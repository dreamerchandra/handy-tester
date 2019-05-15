export default class StorageUtils{
  static getItem(item) {
    return new Promise((resolve, reject) => {
      chrome.storage.local.get(item, (result) => {
        chrome.runtime.lastError ?
          reject(chrome.runtime.lastError) :
          resolve(result[item]);
      })
    });
  }
  static setItem(object) {
    return new Promise((resolve, reject) => {
      chrome.storage.local.set(object, () => {
        chrome.runtime.lastError ?
          reject(chrome.runtime.lastError) :
          resolve(true);
      });
    });
  }
  static removeItem(item) {
    return new Promise((resolve, reject) => {
      chrome.storage.local.remove(item, () => {
        chrome.runtime.lastError ?
          reject(chrome.runtime.lastError) :
          resolve(true);
      });
    });
  }
}