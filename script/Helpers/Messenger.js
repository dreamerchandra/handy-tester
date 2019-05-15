export default class Messenger{
  static sendRunTimeMessage(obj) {
    return new Promise((resolve, reject) => {
      chrome.runtime.sendMessage(obj, (response) => {
        chrome.runtime.lastError || response == 'Failed' ?
          reject(chrome.runtime.lastError || response != 'Failed') :
          resolve(response);
      })
    })
  }
}