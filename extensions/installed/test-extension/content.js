// Test extension content script
console.log('Sigma Test Extension: Content script loaded on', window.location.href);

// Test basic functionality
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

function init() {
  // Add a small indicator that the extension is working
  const indicator = document.createElement('div');
  indicator.id = 'sigma-test-extension-indicator';
  indicator.style.cssText = `
    position: fixed;
    top: 10px;
    right: 10px;
    background: #7c3aed;
    color: white;
    padding: 4px 8px;
    border-radius: 4px;
    font-size: 12px;
    font-family: system-ui, sans-serif;
    z-index: 10000;
    pointer-events: none;
  `;
  indicator.textContent = 'Sigma Extension Active';
  
  document.body.appendChild(indicator);
  
  // Remove indicator after 3 seconds
  setTimeout(() => {
    if (indicator.parentNode) {
      indicator.parentNode.removeChild(indicator);
    }
  }, 3000);
}
