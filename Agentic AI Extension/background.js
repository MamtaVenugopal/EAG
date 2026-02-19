// Background Service Worker for handling downloads
// This is more reliable than downloading from popup context

function doDownload(dataUrl, filename, mimeType, sendResponse) {
  chrome.downloads.download({
    url: dataUrl,
    filename: filename,
    saveAs: true
  }, (downloadId) => {
    if (chrome.runtime.lastError) {
      console.error('[Background] Download error:', chrome.runtime.lastError);
      sendResponse({ success: false, error: chrome.runtime.lastError.message });
    } else {
      console.log('[Background] Download started:', filename, 'ID:', downloadId);
      const onChanged = (delta) => {
        if (delta.id === downloadId && delta.state) {
          if (delta.state.current === 'complete' || delta.state.current === 'interrupted') {
            chrome.downloads.onChanged.removeListener(onChanged);
          }
        }
      };
      chrome.downloads.onChanged.addListener(onChanged);
      sendResponse({ success: true, downloadId });
    }
  });
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'download_file') {
    const { csvContent, filename } = message;
    try {
      const dataUrl = 'data:text/csv;charset=utf-8,' + encodeURIComponent(csvContent);
      doDownload(dataUrl, filename, 'text/csv', sendResponse);
    } catch (error) {
      console.error('[Background] Error:', error);
      sendResponse({ success: false, error: error.message });
    }
    return true;
  }

  return false;
});
