var wait = (ms) => new Promise(res => {
  setTimeout(() => {
    res('DONE');
  }, ms);
})

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

function trimEventsIdsBasedOnResumeId(eventId) {
  const resumeEventAt = window.resumeEventAt || 0;
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
    tag.value += event.key;
    console.log('dispatch successful for', tag);
  } 
  tag.dispatchEvent(new KeyboardEvent('keyup', {
    'keyCode': event.keyCode,
    'shiftKey': false,
    target: tag,
    bubbles: true,
    cancelable: true
  }));
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

function executeScript(event) {
  if (!event) {
    throw new Error('event is required');
  }
  try {
    console.log('starting to execute script', event);
    eval(event.snippet);
  } catch (error) {
    console.error('dispatching script failed', event);
  }
}

function dispatchManualStep(event) {
  console.log(`%c ${event.description} ', 'background: #222; color: #bada55`);
}

function dispatchEventToDom(event) {
  console.log('dispatching event', event);
  switch (event.eventType) {
    case 'mouse':
      dispatchMouseEvent(event);
      break;
    case 'keyboard':
      dispatchKeyboardEvent(event);
      break;
    case 'code':
      executeScript(event);
      break;
    case 'manualStep':
      dispatchManualStep(event);
      break;
  }
}

async function reproduceEvents() {
  try {
    const eventIds = trimEventsIdsBasedOnResumeId(await getEventIds());
    console.log('event ids are', eventIds);
    let previousTimeStamp = 0,
      currentTimeStamp;
    for (const [index, id] of eventIds.entries()) {
      const event = await getEventData(id);
      if (index == 0) {
        previousTimeStamp = event.timeStamp;
        dispatchEventToDom(event);
      } else {
        currentTimeStamp = event.timeStamp;
        const waitTime = currentTimeStamp - previousTimeStamp;
        previousTimeStamp = currentTimeStamp;
        await wait(waitTime);
        dispatchEventToDom(event);
      }
      reproduceEvents.completedIndex = index;
    }
  } catch (error) {
    console.error('play failed', error);
  }
}
reproduceEvents();
window.addEventListener('unload', () => { chrome.runtime.sendMessage({ query: 'unload', queryType: 'reproduce', resumeEventAt: reproduceEvents.completedIndex || 0 }) });
{ finished: true }
