// Global variables
let autoMode = false;
let processingEmail = false;
let autoCheckInterval = null;

// Initialize extension
function init() {
  console.log('Gmail Attachment Manager initialized');
  
  // Check if auto mode is enabled
  chrome.storage.local.get(['autoMode'], handleInitAutoModeResult);
  
  // Set up message listener
  setupMessageListener();

  // Log that we're ready
  console.log('Gmail Attachment Manager ready, auto mode:', autoMode);
}

// Handle init auto mode result
function handleInitAutoModeResult(result) {
  autoMode = result.autoMode || false;
  console.log('Auto mode:', autoMode);
  
  if (autoMode) {
    setupEmailObserver();
  }
}

// Set up message listener
function setupMessageListener() {
  // Listen for messages from popup or background script
  chrome.runtime.onMessage.addListener(handleRuntimeMessage);
}

// Handle runtime message
function handleRuntimeMessage(request, sender, sendResponse) {
  console.log('Message received:', request);
  
  // Always immediately send a basic acknowledgment response
  sendResponse({received: true});
  
  // Handle different message types
  switch(request.action) {
    case 'processCurrentEmail':
      handleProcessRequest(sendResponse);
      break;
    
    case 'setAutoMode':
      handleSetAutoMode(request.autoMode);
      break;
    
    case 'ping':
      handlePing(sendResponse);
      break;
    
    case 'testAttachmentDetection':
      handleTestAttachmentDetection(sendResponse);
      break;
    
    default:
      console.log('Unknown action:', request.action);
      break;
  }
  
  // We've already sent an immediate response, so return false
  return false;
}

// Handle process request
function handleProcessRequest(sendResponse) {
  if (processingEmail) {
    console.log('Already processing an email, skipping');
    if (typeof sendResponse === 'function') {
      sendResponse({success: false, message: 'Already processing an email'});
    }
    return;
  }
  
  processingEmail = true;
  console.log('Starting to process email');
  
  try {
    // Find attachments in the current email
    const attachments = findAttachments();
    console.log('Found attachments:', attachments.map(a => a.filename));
    
    if (attachments.length === 0) {
      console.log('No attachments found, stopping process');
      processingEmail = false;
      if (typeof sendResponse === 'function') {
        sendResponse({success: false, message: 'No attachments found'});
      }
      return;
    }
    
    console.log(`Processing ${attachments.length} attachments...`);
    
    // Download all attachments
    downloadAttachments(attachments)
      .then(() => {
        console.log('✅ All attachments downloaded successfully');
        processingEmail = false;
        
        const message = `Successfully downloaded ${attachments.length} attachment(s)`;
        console.log('📊 Final status:', message);
        
        if (typeof sendResponse === 'function') {
          sendResponse({
            success: true, 
            message: message,
            attachmentsProcessed: attachments.length
          });
        }
      })
      .catch(error => {
        console.error('❌ Error downloading attachments:', error);
        console.error('❌ Error stack:', error.stack);
        processingEmail = false;
        if (typeof sendResponse === 'function') {
          sendResponse({
            success: false, 
            message: `Error: ${error.message}. Some attachments may have been downloaded.`
          });
        }
      });
  } catch (error) {
    console.error('Error processing email:', error);
    processingEmail = false;
    if (typeof sendResponse === 'function') {
      sendResponse({success: false, message: error.message});
    }
  }
}

// Handle set auto mode
function handleSetAutoMode(newAutoMode) {
  try {
    autoMode = newAutoMode;
    console.log('Auto mode set to:', autoMode);
    
    if (autoMode) {
      setupEmailObserver();
    } else if (autoCheckInterval) {
      clearInterval(autoCheckInterval);
      autoCheckInterval = null;
    }
  } catch (err) {
    console.error('Error setting auto mode:', err);
  }
}

// Handle ping request
function handlePing(sendResponse) {
  try {
    if (isExtensionContextValid()) {
      safeSendMessage({
        action: 'pingResponse',
        message: 'Content script is active'
      });
    } else {
      console.warn('Cannot send ping response - extension context invalid');
    }
  } catch (err) {
    console.error('Error sending ping response:', err);
  }
}

// Handle test attachment detection
function handleTestAttachmentDetection(sendResponse) {
  try {
    console.log('=== ATTACHMENT DETECTION DEBUG ===');
    
    // Basic page info
    console.log('Page URL:', window.location.href);
    console.log('Page title:', document.title);
    console.log('Gmail interface detected:', window.location.href.includes('mail.google.com'));
    
    // Check for Gmail interface elements
    const mainElements = document.querySelectorAll('[role="main"]');
    const listItems = document.querySelectorAll('[role="listitem"]');
    console.log('Main elements found:', mainElements.length);
    console.log('List items found:', listItems.length);
    
    // Check for download-related elements
    const downloadElements = document.querySelectorAll('[data-tooltip*="Download"], [aria-label*="Download"]');
    console.log('Download elements found:', downloadElements.length);
    
    // Check for attachment-related classes
    const azoElements = document.querySelectorAll('.aZo');
    const av3Elements = document.querySelectorAll('.aV3');
    const azmElements = document.querySelectorAll('.aZm');
    console.log('aZo elements found:', azoElements.length);
    console.log('aV3 elements found:', av3Elements.length);
    console.log('aZm elements found:', azmElements.length);
    
    // Check for any links that might be attachments
    const attachmentLinks = document.querySelectorAll('a[href*="attachment"], a[href*="download"], a[href*="googleusercontent"]');
    console.log('Attachment links found:', attachmentLinks.length);
    
    // Log some sample elements for debugging
    if (downloadElements.length > 0) {
      console.log('Sample download element:', downloadElements[0]);
      console.log('Sample download element HTML:', downloadElements[0].outerHTML);
    }
    
    if (listItems.length > 0) {
      console.log('Sample list item:', listItems[0]);
      console.log('Sample list item HTML:', listItems[0].outerHTML.substring(0, 200) + '...');
    }
    
    // Now run the actual attachment detection
    const attachments = findAttachments();
    console.log('Attachments detected by findAttachments():', attachments);
    
    // Prepare detailed results
    const detailedResults = {
      pageUrl: window.location.href,
      pageTitle: document.title,
      isGmail: window.location.href.includes('mail.google.com'),
      elementCounts: {
        mainElements: mainElements.length,
        listItems: listItems.length,
        downloadElements: downloadElements.length,
        azoElements: azoElements.length,
        av3Elements: av3Elements.length,
        azmElements: azmElements.length,
        attachmentLinks: attachmentLinks.length
      },
      attachmentsFound: attachments.length,
      attachmentDetails: attachments.map(att => ({
        filename: att.filename,
        type: att.type,
        hasDownloadUrl: !!att.downloadUrl,
        elementTag: att.element.tagName,
        elementClasses: att.element.className
      }))
    };
    
    console.log('Detailed results:', detailedResults);
    console.log('=== END ATTACHMENT DETECTION DEBUG ===');
    
    if (attachments.length > 0) {
      if (isExtensionContextValid()) {
        safeSendMessage({
          action: 'attachmentDetectionResult',
          success: true,
          message: `Found ${attachments.length} attachment(s)`,
          attachments: attachments.map(a => a.filename),
          detailedResults: detailedResults
        });
      } else {
        console.warn('Cannot send attachment detection result - extension context invalid');
      }
    } else {
      if (isExtensionContextValid()) {
        safeSendMessage({
          action: 'attachmentDetectionResult',
          success: false,
          message: 'No attachments found in current view',
          detailedResults: detailedResults
        });
      } else {
        console.warn('Cannot send attachment detection result - extension context invalid');
      }
    }
  } catch (err) {
    console.error('Error in attachment detection test:', err);
    chrome.runtime.sendMessage({
      action: 'attachmentDetectionResult',
      success: false,
      message: 'Error testing attachment detection: ' + err.message
    });
  }
}

// Find all attachments in the current email
function findAttachments() {
  console.log('Searching for attachments in current email');
  const attachments = [];
  
  try {
    // Method 1: Standard Gmail attachment layout (2024 version)
    // Look for download buttons with various possible selectors
    const downloadSelectors = [
      'div[data-tooltip="Download"]',
      'div[aria-label="Download"]',
      'span[data-tooltip="Download"]',
      'span[aria-label="Download"]',
      'div[role="button"][data-tooltip*="Download"]',
      'div[role="button"][aria-label*="Download"]'
    ];
    
    downloadSelectors.forEach(selector => {
      const elements = document.querySelectorAll(selector);
      console.log(`Found ${elements.length} elements with selector: ${selector}`);
      
      elements.forEach(element => {
        const attachmentContainer = element.closest('div[role="listitem"]') || 
                                  element.closest('.aZo') || 
                                  element.closest('.aQH') ||
                                  element.closest('[data-attachment-id]');
        
        if (attachmentContainer) {
          // Try multiple methods to get filename
          let filename = '';
          
          // Method 1: Look for filename in various attributes
          const filenameSelectors = [
            'span[data-tooltip]',
            'span[title]',
            '.aV3',
            '.aZm',
            '[data-filename]'
          ];
          
          for (const fnSelector of filenameSelectors) {
            const fnElement = attachmentContainer.querySelector(fnSelector);
            if (fnElement) {
              filename = fnElement.getAttribute('data-tooltip') || 
                        fnElement.getAttribute('title') || 
                        fnElement.textContent?.trim() || '';
              if (filename) break;
            }
          }
          
          // Fallback filename
          if (!filename) {
            filename = 'attachment_' + Date.now();
          }
          
          // Try to get download URL
          let downloadUrl = '';
          const downloadLink = element.closest('a[href]');
          if (downloadLink) {
            downloadUrl = downloadLink.href;
          }
          
          // Avoid duplicates
          const exists = attachments.some(att => att.filename === filename);
          if (!exists) {
            attachments.push({
              element: element,
              filename: filename,
              downloadUrl: downloadUrl,
              type: 'standard'
            });
            console.log(`Added standard attachment: ${filename} (URL: ${downloadUrl ? 'found' : 'not found'})`);
          }
        }
      });
    });
    
    // Method 2: Alternative Gmail attachment layout
    const altSelectors = [
      'div.aZo[download_url]',
      'div.aZo',
      'span.aZo',
      '[data-attachment-id]'
    ];
    
    altSelectors.forEach(selector => {
      const elements = document.querySelectorAll(selector);
      console.log(`Found ${elements.length} alternative elements with selector: ${selector}`);
      
      elements.forEach(element => {
        let filename = '';
        let downloadUrl = '';
        
        // Try to extract from download_url attribute
        const downloadUrlAttr = element.getAttribute('download_url');
        if (downloadUrlAttr && downloadUrlAttr.includes(':')) {
          const parts = downloadUrlAttr.split(':');
          if (parts.length >= 3) {
            filename = parts[1];
            downloadUrl = parts.slice(2).join(':');
          }
        }
        
        // Alternative filename extraction
        if (!filename) {
          const nameElement = element.querySelector('.aV3') || 
                             element.querySelector('[data-tooltip]') ||
                             element.querySelector('[title]');
          if (nameElement) {
            filename = nameElement.textContent?.trim() || 
                      nameElement.getAttribute('data-tooltip') ||
                      nameElement.getAttribute('title') || '';
          }
        }
        
        if (!filename) {
          filename = 'attachment_alt_' + Date.now();
        }
        
        // Avoid duplicates
        const exists = attachments.some(att => att.filename === filename);
        if (!exists) {
          attachments.push({
            element: element,
            filename: filename,
            downloadUrl: downloadUrl,
            type: 'alternative'
          });
          console.log(`Added alternative attachment: ${filename} (URL: ${downloadUrl ? 'found' : 'not found'})`);
        }
      });
    });
    
    // Method 3: Look for any clickable elements that might be attachments
    const attachmentIndicators = [
      'div[role="listitem"]',
      '.aQH',
      '.aZm'
    ];
    
    attachmentIndicators.forEach(selector => {
      const containers = document.querySelectorAll(selector);
      
      containers.forEach(container => {
        // Check if this container has attachment-like content
        const hasDownloadButton = container.querySelector('[data-tooltip*="Download"], [aria-label*="Download"]');
        const hasFileIcon = container.querySelector('.aZo, .aV3, [data-attachment-id]');
        
        if (hasDownloadButton || hasFileIcon) {
          let filename = '';
          
          // Try to extract filename
          const textElements = container.querySelectorAll('span, div');
          for (const textEl of textElements) {
            const text = textEl.textContent?.trim();
            if (text && text.includes('.') && text.length > 3 && text.length < 100) {
              filename = text;
              break;
            }
          }
          
          if (!filename) {
            filename = 'detected_attachment_' + Date.now();
          }
          
          // Use the download button or the container itself
          const clickElement = hasDownloadButton || container;
          
          // Avoid duplicates
          const exists = attachments.some(att => att.filename === filename);
          if (!exists) {
            attachments.push({
              element: clickElement,
              filename: filename,
              downloadUrl: '',
              type: 'detected'
            });
            console.log(`Added detected attachment: ${filename}`);
          }
        }
      });
    });
    
    // Method 4: Look for direct download links
    const downloadLinks = document.querySelectorAll('a[href*="attachment"], a[href*="download"], a[href*="googleusercontent"]');
    console.log(`Found ${downloadLinks.length} potential download links`);
    
    downloadLinks.forEach(link => {
      const href = link.href;
      let filename = link.textContent?.trim() || 
                    link.getAttribute('download') || 
                    link.getAttribute('title') || '';
      
      // Extract filename from URL if not found
      if (!filename && href) {
        const urlParts = href.split('/');
        const lastPart = urlParts[urlParts.length - 1];
        if (lastPart && lastPart.includes('.')) {
          filename = decodeURIComponent(lastPart.split('?')[0]);
        }
      }
      
      if (!filename) {
        filename = 'download_link_' + Date.now();
      }
      
      // Avoid duplicates
      const exists = attachments.some(att => att.downloadUrl === href || att.filename === filename);
      if (!exists && href) {
        attachments.push({
          element: link,
          filename: filename,
          downloadUrl: href,
          type: 'link'
        });
        console.log(`Added download link: ${filename}`);
      }
    });
    
    // Log the total attachments found
    console.log(`Total attachments found: ${attachments.length}`);
    
    // If no attachments found, log some debug info
    if (attachments.length === 0) {
      console.log('No attachments found. Debug info:');
      console.log('- Page URL:', window.location.href);
      console.log('- Gmail interface elements found:', document.querySelectorAll('[role="main"], [role="listitem"]').length);
      console.log('- Any download-related elements:', document.querySelectorAll('[data-tooltip*="Download"], [aria-label*="Download"]').length);
    }
    
  } catch (error) {
    console.error('Error finding attachments:', error);
  }
  
  return attachments;
}

// Download all attachments found in the email
function downloadAttachments(attachments) {
  return new Promise((resolve, reject) => {
    console.log(`Starting download of ${attachments.length} attachments`);
    
    if (attachments.length === 0) {
      resolve();
      return;
    }
    
    const downloadPromises = attachments.map((attachment, index) => {
      return new Promise((resolveDownload, rejectDownload) => {
        try {
          console.log(`Processing attachment "${attachment.filename}" (${index + 1}/${attachments.length})`);
          
          // Check if the element is still in the DOM
          if (!document.contains(attachment.element)) {
            console.warn(`Attachment element for "${attachment.filename}" is no longer in the DOM`);
            // Don't reject, just skip this attachment
            setTimeout(() => resolveDownload(), 100);
            return;
          }
          
          // Strategy 1: If we have a direct download URL, use Chrome's download API
          if (attachment.downloadUrl && attachment.downloadUrl.startsWith('http')) {
            console.log(`Using direct download for "${attachment.filename}"`);
            
            // Check extension context before sending message
            if (!isExtensionContextValid()) {
              console.warn(`Extension context invalid for "${attachment.filename}", using fallback`);
              fallbackDownload(attachment, resolveDownload, rejectDownload, index);
              return;
            }
            
            // Send message to background script to download
            safeSendMessage({
              action: 'downloadAttachment',
              url: attachment.downloadUrl,
              filename: attachment.filename
            }, createDownloadResponseHandler(attachment, resolveDownload, rejectDownload, index));
          } else {
            // Strategy 2: Try to extract download URL by inspecting the element
            console.log(`Attempting to extract download URL for "${attachment.filename}"`);
            
            const extractedUrl = extractDownloadUrl(attachment.element);
            if (extractedUrl && isExtensionContextValid()) {
              console.log(`Extracted URL for "${attachment.filename}": ${extractedUrl}`);
              
              safeSendMessage({
                action: 'downloadAttachment',
                url: extractedUrl,
                filename: attachment.filename
              }, createExtractedUrlResponseHandler(attachment, resolveDownload, rejectDownload, index));
            } else {
              // Strategy 3: Fallback to clicking the download button
              console.log(`Using click fallback for "${attachment.filename}" (context valid: ${isExtensionContextValid()})`);
              fallbackDownload(attachment, resolveDownload, rejectDownload, index);
            }
          }
        } catch (error) {
          console.error(`Error processing attachment "${attachment.filename}":`, error);
          // Don't reject the whole process for one failed attachment
          setTimeout(() => resolveDownload(), 100);
        }
      });
    });
    
    Promise.all(downloadPromises)
      .then(() => {
        console.log(`All ${attachments.length} attachments processed`);
        resolve();
      })
      .catch(error => {
        console.error('Failed to download some attachments:', error);
        // Don't reject completely, some downloads might have succeeded
        resolve();
      });
  });
}

// Create download response handler
function createDownloadResponseHandler(attachment, resolveDownload, rejectDownload, index) {
  return function(response) {
    if (chrome.runtime.lastError) {
      console.error(`Download API error for "${attachment.filename}":`, chrome.runtime.lastError);
      // Fallback to clicking the element
      fallbackDownload(attachment, resolveDownload, rejectDownload, index);
    } else if (response && response.success) {
      console.log(`Download started successfully for "${attachment.filename}"`);
      setTimeout(() => resolveDownload(), 1000);
    } else {
      console.error(`Download failed for "${attachment.filename}":`, response?.error);
      // Fallback to clicking the element
      fallbackDownload(attachment, resolveDownload, rejectDownload, index);
    }
  };
}

// Create extracted URL response handler
function createExtractedUrlResponseHandler(attachment, resolveDownload, rejectDownload, index) {
  return function(response) {
    if (chrome.runtime.lastError || !response || !response.success) {
      console.log(`Extracted URL failed, falling back to click for "${attachment.filename}"`);
      fallbackDownload(attachment, resolveDownload, rejectDownload, index);
    } else {
      console.log(`Download started with extracted URL for "${attachment.filename}"`);
      setTimeout(() => resolveDownload(), 1000);
    }
  };
}

// Extract download URL from element
function extractDownloadUrl(element) {
  try {
    // Method 1: Look for href in parent anchor
    const parentLink = element.closest('a[href]');
    if (parentLink && parentLink.href) {
      return parentLink.href;
    }
    
    // Method 2: Look for data attributes
    const dataUrl = element.getAttribute('data-url') || 
                   element.getAttribute('data-download-url') ||
                   element.getAttribute('data-href');
    if (dataUrl) {
      return dataUrl;
    }
    
    // Method 3: Look in onclick attribute
    const onclick = element.getAttribute('onclick');
    if (onclick) {
      const urlMatch = onclick.match(/https?:\/\/[^\s'"]+/);
      if (urlMatch) {
        return urlMatch[0];
      }
    }
    
    // Method 4: Look for download URL in nearby elements
    const container = element.closest('div[role="listitem"]') || element.parentElement;
    if (container) {
      const allLinks = container.querySelectorAll('a[href]');
      for (const link of allLinks) {
        if (link.href && (link.href.includes('attachment') || link.href.includes('download'))) {
          return link.href;
        }
      }
    }
    
    return null;
  } catch (error) {
    console.error('Error extracting download URL:', error);
    return null;
  }
}

// Fallback download method using element click
function fallbackDownload(attachment, resolveDownload, rejectDownload, index) {
  try {
    console.log(`Clicking download button for "${attachment.filename}"`);
    
    // Ensure the element is visible and clickable
    if (attachment.element.offsetParent === null) {
      console.warn(`Element for "${attachment.filename}" is not visible`);
    }
    
    // Try different click methods
    let clicked = false;
    
    // Method 1: Regular click
    try {
      attachment.element.click();
      clicked = true;
      console.log(`Regular click successful for "${attachment.filename}"`);
    } catch (e) {
      console.log(`Regular click failed for "${attachment.filename}":`, e.message);
    }
    
    // Method 2: Dispatch click event if regular click failed
    if (!clicked) {
      try {
        const clickEvent = new MouseEvent('click', {
          view: window,
          bubbles: true,
          cancelable: true
        });
        attachment.element.dispatchEvent(clickEvent);
        clicked = true;
        console.log(`Dispatched click successful for "${attachment.filename}"`);
      } catch (e) {
        console.log(`Dispatched click failed for "${attachment.filename}":`, e.message);
      }
    }
    
    // Method 3: Try clicking parent elements
    if (!clicked) {
      const clickableParent = attachment.element.closest('a, button, [role="button"]');
      if (clickableParent) {
        try {
          clickableParent.click();
          clicked = true;
          console.log(`Parent click successful for "${attachment.filename}"`);
        } catch (e) {
          console.log(`Parent click failed for "${attachment.filename}":`, e.message);
        }
      }
    }
    
    if (clicked) {
      console.log(`Download initiated for "${attachment.filename}"`);
    } else {
      console.warn(`All click methods failed for "${attachment.filename}"`);
    }
    
    // Use a longer delay for larger indices to allow multiple downloads to happen
    const delay = 2000 + (index * 500); // Base 2 seconds + 0.5 second per index
    setTimeout(() => {
      console.log(`Download assumed complete for "${attachment.filename}" after ${delay}ms`);
      resolveDownload();
    }, delay);
  } catch (error) {
    console.error(`Error in fallback download for "${attachment.filename}":`, error);
    // Don't reject, just resolve to continue with other attachments
    setTimeout(() => resolveDownload(), 100);
  }
}

// Set up an observer to watch for new emails being opened in auto mode
function setupEmailObserver() {
  console.log('Setting up email observer for auto mode');
  
  // Clear any existing interval
  if (autoCheckInterval) {
    clearInterval(autoCheckInterval);
    autoCheckInterval = null;
  }
  
  // First check if there are already attachments visible
  if (autoMode && !processingEmail) {
    const attachments = findAttachments();
    if (attachments.length > 0) {
      console.log('Found attachments on page load, processing immediately');
      handleProcessRequest(null); // No callback needed for auto mode
    }
  }
  
  // We'll use MutationObserver to detect when a new email is opened
  const emailContainer = document.querySelector('div[role="main"]');
  
  if (!emailContainer) {
    console.error('Email container not found for observer');
    // Try looking for it again in a moment, Gmail's interface might be loading
    setTimeout(setupEmailObserver, 2000);
    return;
  }
  
  // Create an observer instance
  const observer = new MutationObserver(handleMutationObserver);
  
  // Configuration for the observer: watch for additions to the DOM tree
  const config = { childList: true, subtree: true, attributes: true, attributeFilter: ['role', 'data-tooltip'] };
  
  // Start observing
  observer.observe(emailContainer, config);
  console.log('Email observer started');
  
  // Set up a repeated check every few seconds as a backup
  // This helps with pages that might not trigger the mutation observer correctly
  autoCheckInterval = setInterval(handleAutoCheckInterval, 5000); // Check every 5 seconds
  
  console.log('Auto check interval started');
}

// Handle mutation observer
function handleMutationObserver(mutations) {
  if (autoMode && !processingEmail) {
    // Check if an email is open with attachments
    const attachments = findAttachments();
    
    if (attachments.length > 0) {
      console.log('Observer detected attachments, processing email');
      // Process the email
      handleProcessRequest(null);
    }
  }
}

// Handle auto check interval
function handleAutoCheckInterval() {
  if (autoMode && !processingEmail) {
    const attachments = findAttachments();
    
    if (attachments.length > 0) {
      console.log('Interval check found attachments, processing email');
      handleProcessRequest(null);
    }
  }
}

// Check if extension context is valid
function isExtensionContextValid() {
  try {
    return chrome.runtime && chrome.runtime.id;
  } catch (error) {
    console.error('Extension context is invalid:', error);
    return false;
  }
}

// Safe chrome runtime message sending
function safeSendMessage(message, callback) {
  if (!isExtensionContextValid()) {
    console.error('Cannot send message - extension context invalidated');
    if (callback) callback({ success: false, error: 'Extension context invalidated' });
    return;
  }
  
  try {
    chrome.runtime.sendMessage(message, callback);
  } catch (error) {
    console.error('Error sending message:', error);
    if (callback) callback({ success: false, error: error.message });
  }
}

// Initialize when the page is fully loaded
window.addEventListener('load', init); 