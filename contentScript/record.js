async function responseListener(response) {
  console.log(await response);
}

function getScenarioName() {
  let scenarioName = window.scenarioName;
  if (!scenarioName && typeof(scenarioName) === 'string') {
    throw new Error('scenarioName does not exist or malformed');
  }
  return scenarioName;
}

function getBasicDataToSave(event) {
  const scenarioName = getScenarioName();
  const data = {
    id: event.path[0].id,
    className: event.path[0].className,
    tagName: event.path[0].tagName,
    scenarioName
  }
  return data;
}

function mouseListener(event) {
  if (window.startRecording) {
    let dataToSave = getBasicDataToSave(event);
    dataToSave = {
      ...dataToSave,
      query: 'record',
      queryType: 'mouse',
    }
    chrome.runtime.sendMessage(dataToSave, responseListener);
  }
}

function keyListener(event) {
  if (window.startRecording) {
    let dataToSave = getBasicDataToSave(event);
    dataToSave = {
      ...dataToSave,
      query: 'record',
      queryType: 'keyboard',
      keyCode: event.keyCode,
      key: event.key,
      code: event.code,
    };
    chrome.runtime.sendMessage(dataToSave, responseListener);
  }
}
function attachListeners() {
  if (window.startRecording) {
    document.addEventListener('mousedown', mouseListener);
    document.addEventListener('keydown', keyListener);
  } else {
    document.removeEventListener('mousedown', mouseListener);
    document.removeEventListener('keydown', keyListener);
  }
}

function recordCode(event) {
  if (event && event.data && event.data.type === 'code') {
    const snippet = event.data.snippet,
      forceSave = event.data.forceSave;
    if (window.startRecording && typeof (snippet) === 'string') {
      if (!forceSave) {
        try {
          //TODO: dispatching key down or mouse down events should be treated properly
          eval(snippet);
        } catch (error) {
          console.log("It seems your snippet contains error ", error);
          console.log("aborting save");
          console.log(`recordCode('${snippet}',true) to force save this step`);
          return;
        }
      }
      const scenarioName = getScenarioName();
      let dataToSave = {
        scenarioName,
        snippet,
        query: 'record',
        queryType: 'code',
      };
      chrome.runtime.sendMessage(dataToSave, responseListener);
    }
  }
}

function recordManualStep(event) {
  if (event && event.data && event.data.type === 'manualStep') {
    const description = event.data.description;
    if (window.startRecording && typeof (snippet) === 'string') {
      const scenarioName = getScenarioName();
      let dataToSave = {
        scenarioName,
        description,
        query: 'record',
        queryType: 'manualStep',
      };
      chrome.runtime.sendMessage(dataToSave, responseListener);
    }
  }
}
function postCodeToExtension(snippet, forceSave = false) {
  window.postMessage({ type: 'code', snippet, forceSave });
}
function postManualToExtension(description) {
  window.postMessage({ type: 'code', description});
}
var codeScript = document.createElement("script");
var manualScript = document.createElement("script");
codeScript.innerHTML = `window.recordCode = ${postCodeToExtension}`;
manualScript.innerHTML += `window.recordManualStep = ${postManualToExtension}`;
document.head.appendChild(codeScript);
document.head.appendChild(manualScript);
window.recordCode = recordCode;
window.recordManualStep = recordManualStep;
attachListeners();
window.addEventListener('message', recordCode);
{ finished: true }