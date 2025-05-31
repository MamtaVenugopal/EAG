// Popup script for Gmail Attachment Manager
// Version with attachment download only (no deletion features)

// Global variables for DOM elements
let startProcessButton;
let toggleAutoModeButton;
let debugButton;
let statusMessage;
let debugInfo;

// Initialize the popup
function initPopup() {
  console.log('Initializing popup');
  
  // Get DOM elements
  startProcessButton = document.getElementById('startProcess');
  toggleAutoModeButton = document.getElementById('toggleAutoMode');
  debugButton = document.getElementById('debugButton');
  statusMessage = document.getElementById('statusMessage');
  debugInfo = document.getElementById('debugInfo');
  
  // Add event listeners
  if (startProcessButton) {
    startProcessButton.addEventListener('click', handleProcessButton);
  }
  
  if (toggleAutoModeButton) {
    toggleAutoModeButton.addEventListener('click', handleToggleButton);
  }
  
  if (debugButton) {
    debugButton.addEventListener('click', handleDebugButton);
  }
  
  // Handle tab switching
  setupTabSwitching();
  
  // Check auto mode state
  checkAutoMode();
  
  // Show initial status
  showStatus('Ready to download attachments', 'success');
}

// Setup tab switching functionality
function setupTabSwitching() {
  const tabs = document.querySelectorAll('.tab');
  
  tabs.forEach(tab => {
    tab.addEventListener('click', handleTabClick);
  });
}

// Handle tab click
function handleTabClick() {
  const targetTab = this.getAttribute('data-tab');
  const tabs = document.querySelectorAll('.tab');
  const tabContents = document.querySelectorAll('.tab-content');
  
  // Remove active class from all tabs and contents
  tabs.forEach(t => t.classList.remove('active'));
  tabContents.forEach(tc => tc.classList.remove('active'));
  
  // Add active class to clicked tab
  this.classList.add('active');
  
  // Show corresponding content
  const targetContent = document.getElementById(targetTab + 'Tab');
  if (targetContent) {
    targetContent.classList.add('active');
  }
}

// Check auto mode state
function checkAutoMode() {
  try {
    chrome.storage.local.get(['autoMode'], handleAutoModeResult);
  } catch (error) {
    console.error('Error checking auto mode:', error);
  }
}

// Handle auto mode result
function handleAutoModeResult(result) {
  const autoMode = result.autoMode || false;
  if (toggleAutoModeButton) {
    toggleAutoModeButton.textContent = autoMode ? 'Disable Auto Mode' : 'Enable Auto Mode';
  }
}

// Handle process button click
function handleProcessButton() {
  try {
    chrome.tabs.query({active: true, currentWindow: true}, handleProcessTabQuery);
  } catch (error) {
    showStatus('Error: ' + error.message, 'error');
  }
}

// Handle process tab query result
function handleProcessTabQuery(tabs) {
  if (!tabs || tabs.length === 0) {
    showStatus('Error: No active tab found', 'error');
    return;
  }
  
  if (!tabs[0].url || !tabs[0].url.includes('mail.google.com')) {
    showStatus('Error: Not a Gmail page', 'error');
    return;
  }
  
  chrome.tabs.sendMessage(tabs[0].id, {action: 'processCurrentEmail'});
  showStatus('Downloading attachments...', 'success');
}

// Handle toggle button click
function handleToggleButton() {
  try {
    chrome.storage.local.get(['autoMode'], handleToggleAutoModeGet);
  } catch (error) {
    showStatus('Error: ' + error.message, 'error');
  }
}

// Handle toggle auto mode get result
function handleToggleAutoModeGet(result) {
  const newAutoMode = !(result.autoMode || false);
  
  chrome.storage.local.set({autoMode: newAutoMode}, createToggleSetHandler(newAutoMode));
}

// Create toggle set handler
function createToggleSetHandler(newAutoMode) {
  return function() {
    handleToggleAutoModeSet(newAutoMode);
  };
}

// Handle toggle auto mode set
function handleToggleAutoModeSet(newAutoMode) {
  toggleAutoModeButton.textContent = newAutoMode ? 'Disable Auto Mode' : 'Enable Auto Mode';
  showStatus(newAutoMode ? 'Auto mode enabled' : 'Auto mode disabled', 'success');
  
  chrome.tabs.query({active: true, currentWindow: true}, createToggleTabQueryHandler(newAutoMode));
}

// Create toggle tab query handler
function createToggleTabQueryHandler(newAutoMode) {
  return function(tabs) {
    handleToggleTabQuery(tabs, newAutoMode);
  };
}

// Handle toggle tab query
function handleToggleTabQuery(tabs, newAutoMode) {
  if (tabs && tabs.length > 0 && tabs[0].url && tabs[0].url.includes('mail.google.com')) {
    chrome.tabs.sendMessage(tabs[0].id, {action: 'setAutoMode', autoMode: newAutoMode});
  }
}

// Handle debug button click
function handleDebugButton() {
  if (debugInfo) {
    debugInfo.style.display = 'block';
    debugInfo.innerHTML = '<strong>Running diagnostics...</strong>';
  }
  
  let debugText = '<strong>Debug Information:</strong><br>';
  
  // Check current tab
  chrome.tabs.query({active: true, currentWindow: true}, createDebugTabQueryHandler(debugText));
}

// Create debug tab query handler
function createDebugTabQueryHandler(debugText) {
  return function(tabs) {
    handleDebugTabQuery(tabs, debugText);
  };
}

// Handle debug tab query
function handleDebugTabQuery(tabs, debugText) {
  if (!tabs || tabs.length === 0) {
    debugText += '❌ No active tab found<br>';
    updateDebugInfo(debugText);
    return;
  }
  
  const currentUrl = tabs[0].url || 'unknown';
  const isGmail = currentUrl.includes('mail.google.com');
  debugText += (isGmail ? '✅' : '❌') + ' Current URL: ' + currentUrl + '<br>';
  updateDebugInfo(debugText);
  
  // Only continue with Gmail-specific checks if on Gmail
  if (isGmail) {
    // Check content script
    chrome.tabs.sendMessage(tabs[0].id, {action: 'ping'});
    
    // Test attachment detection
    chrome.tabs.sendMessage(tabs[0].id, {action: 'testAttachmentDetection'});
    
    // Check for test results after a short delay
    setTimeout(createCheckTestResultsHandler(debugText), 1000);
  } else {
    checkPermissions(debugText);
  }
}

// Create check test results handler
function createCheckTestResultsHandler(debugText) {
  return function() {
    checkTestResults(debugText);
  };
}

// Check test results from background script
function checkTestResults(debugText) {
  chrome.runtime.sendMessage({action: 'getTestResults'}, createTestResultsHandler(debugText));
}

// Create test results handler
function createTestResultsHandler(debugText) {
  return function(results) {
    handleTestResults(results, debugText);
  };
}

// Handle test results
function handleTestResults(results, debugText) {
  if (results && results.ping && (Date.now() - results.ping.timestamp < 5000)) {
    debugText += '✅ Content script is loaded and responding<br>';
    
    if (results.attachmentDetection && (Date.now() - results.attachmentDetection.timestamp < 5000)) {
      if (results.attachmentDetection.success) {
        debugText += '✅ Attachment detection: ' + results.attachmentDetection.message + '<br>';
        
        if (results.attachmentDetection.attachments && results.attachmentDetection.attachments.length) {
          debugText += '📎 Attachments found: ' + results.attachmentDetection.attachments.join(', ') + '<br>';
        }
      } else {
        debugText += '❌ Attachment detection: ' + results.attachmentDetection.message + '<br>';
      }
    } else {
      debugText += '❓ Attachment detection: No recent results<br>';
    }
  } else {
    debugText += '❌ Content script not responding<br>';
  }
  
  updateDebugInfo(debugText);
  checkPermissions(debugText);
}

// Check permissions
function checkPermissions(debugText) {
  debugText += '<strong>Permissions:</strong><br>';
  updateDebugInfo(debugText);
  
  // Storage permission
  chrome.storage.local.get(['autoMode'], createPermissionStorageHandler(debugText));
}

// Create permission storage handler
function createPermissionStorageHandler(debugText) {
  return function(result) {
    handlePermissionStorageResult(result, debugText);
  };
}

// Handle permission storage result
function handlePermissionStorageResult(result, debugText) {
  debugText += '✅ Storage permission: OK (autoMode=' + (result.autoMode ? 'enabled' : 'disabled') + ')<br>';
  updateDebugInfo(debugText);
  
  // Download permission
  chrome.runtime.sendMessage({action: 'testDownload'}, createPermissionDownloadHandler(debugText));
}

// Create permission download handler
function createPermissionDownloadHandler(debugText) {
  return function(response) {
    handlePermissionDownloadResult(response, debugText);
  };
}

// Handle permission download result
function handlePermissionDownloadResult(response, debugText) {
  if (response && response.success) {
    debugText += '✅ Download permission: OK (Test file downloaded)<br>';
  } else {
    debugText += '❌ Download permission: ' + (response?.error || 'Error') + '<br>';
  }
  updateDebugInfo(debugText);
  
  // Check download folder access
  checkDownloadFolder(debugText);
}

// Check download folder access
function checkDownloadFolder(debugText) {
  debugText += '<strong>Download Information:</strong><br>';
  
  // Get recent downloads to check if downloads are working
  chrome.downloads.search({limit: 5, orderBy: ['-startTime']}, createDownloadFolderHandler(debugText));
}

// Create download folder handler
function createDownloadFolderHandler(debugText) {
  return function(downloads) {
    handleDownloadFolderResult(downloads, debugText);
  };
}

// Handle download folder result
function handleDownloadFolderResult(downloads, debugText) {
  if (chrome.runtime.lastError) {
    debugText += '❌ Cannot access downloads: ' + chrome.runtime.lastError.message + '<br>';
  } else {
    debugText += '✅ Downloads API accessible<br>';
    debugText += '📁 Recent downloads: ' + downloads.length + '<br>';
    
    if (downloads.length > 0) {
      const recentDownload = downloads[0];
      debugText += '📄 Last download: ' + recentDownload.filename + '<br>';
      debugText += '📍 Download state: ' + recentDownload.state + '<br>';
    }
  }
  
  // Check manifest permissions
  debugText += '<strong>Manifest Information:</strong><br>';
  debugText += '• Extension version: ' + chrome.runtime.getManifest().version + '<br>';
  debugText += '• Required permissions: ' + JSON.stringify(chrome.runtime.getManifest().permissions) + '<br>';
  debugText += '• Host permissions: ' + JSON.stringify(chrome.runtime.getManifest().host_permissions) + '<br>';
  
  updateDebugInfo(debugText);
}

// Update debug info
function updateDebugInfo(text) {
  if (debugInfo) {
    debugInfo.innerHTML = text;
  }
}

// Show status message
function showStatus(message, type) {
  if (statusMessage) {
    statusMessage.textContent = message;
    statusMessage.className = 'status ' + type;
    statusMessage.style.display = 'block';
    
    setTimeout(hideStatus, 3000);
  }
}

// Hide status message
function hideStatus() {
  if (statusMessage) {
    statusMessage.style.display = 'none';
  }
}

// Initialize the popup when the DOM is loaded
document.addEventListener('DOMContentLoaded', initPopup); 