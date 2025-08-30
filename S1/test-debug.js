// Gmail Attachment Manager Debug Script
// Run this in the browser console on a Gmail page with attachments

console.log('=== GMAIL ATTACHMENT DEBUG SCRIPT ===');

// Check if we're on Gmail
if (!window.location.href.includes('mail.google.com')) {
  console.error('This script should be run on a Gmail page');
} else {
  console.log('✅ Running on Gmail');
}

// Check for various Gmail elements
console.log('\n--- Gmail Interface Elements ---');
console.log('Main elements:', document.querySelectorAll('[role="main"]').length);
console.log('List items:', document.querySelectorAll('[role="listitem"]').length);
console.log('Buttons:', document.querySelectorAll('button, [role="button"]').length);

// Check for download-related elements
console.log('\n--- Download Elements ---');
const downloadSelectors = [
  '[data-tooltip="Download"]',
  '[aria-label="Download"]',
  '[data-tooltip*="Download"]',
  '[aria-label*="Download"]'
];

downloadSelectors.forEach(selector => {
  const elements = document.querySelectorAll(selector);
  console.log(`${selector}: ${elements.length} found`);
  if (elements.length > 0) {
    console.log('  Sample element:', elements[0]);
  }
});

// Check for attachment-related classes
console.log('\n--- Attachment Classes ---');
const attachmentClasses = ['.aZo', '.aV3', '.aZm', '.aQH'];
attachmentClasses.forEach(className => {
  const elements = document.querySelectorAll(className);
  console.log(`${className}: ${elements.length} found`);
});

// Check for links
console.log('\n--- Attachment Links ---');
const linkSelectors = [
  'a[href*="attachment"]',
  'a[href*="download"]',
  'a[href*="googleusercontent"]'
];

linkSelectors.forEach(selector => {
  const elements = document.querySelectorAll(selector);
  console.log(`${selector}: ${elements.length} found`);
});

// Look for any elements with "attachment" in their attributes
console.log('\n--- Elements with "attachment" in attributes ---');
const allElements = document.querySelectorAll('*');
let attachmentElements = 0;
for (let el of allElements) {
  for (let attr of el.attributes || []) {
    if (attr.name.includes('attachment') || attr.value.includes('attachment')) {
      attachmentElements++;
      if (attachmentElements <= 3) { // Show first 3 examples
        console.log(`Found: ${el.tagName} with ${attr.name}="${attr.value}"`);
      }
      break;
    }
  }
}
console.log(`Total elements with "attachment" in attributes: ${attachmentElements}`);

console.log('\n=== END DEBUG SCRIPT ===');
console.log('Copy this output and share it for debugging help!'); 