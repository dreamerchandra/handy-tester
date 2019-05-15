export default class ScriptExecutor {
  static async importFile(fileName) {
    const src = chrome.extension.getURL(`contentScript/${fileName}`);
    const script = await import(src);
    return script;
  }

  static async executeFile(fileName, tabId) {
    const script = await this.importFile(fileName);
    if (!tabId) {
      return new Promise((resolve, reject) => {
        chrome.tabs.executeScript({
          file: `contentScript/${fileName}`
        }, (result) => {
          if (result[0]) {
            return resolve(result);
          }
          return reject(result);
        });
      });
    }
  }

  static executeCode(snippet, tabId) {
    if (!tabId) {
      return new Promise((resolve, reject) => {
        chrome.tabs.executeScript({
          code: snippet
        }, (result) => {
          if (result[0]) {
            return resolve(result);
          }
          return reject(result);
        })
      });
    }
  }
}