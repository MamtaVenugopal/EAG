// Background script for Gmail Attachment Manager

// Storage for test results from content script
let lastTestResults = {};

// Listen for installation
chrome.runtime.onInstalled.addListener(handleInstallation);

// Handle installation
function handleInstallation() {
  console.log('Gmail Attachment Manager installed');
  
  // Initialize default settings
  try {
    chrome.storage.local.set({
      autoMode: false
    }, handleSettingsInitialized);
  } catch (error) {
    console.error('Error during initialization:', error);
  }
}

// Handle settings initialized
function handleSettingsInitialized() {
  if (chrome.runtime.lastError) {
    console.error('Error initializing settings:', chrome.runtime.lastError);
  } else {
    console.log('Settings initialized successfully');
  }
}

// Error handling for unhandled errors
chrome.runtime.onMessage.addListener(handleRuntimeMessage);

// Handle runtime message
function handleRuntimeMessage(request, sender, sendResponse) {
  try {
    console.log('Background received message:', request.action);
    
    switch(request.action) {
      case 'downloadAttachment':
        handleDownloadAttachment(request, sendResponse);
        return true; // Keep message channel open
        
      case 'logError':
        // Log errors from content script or popup
        console.error('Error from', sender.tab ? 'content script' : 'popup', ':', request.error);
        sendResponse({ success: true });
        break;
        
      case 'testDownload':
        handleTestDownload(sendResponse);
        return true; // Keep message channel open
        
      case 'pingResponse':
        // Store ping response for popup to retrieve
        lastTestResults.ping = {
          success: true,
          message: request.message,
          timestamp: Date.now()
        };
        break;
        
      case 'attachmentDetectionResult':
        // Store attachment detection result for popup to retrieve
        lastTestResults.attachmentDetection = {
          success: request.success,
          message: request.message,
          attachments: request.attachments,
          timestamp: Date.now()
        };
        break;
        
      case 'deleteButtonTestResult':
        // Store delete button test result for popup to retrieve
        lastTestResults.deleteButtonTest = {
          success: request.success,
          message: request.message,
          testResults: request.testResults,
          timestamp: Date.now()
        };
        break;
        
      case 'getTestResults':
        // Return the stored test results to popup
        sendResponse(lastTestResults);
        break;
        
      case 'getDeleteTestResults':
        // Return the stored test results to popup (alias for getTestResults)
        sendResponse(lastTestResults);
        break;
    }
  } catch (error) {
    console.error('Error in background script:', error);
    sendResponse({ success: false, error: error.message });
  }
}

// Handle download attachment request
function handleDownloadAttachment(request, sendResponse) {
  // Download the attachment using Chrome's download API
  chrome.downloads.download({
    url: request.url,
    filename: request.filename,
    saveAs: false
  }, createDownloadHandler(sendResponse));
}

// Create download handler
function createDownloadHandler(sendResponse) {
  return function(downloadId) {
    if (chrome.runtime.lastError) {
      console.error('Download failed:', chrome.runtime.lastError);
      sendResponse({ success: false, error: chrome.runtime.lastError.message });
    } else {
      console.log('Download started with ID:', downloadId);
      sendResponse({ success: true, downloadId: downloadId });
    }
  };
}

// Handle test download request
function handleTestDownload(sendResponse) {
  // Test the download permission with a simple test
  try {
    // Create a small test file as a data URL
    const testDataUrl = 'data:text/plain;base64,VGhpcyBpcyBhIHRlc3QgZmlsZSBmb3IgR21haWwgQXR0YWNobWVudCBNYW5hZ2Vy';
    
    // Try to download it to a temporary location
    chrome.downloads.download({
      url: testDataUrl,
      filename: 'test-download-permission.txt',
      saveAs: false
    }, createTestDownloadHandler(sendResponse));
  } catch (error) {
    console.error('Error in test download:', error);
    sendResponse({ success: false, error: error.message });
  }
}

// Create test download handler
function createTestDownloadHandler(sendResponse) {
  return function(downloadId) {
    if (chrome.runtime.lastError) {
      console.error('Test download failed:', chrome.runtime.lastError);
      sendResponse({ success: false, error: chrome.runtime.lastError.message });
    } else {
      console.log('Test download started with ID:', downloadId);
      
      // Try to clean up the test file after a short delay
      setTimeout(createCleanupTimeout(downloadId), 1000);
      
      sendResponse({ success: true, downloadId: downloadId });
    }
  };
}

// Create cleanup timeout
function createCleanupTimeout(downloadId) {
  return function() {
    cleanupTestDownload(downloadId);
  };
}

// Cleanup test download
function cleanupTestDownload(downloadId) {
  chrome.downloads.erase({ id: downloadId }, handleTestDownloadCleanup);
}

// Handle test download cleanup
function handleTestDownloadCleanup() {
  console.log('Test download erased');
} 