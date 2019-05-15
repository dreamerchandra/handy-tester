export default class ChromeUtils{
  /**
   *  Any values in chrome.tabs.Tab can be given
   * @typedef {chrome.tabs.Tab} TabInfo
   */
  /**
   * @param {TabInfo} info 
   */
  static getActiveTabInfo(info) {
    return new Promise((resolve, reject) => {
      chrome.tabs.query({
        currentWindow: true,
        active: true,
      }, (tabsIds) => {
          console.log('getting active tab id ', tabsIds && tabsIds[0] && tabsIds[0][info]);
          chrome.runtime.lastError ?
            reject(chrome.runtime.lastError) :
            resolve(tabsIds && tabsIds[0] && tabsIds[0][info]);
      })
    })
  }

  static __listener = (tabId, changeInfo, tab) => {
    if (tabId === this.tabIdToListen && this.expectedStatus === changeInfo.status) {
      this.cb(tabId, changeInfo, tab, ...this.cbArg);
    }
  }
  static listenForTabStatusChange = (tabIdToListen, expectedStatus, cb, ...cbArg) => {
    chrome.tabs.onUpdated.addListener(this.__listener);
    this.cb = cb;
    this.cbArg = [...cbArg];
    this.tabIdToListen = tabIdToListen;
    this.expectedStatus = expectedStatus;
  }
  static detachListenerForTabStatusChange = () => {
    chrome.tabs.onUpdated.removeListener(this.__listener);
  }
}