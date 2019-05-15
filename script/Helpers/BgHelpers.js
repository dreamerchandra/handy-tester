import StorageUtils from "../Utils/StorageUtils.js";
import ScriptExecutor from "../Utils/ScriptExecutor.js";

export async function triggerRecorderOnReload(tabId, changeInfo, tab) {
  try {
    console.log('Reloaded tab info', tabId, tab, changeInfo);
    const scenarioName = await StorageUtils.getItem('currentlyRecording');
    if (!scenarioName) return;
    console.log('recording starting to resume for', scenarioName);
    await ScriptExecutor.executeCode(`window.startRecording = ${true}; window.scenarioName = '${scenarioName}';console.log("${scenarioName} is recording and is resumed"); {done:true}`);
    await ScriptExecutor.executeFile('record.js');
    console.log('recording resumed for', scenarioName);
  } catch (error) {
    console.error('triggerRecorderOnReload failed', error);
  }
}

export async function triggerReproduceOnReload(tabId, changeInfo, tab, resumeEventAt) {
  try {
    console.log('Reloaded tab info', tabId, tab, changeInfo);
    const scenarioName = await StorageUtils.getItem('currentlyReproducing');
    if (!scenarioName) return;
    console.log('reproducing starting to resume for', scenarioName);
    await ScriptExecutor.executeCode(`window.scenarioName = '${scenarioName}';console.log("${scenarioName} is reproducing and resuming at  ${resumeEventAt} index"); window.resumeEventAt = ${resumeEventAt}; {done:true}`);
    await ScriptExecutor.executeFile('reproduce.js');
    console.log('reproducing resumed for', scenarioName);
  } catch (error) {
    console.error('triggerReproduceOnReload failed', error);
  }
}

export function connectMessageListener(msg) {
  console.log('message received on connect listener', msg);
}