// Test extension background script
console.log('Sigma Test Extension: Background script loaded');

// Test chrome.tabs API
chrome.tabs.onActivated.addListener(function(activeInfo) {
  console.log('Tab activated:', activeInfo.tabId);
});

// Test chrome.browserAction API
chrome.browserAction.onClicked.addListener(function(tab) {
  console.log('Browser action clicked on tab:', tab.id);
  
  // Set badge text
  chrome.browserAction.setBadgeText({
    text: '!',
    tabId: tab.id
  });
  
  // Set badge color
  chrome.browserAction.setBadgeBackgroundColor({
    color: '#FF0000',
    tabId: tab.id
  });
});

// Test chrome.storage API
chrome.storage.local.set({
  'testKey': 'Hello from Sigma Test Extension!'
}, function() {
  console.log('Data saved to storage');
});

chrome.storage.local.get(['testKey'], function(result) {
  console.log('Data retrieved from storage:', result.testKey);
});
