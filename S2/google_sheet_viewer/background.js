// Chrome Extension Background Service Worker
console.log('Google Sheet Viewer with Gemini AI: Background script loaded');

// Handle extension installation
chrome.runtime.onInstalled.addListener((details) => {
    console.log('Extension installed:', details.reason);
    
    if (details.reason === 'install') {
        // First time installation
        console.log('First time installation - setting up default configuration');
        
        // Set default configuration (no API keys for security)
        chrome.storage.sync.set({
            sheetViewerConfig: {
                sheetsApiKey: '',
                sheetId: '',
                sheetRange: 'A1:I25',
                geminiApiKey: '',
                prompt: 'Extract all the sports tryout information from this Google Sheet data and return it in a structured JSON format. Organize by seasons (Fall, Winter, Spring) and include sport names, tryout dates, tryout times, makeup dates, makeup times, locations, coach emails, and Instagram accounts. Create a clean, organized structure for each sport.'
            }
        });
    }
});

// Handle messages from popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    console.log('Background received message:', request);
    
    switch (request.action) {
        case 'testConnection':
            testConnection(request.config)
                .then(result => sendResponse({ success: true, data: result }))
                .catch(error => sendResponse({ success: false, error: error.message }));
            return true; // Keep message channel open for async response
            
        case 'extractAndProcess':
            extractAndProcess(request.config)
                .then(result => sendResponse({ success: true, data: result }))
                .catch(error => sendResponse({ success: false, error: error.message }));
            return true; // Keep message channel open for async response
            
        case 'getConfig':
            chrome.storage.sync.get(['sheetViewerConfig'], (result) => {
                sendResponse({ success: true, data: result.sheetViewerConfig });
            });
            return true;
            
        default:
            sendResponse({ success: false, error: 'Unknown action' });
    }
});

// Test connections
async function testConnection(config) {
    try {
        // Test Google Sheets API
        const sheetsTestUrl = `https://sheets.googleapis.com/v4/spreadsheets/${config.sheetId}?key=${config.sheetsApiKey}`;
        const sheetsResponse = await fetch(sheetsTestUrl);
        
        if (!sheetsResponse.ok) {
            throw new Error(`Google Sheets API test failed: ${sheetsResponse.status} - ${sheetsResponse.statusText}`);
        }

        // Test Gemini API
        const geminiTestUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp?key=${config.geminiApiKey}`;
        const geminiResponse = await fetch(geminiTestUrl);
        
        if (!geminiResponse.ok) {
            throw new Error(`Gemini API test failed: ${geminiResponse.status} - ${geminiResponse.statusText}`);
        }

        return {
            sheetsAccessible: true,
            geminiAccessible: true,
            timestamp: new Date().toISOString()
        };
        
    } catch (error) {
        console.error('Connection test failed:', error);
        throw error;
    }
}

// Extract and process data
async function extractAndProcess(config) {
    try {
        // Extract from Google Sheets
        const sheetsData = await extractFromGoogleSheets(config);
        
        // Process with Gemini
        const processedData = await processWithGemini(config, sheetsData);
        
        return {
            rawData: sheetsData,
            processedData: processedData,
            timestamp: new Date().toISOString()
        };
        
    } catch (error) {
        console.error('Extract and process failed:', error);
        throw error;
    }
}

// Extract data from Google Sheets
async function extractFromGoogleSheets(config) {
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${config.sheetId}/values/${config.sheetRange}?key=${config.sheetsApiKey}`;
    
    const response = await fetch(url);
    
    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to extract data: ${response.status} - ${response.statusText}\n${errorText}`);
    }

    const data = await response.json();
    
    if (!data.values || data.values.length === 0) {
        throw new Error('No data found in the specified range');
    }

    return data.values;
}

// Process data with Gemini AI
async function processWithGemini(config, sheetData) {
    // Format the sheet data for Gemini
    const formattedData = formatDataForGemini(sheetData);
    
    const prompt = `${config.prompt}\n\nHere is the Google Sheet data:\n${formattedData}`;

    const requestBody = {
        contents: [{
            parts: [{
                text: prompt
            }]
        }],
        generationConfig: {
            temperature: 0.1,
            topK: 40,
            topP: 0.95,
            maxOutputTokens: 8192,
        }
    };

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${config.geminiApiKey}`;
    
    const response = await fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Gemini API error: ${response.status} - ${response.statusText}\n${errorText}`);
    }

    const result = await response.json();
    
    if (!result.candidates || !result.candidates[0] || !result.candidates[0].content) {
        throw new Error('Invalid response from Gemini API');
    }

    const processedText = result.candidates[0].content.parts[0].text;
    
    // Try to parse as JSON
    try {
        // Extract JSON from the response (in case it's wrapped in markdown)
        const jsonMatch = processedText.match(/```json\s*([\s\S]*?)\s*```/) || 
                         processedText.match(/```\s*([\s\S]*?)\s*```/) ||
                         [null, processedText];
        
        return JSON.parse(jsonMatch[1] || processedText);
    } catch (parseError) {
        // If JSON parsing fails, create a structured object
        return {
            rawResponse: processedText,
            parseError: parseError.message,
            timestamp: new Date().toISOString()
        };
    }
}

// Format data for Gemini
function formatDataForGemini(sheetData) {
    let formatted = '';
    
    sheetData.forEach((row, index) => {
        if (index === 0) {
            formatted += 'Headers: ' + row.join(' | ') + '\n';
        } else {
            formatted += `Row ${index}: ` + row.join(' | ') + '\n';
        }
    });

    return formatted;
}

// Handle extension icon click
chrome.action.onClicked.addListener((tab) => {
    console.log('Extension icon clicked on tab:', tab.id);
});

// Handle tab updates
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (changeInfo.status === 'complete' && tab.url) {
        console.log('Tab updated:', tab.url);
    }
});

// Handle storage changes
chrome.storage.onChanged.addListener((changes, namespace) => {
    console.log('Storage changed:', changes, namespace);
    
    if (namespace === 'sync' && changes.sheetViewerConfig) {
        console.log('Configuration updated:', changes.sheetViewerConfig.newValue);
    }
});

// Handle extension errors
chrome.runtime.onSuspend.addListener(() => {
    console.log('Extension being suspended');
});
