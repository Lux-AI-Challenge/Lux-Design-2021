import * as Dimension from 'dimensions-ai';
import Match = Dimension.Match;
import Tournament = Dimension.Tournament;
import { LuxMatchResults, LuxMatchState } from './types';
import { DEFAULT_CONFIGS } from './defaults';
import { generateGame } from './Game/gen';
import {
  Action,
  SpawnWorkerAction,
  SpawnCityAction,
  SpawnCartAction,
  ResearchAction,
  TransferAction,
  MoveAction,
} from './Actions';
import { Game } from './Game';
import { Unit } from './Unit';
import seedrandom from 'seedrandom';

export class LuxDesign extends Dimension.Design {
  constructor(name: string) {
    super(name);
  }

  // Initialization step of each match
  async initialize(match: Match): Promise<void> {
    // initialize with default state and configurations and default RNG
    const state: LuxMatchState = {
      configs: { ...DEFAULT_CONFIGS },
      game: generateGame(),
      rng: seedrandom(`${Math.random()}`),
    };
    state.configs = { ...state.configs, ...match.configs };

    if (state.configs.seed !== undefined) {
      state.rng = seedrandom(`${state.configs.seed}`);
    }

    // store the state into the match so it can be used again in `update` and `getResults`
    match.state = state;

    // send each agent their id
    for (let i = 0; i < match.agents.length; i++) {
      const agentID = match.agents[i].id;
      match.send(`${agentID}`, agentID);
    }
    // send all agents some global configs / parameters
    match.sendAll('');
  }

  // Update step of each match, called whenever the match moves forward by a single unit in time (1 timeStep)
  async update(
    match: Match,
    commands: Array<Dimension.MatchEngine.Command>
  ): Promise<Match.Status> {
    const state: LuxMatchState = match.state;
    const game = state.game;
    game.state.turn++;

    // loop over commands and validate and map into internal action representations
    const actionsMap: Map<Game.ACTIONS, Array<Action>> = new Map();
    Object.values(Game.ACTIONS).forEach((val) => {
      actionsMap.set(val, []);
    });
    for (let i = 0; i < commands.length; i++) {
      // get the command and the agent that issued it and handle appropriately
      const agentID = commands[i].agentID;
      try {
        const action = game.validateCommand(commands[i]);
        // TODO: this might be slow, depends on its optimized and compiled
        const newactionArray = [...actionsMap.get(action.action), action];
        actionsMap.set(action.action, newactionArray);
      } catch (err) {
        match.throw(agentID, err);
      }
    }

    // first distribute all resources
    game.map.resourcesMap.forEach((cell) => {
      game.handleResourceRelease(cell);
    });

    // give units and city tiles their validated actions to use
    actionsMap
      .get(Game.ACTIONS.BUILD_CITY)
      .forEach((action: SpawnCityAction) => {
        game.getUnit(action.team, action.unitid).giveAction(action);
      });
    actionsMap
      .get(Game.ACTIONS.BUILD_WORKER)
      .forEach((action: SpawnWorkerAction) => {
        const citytile = game.map.getCell(action.x, action.y).citytile;
        citytile.giveAction(action);
      });
    actionsMap
      .get(Game.ACTIONS.BUILD_CART)
      .forEach((action: SpawnCartAction) => {
        const citytile = game.map.getCell(action.x, action.y).citytile;
        citytile.giveAction(action);
      });
    actionsMap.get(Game.ACTIONS.RESEARCH).forEach((action: ResearchAction) => {
      const citytile = game.map.getCell(action.x, action.y).citytile;
      citytile.giveAction(action);
    });
    actionsMap.get(Game.ACTIONS.TRANSFER).forEach((action: TransferAction) => {
      game.getUnit(action.team, action.srcID).giveAction(action);
    });

    const prunedMoveActions = game.handleMovementActions(
      actionsMap.get(Game.ACTIONS.MOVE) as Array<MoveAction>
    );

    prunedMoveActions.forEach((action) => {
      game.getUnit(action.team, action.unitid).giveAction(action);
    });

    // now we go through every actionable entity and execute actions
    game.cities.forEach((city) => {
      city.citycells.forEach((cellWithCityTile) => {
        cellWithCityTile.citytile.handleTurn(game);
      });
    });
    game.state.teamStates[0].units.forEach((unit) => {
      unit.handleTurn(game);
    });
    game.state.teamStates[1].units.forEach((unit) => {
      unit.handleTurn(game);
    });

    if (game.state.turn % state.configs.parameters.DAY_LENGTH === 0) {
      // do something at night
      this.handleNight(state);
    }

    // send specific agents some information
    for (let i = 0; i < match.agents.length; i++) {
      const agent = match.agents[i];
      match.send('agentspecific', agent);
    }

    if (this.matchOver(match.state)) {
      return Match.Status.FINISHED;
    }
  }

  /**
   * Determine if match is over or not
   * @param state
   */
  matchOver(state: Readonly<LuxMatchState>): boolean {
    const game = state.game;
    if (game.state.turn === state.configs.parameters.MAX_DAYS) {
      return true;
    }
    // over if at least one team has no units left or city tiles
    const teams = [Unit.TEAM.A, Unit.TEAM.B];
    const cityCount = [0, 0];

    game.cities.forEach((city) => {
      cityCount[city.team] += 1;
    });

    for (const team of teams) {
      if (game.getTeamsUnits(team).size + cityCount[team] === 0) {
        return true;
      }
    }
  }

  /**
   * Handle nightfall and update state accordingly
   * @param state
   */
  handleNight(state: LuxMatchState): void {
    const game = state.game;
    game.cities.forEach((city) => {
      // if city does not have enough fuel, destroy it
      // TODO, probably add this event to replay
      if (city.fuel < city.getLightUpkeep()) {
        //
        game.destroyCity(city.id);
      } else {
        city.fuel -= city.getLightUpkeep();
      }
      game.state.teamStates[0].units.forEach((unit) => {
        if (game.map.getCellByPos(unit.pos).isCityTile()) {
          if (!unit.spendFuelToSurvive()) {
            // delete unit
            game.destroyUnit(unit.team, unit.id);
          }
        }
      });
      game.state.teamStates[1].units.forEach((unit) => {
        if (game.map.getCellByPos(unit.pos).isCityTile()) {
          if (!unit.spendFuelToSurvive()) {
            // delete unit
            game.destroyUnit(unit.team, unit.id);
          }
        }
      });
    });
  }

  // Result calculation of concluded match. Should return the results of a match after it finishes
  async getResults(match: Match): Promise<LuxMatchResults> {
    // calculate results
    const state: LuxMatchState = match.state;
    const game = state.game;
    let winningTeam = Unit.TEAM.A;
    let losingTeam = Unit.TEAM.B;
    figureresults: {
      // count city tiles
      const cityTileCount = [0, 0];
      game.cities.forEach((city) => {
        cityTileCount[city.team] += city.citycells.length;
      });
      if (cityTileCount[Unit.TEAM.A] > cityTileCount[Unit.TEAM.B]) {
        break figureresults;
      } else if (cityTileCount[Unit.TEAM.A] < cityTileCount[Unit.TEAM.B]) {
        winningTeam = Unit.TEAM.B;
        losingTeam = Unit.TEAM.A;
        break figureresults;
      }

      // if tied, count by units
      const unitCount = [
        game.getTeamsUnits(Unit.TEAM.A),
        game.getTeamsUnits(Unit.TEAM.B),
      ];
      if (unitCount[Unit.TEAM.A] > unitCount[Unit.TEAM.B]) {
        break figureresults;
      } else if (unitCount[Unit.TEAM.A] < unitCount[Unit.TEAM.B]) {
        winningTeam = Unit.TEAM.B;
        losingTeam = Unit.TEAM.A;
        break figureresults;
      }

      // if still undecided, for now, go by random choice
      if (state.rng() > 0.5) {
        winningTeam = Unit.TEAM.B;
        losingTeam = Unit.TEAM.A;
      }
    }

    const results = {
      ranks: [
        { rank: 1, agentID: winningTeam },
        { rank: 2, agentID: losingTeam },
      ],
    };
    return results;
  }

  static resultHandler(
    results: LuxMatchResults
  ): Tournament.RankSystem.Results {
    const rankings = [];
    for (let i = 0; i < results.ranks.length; i++) {
      const info = results.ranks[i];
      rankings.push({ rank: info.rank, agentID: info.agentID });
    }
    return { ranks: rankings };
  }
}
