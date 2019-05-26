import Messenger from "./Messenger.js";
import ScriptExecutor from "../Utils/ScriptExecutor.js";

export function getScenarioNameGivenByUser() {
  const scenario = document.getElementById('scenarioName');
  return { scenario, scenarioName: scenarioName.value };
}

export async function startRecording(scenario, scenarioName) {
  const isExist = await Messenger.sendRunTimeMessage({
    query: 'isScenarioExist',
    scenarioName
  });
  if (isExist) {
    scenario.value = '';
    scenario.placeholder = 'Already scenario exist in same name';
    return;
  }
  const canStart = await Messenger.sendRunTimeMessage({
    query: 'startRecording',
    scenarioName
  });
  if (canStart) {
    await ScriptExecutor.executeCode(`window.startRecording = ${true}; window.scenarioName = '${scenarioName}';console.log("${scenarioName} is recording"); {done:true}`);
    await ScriptExecutor.executeFile('record.js');
    console.log('recording started for', scenarioName);
    scenario.value = '';
    scenario.placeholder = `${scenarioName} started to record`;
    document.getElementById('record').innerText = 'stop'
  }
}

export async function stopRecording(scenario) {
  const currentlyRecording = await Messenger.sendRunTimeMessage({ query: 'currentAction', queryType: 'currentlyRecording' });
  await Messenger.sendRunTimeMessage({
    query: 'stopAction',
    queryType: 'currentlyRecording'
  });
  await ScriptExecutor.executeCode(`window.startRecording = ${false}; window.scenarioName = ''; console.log("${currentlyRecording} stopped to recording"); {done:true}`);
  await ScriptExecutor.executeFile('record.js');
  console.log('recording stopped for', currentlyRecording);
  scenario.placeholder = `${currentlyRecording} stopped to record`;
  document.getElementById('record').innerText = 'record'
}

export async function fetchScenarioNames() {
  try {
    const names = await Messenger.sendRunTimeMessage({ query: 'getScenarioNames' });
    console.log('scenario names ', names);
    return names;
  } catch(error){
    console.error('fetching names failed', error);
  }
}

export function messageListener(port) {
  console.log(port);
  ScriptExecutor.executeCode(`console.log("${currentlyRecording, request, sender} stopped to recording"); {done:true}`)
}