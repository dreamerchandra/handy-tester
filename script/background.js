import { triggerRecorderOnReload, triggerReproduceOnReload } from './Helpers/BgHelpers.js';
import { saveEventToLocalStorage } from './Helpers/StorageHelpers.js';
import ChromeUtils from './Utils/ChromeUtils.js';
import StorageUtils from './Utils/StorageUtils.js';

//TODO: move the event payload in request to request.payload
function getScenarioNameFromRequest(request) {
  const scenarioName = request.scenarioName;
  if (!scenarioName && typeof(scenarioName) === "string") {
    throw new Error('scenarioName does not exist or malformed');
  }
  return scenarioName;
}
async function recordKeyboardEvent(request) {
  if (!(request.tagName && request.key && request.keyCode)) {
    throw new Error('tagName, key and keyCode name must be defined');
  }
  try {
    //TODO: ctrl, shift, alt, options should also be associated with keycode
    console.log('recording keyboard event', request);
    const scenarioName = getScenarioNameFromRequest(request);
    const dataToSave = {
      eventType: 'keyboard',
      id: request.id || '',
      className: request.className || '',
      tagName: request.tagName,
      key: request.key,
      keyCode: request.keyCode,
      code: request.code,
    };
    return await saveEventToLocalStorage(scenarioName, dataToSave);
  } catch (error) {
    console.error('record keyboard event failed', error);
  }
}

async function recordCodeEvent(request) {
  if (!request.snippet) {
    throw new Error('code snippet is required');
  }
  try {
    console.log('recording code event', request);
    const scenarioName = getScenarioNameFromRequest(request);
    const dataToSave = {
      eventType: 'code',
      snippet: request.snippet,
    };
    return await saveEventToLocalStorage(scenarioName, dataToSave);
  } catch (error) {
    console.error('recording code failed', error);
  }
}

async function recordTestCaseEvent(request) {
  if (!request.snippet) {
    throw new Error('code snippet is required');
  }
  try {
    console.log('recording test case event', request);
    const scenarioName = getScenarioNameFromRequest(request);
    const dataToSave = {
      eventType: 'testCase',
      snippet: request.snippet,
      name: request.name,
      description: request.description,
    };
    return await saveEventToLocalStorage(scenarioName, dataToSave);
  } catch (error) {
    console.error('recording test case event thrown an error', error);
  }
}
async function recordMouseEvent(request) {
  if (!request.tagName) {
    throw new Error('tagName name must be defined');
  }
  try {
    console.log('recording mouse event', request);
    const scenarioName = getScenarioNameFromRequest(request);
    //TODO: mouse position with relative to window size has to be stored
    const dataToSave = {
      eventType: 'mouse',
      id: request.id || '',
      className: request.className || '',
      tagName: request.tagName,
    };
    return await saveEventToLocalStorage(scenarioName, dataToSave);
  } catch (error) {
    console.error('record mouse event failed', error);
  }
}

async function recordManualEvent(request) {
  if (!request.description) {
    throw new Error('description is required');
  }
  try {
    console.log('recording manual step', request);
    const scenarioName = getScenarioNameFromRequest(request);
    const dataToSave = {
      eventType: 'manualStep',
      description: request.description,
    };
    return await saveEventToLocalStorage(scenarioName, dataToSave);
  } catch (error) {
    console.error('recording manual step failed', error);
  }
}

async function recordEvents(request) {
  try {
    switch (request.queryType) {
      case 'keyboard':
        return await recordKeyboardEvent(request);
      case 'mouse':
        return await recordMouseEvent(request);
      case 'code':
        return await recordCodeEvent(request);
      case 'manualStep': //TODO: din complete yet
        return await recordManualEvent(request);
      case 'testCase':
        return await recordTestCaseEvent(request);
    }
  } catch (error) {
    console.error('record events failed', error);
  }
}

async function isScenarioExist(request) {
  try {
    const names = (await StorageUtils.getItem('Scenario names') || []);
    const scenarioName = getScenarioNameFromRequest(request);
    return names.includes(scenarioName);
  } catch (error) {
    console.error('isScenarioExist failed to check', error);
  }
}

async function getEventIdsForScenario(request) {
  try {
    const scenarioName = getScenarioNameFromRequest(request);
    const eventIds = await StorageUtils.getItem(scenarioName);
    return eventIds;
  } catch (error) {
    console.error('getEventsAssociatedWithScenario failed', error);
  }
}

async function getEventData(request) {
  try {
    if (request.eventId) {
      const eventData = await StorageUtils.getItem(request.eventId)
      return eventData;
    }
    throw new Error('event id should be given');
  } catch (error) {
    console.error('get event data failed', error);
  }
}

async function startRecording(request) {
  try {
    const scenarioName = getScenarioNameFromRequest(request);
    const isExist = await isScenarioExist(request);
    if (!isExist) {
      const isRecording = await StorageUtils.getItem('currentlyRecording');
      if (!isRecording) {
        const isSaved = await StorageUtils.setItem({ currentlyRecording: scenarioName });
        if (!isSaved) return;
        const activeTabId = await ChromeUtils.getActiveTabInfo('id');
        //currently connectToTab is being utilized to inject content script on page reload 
        ChromeUtils.listenForTabStatusChange
          (activeTabId, 'complete', triggerRecorderOnReload);
        return isSaved;
      }
    }
  } catch (error) {
    console.error('starting recording failed', error);
  }
}

async function startReproducing(request) {
  try {
    const scenarioName = getScenarioNameFromRequest(request);
    const isExist = await isScenarioExist(request);
    if (isExist) {
      const isSaved = await StorageUtils.setItem({ currentlyReproducing: scenarioName });
      return isSaved;
    }
  } catch (error) {
    console.error('failing to start reproducing ', request);
  }
}

const messageListener = (request, sender, sendResponse) => {
  async function _messageListener() {
    switch (request.query) {
      case 'getScenarioNames':
        const data = await StorageUtils.getItem('Scenario names');
        console.log('scenario names', data);
        sendResponse(data);
        break;
      case 'isScenarioExist':
        const isExist = await isScenarioExist(request);
        sendResponse(isExist);
        break;
      case 'record':
        try {
          console.log('recording ', request);
          const isSuccess = await recordEvents(request);
          if (isSuccess) {
            console.log('recording successful', request);
            sendResponse('Done');
          } else {
            console.log('recording failed', request);
            sendResponse('Failed');
          }
        } catch (error) {
          console.log('recording failed for', request, 'with error', error);
          sendResponse('Failed');
        }
        break;
      case 'reproduce':
        if (request.queryType == 'getEventIds') { // returns event ids associated with scenario
          try {
            console.log('getting event ids associated with scenario', request);
            const eventIds = await getEventIdsForScenario(request);
            console.log('event ids are ', eventIds);
            sendResponse(eventIds);
          } catch (error) {
            console.log('getting event ids failed', error);
            sendResponse('Failed');
          }
        } else if (request.queryType == 'getEventData') { // return individual events
          try {
            console.log('getting event', request);
            const data = await getEventData(request)
            console.log('event data is', data);
            sendResponse(data);
          } catch (error) {
            console.log('getting event data failed', error);
            sendResponse('Failed');
          }
        }
        break;
      case 'startRecording':
        try {
          const canStart = await startRecording(request);
          console.log('recording can start:', canStart, ' for request ', request);
          sendResponse(canStart);
        } catch (error) {
          console.log('recording can start:', error);
          sendResponse('Failed');
        }
        break;
      case 'currentAction':
        try {
          const scenarioName = await StorageUtils.getItem(request.queryType);
          console.log(request.queryType, ' ', scenarioName ? scenarioName : 'nothing');
          sendResponse(scenarioName);
        } catch (error) {
          console.log('currentlyRecording failed to set', error);
          sendResponse('Failed');
        }
        break;
      case 'stopAction':
        try {
          ChromeUtils.detachListenerForTabStatusChange();
          const removed = await StorageUtils.removeItem(request.queryType);
          console.log(request.queryType, ' removed ', removed ? 'success' : 'failed');
          sendResponse(removed ? true : false);
        } catch (error) {
          console.log('stop recording failed to stop:', error);
          sendResponse('Failed');
        }
        break;
      case 'activeTabId':
        try {
          const tabId = await ChromeUtils.getActiveTabInfo('id');
          console.log("active tab id is ", tabId);
          sendResponse(tabId);
        } catch (error) {
          console.log('stop recording failed to stop:', error);
          sendResponse('Failed');
        }
        break;
      case 'startReproduce':
        try {
          const canStart = await startReproducing(request);
          console.log('reproducing can start:', canStart, ' for request ', request);
          sendResponse(canStart);
        } catch (error) {
          console.log('recording can start:', error);
          sendResponse('Failed');
        }
        break;
      case 'unload':
        console.log('reproduce going to unload', request);
        if (request.queryType === 'reproduce') {
          try {
            const activeTabId = await ChromeUtils.getActiveTabInfo('id');
            if (activeTabId) {
              ChromeUtils.listenForTabStatusChange(activeTabId, 'complete', triggerReproduceOnReload, request.resumeEventAt);
            }
          } catch (error) {
            console.log('unload failed:', error);
            sendResponse('Failed');
          }
        }
    }
  }
  _messageListener();
  return true;
}

chrome.runtime.onMessage.addListener(messageListener)