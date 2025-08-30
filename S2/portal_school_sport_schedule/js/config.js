// Configuration file for Portola Sports Schedule Extractor
// This file contains the Gemini API key from .env file

const CONFIG = {
  GEMINI_API_KEY: 'AIzaSyCp_pQrbBzNC6LZsaULKmGuiTSTlftYhgs',
  
  // Google Sheets API Configuration - Portola High School Tryout Schedules
  // Sheet URL: https://docs.google.com/spreadsheets/d/1hyFN0VyXwRCrFnw-wLe4NhbXEnIxvh1Jj9D-LVw4te4/edit
  //
  // TO ENABLE GOOGLE SHEETS INTEGRATION:
  // 1. Get API Key: https://console.cloud.google.com/ → APIs & Services → Credentials → Create API Key
  // 2. Replace 'YOUR_ACTUAL_API_KEY_HERE' with your actual Google Sheets API key
  // 3. The sheet ID is already configured for the Portola tryout schedule
  //
  GOOGLE_SHEETS: {
    // Replace this with your actual Google Sheets API key
    API_KEY: 'AIzaSyC3qLiozTh2vVRgrRmzE9klXEVJbAPhKCg',
    
    // Portola High School Tryout Schedule Sheet ID (already configured)
    TRYOUT_SHEET_ID: '1hyFN0VyXwRCrFnw-wLe4NhbXEnIxvh1Jj9D-LVw4te4',
    
    // Range covers all tryout data columns (A to I based on your sheet structure)
    SHEET_RANGE: 'A:I'
  }
};

// Helper function to check if Google Sheets is configured
CONFIG.isGoogleSheetsConfigured = function() {
  return this.GOOGLE_SHEETS && 
         this.GOOGLE_SHEETS.API_KEY && 
         this.GOOGLE_SHEETS.API_KEY !== 'AIzaSyC3qLiozTh2vVRgrRmzE9klXEVJbAPhKCg' &&
         this.GOOGLE_SHEETS.TRYOUT_SHEET_ID;
};

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = CONFIG;
} 