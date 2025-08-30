// Chrome Extension - Google Sheet Viewer with Gemini AI
class SheetViewerWithGemini {
    constructor() {
        this.currentData = null;
        this.processedJSON = null;
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.loadSavedConfig();
        this.checkPDFLibrary();
    }

    checkPDFLibrary() {
        setTimeout(() => {
            if (typeof window.jspdf !== 'undefined') {
                console.log('jsPDF library loaded successfully');
            } else {
                console.log('jsPDF library not loaded - will use HTML fallback');
            }
        }, 1000);
    }

    setupEventListeners() {
        // Configuration buttons
        document.getElementById('testConnectionBtn').addEventListener('click', () => this.testConnection());
        document.getElementById('extractProcessBtn').addEventListener('click', () => this.extractAndProcess());
        
        // Results buttons
        document.getElementById('copyBtn').addEventListener('click', () => this.copyToClipboard());
        document.getElementById('downloadBtn').addEventListener('click', () => this.downloadJSON());
        document.getElementById('downloadFallBtn').addEventListener('click', () => this.downloadSeasonPDF('Fall'));
        document.getElementById('downloadWinterBtn').addEventListener('click', () => this.downloadSeasonPDF('Winter'));
        document.getElementById('downloadSpringBtn').addEventListener('click', () => this.downloadSeasonPDF('Spring'));
        document.getElementById('clearBtn').addEventListener('click', () => this.clearResults());
        
        // Tab switching
        document.getElementById('jsonTab').addEventListener('click', () => this.switchTab('json'));
        document.getElementById('rawTab').addEventListener('click', () => this.switchTab('raw'));
        
        // Password toggles
        document.getElementById('toggleSheetsKey').addEventListener('click', () => this.togglePassword('sheetsApiKey'));
        document.getElementById('toggleGeminiKey').addEventListener('click', () => this.togglePassword('geminiApiKey'));
        document.getElementById('toggleSheetId').addEventListener('click', () => this.togglePassword('sheetId'));
        
        // Auto-save configuration
        const configInputs = ['sheetsApiKey', 'sheetId', 'sheetRange', 'geminiApiKey', 'prompt'];
        configInputs.forEach(id => {
            document.getElementById(id).addEventListener('input', () => this.saveConfig());
        });
    }

    saveConfig() {
        const config = {
            sheetsApiKey: document.getElementById('sheetsApiKey').value,
            sheetId: document.getElementById('sheetId').value,
            sheetRange: document.getElementById('sheetRange').value,
            geminiApiKey: document.getElementById('geminiApiKey').value,
            prompt: document.getElementById('prompt').value
        };
        chrome.storage.sync.set({ sheetViewerConfig: config });
    }

    loadSavedConfig() {
        chrome.storage.sync.get(['sheetViewerConfig'], (result) => {
            if (result.sheetViewerConfig) {
                const config = result.sheetViewerConfig;
                document.getElementById('sheetsApiKey').value = config.sheetsApiKey || '';
                document.getElementById('sheetId').value = config.sheetId || '';
                document.getElementById('sheetRange').value = config.sheetRange || '';
                document.getElementById('geminiApiKey').value = config.geminiApiKey || '';
                document.getElementById('prompt').value = config.prompt || '';
            }
        });
    }

    getConfig() {
        return {
            sheetsApiKey: document.getElementById('sheetsApiKey').value.trim(),
            sheetId: document.getElementById('sheetId').value.trim(),
            sheetRange: document.getElementById('sheetRange').value.trim(),
            geminiApiKey: document.getElementById('geminiApiKey').value.trim(),
            prompt: document.getElementById('prompt').value.trim()
        };
    }

    async testConnection() {
        const config = this.getConfig();
        if (!this.validateConfig(config)) return;

        this.updateStatus('Testing connections...', 'info');
        this.updateProgress(25);

        try {
            const sheetsTestUrl = 'https://sheets.googleapis.com/v4/spreadsheets/' + config.sheetId + '?key=' + config.sheetsApiKey;
            const sheetsResponse = await fetch(sheetsTestUrl);
            
            if (!sheetsResponse.ok) {
                throw new Error('Google Sheets API test failed: ' + sheetsResponse.status);
            }

            this.updateProgress(50);
            this.updateStatus('Google Sheets connected, testing Gemini...', 'info');

            const geminiTestUrl = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp?key=' + config.geminiApiKey;
            const geminiResponse = await fetch(geminiTestUrl);
            
            if (!geminiResponse.ok) {
                throw new Error('Gemini API test failed: ' + geminiResponse.status);
            }

            this.updateProgress(100);
            this.updateStatus('All connections successful!', 'success');
            this.showToast('Connection test passed!', 'success');

        } catch (error) {
            this.updateStatus('Connection failed: ' + error.message, 'error');
            this.showToast('Connection failed: ' + error.message, 'error');
        }
    }

    async extractAndProcess() {
        const config = this.getConfig();
        if (!this.validateConfig(config)) return;

        this.updateStatus('Extracting data from Google Sheets...', 'info');
        this.updateProgress(20);

        try {
            const sheetsData = await this.extractFromGoogleSheets(config);
            this.updateProgress(40);
            this.updateStatus('Data extracted, processing with Gemini AI...', 'info');

            const processedData = await this.processWithGemini(config, sheetsData);
            this.updateProgress(80);
            this.updateStatus('Processing complete!', 'success');

            this.displayResults(sheetsData, processedData);
            this.updateProgress(100);
            this.showToast('Data processed successfully!', 'success');

        } catch (error) {
            this.updateStatus('Processing failed: ' + error.message, 'error');
            this.showToast('Processing failed: ' + error.message, 'error');
        }
    }

    async extractFromGoogleSheets(config) {
        const url = 'https://sheets.googleapis.com/v4/spreadsheets/' + config.sheetId + '/values/' + config.sheetRange + '?key=' + config.sheetsApiKey;
        const response = await fetch(url);
        
        if (!response.ok) {
            throw new Error('Failed to extract data: ' + response.status);
        }

        const data = await response.json();
        
        if (!data.values || data.values.length === 0) {
            throw new Error('No data found in the specified range');
        }

        return data.values;
    }

    async processWithGemini(config, sheetData) {
        const formattedData = this.formatDataForGemini(sheetData);
        const prompt = config.prompt + '\n\nHere is the Google Sheet data:\n' + formattedData;

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

        const url = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=' + config.geminiApiKey;
        
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(requestBody)
        });

        if (!response.ok) {
            throw new Error('Gemini API error: ' + response.status);
        }

        const result = await response.json();
        
        if (!result.candidates || !result.candidates[0] || !result.candidates[0].content) {
            throw new Error('Invalid response from Gemini API');
        }

        const processedText = result.candidates[0].content.parts[0].text;
        
        try {
            const jsonMatch = processedText.match(/```json\s*([\s\S]*?)\s*```/) || 
                             processedText.match(/```\s*([\s\S]*?)\s*```/) ||
                             [null, processedText];
            
            return JSON.parse(jsonMatch[1] || processedText);
        } catch (parseError) {
            return {
                rawResponse: processedText,
                parseError: parseError.message,
                timestamp: new Date().toISOString()
            };
        }
    }

    formatDataForGemini(sheetData) {
        let formatted = '';
        sheetData.forEach((row, index) => {
            if (index === 0) {
                formatted += 'Headers: ' + row.join(' | ') + '\n';
            } else {
                formatted += 'Row ' + index + ': ' + row.join(' | ') + '\n';
            }
        });
        return formatted;
    }

    displayResults(rawData, processedData) {
        this.displayRawData(rawData);
        this.displayJSONOutput(processedData);
    }

    displayRawData(data) {
        const rawOutputElement = document.getElementById('rawOutput');
        if (data) {
            rawOutputElement.textContent = JSON.stringify(data, null, 2);
        } else {
            rawOutputElement.textContent = 'No raw data available';
        }
    }

    displayJSONOutput(data) {
        const jsonOutputElement = document.getElementById('jsonOutput');
        if (data) {
            this.processedJSON = data;
            jsonOutputElement.textContent = JSON.stringify(data, null, 2);
        } else {
            jsonOutputElement.textContent = 'No data processed yet';
        }
    }

    async copyToClipboard() {
        if (!this.processedJSON) {
            this.showToast('No JSON data to copy', 'error');
            return;
        }

        const jsonText = JSON.stringify(this.processedJSON, null, 2);
        
        try {
            await navigator.clipboard.writeText(jsonText);
            this.showToast('JSON copied to clipboard', 'success');
        } catch (error) {
            const textArea = document.createElement('textarea');
            textArea.value = jsonText;
            document.body.appendChild(textArea);
            textArea.select();
            document.execCommand('copy');
            document.body.removeChild(textArea);
            this.showToast('JSON copied to clipboard', 'success');
        }
    }

    downloadJSON() {
        if (!this.processedJSON) {
            this.showToast('No JSON data to download', 'error');
            return;
        }

        const jsonText = JSON.stringify(this.processedJSON, null, 2);
        const blob = new Blob([jsonText], { type: 'application/json;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        
        const link = document.createElement('a');
        link.setAttribute('href', url);
        link.setAttribute('download', 'processed_data.json');
        link.style.display = 'none';
        
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        URL.revokeObjectURL(url);
        this.showToast('JSON file downloaded successfully', 'success');
    }

    downloadSeasonPDF(season) {
        if (!this.processedJSON) {
            this.showToast('No data to download', 'error');
            return;
        }

        console.log('Full processed JSON:', this.processedJSON);

        try {
            // Check if jsPDF is available
            if (typeof window.jspdf === 'undefined') {
                console.log('jsPDF not available, using HTML fallback');
                this.downloadSeasonHTML(season, seasonData);
                return;
            }

            // Extract season data from processed JSON
            let seasonData = null;
            console.log(`Looking for ${season} data in:`, Object.keys(this.processedJSON));
            
            // Check for both lowercase and capitalized keys
            const seasonKey = season.charAt(0).toUpperCase() + season.slice(1); // "fall" -> "Fall"
            
            if (this.processedJSON[seasonKey]) {
                seasonData = this.processedJSON[seasonKey];
                console.log(`Found ${season} data:`, seasonData);
            } else if (this.processedJSON[season]) {
                seasonData = this.processedJSON[season];
                console.log(`Found ${season} data:`, seasonData);
            }

            if (!seasonData) {
                console.log(`No ${season} sports data found in processed JSON, trying to extract from raw data`);
                seasonData = this.extractSeasonFromRawData(season);
                
                if (!seasonData || seasonData.length === 0) {
                    this.showToast(`No ${season} sports data found`, 'error');
                    return;
                }
            }

            console.log(`Downloading ${season} sports PDF with data:`, seasonData);

            // Create PDF document
            const pdfDoc = this.createPDFContent(season, seasonData);
            
            // Save the PDF
            pdfDoc.save(`${season}_sports_tryouts.pdf`);
            this.showToast(`${season.charAt(0).toUpperCase() + season.slice(1)} sports PDF downloaded successfully`, 'success');

        } catch (error) {
            console.error('PDF download error:', error);
            this.showToast('PDF download failed: ' + error.message, 'error');
        }
    }

    createPDFContent(season, seasonData) {
        console.log('Creating PDF for season:', season, 'with data:', seasonData);
        
        // Check if jsPDF is available
        if (typeof window.jspdf === 'undefined') {
            throw new Error('jsPDF library not loaded');
        }
        
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();
        const seasonTitle = season.charAt(0).toUpperCase() + season.slice(1);
        
        // Set up fonts and styles
        doc.setFontSize(20);
        doc.setTextColor(44, 62, 80);
        doc.text(`${seasonTitle} Sports Tryouts`, 105, 20, { align: 'center' });
        
        doc.setFontSize(16);
        doc.setTextColor(52, 73, 94);
        doc.text('Portola High School Athletics', 105, 35, { align: 'center' });
        
        doc.setFontSize(10);
        doc.setTextColor(127, 140, 141);
        doc.text(`Generated on ${new Date().toLocaleDateString()}`, 105, 45, { align: 'center' });
        
        let yPosition = 60;
        
        // Add each sport's information
        if (Array.isArray(seasonData)) {
            seasonData.forEach((sport, index) => {
                // Check if we need a new page
                if (yPosition > 250) {
                    doc.addPage();
                    yPosition = 20;
                }
                
                // Sport name
                doc.setFontSize(14);
                doc.setTextColor(41, 128, 185);
                doc.text(sport.sport || sport.name || 'Sport', 20, yPosition);
                yPosition += 10;
                
                // Sport details
                doc.setFontSize(10);
                doc.setTextColor(85, 85, 85);
                
                // Log the sport object to see its structure
                console.log('Sport object:', sport);
                
                const details = [
                    `Tryout Date: ${sport.tryout_date || sport.tryoutDate || sport.date || 'TBD'}`,
                    `Tryout Time: ${sport.tryout_time || sport.tryoutTime || sport.time || 'TBD'}`,
                    `Makeup Date: ${sport.makeup_date || sport.makeupDate || sport.makeupsDate || 'TBD'}`,
                    `Makeup Time: ${sport.makeup_time || sport.makeupTime || sport.makeupsTime || 'TBD'}`,
                    `Location: ${sport.location || sport.locationNotes || sport.location_notes || 'TBD'}`,
                    `Coach Email: ${sport.coach_email || sport.coachEmail || sport.email || 'TBD'}`,
                    `Instagram: ${sport.instagram_account || sport.instagramAccount || sport.instagram || 'N/A'}`
                ];
                
                details.forEach(detail => {
                    doc.text(detail, 20, yPosition);
                    yPosition += 6;
                });
                
                yPosition += 10; // Add space between sports
            });
        }
        
        // Add footer
        doc.setFontSize(8);
        doc.setTextColor(119, 119, 119);
        doc.text('This document was automatically generated from Portola High School athletics data.', 105, 280, { align: 'center' });
        doc.text('For the most up-to-date information, please contact the athletic department.', 105, 285, { align: 'center' });
        
        return doc;
    }

    downloadSeasonHTML(season, seasonData) {
        const seasonTitle = season.charAt(0).toUpperCase() + season.slice(1);
        let htmlContent = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>${seasonTitle} Sports Tryouts - Portola High School</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        h1 { color: #2c3e50; text-align: center; border-bottom: 2px solid #3498db; padding-bottom: 10px; }
        h2 { color: #34495e; margin-top: 30px; }
        .sport { margin: 20px 0; padding: 15px; border: 1px solid #ddd; border-radius: 5px; background-color: #f9f9f9; }
        .sport h3 { color: #2980b9; margin-top: 0; }
        .info { margin: 5px 0; }
        .label { font-weight: bold; color: #555; }
        .value { color: #333; }
        .header { text-align: center; margin-bottom: 30px; }
        .footer { text-align: center; margin-top: 30px; font-size: 12px; color: #777; }
    </style>
</head>
<body>
    <div class="header">
        <h1>${seasonTitle} Sports Tryouts</h1>
        <h2>Portola High School Athletics</h2>
        <p>Generated on ${new Date().toLocaleDateString()}</p>
    </div>
`;

        // Add each sport's information
        if (Array.isArray(seasonData)) {
            seasonData.forEach(sport => {
                htmlContent += `
    <div class="sport">
        <h3>${sport.sport || sport.name || 'Sport'}</h3>
        <div class="info"><span class="label">Tryout Date:</span> <span class="value">${sport.tryout_date || sport.tryoutDate || sport.date || 'TBD'}</span></div>
        <div class="info"><span class="label">Tryout Time:</span> <span class="value">${sport.tryout_time || sport.tryoutTime || sport.time || 'TBD'}</span></div>
        <div class="info"><span class="label">Makeup Date:</span> <span class="value">${sport.makeup_date || sport.makeupDate || sport.makeupsDate || 'TBD'}</span></div>
        <div class="info"><span class="label">Makeup Time:</span> <span class="value">${sport.makeup_time || sport.makeupTime || sport.makeupsTime || 'TBD'}</span></div>
        <div class="info"><span class="label">Location:</span> <span class="value">${sport.location || sport.locationNotes || sport.location_notes || 'TBD'}</span></div>
        <div class="info"><span class="label">Coach Email:</span> <span class="value">${sport.coach_email || sport.coachEmail || sport.email || 'TBD'}</span></div>
        <div class="info"><span class="label">Instagram:</span> <span class="value">${sport.instagram_account || sport.instagramAccount || sport.instagram || 'N/A'}</span></div>
    </div>
`;
            });
        }

        htmlContent += `
    <div class="footer">
        <p>This document was automatically generated from Portola High School athletics data.</p>
        <p>For the most up-to-date information, please contact the athletic department.</p>
    </div>
</body>
</html>`;

        // Create and download HTML file
        const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        
        const link = document.createElement('a');
        link.setAttribute('href', url);
        link.setAttribute('download', `${season}_sports_tryouts.html`);
        link.style.display = 'none';
        
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        URL.revokeObjectURL(url);
        this.showToast(`${seasonTitle} sports HTML file downloaded successfully`, 'success');
    }

    extractSeasonFromRawData(season) {
        if (!this.currentData || !Array.isArray(this.currentData)) {
            console.log('No raw data available');
            return null;
        }

        console.log('Extracting season data from raw data:', season);
        console.log('Raw data:', this.currentData);

        const seasonData = [];
        let inSeason = false;
        let currentSport = {};

        for (let i = 0; i < this.currentData.length; i++) {
            const row = this.currentData[i];
            if (!Array.isArray(row) || row.length === 0) continue;

            const firstCell = row[0] ? row[0].toString().toLowerCase() : '';
            
            // Check if this is a season header
            if (firstCell.includes(season.toLowerCase())) {
                inSeason = true;
                console.log(`Found ${season} season at row ${i}`);
                continue;
            }

            // Check if we've moved to the next season
            if (inSeason && (firstCell.includes('winter') || firstCell.includes('spring') || firstCell.includes('fall'))) {
                console.log(`End of ${season} season at row ${i}`);
                break;
            }

            // If we're in the right season and this looks like a sport row
            if (inSeason && firstCell && !firstCell.includes('sport') && !firstCell.includes('tryout')) {
                const sport = {
                    sport: row[0] || 'Unknown Sport',
                    tryoutDate: row[1] || 'TBD',
                    tryoutTime: row[2] || 'TBD',
                    makeupDate: row[3] || 'TBD',
                    makeupTime: row[4] || 'TBD',
                    location: row[5] || 'TBD',
                    coachEmail: row[6] || 'TBD',
                    instagram: row[7] || 'N/A'
                };
                seasonData.push(sport);
                console.log(`Added sport: ${sport.sport}`);
            }
        }

        console.log(`Extracted ${seasonData.length} sports for ${season} season:`, seasonData);
        return seasonData;
    }

    clearResults() {
        this.currentData = null;
        this.processedJSON = null;
        
        document.getElementById('jsonOutput').textContent = 'No data processed yet';
        document.getElementById('rawOutput').textContent = 'No raw data available';
        
        this.updateStatus('Results cleared', 'info');
        this.showToast('Results cleared', 'success');
    }

    validateConfig(config) {
        if (!config.sheetsApiKey) {
            this.showToast('Please enter a Google Sheets API key', 'error');
            return false;
        }
        if (!config.sheetId) {
            this.showToast('Please enter a sheet ID', 'error');
            return false;
        }
        if (!config.sheetRange) {
            this.showToast('Please enter a sheet range', 'error');
            return false;
        }
        if (!config.geminiApiKey) {
            this.showToast('Please enter a Gemini API key', 'error');
            return false;
        }
        if (!config.prompt) {
            this.showToast('Please enter a prompt for Gemini AI', 'error');
            return false;
        }
        return true;
    }

    updateStatus(message, type = 'info') {
        const statusElement = document.getElementById('statusMessage');
        statusElement.textContent = message;
        
        const statusPanel = document.getElementById('statusPanel');
        statusPanel.className = 'status-panel ' + type;
    }

    updateProgress(percentage) {
        const progressFill = document.getElementById('progressFill');
        progressFill.style.width = percentage + '%';
    }

    showToast(message, type = 'info') {
        const toastContainer = document.getElementById('toastContainer');
        if (toastContainer) {
            const toast = document.createElement('div');
            toast.className = 'toast ' + type;
            
            let iconClass = 'fas fa-info-circle';
            if (type === 'success') {
                iconClass = 'fas fa-check-circle';
            } else if (type === 'error') {
                iconClass = 'fas fa-exclamation-circle';
            }
            
            toast.innerHTML = '<i class="' + iconClass + '"></i><span>' + message + '</span>';
            toastContainer.appendChild(toast);
            
            setTimeout(() => {
                if (toast.parentNode) {
                    toast.remove();
                }
            }, 3000);
        }
    }

    togglePassword(inputId) {
        const input = document.getElementById(inputId);
        const toggleBtn = input.nextElementSibling.querySelector('i');
        
        if (input.type === 'password') {
            input.type = 'text';
            toggleBtn.className = 'fas fa-eye-slash';
        } else {
            input.type = 'password';
            toggleBtn.className = 'fas fa-eye';
        }
    }

    switchTab(tabName) {
        document.querySelectorAll('.tab-content').forEach(content => {
            content.classList.remove('active');
        });
        
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        
        document.getElementById(tabName + 'Content').classList.add('active');
        event.target.classList.add('active');
    }
}

// Initialize when popup loads
document.addEventListener('DOMContentLoaded', () => {
    new SheetViewerWithGemini();
});
