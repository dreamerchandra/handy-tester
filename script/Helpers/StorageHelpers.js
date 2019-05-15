import StorageUtils from "../Utils/StorageUtils.js";
import ChromeUtils from "../Utils/ChromeUtils.js";

function getSaveIndexForSaving() {
  const gFV = (val) => val.toString().length == 1 ? `${0}${val}` : `${val}`; // adds leading zeros for single values
  const date = new Date();
  //saveIndex Format: hhmmss(mes)(ms)#6digitnumber 
  let saveIndex = `${gFV(date.getHours())}${gFV(date.getMinutes())}${gFV(date.getSeconds())}${gFV(date.getMilliseconds())}#`;//hhmmssmes# mes can of 2 or 3 digit
  saveIndex += `${Math.floor(100000 + Math.random() * 900000)}`; //Will always create a number of 6 digits and it ensures the first digit will never be 0
  return saveIndex;
}

async function saveScenarioNameIfNotSaved(scenarioName) {
  try {
    if (scenarioName && saveScenarioNameIfNotSaved.previousScenario != scenarioName) {
      const scenarioNames = new Set(await StorageUtils.getItem('Scenario names') || []);
      scenarioNames.add(scenarioName);
      const isSaved = await StorageUtils.setItem({ 'Scenario names': [...scenarioNames] });
      if (isSaved) {
        console.log('scenario name saved');
        saveScenarioNameIfNotSaved.previousScenario = scenarioName;
      } else {
        console.log('scenario name failed to saved');
      }
    }
  } catch (error) {
    console.log('saveScenarioName failed', error);
  }
}
async function addSaveIndexToScenario(saveIndex, scenarioName) {
  try {
    if (saveIndex && scenarioName) {
      const eventIds = new Set(await StorageUtils.getItem(scenarioName) || []);
      eventIds.add(saveIndex);
      const isSaved = await StorageUtils.setItem({ [scenarioName]: [...eventIds] });
      if (isSaved) {
        console.log('saveIndex successfully appended to scenarios');
      }
      return isSaved;
    } else{
      throw new Error('arguments are required');
    }
  } catch (error) {
    console.error('addSaveIndexToScenario failed', error);
  }
}
async function saveToLocalStorage(data, scenarioName) {
  try {
    if (data && scenarioName) {
      const saveIndex = getSaveIndexForSaving();
      const isSaveIndexSaved = await addSaveIndexToScenario(saveIndex, scenarioName);
      const isDataSaved = await StorageUtils.setItem({ [saveIndex]: data });
      if (isSaveIndexSaved && isDataSaved) {
        console.log(`saved to ${saveIndex}`);
        return saveIndex;
      }
      console.error('failed to save');
    } else {
      throw new Error('arguments are required');
    }
  } catch (error) {
    console.error('saveToLocalStorage failed', error);
  }
}

export async function saveEventToLocalStorage(scenarioName, data) {
  try {
    await saveScenarioNameIfNotSaved(scenarioName);
    const tabId = await ChromeUtils.getActiveTabInfo('id');
    const tabUrl = await ChromeUtils.getActiveTabInfo('url');
    const saveIndex = await saveToLocalStorage({
      ...data,
      timeStamp: new Date().getTime(),
      tabId,
      tabUrl,
    }, scenarioName);
    return saveIndex ? true : false;
  } catch (error) {
    console.error('recording events failed at save state', error);
  }
}