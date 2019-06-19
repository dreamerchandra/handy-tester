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

async function recordEvents(request) {
  try {
    const events = ['keyboard', 'mouse', 'code', 'manualStep', 'testCase', 'mutationChildList', 'mutationAttributes', 'scroll'];
    if (events.indexOf(request.queryType) != -1 && typeof(request.dataToSave) === "object") {
      const scenarioName = getScenarioNameFromRequest(request);
      let dataToSave = request.dataToSave;
      dataToSave.eventType = request.queryType;
      return await saveEventToLocalStorage(scenarioName, dataToSave);
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