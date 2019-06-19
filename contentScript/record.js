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

function mouseListener(event) {
  if (window.startRecording) {
    const scenarioName = getScenarioName();
    const data = {
      dataToSave: {
        id: event.path[0].id,
        className: event.path[0].className,
        tagName: event.path[0].tagName,
      },
      scenarioName,
      query: 'record',
      queryType: 'mouse',
    }
    chrome.runtime.sendMessage(data, responseListener);
  }
}

function keyListener(event) {
  if (window.startRecording) {
    const scenarioName = getScenarioName();
    const data = {
      dataToSave: {
        id: event.path[0].id,
        className: event.path[0].className,
        tagName: event.path[0].tagName,
        keyCode: event.keyCode,
        key: event.key,
        code: event.code,
      },
      scenarioName,
      query: 'record',
      queryType: 'keyboard',
    };
    chrome.runtime.sendMessage(data, responseListener);
  }
}

function scrollListener(event) {
  if (window.startRecording) {
    const scenarioName = getScenarioName();
    const data = {
      dataToSave: {
        id: event.path[0].id,
        className: event.path[0].className,
        tagName: event.path[0].tagName,
        scrollTop: event.path[0].scrollTop
      },
      scenarioName,
      query: 'record',
      queryType: 'scroll',
    };
    chrome.runtime.sendMessage(data, responseListener);
  }
}

function debounce(func, wait, immediate) {
	var timeout;
	return function() {
		var context = this, args = arguments;
		var later = function() {
			timeout = null;
			if (!immediate) func.apply(context, args);
		};
		var callNow = immediate && !timeout;
		clearTimeout(timeout);
		timeout = setTimeout(later, wait);
		if (callNow) func.apply(context, args);
	};
};

function attachListeners() {
  if (window.startRecording) {
    document.addEventListener('mousedown', mouseListener);
    document.addEventListener('keydown', keyListener);
    window.addEventListener('scroll', debounce(scrollListener, 100, false), true)
    connectMutationObserver();
  } else {
    document.removeEventListener('mousedown', mouseListener);
    document.removeEventListener('keydown', keyListener);
    disconnectMutationObserver();
  }
}

function recordCode(event) {
  const snippet = event.data.snippet;
  if (window.startRecording && typeof (snippet) === 'string') {
    const scenarioName = getScenarioName();
    const data = {
      dataToSave: {
        snippet,
      },
      scenarioName,
      query: 'record',
      queryType: 'code',
    };
    chrome.runtime.sendMessage(data, responseListener);
  }
}

function recordTestCase(event) {
  const { snippet, name, description, result } = event.data;
  if (window.startRecording) {
    const scenarioName = getScenarioName();
    console.log(`%c${name}`, `color: ${result ? 'green' : 'red'}; font-size: large`);
    const data = {
      dataToSave: {
        snippet,
        description,
      },
      scenarioName,
      query: 'record',
      queryType: 'testCase',
      name: name
    };
    chrome.runtime.sendMessage(data, responseListener);
  }
}

//TODO: the logic for recordManualStep is not yet finished
function recordManualStep(event) {
  if (event && event.data && event.data.type === 'manualStep') {
    const description = event.data.description;
    if (window.startRecording && typeof (snippet) === 'string') {
      const scenarioName = getScenarioName();
      const data = {
        dataToSave: {
          description,
        },
        scenarioName,
        query: 'record',
        queryType: 'manualStep',
      };
      chrome.runtime.sendMessage(data, responseListener);
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

//TODO: old school method for connecting and disconnet mutation observer
function disconnectMutationObserver() {
  const observer = mutationObserver();
  observer.disconnect();
  console.log('observer disconnected');
}

function connectMutationObserver() {
  const config = {
    attributes: true,
    childList: true,
    subtree: true,
    attributeOldValue: true,
  };
  const observer = mutationObserver();
  //TODO: abstract this logic
  if (document.readyState === 'complete') {
    observer.observe(document, config);
    console.log('mutation observer attached at readyState completed');
  } else {
    window.addEventListener('load', () => {
      observer.observe(document, config);
      console.log('mutation observer attached');
    });
  }
}

//TODO: refactor
function mutationObserver() {
  if (!mutationObserver.observer) {
    /**
     * 
     * @param {MutationRecord[]} mutationList 
     */
    const mutationCallBack = (mutationList) => {
      if (!window.scenarioName) return;
      //TODO: find a better logic for mutation recording
      console.log("recording mutation events:", mutationList);
      mutationList.forEach((records) => {
        const scenarioName = getScenarioName();
        if (records.type === 'childList') {
          //TODO: change the logic to support the added nodes or listen for network status 
          const data = {
            dataToSave: {
              childAddedOrRemoved: records.removedNodes.length + records.addedNodes.length,
            },
            scenarioName,
            query: 'record',
            queryType: 'mutationChildList',
          };
          chrome.runtime.sendMessage(data, responseListener);
        } else if (records.type === 'attributes') {
          const changeInfo = {
            oldValue: records.oldValue,
            attributeName: records.attributeName,
          };
          if (records.target.getAttribute) {
            changeInfo.newValue = records.target
              .getAttribute(records.attributeName);
          }
          const data = {
            dataToSave: {
              changeInfo,
            },
            scenarioName,
            query: 'record',
            queryType: 'mutationAttributes',
          };
          chrome.runtime.sendMessage(data, responseListener);
        }
        console.log(`mutationObserver recording request sent`);
      });
    };
    const observer = new MutationObserver(mutationCallBack);
    mutationObserver.observer = observer;
  }
  return mutationObserver.observer;
}

var codeScript = document.createElement("script");
//to access from the actual dom
codeScript.innerHTML = `
window.recordCode = ${postCodeToExtension};
window.recordTestCase = ${postTestCaseToExtension};
window.recordManualStep = ${postManualToExtension};`;
codeScript.id = 'handyTester';
document.head.appendChild(codeScript);

window.recordCode = recordCode;
window.recordManualStep = recordManualStep;


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

attachListeners();
window.addEventListener('message', messageListener);

{ finished: true }