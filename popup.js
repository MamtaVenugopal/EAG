(function () {
  const exportBtn = document.getElementById('export-btn');
  const debugBtn = document.getElementById('debug-btn');
  const statusEl = document.getElementById('status');
  const logEl = document.getElementById('log-area');
  const logSection = document.getElementById('log-section');
  const copyLogBtn = document.getElementById('copy-log-btn');

  function setStatus(msg, type = '') {
    statusEl.textContent = msg;
    statusEl.className = type ? 'status ' + type : '';
  }

  function appendLog(text, isError) {
    if (!logEl) return;
    const line = document.createElement('div');
    line.className = isError ? 'log-line error' : 'log-line';
    line.textContent = new Date().toLocaleTimeString() + ' – ' + text;
    logEl.appendChild(line);
    logSection.classList.remove('hidden');
    logEl.scrollTop = logEl.scrollHeight;
  }

  function setLogContent(text) {
    if (!logEl) return;
    logEl.innerHTML = '';
    const pre = document.createElement('pre');
    pre.className = 'log-pre';
    pre.textContent = text;
    logEl.appendChild(pre);
    logSection.classList.remove('hidden');
    logEl.scrollTop = 0;
  }

  exportBtn.addEventListener('click', async () => {
    setStatus('Reading page...');
    exportBtn.disabled = true;
    appendLog('Export started – scraping all syllabus by date.');

    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tab?.id) {
        setStatus('No active tab found.', 'error');
        appendLog('No active tab.', true);
        return;
      }
      if (tab.url.startsWith('chrome://') || tab.url.startsWith('chrome-extension://')) {
        setStatus('Open the schedule webpage first, then click the extension.', 'error');
        appendLog('Invalid tab (Chrome internal page).', true);
        return;
      }

      const results = await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: getAllSyllabusByDate,
        args: []
      });

      const payload = results?.[0]?.result;
      if (!payload) {
        setStatus('Could not read page. Try refreshing and run again.', 'error');
        appendLog('executeScript returned no result. Page may block injection.', true);
        return;
      }

      const { byDate, debug } = payload;
      if (debug) {
        appendLog('Debug: items scraped=' + (debug.totalItems || 0) + ', dates=' + (debug.datesCount || 0));
      }

      if (!byDate || Object.keys(byDate).length === 0) {
        const msg = 'No syllabus found. Run Debug to see page structure.';
        setStatus(msg, 'error');
        appendLog(msg, true);
        return;
      }

      // Build rows: one row per date; multiple syllabus on same date → same row, multiple columns
      const sortedDates = Object.keys(byDate).sort();
      const maxCols = Math.max(...sortedDates.map(d => byDate[d].length), 1);
      const headerRow = ['Date'].concat(Array.from({ length: maxCols }, (_, i) => 'Syllabus ' + (i + 1)));
      const dataRows = sortedDates.map(date => {
        const items = byDate[date];
        const row = [date].concat(items);
        while (row.length < headerRow.length) row.push('');
        return row;
      });
      const rows = [headerRow].concat(dataRows);

      const csv = rowsToCSV(rows);
      const dateRange = sortedDates.length ? sortedDates[0] + '_to_' + sortedDates[sortedDates.length - 1] : 'schedule';
      downloadCSV(csv, 'syllabus_' + dateRange + '.csv');
      const totalItems = sortedDates.reduce((sum, d) => sum + byDate[d].length, 0);
      setStatus('Exported ' + sortedDates.length + ' date(s), ' + totalItems + ' item(s) to Excel.', 'success');
      appendLog('Exported ' + sortedDates.length + ' dates, ' + totalItems + ' syllabus items.');
    } catch (e) {
      const errMsg = e.message || String(e);
      setStatus('Error: ' + errMsg, 'error');
      appendLog('Error: ' + errMsg, true);
    } finally {
      exportBtn.disabled = false;
    }
  });

  if (debugBtn) {
    debugBtn.addEventListener('click', async () => {
      const selectedDate = new Date().toISOString().slice(0, 10);
      debugBtn.disabled = true;
      setStatus('Running debug...');
      setLogContent('Gathering debug info...');

      try {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (!tab?.id) {
          setLogContent('No active tab.');
          setStatus('No active tab.', 'error');
          return;
        }
        if (tab.url.startsWith('chrome://') || tab.url.startsWith('chrome-extension://')) {
          setLogContent('Open the schedule page (e.g. uplevel.interviewkickstart.com/schedule/) first, then run Debug.');
          setStatus('Open the schedule page first.', 'error');
          return;
        }

        const results = await chrome.scripting.executeScript({
          target: { tabId: tab.id },
          func: getPageDebugInfo,
          args: [selectedDate]
        });

        const logText = results?.[0]?.result;
        if (logText != null) {
          setLogContent(logText);
          setStatus('Debug complete. See log below.');
        } else {
          setLogContent('Debug script returned nothing. Page may not allow scripting.');
          setStatus('Debug failed.', 'error');
        }
      } catch (e) {
        setLogContent('Error: ' + (e.message || e) + '\n\nMake sure you are on the schedule page (e.g. signed in at uplevel.interviewkickstart.com/schedule/).');
        setStatus('Debug error.', 'error');
      } finally {
        debugBtn.disabled = false;
      }
    });
  }

  if (copyLogBtn && logEl) {
    copyLogBtn.addEventListener('click', () => {
      const text = logEl.innerText || logEl.textContent || '';
      if (!text) return;
      navigator.clipboard.writeText(text).then(() => {
        copyLogBtn.textContent = 'Copied!';
        setTimeout(() => { copyLogBtn.textContent = 'Copy log'; }, 2000);
      });
    });
  }

  function rowsToCSV(rows) {
    const escape = (cell) => {
      const s = String(cell ?? '');
      if (/[",\n\r]/.test(s)) return '"' + s.replace(/"/g, '""') + '"';
      return s;
    };
    return rows.map(row => row.map(escape).join(',')).join('\r\n');
  }

  function downloadCSV(csv, filename) {
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }
})();

// ---- Injected functions (run in page context via executeScript) ----
// Scrapes ALL syllabus from the page, groups by date. Multiple items on same date → same row, multiple columns.

function getAllSyllabusByDate() {
  const debug = { url: location.href, title: document.title, totalItems: 0, datesCount: 0 };

  function text(el) {
    if (!el) return '';
    return (el.textContent || '').replace(/\s+/g, ' ').trim();
  }

  function normalizeDateStr(str) {
    if (!str) return '';
    const digits = str.replace(/\D/g, '');
    if (digits.length >= 8) {
      const y = digits.length === 8 ? '20' + digits.slice(4) : digits.slice(0, 4);
      const m = digits.length === 8 ? digits.slice(2, 4) : digits.slice(4, 6);
      const d = digits.length === 8 ? digits.slice(0, 2) : digits.slice(6, 8);
      return y + '-' + m + '-' + d;
    }
    return str;
  }

  function parseIKDate(dateStr) {
    if (!dateStr) return null;
    const match = dateStr.match(/^(Mon|Tue|Wed|Thu|Fri|Sat|Sun)(\d{1,2})(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)$/i);
    if (!match) return null;
    const [, dayName, day, monthName] = match;
    const monthMap = { jan: '01', feb: '02', mar: '03', apr: '04', may: '05', jun: '06', jul: '07', aug: '08', sep: '09', oct: '10', nov: '11', dec: '12' };
    const month = monthMap[monthName.toLowerCase()];
    if (!month) return null;
    const dayNum = String(day).padStart(2, '0');
    const now = new Date();
    const currentYear = now.getFullYear();
    const testDate = new Date(currentYear, parseInt(month) - 1, parseInt(day));
    const daysDiff = (now - testDate) / (1000 * 60 * 60 * 24);
    const year = daysDiff > 90 ? currentYear + 1 : currentYear;
    return year + '-' + month + '-' + dayNum;
  }

  // Collect all items as { date, syllabusText }; we'll group by date and dedupe
  const items = [];
  const seenKeys = new Set();

  function addItem(date, syllabusText) {
    if (!date || !date.match(/^\d{4}-\d{2}-\d{2}$/)) return;
    const key = date + '|' + (syllabusText || '').slice(0, 200);
    if (seenKeys.has(key)) return;
    seenKeys.add(key);
    items.push({ date: date.slice(0, 10), syllabus: (syllabusText || '').trim() });
  }

  // Strategy 1: Tables
  document.querySelectorAll('table tr').forEach(tr => {
    const cells = tr.querySelectorAll('td, th');
    if (cells.length < 2) return;
    const firstText = text(cells[0]);
    const dateNorm = normalizeDateStr(firstText);
    if (dateNorm && dateNorm.length >= 10) {
      const syllabus = [text(cells[1]), cells[2] ? text(cells[2]) : ''].filter(Boolean).join(' – ');
      addItem(dateNorm.slice(0, 10), syllabus);
    }
  });

  // Strategy 2: [data-date]
  document.querySelectorAll('[data-date]').forEach(el => {
    const d = (el.getAttribute('data-date') || '').trim();
    const norm = normalizeDateStr(d);
    if (norm && norm.length >= 10) {
      const sub = text(el.querySelector('[class*="subject"], [class*="class"], [class*="title"]') || el);
      const syl = el.querySelector('[class*="syllabus"], [class*="topic"], [class*="content"]');
      addItem(norm.slice(0, 10), (sub + ' ' + text(syl || el)).trim());
    }
  });

  // Strategy 3: Interview Kickstart .schedule-activity-date-group – one item per ACTIVITY (leaf nodes only)
  // Skip containers that have another .schedule-activity-date-group inside (they would concatenate all children)
  document.querySelectorAll('.schedule-activity-date-group').forEach(el => {
    if (el.querySelector('.schedule-activity-date-group')) return; // container, not a single activity
    const fullText = text(el);
    const dateMatch = fullText.match(/^(Mon|Tue|Wed|Thu|Fri|Sat|Sun)\d{1,2}(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)/i);
    if (dateMatch) {
      const parsedDate = parseIKDate(dateMatch[0]);
      if (parsedDate) {
        const rest = fullText.replace(/^(Mon|Tue|Wed|Thu|Fri|Sat|Sun)\d{1,2}(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s*/i, '').trim();
        addItem(parsedDate, rest);
      }
    }
  });

  // Group by date: { 'YYYY-MM-DD': ['syllabus1', 'syllabus2'], ... }
  const byDate = {};
  items.forEach(({ date, syllabus }) => {
    if (!byDate[date]) byDate[date] = [];
    if (syllabus) byDate[date].push(syllabus);
  });

  debug.totalItems = items.length;
  debug.datesCount = Object.keys(byDate).length;
  return { byDate, debug };
}

function getPageDebugInfo(selectedDate) {
  const selected = selectedDate || new Date().toISOString().slice(0, 10);
  const log = [];
  function t(el) { return (el && (el.textContent || '').replace(/\s+/g, ' ').trim()) || ''; }

  log.push('=== Syllabus to Excel – Page Debug ===');
  log.push('URL: ' + location.href);
  log.push('Title: ' + document.title);
  log.push('Selected date: ' + selected);
  log.push('');

  const tables = document.querySelectorAll('table');
  log.push('Tables: ' + tables.length);
  tables.forEach((tbl, i) => {
    const trs = tbl.querySelectorAll('tr');
    log.push('  Table ' + (i + 1) + ': ' + trs.length + ' rows');
    if (trs.length > 0 && trs.length <= 8) {
      trs.forEach((tr, j) => {
        const cells = tr.querySelectorAll('td, th');
        const cellTexts = Array.from(cells).map(c => t(c).slice(0, 45));
        log.push('    Row ' + j + ': ' + cellTexts.join(' | '));
      });
    }
  });
  log.push('');

  const dataDates = document.querySelectorAll('[data-date]');
  log.push('[data-date] elements: ' + dataDates.length);
  dataDates.forEach((el, i) => {
    if (i < 15) log.push('  ' + (el.getAttribute('data-date') || '') + ' -> ' + t(el).slice(0, 50));
  });
  log.push('');

  const scheduleLike = document.querySelectorAll('[class*="schedule"], [class*="Schedule"], [class*="session"], [class*="date"], [class*="Date"], [class*="week"], [class*="day"]');
  log.push('Elements (schedule/date/session/week/day classes): ' + scheduleLike.length);
  scheduleLike.forEach((el, i) => {
    if (i < 12) log.push('  class="' + (el.className || '').slice(0, 80) + '" -> ' + t(el).slice(0, 55));
  });
  log.push('');

  const ikGroups = document.querySelectorAll('.schedule-activity-date-group');
  log.push('Interview Kickstart .schedule-activity-date-group elements: ' + ikGroups.length);
  ikGroups.forEach((el, i) => {
    if (i < 15) {
      const txt = t(el);
      const dateMatch = txt.match(/^(Mon|Tue|Wed|Thu|Fri|Sat|Sun)\d{1,2}(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)/i);
      log.push('  ' + (dateMatch ? dateMatch[0] : 'no date') + ' -> ' + txt.slice(0, 70));
    }
  });
  log.push('');

  const bodyText = (document.body && document.body.innerText || '').slice(0, 1000);
  log.push('Body contains schedule-like text: ' + /schedule|syllabus|class|date|session|week/i.test(bodyText));
  log.push('Body sample (first 600 chars):');
  log.push(bodyText.slice(0, 600));
  log.push('');
  log.push('=== End debug ===');
  return log.join('\n');
}
