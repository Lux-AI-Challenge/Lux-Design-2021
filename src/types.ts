import { Game } from './Game';
import { GameMap } from './GameMap';
import { Resource } from './Resource';

export interface LuxMatchResults {
  ranks: Array<{ rank: number; agentID: number }>;
}

export interface LuxMatchState {
  configs: LuxMatchConfigs;
  game: Game;
  profile: {
    dataTransfer: Array<number>;
    updateStage: Array<number>;
  };
  rng: () => number;
}

/**
 * Configurations for a match
 */
export interface LuxMatchConfigs {
  preLoadedGame?: Game;
  storeReplay: boolean;
  mapType: GameMap.Types;
  width: number;
  height: number;
  debug?: boolean;
  runProfiler: boolean;
  debugDelay: number;
  seed: number | undefined;
  parameters: {
    DAY_LENGTH: number;
    NIGHT_LENGTH: number;
    MAX_DAYS: number;
    LIGHT_UPKEEP: {
      CITY: number;
      WORKER: number;
      CART: number;
    };
    RESOURCE_CAPACITY: {
      WORKER: number;
      CART: number;
    };
    WORKER_COLLECTION_RATE: {
      WOOD: number;
      COAL: number;
      URANIUM: number;
    };
    RESOURCE_TO_FUEL_RATE: {
      WOOD: number;
      COAL: number;
      URANIUM: number;
    };
    CITY_ADJACENCY_BONUS: number;
    BUILD_TIME: {
      WORKER: number;
      CART: number;
    };
    RESEARCH_REQUIREMENTS: {
      COAL: number;
      URANIUM: number;
    };
    CITY_ACTION_COOLDOWN: number;
    UNIT_ACTION_COOLDOWN: {
      CART: number;
      WORKER: number;
    };
    MAX_CELL_COOLDOWN: number;
    CART_ROAD_DEVELOPMENT_RATE: number;
    PILLAGE_RATE: number;
    MIN_CELL_COOLDOWN: number;
  };
}
