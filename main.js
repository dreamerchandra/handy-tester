import Messenger from "./script/Helpers/Messenger.js";
import ScriptExecutor from "./script/Utils/ScriptExecutor.js";
import {
  getScenarioNameGivenByUser, startRecording, stopRecording,
  fetchScenarioNames, messageListener
} from "./script/Helpers/PopupHelper.js";

async function record() {
  try {
    const { scenario, scenarioName } = getScenarioNameGivenByUser();
    const currentlyRecording = await Messenger.sendRunTimeMessage({ query: 'currentAction', queryType: 'currentlyRecording' });
    if (scenarioName && !currentlyRecording) {
      await startRecording(scenario, scenarioName);
    } else {
      await stopRecording(scenario);
    }
  } catch (error) {
    console.error('failed to record/stop', error);
  }
}

//TODO: refactor the code 
async function reproduce() {
  console.log('staring to reproduce');
  const selector = document.getElementById('reproduceOptions');
  const scenarioName = selector.options[selector.selectedIndex].innerText;
  const currentlyReproducing = await Messenger.sendRunTimeMessage({ query: 'currentAction', queryType: 'currentlyReproducing' });
  if (currentlyReproducing) {
    const isStopped = await Messenger.sendRunTimeMessage({ query: 'stopAction', queryType: 'currentlyReproducing' });
    if (isStopped) {
      await ScriptExecutor.executeCode(`window.scenarioName = '';console.log("${scenarioName} stopped to reproduce"); {done:true}`);
      console.log('stopped reproducing');
      document.getElementById('reproduce').innerText = 'reproduce';
    }
  } else {
    const isExist = await Messenger.sendRunTimeMessage({ query: 'isScenarioExist', scenarioName });
    if (isExist) {
      const canReproduce = await Messenger.sendRunTimeMessage({
        query: 'startReproduce',
        scenarioName,
      })
      await ScriptExecutor.executeCode(`window.scenarioName = '${scenarioName}';console.log("${scenarioName} is reproducing"); {done:true}`);
      await ScriptExecutor.executeFile('reproduce.js');
      console.log('finished reproducing');
    }
  }
}

async function editScenarioInput(scenarioName) {
  const input = document.getElementById('scenarioName');
  input.placeholder = `Name your ${((scenarioName && scenarioName.length) || 0) + 1}th scenario`;
}

async function addOptionsForReproduce() {
  const selector = document.getElementById("reproduceOptions");
  const scenarioName = await fetchScenarioNames();
  if (scenarioName) {
    await editScenarioInput(scenarioName);
    scenarioName.forEach((name, index) => {
      const options = `<option value=${index}>${name}</option>`;
      selector.innerHTML += options;
    });
  } else {
    document.getElementById('scenarioName').placeholder = 'Name your first scenario';
  }
  
}

async function showControls() {
  const currentlyRecording = await Messenger.sendRunTimeMessage({ query: 'currentAction', queryType: 'currentlyRecording' });
  console.log('currentlyRecording', currentlyRecording);
  const scenarioName =  document.getElementById('scenarioName');
  if (currentlyRecording) {
    scenarioName.placeholder = `${currentlyRecording} started to record`;
    document.getElementById('record').innerText = 'stop';
  } else {
    document.getElementById('record').innerText = 'record';
  }
  const currentlyReproducing = await Messenger.sendRunTimeMessage({ query: 'currentAction', queryType: 'currentlyReproducing' });
  console.log('currentlyReproducing', currentlyRecording);
  if (currentlyReproducing) {
    scenarioName.placeholder = `${currentlyReproducing} is reproducing`;
    document.getElementById('reproduce').innerText = 'stop'
  } else {
    document.getElementById('reproduce').innerText = 'reproduce';
  }
}


addOptionsForReproduce();
showControls();
document.getElementById('record').addEventListener('click', record);
document.getElementById('reproduce').onclick = reproduce;
chrome.runtime.onConnect.addListener(messageListener);