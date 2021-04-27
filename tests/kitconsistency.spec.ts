import chai from 'chai';
import 'mocha';
const expect = chai.expect;
import { Game } from '../src/Game';
import { GameMap } from '../src/GameMap';
import { create, Logger } from 'dimensions-ai';
import { LuxDesign, LuxMatchState } from '../src';
import { fail } from 'assert';

describe('Test kit consistency', () => {
  const design = new LuxDesign('Lux Design');
  const luxdim = create(design, {
    name: 'luxdimension',
    id: 'luxdim',
    defaultMatchConfigs: {},
    loggingLevel: Logger.LEVEL.NONE,
    secureMode: false,
    observe: false,
    activateStation: false,
  });
  const bots = {
    js: {
      file: './kits/js/bot.js',
      name: 'js',
    },
    cpp: {
      file: './kits/cpp/organic/main.cpp',
      name: 'cpp',
    },
    cppTranspiled: {
      file: './kits/cpp/organic/main.js',
      name: 'cpp-transpiled',
    },
  };
  const options = {
    storeErrorLogs: false,
    storeReplay: false,
    compressReplay: false,
    // seed: 1,
    debug: false,
    width: 16,
    height: 16,
    debugAnnotations: true,
    // runProfiler: true,
    loggingLevel: Logger.LEVEL.NONE,
    mapType: 'debug',
    engineOptions: {
      noStdErr: false,
      timeout: {
        active: true,
        max: 2000
      }
    },
  }
  it('c++ consistency test', async () => {
    
    let botList = [bots.js, bots.cppTranspiled];
    const match = await luxdim.createMatch(botList, options);
    const res = await match.run();

    botList = [bots.js, bots.cpp];
    const match2 = await luxdim.createMatch(botList, options);
    const res2 = await match.run();
    const state: LuxMatchState = match.state;
    const state2: LuxMatchState = match.state;
    let cmds1 = state.game.replay.data.allCommands;
    let cmds2 = state2.game.replay.data.allCommands;
    for (let turn = 0; turn < cmds1.length; turn++) {
      let match1_cmds = cmds1[turn];
      let match2_cmds = cmds2[turn];
      expect(match1_cmds).to.eql(match2_cmds);
    }
  }).timeout(10000);

  after(async () => {
    await luxdim.cleanup();
  });
});
