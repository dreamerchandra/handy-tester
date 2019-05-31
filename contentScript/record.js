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
  const snippet = event.data.snippet;
  if (window.startRecording && typeof (snippet) === 'string') {
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

function recordTestCase(event) {
  const { snippet, name, description, result } = event.data;
  if (window.startRecording) {
    const scenarioName = getScenarioName();
    console.log(`%c${name}`, `color: ${result ? 'green' : 'red'}; font-size: large`);
    let dataToSave = {
      scenarioName,
      snippet,
      description,
      query: 'record',
      queryType: 'testCase',
      name: name
    };
    chrome.runtime.sendMessage(dataToSave, responseListener);
  }
}

//TODO: the logic for recordManualStep is not yet finished
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
  if (typeof (snippet) === 'string') {
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
    window.postMessage({
      type: 'code',
      snippet,
      forceSave
    });
  }
}

function postTestCaseToExtension(name, description, snippet) {
  if (typeof (snippet) === 'string') {
    try {
      //TODO: dispatching key down or mouse down events should be treated properly
      const result = eval(snippet);
      window.postMessage({
        type: 'testCase',
        snippet,
        name,
        description,
        result
      });
    } catch (error) {
      console.log("It seems your snippet contains error ", error);
      console.log("aborting save");
    }
  }
}
function postManualToExtension(description) {
  window.postMessage({ type: 'code', description});
}

var codeScript = document.createElement("script");
codeScript.innerHTML = `window.recordCode = ${postCodeToExtension}`;
document.head.appendChild(codeScript);

var manualScript = document.createElement("script");
manualScript.innerHTML += `window.recordManualStep = ${postManualToExtension}`;
document.head.appendChild(manualScript);

var testScript = document.createElement("script");
testScript.innerHTML += `window.recordTestCase = ${postTestCaseToExtension}`;
document.head.appendChild(testScript);

window.recordCode = recordCode;
window.recordManualStep = recordManualStep;

attachListeners();

function messageListener(event) {
  switch (event.data.type) {
    case 'code':
      recordCode(event);
      break;
    case 'testCase':
      recordTestCase(event);
      break;
  }
}

window.addEventListener('message', messageListener);

{ finished: true }