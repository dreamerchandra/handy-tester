chrome.tabs.onUpdated.addListener(function (tabId, changeInfo, tab) {
  console.log('updated from background');
  console.log(tabId, changeInfo, tab);
});

// chrome.tabs.onActivated.addListener((activeInfo) => {
//   chrome.tabs.get(activeInfo.tabId, (tab) => {
//     console.log(tab);
//     chrome.runtime.sendMessage({
//       url: tab.url
//     });
//   });
// });

chrome.runtime.onMessage.addListener(
  function (request, sender, sendResponse) {
    console.log('background');
    if (request.query == 'record') {
      console.log(request);
      chrome.tabs.query({
        active: true
      }, (tab) => {
        console.log('from background ', tab);
        chrome.storage.local.get(['maxClicks'], function (result) {
          console.log('Value currently is ' + result.maxClicks);
          if (result.maxClicks) {
            const res = result["maxClicks"];
            chrome.storage.local.set({
              [res]: {
                id: request.id,
                class: request.class
              }
            }, function (value) {
              console.log('Value is set to ' + value);
              chrome.storage.local.set({
                'maxClicks': result.maxClicks + 1
              }, (res) => {
                console.log('incremented');
              })
            });
          } else {
            chrome.storage.local.set({
              'maxClicks': 0
            }, (res) => {
              chrome.storage.local.set({
                '0': {
                  id: request.id,
                  class: request.class
                }
              }, function (value) {
                console.log('Value is set to ' + value);
                chrome.storage.local.set({
                  'maxClicks': 1
                }, (res) => {
                  console.log('incremented');
                })
              });
            });
          }
        });
        sendResponse({
          url: tab[0].url
        });
      });
    } else if (request.query == 'keyboard-record') {
      console.log(request);
      chrome.storage.local.get(['maxClicks'], function (result) {
        console.log('Value currently is ' + result.maxClicks);
        if (result.maxClicks) {
          const res = result["maxClicks"];
          chrome.storage.local.set({
            [res]: {
              eventType: 'keyboard',
              id: request.id,
              class: request.className,
              tag: request.tag,
              key:request.key
            }
          }, function (value) {
            console.log('Value is set to ' + value);
            chrome.storage.local.set({
              'maxClicks': result.maxClicks + 1
            }, (res) => {
              console.log('incremented');
            })
          });
        } else {
          chrome.storage.local.set({
            'maxClicks': 0
          }, (res) => {
            chrome.storage.local.set({
              '0': {
                eventType: 'keyboard',
                id: request.id,
                class: request.className,
                tag: request.tag,
                key:request.key
              }
            }, function (value) {
              console.log('Value is set to ' + value);
              chrome.storage.local.set({
                'maxClicks': 1
              }, (res) => {
                console.log('incremented');
              })
            });
          });
        }
      });
    } else if (request.query == 'reproduce') {
      console.log('reproducing');
      chrome.storage.local.get(['maxClicks'], (res) => {
        console.log('max click recorded is ' + res.maxClicks);
        var selector = [];
        for (var i = 0; i <= res.maxClicks; i++) {
          chrome.storage.local.get(`${i}`, (response) => {
            var id1 = Object.keys(response)[0]
            let sel = '';
            if (response[id1].class) {
              sel += '.' + response[id1].class;
            }
            if (response[id1].id) {
              sel += '#' + response[id1].id;
            }
            console.log(selector);
            selector.push(sel);
            if (Object.keys(response)[0] == res.maxClicks - 1) {
              console.log('sending', selector);
              sendResponse(selector);
            }
          });
        }
      })
    }
    return true;
  }
);