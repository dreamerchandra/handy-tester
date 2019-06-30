class Helper {
  static initialize(eventIds, completedIndex) {
    console.log('initializing mutation observer');
    Helper.eventIds = eventIds;
    Helper.completedIndex = completedIndex;
    Helper._completedIndex = completedIndex;
    Helper.config = {
      attributes: true,
      childList: true,
      subtree: true,
      attributeOldValue: true,
    };
    Helper.tillNextEvent = {
      childAddedOrRemoved: 0,
      mutationChanges: undefined,
    }
    Helper.changesAfterDispatch = {
      childAddedOrRemoved: 0,
      mutationChanges: undefined,
    }
    Helper.getOrCreateObserver();
    if (document.readyState === 'complete') {
      Helper.observer.observe(document, Helper.config);
      console.log('mutation observer attached at readyState completed');
    } else {
      window.addEventListener('load', () => {
        Helper.observer.observe(document, Helper.config);
        console.log('mutation observer attached');
      });
    }
  }
  static getOrCreateObserver() {
    if (!Helper.observer) {
      Helper.createNewObserver();
    } 
    return Helper.observer;
  }
  /**
   * 
   * @param {MutationRecord[]} mutationList 
   */
  static async mutationCallBack(mutationList) {
    if (!window.scenarioName) return;
    async function mutationWork() {
      for (const [index, records] of mutationList.entries()) {
        Helper.changesAfterDispatch = {
          childAddedOrRemoved: 0,
          mutationChanges: undefined,
        };
        if (records.target && records.attributeName && records.target.getAttribute(records.attributeName) === 'injectCodeScript123') {
          //known start point
          console.log('known start point>>>>');
          console.log('STEP 1: dispatching first event');
          await Helper.dispatchNextEvent();
          return;
        }
        if (records.type === 'childList') {
          Helper.changesAfterDispatch.childAddedOrRemoved += records.removedNodes.length + records.addedNodes.length;
        } else if (records.type === 'attributes') {
          Helper.changesAfterDispatch.mutationChanges = {
            oldValue: records.oldValue,
            attributeName: records.attributeName,
          };
          if (records.target.getAttribute) {
            Helper.changesAfterDispatch.mutationChanges.newValue = records.target.getAttribute(records.attributeName);
          }
        }
        Helper._completedIndex++;
        console.log('STEP 8: mutation changes observed with Helper.changesAfterDispatch:', JSON.stringify(Helper.changesAfterDispatch));
        //TODO: finish canDispatchable
        if (Helper.canDispatchable()) {
          //TODO: finish dispatchNextEvent
          await Helper.dispatchNextEvent();
        }
      }
    }
    setTimeout(mutationWork, 5);
  }
  static createNewObserver() {
    Helper.observer = new MutationObserver(Helper.mutationCallBack);
  }
  static canDispatchable() {
    if (typeof (Helper.tillNextEvent.mutationChanges) === 'undefined' &&
    typeof (Helper.changesAfterDispatch.mutationChanges) !== 'undefined') {
      Helper.tillNextEvent.mutationChanges = {
        oldValue: undefined,
        attributeName: undefined,
        newValue: undefined,
      };
    }
    if (typeof (Helper.changesAfterDispatch.mutationChanges) === 'undefined' &&
    typeof (Helper.tillNextEvent.mutationChanges) !== 'undefined') {
      Helper.changesAfterDispatch.mutationChanges = {
        oldValue: undefined,
        attributeName: undefined,
        newValue: undefined,
      };
    }
    console.log('STEP 9: triggering can dispatch Helper.changesAfterDispatch:', JSON.stringify(Helper.changesAfterDispatch), 'Helper.tillNextEvent: ', JSON.stringify(Helper.tillNextEvent));
    if (Helper.changesAfterDispatch.childAddedOrRemoved >= Helper.tillNextEvent.childAddedOrRemoved &&
      ((typeof(Helper.changesAfterDispatch.mutationChanges) === 'undefined' && typeof(Helper.tillNextEvent.mutationChanges) === 'undefined') || 
        Helper.changesAfterDispatch.mutationChanges.oldValue === Helper.tillNextEvent.mutationChanges.oldValue &&
        Helper.changesAfterDispatch.mutationChanges.attributeName === Helper.tillNextEvent.mutationChanges.attributeName &&
        Helper.changesAfterDispatch.mutationChanges.newValue === Helper.tillNextEvent.mutationChanges.newValue)) {
      console.log('STEP 10: can dispatch triggered true\n<<<<<<< FINISHED ONE CYCLE next cycle starts from STEP 2');
      return true;
    }
    return false;
  }
  static async getDomChangesTillNextEvent() {
    console.log('splicing index: completedIndex at getDomChnagesTillNextEvent', Helper.completedIndex);
    Helper.eventIds = Helper.eventIds.splice(Helper.completedIndex);
    Helper.completedIndex = 0;
    Helper.tillNextEvent = {
      childAddedOrRemoved: 0,
      mutationChanges: undefined,
    };
    Helper.changesAfterDispatch = {
      childAddedOrRemoved: 0,
      mutationChanges: undefined,
    }
    console.log('STEP 4: in process of getting dom changes till next event based on eventsIds', JSON.stringify(Helper.eventIds));
    for (const [index, id] of Helper.eventIds.entries()) {
      const event = await getEventData(id);
      if (event.eventType === 'mutationChildList') {
        Helper.tillNextEvent.childAddedOrRemoved += event.childAddedOrRemoved;
        Helper.tillNextEvent.mutationChanges = undefined;
      } else if (event.eventType === 'mutationAttributes') {
        Helper.tillNextEvent.childAddedOrRemoved = 0;
        Helper.tillNextEvent.mutationChanges = event.changeInfo;
      } else {
        console.log('STEP 5: returning getDomChangesTillNextEvent lastDispatchDomChanges', JSON.stringify(Helper.tillNextEvent));
        return;
      }
    }
  }
  static async dispatchNextEvent() {
    console.log('splicing index: completedIndex', Helper.completedIndex);
    Helper.eventIds = Helper.eventIds.splice(Helper.completedIndex);
    Helper.completedIndex = 0;
    for (const [index, id] of Helper.eventIds.entries()) {
      //getEventData is using window variable
      const event = await getEventData(id);
      if (!event.eventType.includes('mutation')) {
        console.log('>>>>>>>>>>\nSTEP 2: initiating dispatching event to dom ');
        dispatchEventToDom(event);
        Helper.completedIndex = index + 1;
        Helper._completedIndex += index + 1;
        console.log('STEP 3: getting dom changes till next event');
        await Helper.getDomChangesTillNextEvent();
      }
    }
  }
  static getCompletedIndex() {
    return Helper._completedIndex;
  }
}
var wait = (ms) => new Promise(res => {
  setTimeout(() => {
    res('DONE');
  }, ms);
});

function getScenarioName() {
  let scenarioName = window.scenarioName;
  if (!scenarioName && typeof(scenarioName) === 'string') {
    throw new Error('scenarioName does not exist or malformed');
  }
  return scenarioName;
}

function getEventIds() {
  const scenarioName = getScenarioName();
  const request = {
    query: 'reproduce',
    queryType: 'getEventIds',
    scenarioName
  };
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage(request, (response) => {
      response != 'Failed' ? resolve(response) : reject(response);
    })
  })
}

function trimEventsIds(eventId, resumeAt = window.resumeEventAt) {
  const resumeEventAt = resumeAt || 0;
  return eventId.splice(resumeEventAt);
}

function getEventData(eventId) {
  const request = {
    query: 'reproduce',
    queryType: 'getEventData',
    eventId
  };
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage(request, (response) => {
      response != 'Failed' ? resolve(response) : reject(response);
    })
  })
}

function getSelectorIdentifier(event) {
  if (!event) {
    throw new Error('event is required');
  }
  //TODO: Selector logic has to be improved
  let identifier = '';
  if (event.className) {
    identifier += `.${event.className.split(' ')[0]}`;
  }
  if (event.id) {
    identifier += `#${event.id.split(' ')[0]}`;
  }
  return identifier;
}

function getTag(event) {
  if (!event) {
    throw new Error('event is required');
  }
  const identifier = getSelectorIdentifier(event);
  if (identifier) {
    const tag = document.querySelector(identifier);
    return tag;
  }
  const tag = document.getElementsByTagName(event.tagName);
  if (tag.length > 0) {
    return tag[0];
  }
  console.log('tag can not be found in dom');
}

function dispatchKeyboardEvent(event) {
  if (!event) {
    throw new Error('event is required');
  }
  const tag = getTag(event);
  if (tag && event.keyCode != 13) {
    //TODO: value of tag should only change for input, text area, editable tags
    tag.value += event.key;
    console.log('dispatch successful for', tag);
  } 
  const keyConfig = {
    'keyCode': event.keyCode,
    'shiftKey': false,
    target: tag,
    bubbles: true,
    cancelable: true,
    code: event.code,
  };
  tag.dispatchEvent(new KeyboardEvent('keydown', keyConfig));
  tag.dispatchEvent(new KeyboardEvent('keypress', keyConfig));
  tag.dispatchEvent(new KeyboardEvent('keyup', keyConfig));
}

function dispatchMouseEvent(event) {
  if (!event) {
    throw new Error('event is required');
  }
  const tag = getTag(event);
  //TODO: The logic for '.bg-overlay' should be refactored
  if (tag && tag.id == '.bg-overlay') {
    document.dispatchEvent(new Event('mousemove'));
    return;
  }
  if (tag) {
    tag.click();
    console.log('dispatch successful for', tag);
  }
}

function executeScriptInWindow(event) {
  if (!event) {
    throw new Error('event is required');
  }
  try {
    console.log('posting message to execute script', event);
    window.postMessage({ type: 'code', snippet: event.snippet });
  } catch (error) {
    console.error('positing msg failed with', error);
  }
}

function executeTestCaseInWindow(event) {
  if (!event) {
    throw new Error('event is required');
  }
  try {
    console.log('posting message to evaluate test case', event);
    window.postMessage({
      type: 'testCase',
      snippet: event.snippet,
      name: event.name,
      description: event.description
    });
  } catch (error) {
    console.error('positing msg failed with', error);
  }
}

function dispatchManualStep(event) {
  console.log(`%c ${event.description} ', 'background: #222; color: #bada55`);
}

function dispatchEventToDom(event) {
  setTimeout(() => {
    try {
      console.log('STEP 6: dispatching event', event);
      switch (event.eventType) {
        case 'mouse':
          dispatchMouseEvent(event);
          break;
        case 'keyboard':
          dispatchKeyboardEvent(event);
          break;
        case 'code':
          executeScriptInWindow(event);
          break;
        case 'manualStep':
          dispatchManualStep(event);
          break;
        case 'testCase':
          executeTestCaseInWindow(event);
          break;
      }
      console.log('STEP 7: event dispatch successfully');
    } catch (error) {
      console.error('STEP 6>7: err: dispatching event failed with error', error);
    }
  }, 100);
}

function changeIdOfInjectedScript() {
  const cs = document.getElementById('injectCodeScript');
  cs.setAttribute('id', 'injectCodeScript123');
}

/**
 * @summary Reproduce Events using mutation observer 
 * Steps followed:
 *  1. Instantiate Mutation Observer 
 *  2. Change the id of script tag which trigger an known start point in mutation observer 
 *  3. If id of script tag changes check calculate newChildToBeAdded and mutationChanges
 *  4. Initialize changeInfo object in global scope with newChildToBeAdded = 0 and mutationChanges = undefined 
 *  5. If changeInfo.newChildToBeAdded is less or equal to 0 and mutationChange is changeInfo.mutationChanges dispatch next immediate event
 *  6. Calculate newChildToBeAdded and mutationChanges till next ManualEventRecorded occurs in the array and assign to changeInfo object which is closure object
 *  7. For every new child added subtract that value from newChildToBeAdded and repeat from step 5
 *  
 */
async function reproduceEvents() {
  const eventIds = trimEventsIds(await getEventIds());
  reproduceEvents.completedIndex = 0;
  Helper.initialize(eventIds, reproduceEvents.completedIndex);
  console.log('injected');
  changeIdOfInjectedScript();
}

// async function reproduceEvents() {
//   try {
//     const eventIds = trimEventsIdsBasedOnResumeId(await getEventIds());
//     console.log('event ids are', eventIds);
//     let previousTimeStamp = 0,
//       currentTimeStamp;
//     for (const [index, id] of eventIds.entries()) {
//       const event = await getEventData(id);
//       if (index == 0) {
//         previousTimeStamp = event.timeStamp;
//         dispatchEventToDom(event);
//       } else {
//         currentTimeStamp = event.timeStamp;
//         const waitTime = currentTimeStamp - previousTimeStamp;
//         previousTimeStamp = currentTimeStamp;
//         (event.eventType === 'testCase') ? await wait(1000) : await wait(waitTime);
//         dispatchEventToDom(event);
//       }
//       reproduceEvents.completedIndex = index;
//     }
//   } catch (error) {
//     console.error('play failed', error);
//   }
// }

function executeScript(event) {
  try {
    console.log('starting to execute script', event);
    eval(event.data.snippet);
  } catch (error) {
    console.error('dispatching script failed', event);
  }
}

function evaluateTestCase(event) {
  try {
    console.log('starting to evaluate test case', event);
    const { name, description, snippet } = event.data;
    const result = eval(snippet);
    console.log(`%c${name} `, `color: ${result ? 'green' : 'red'}; font-size: large`);
    if (!result) {
      console.log(`%${description}`, 'font-style: italic; ');
    }
  } catch (error) {
    console.error('testing test case failed with reproducing ', error);
  }
}

function messageListener(event) {
  switch (event.data.type) {
    case 'code':
      executeScript(event);
      break;
    case 'testCase':
      evaluateTestCase(event);
      break;
  }
}
var codeScript = document.createElement("script");
codeScript.innerHTML = `
window.evaluateTestCase = ${evaluateTestCase};
window.executeScript = ${executeScript};
window.addEventListener('message', ${messageListener});`;
codeScript.setAttribute('id', 'injectCodeScript');


document.head.appendChild(codeScript);
window.addEventListener('unload', () => { chrome.runtime.sendMessage({ query: 'unload', queryType: 'reproduce', resumeEventAt: Helper.getCompletedIndex() || 0 }) });

reproduceEvents();

{ finished: true }
