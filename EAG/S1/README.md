# Gmail Attachment Manager

A Chrome extension that automatically downloads Gmail attachments to your local Downloads folder.

## Features

- **Download Attachments**: Download all attachments from the current Gmail email with one click
- **Auto Mode**: Automatically download attachments when you open emails that contain them
- **Original Filenames**: Preserves the original filenames of downloaded attachments
- **Multiple Formats**: Supports all attachment types (images, documents, PDFs, etc.)
- **Debug Tools**: Built-in diagnostics to troubleshoot any issues

## Installation

1. Download or clone this repository
2. Open Chrome and go to `chrome://extensions/`
3. Enable "Developer mode" in the top right
4. Click "Load unpacked" and select the extension folder
5. The extension icon will appear in your Chrome toolbar

## Usage

### Manual Download
1. Open a Gmail email with attachments
2. Click the extension icon in your Chrome toolbar
3. Click "Download Attachments" to download all attachments

### Auto Mode
1. Click the extension icon
2. Click "Enable Auto Mode"
3. Now when you open any Gmail email with attachments, they will be downloaded automatically

### Debug Tools
If the extension isn't working properly:
1. Click the extension icon
2. Go to the "Debug" tab
3. Click "Run Diagnostics" to see detailed information about what's happening

## How It Works

The extension:
1. Detects when you're viewing a Gmail email
2. Scans the email for attachment download buttons
3. Downloads each attachment using Chrome's download API
4. Falls back to clicking download buttons if the API method fails
5. Saves files to your default Downloads folder with original filenames

## Permissions

The extension requires these permissions:
- **activeTab**: To interact with Gmail pages
- **downloads**: To download attachments to your computer
- **storage**: To remember your auto mode preference
- **scripting**: To inject code into Gmail pages
- **tabs**: To detect when you're on Gmail
- **host_permissions**: To access Gmail and Google's file servers

## Troubleshooting

### No Attachments Found
- Make sure you're viewing a Gmail email (not the inbox list)
- Check that the email actually contains attachments
- Try refreshing the Gmail page

### Downloads Not Working
- Check your Chrome download settings
- Make sure downloads aren't blocked by your browser
- Try the debug tools to see detailed error information

### Extension Not Responding
- Reload the extension in `chrome://extensions/`
- Refresh the Gmail page
- Check the browser console for error messages

## Technical Details

- Built for Chrome Extensions Manifest V3
- Uses modern Chrome APIs for downloads and scripting
- Supports multiple Gmail interface layouts
- Includes comprehensive error handling and fallback methods

## Version History

- **v1.1**: Simplified to attachment download only
- **v1.0**: Initial release with download and deletion features

## Support

If you encounter any issues:
1. Try the built-in debug tools first
2. Check the browser console for error messages
3. Make sure you're using the latest version of Chrome
4. Verify the extension has all required permissions 