# 📊 Google Sheet Viewer + Gemini AI Chrome Extension

A powerful Chrome extension that extracts data from Google Sheets, processes it with Google Gemini AI, and generates downloadable PDF reports organized by seasons (Fall, Winter, Spring).

## ✨ Features

- **🔗 Google Sheets Integration**: Extract data from any public Google Sheet
- **🤖 AI Processing**: Process data with Google Gemini AI for structured output
- **📄 PDF Generation**: Create professional PDF reports for each season
- **📋 Data Export**: Copy JSON data or download as files
- **🔐 Secure**: API keys are stored locally and can be hidden/shown
- **💾 Auto-Save**: Configuration is automatically saved between sessions

## 🚀 Quick Start

### Prerequisites

1. **Google Sheets API Key**
   - Go to [Google Cloud Console](https://console.cloud.google.com/)
   - Create a new project or select existing one
   - Enable Google Sheets API
   - Create credentials (API Key)
   - Copy the API key

2. **Google Gemini AI API Key**
   - Go to [Google AI Studio](https://makersuite.google.com/app/apikey)
   - Create a new API key
   - Copy the API key

### Installation

1. **Download the Extension**
   ```bash
   git clone <your-repo-url>
   cd google_sheet_viewer
   ```

2. **Load in Chrome**
   - Open Chrome and go to `chrome://extensions/`
   - Enable "Developer mode" (top right toggle)
   - Click "Load unpacked"
   - Select the `google_sheet_viewer` folder

3. **Configure API Keys**
   - Click the extension icon in your browser
   - Enter your Google Sheets API key
   - Enter your Gemini AI API key
   - Configure your sheet ID and range

## 📖 Usage

### Basic Workflow

1. **Configure Settings**
   - Enter your API keys
   - Set your Google Sheet ID
   - Define the data range (e.g., `A1:I25`)
   - Customize the AI prompt if needed

2. **Test Connection**
   - Click "Test Connection" to verify API access
   - Ensure both Google Sheets and Gemini AI are working

3. **Extract & Process**
   - Click "Extract & Process" to fetch and process data
   - View the structured JSON output
   - Check raw data if needed

4. **Generate Reports**
   - Click "Fall Sports PDF", "Winter Sports PDF", or "Spring Sports PDF"
   - Download professional PDF reports
   - Copy JSON data or download as file

### Configuration Options

| Setting | Description | Example |
|---------|-------------|---------|
| **Google Sheets API Key** | Your Google Sheets API key | `AIzaSy...` |
| **Sheet ID** | The ID from your Google Sheet URL | `1hyFN0VyXwRCrFnw-wLe4NhbXEnIxvh1Jj9D-LVw4te4` |
| **Range** | The cell range to extract | `A1:I25` |
| **Gemini API Key** | Your Google Gemini AI API key | `AIzaSy...` |
| **AI Prompt** | Custom prompt for data processing | `Extract sports information...` |

> **🔒 Security Note**: API keys are stored locally in your browser and are never shared or transmitted to external servers except for the respective Google APIs.

## 🏗️ Project Structure

```
google_sheet_viewer/
├── manifest.json          # Extension configuration
├── popup.html            # User interface
├── script.js             # Main application logic
├── background.js         # Service worker
├── styles.css            # Styling
├── jspdf.min.js          # PDF generation library
└── README.md             # This file
```

## 🔧 Technical Details

### API Integration

- **Google Sheets API v4**: Fetches data using the `/values/{range}` endpoint
- **Google Gemini AI**: Processes data with custom prompts
- **jsPDF**: Generates professional PDF reports

### Data Flow

1. **Extraction**: Fetch raw data from Google Sheets
2. **Processing**: Send data to Gemini AI with custom prompt
3. **Structuring**: Parse AI response into organized JSON
4. **Generation**: Create PDF reports for each season
5. **Export**: Provide multiple download options

### Error Handling

- Comprehensive error catching and user feedback
- Graceful fallbacks for PDF generation
- Clear status messages and toast notifications
- Automatic retry mechanisms

## 🎯 Use Cases

### Sports Management
- Extract tryout schedules from Google Sheets
- Generate season-specific reports
- Share information with coaches and athletes

### Data Analysis
- Process structured data with AI
- Create professional reports
- Export data in multiple formats

### Content Management
- Transform raw data into organized formats
- Generate documentation
- Create presentation materials

## 🔒 Security

- **API Keys**: Stored locally in Chrome storage, never hardcoded in source code
- **Data Privacy**: No data is sent to external servers (except Google APIs)
- **Key Visibility**: Keys can be hidden/shown for security
- **Client-Side Processing**: All processing happens locally in your browser
- **No Backend**: No server-side storage or processing of sensitive data

## 🛠️ Development

### Local Development

1. **Clone the repository**
   ```bash
   git clone <your-repo-url>
   cd google_sheet_viewer
   ```

2. **Make changes**
   - Edit files as needed
   - Test in Chrome extension manager

3. **Reload extension**
   - Go to `chrome://extensions/`
   - Click reload button on the extension

### Building for Production

1. **Remove debug features**
   - All debug features have been removed
   - Code is production-ready

2. **Test thoroughly**
   - Test with different sheet formats
   - Verify PDF generation
   - Check error handling

## 📝 API Documentation

### Google Sheets API

```javascript
// Example API call
const url = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${range}?key=${apiKey}`;
const response = await fetch(url);
const data = await response.json();
```

### Gemini AI API

```javascript
// Example API call
const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${apiKey}`;
const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }]
    })
});
```

## 🐛 Troubleshooting

### Common Issues

| Issue | Solution |
|-------|----------|
| **API Key Error** | Verify API keys are correct and have proper permissions |
| **Sheet Access Error** | Ensure the Google Sheet is public or shared properly |
| **PDF Generation Fails** | Check if jsPDF library is loaded, falls back to HTML |
| **No Data Found** | Verify sheet range and data format |
| **Extension Not Loading** | Check manifest.json and reload extension |

### Debug Steps

1. **Check Console**: Open browser console for error messages
2. **Verify APIs**: Test API keys independently
3. **Check Permissions**: Ensure proper Chrome extension permissions
4. **Reload Extension**: Remove and re-add the extension

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📞 Support

For support and questions:
- Create an issue in the GitHub repository
- Check the troubleshooting section
- Review the API documentation

## 🎉 Acknowledgments

- Google Sheets API for data extraction
- Google Gemini AI for intelligent processing
- jsPDF for PDF generation
- Chrome Extension API for browser integration

---

**Made with ❤️ for efficient data processing and reporting**
