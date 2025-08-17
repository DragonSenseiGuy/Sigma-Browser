// Test extension popup script
document.addEventListener('DOMContentLoaded', function() {
  const output = document.getElementById('output');
  
  function log(message) {
    output.textContent = message;
    console.log('Popup:', message);
  }
  
  // Test Tabs API
  document.getElementById('test-tabs').addEventListener('click', function() {
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
      if (tabs.length > 0) {
        log(`Active tab: ${tabs[0].title}`);
      } else {
        log('No active tab found');
      }
    });
  });
  
  // Test Storage API
  document.getElementById('test-storage').addEventListener('click', function() {
    const testData = {
      timestamp: Date.now(),
      message: 'Hello from popup!'
    };
    
    chrome.storage.local.set(testData, function() {
      log('Data saved to storage');
      
      // Read it back
      chrome.storage.local.get(['timestamp', 'message'], function(result) {
        log(`Retrieved: ${result.message} at ${new Date(result.timestamp).toLocaleTimeString()}`);
      });
    });
  });
  
  log('Popup loaded successfully');
});
