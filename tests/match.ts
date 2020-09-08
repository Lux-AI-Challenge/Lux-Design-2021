import * as Dimensions from 'dimensions-ai';
// test running a match
import { LuxDesign } from '../src';
import { Logger } from 'dimensions-ai';
const design = new LuxDesign('Lux Design');
const luxdim = Dimensions.create(design, {
  name: 'luxdimension',
  id: 'luxdim',
  defaultMatchConfigs: {},
  loggingLevel: Logger.LEVEL.INFO,
  secureMode: false,
  observe: false,
  activateStation: false,
});

const js = './kits/js/bot.js';
const testjs = './tests/bots/js/bot.js';
const botList = [testjs, testjs];
luxdim
  .createMatch(botList, {
    storeErrorLogs: true,
    storeReplay: false,
    seed: 1,
    debug: false,
    runProfiler: true,
    debugDelay: 100,
    engineOptions: {
      noStdErr: false,
    },
    mapType: 'debug',
    loggingLevel: Logger.LEVEL.WARN,
  })
  .then(async (match) => {
    console.log('Created match');
    const stime = new Date().valueOf();
    const res = await match.run();
    console.log(`Match took ${new Date().valueOf() - stime}ms`);
    // console.log(match.state.game.map.getMapString());
    console.log(res);
    console.log(
      `Update Stage: avg ${
        match.state.profile.updateStage.reduce((acc, curr) => acc + curr) /
        match.state.profile.updateStage.length
      }ms`
    );
    console.log(
      `Data Transfer: avg ${
        match.state.profile.dataTransfer.reduce((acc, curr) => acc + curr) /
        match.state.profile.dataTransfer.length
      }ms`
    );
  })
  .catch(console.error);
