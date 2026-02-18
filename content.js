// Content script: runs on every page to expose helpers and highlight date/syllabus structure
// The actual extraction runs in the popup via executeScript (getSyllabusForDate) so it sees the latest DOM.

(function () {
  // Optional: add a small indicator when on a page that might have syllabus
  const hasLikelySyllabus = () => {
    const body = document.body && document.body.innerText || '';
    const lower = body.toLowerCase();
    return (
      lower.includes('syllabus') ||
      lower.includes('schedule') ||
      lower.includes('class') && lower.includes('date')
    );
  };

  if (hasLikelySyllabus()) {
    console.log('[Syllabus to Excel] This page may contain syllabus data. Use the extension popup to select a date and export.');
  }
})();
