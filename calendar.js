(function () {
  const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  function shortDate(ymd) {
    if (!ymd || typeof ymd !== 'string') return '';
    const parts = ymd.split('-').map(Number);
    if (parts.length < 3) return '';
    return parts[2] + '-' + (MONTHS[parts[1] - 1] || '');
  }

  function weekday(ymd) {
    if (!ymd || typeof ymd !== 'string') return '';
    const parts = ymd.split('-').map(Number);
    if (parts.length < 3) return '';
    const date = new Date(parts[0], parts[1] - 1, parts[2]);
    return WEEKDAYS[date.getDay()] || '';
  }

  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  const calendarEl = document.getElementById('calendar');
  const rangeLabel = document.getElementById('range-label');
  const emptyEl = document.getElementById('empty');
  const toolbar = document.getElementById('toolbar');
  const downloadBtn = document.getElementById('download-btn');
  const csvBtn = document.getElementById('csv-btn');
  const printBtn = document.getElementById('print-btn');

  let lastCalendarData = null;
  let lastRangeLabel = '';

  function buildStandaloneHtml(data) {
    const { byDate, sortedDates, fromDate, toDate } = data;
    const from = fromDate ? shortDate(fromDate) : shortDate(sortedDates[0]);
    const to = toDate ? shortDate(toDate) : shortDate(sortedDates[sortedDates.length - 1]);
    let cardsHtml = '';
    for (const date of sortedDates) {
      const items = byDate[date] || [];
      const label = shortDate(date);
      const dayName = weekday(date);
      const itemsHtml = items.map(function (item) {
        return '<div style="font-size:13px;padding:8px 0;border-bottom:1px solid #f1f5f9;line-height:1.4;color:#334155">' + escapeHtml((item || '').trim()) + '</div>';
      }).join('');
      cardsHtml +=
        '<div style="background:#fff;border-radius:12px;box-shadow:0 1px 3px rgba(0,0,0,.08);border:1px solid #e2e8f0;min-width:280px;max-width:360px;overflow:hidden">' +
          '<div style="background:#0f766e;color:#fff;padding:12px 16px;font-size:15px;font-weight:600">' +
            '<span style="font-size:11px;font-weight:400;opacity:.9;text-transform:uppercase">' + dayName + '</span><br>' + label +
          '</div>' +
          '<div style="padding:12px 16px">' + itemsHtml + '</div>' +
        '</div>';
    }
    return '<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Syllabus Calendar</title></head><body style="font-family:\'Segoe UI\',system-ui,sans-serif;margin:0;padding:24px;background:#f8fafc;color:#1e293b">' +
      '<h1 style="font-size:22px;margin:0 0 8px 0;color:#0f766e">Syllabus Calendar</h1>' +
      '<p style="font-size:13px;color:#64748b;margin-bottom:24px">From ' + from + ' to ' + to + '</p>' +
      '<div style="display:flex;flex-wrap:wrap;gap:16px">' + cardsHtml + '</div>' +
      '</body></html>';
  }

  function downloadCalendar() {
    if (!lastCalendarData) return;
    const html = buildStandaloneHtml(lastCalendarData);
    const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    if (chrome.downloads && chrome.downloads.download) {
      chrome.downloads.download({ url: url, filename: 'syllabus_calendar.html', saveAs: true }, function () {
        setTimeout(function () { URL.revokeObjectURL(url); }, 2000);
      });
    } else {
      const a = document.createElement('a');
      a.href = url;
      a.download = 'syllabus_calendar.html';
      a.style.display = 'none';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(function () { URL.revokeObjectURL(url); }, 500);
    }
  }

  function escapeCsvCell(s) {
    const t = String(s || '').replace(/\r\n|\r|\n/g, ' ').trim();
    return '"' + t.replace(/"/g, '""') + '"';
  }

  function downloadCSV() {
    if (!lastCalendarData) {
      alert('No calendar data. Use the extension popup on the schedule page: click Syllabus to Excel icon → Export to Excel.');
      return;
    }
    const { byDate, sortedDates } = lastCalendarData;
    const header = escapeCsvCell('Date') + '\t' + escapeCsvCell('Syllabus');
    const rows = [];
    for (const date of sortedDates) {
      const label = shortDate(date);
      for (const syllabus of byDate[date] || []) {
        rows.push(escapeCsvCell(label) + '\t' + escapeCsvCell(syllabus));
      }
    }
    const csv = '\uFEFF' + header + '\r\n' + rows.join('\r\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    if (chrome.downloads && chrome.downloads.download) {
      chrome.downloads.download({ url: url, filename: 'syllabus_calendar.csv', saveAs: true }, function () {
        setTimeout(function () { URL.revokeObjectURL(url); }, 2000);
      });
    } else {
      const a = document.createElement('a');
      a.href = url;
      a.download = 'syllabus_calendar.csv';
      a.style.display = 'none';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(function () { URL.revokeObjectURL(url); }, 500);
    }
  }

  if (downloadBtn) downloadBtn.addEventListener('click', downloadCalendar);
  if (csvBtn) csvBtn.addEventListener('click', downloadCSV);
  if (printBtn) printBtn.addEventListener('click', function () { window.print(); });

  function showEmpty(msg) {
    if (rangeLabel) rangeLabel.textContent = msg || 'No data';
    if (emptyEl) {
      emptyEl.style.display = 'block';
      emptyEl.innerHTML = '<p><strong>No calendar data</strong></p>' +
        '<p>1. Go to the schedule page (e.g. uplevel.interviewkickstart.com/schedule/) and sign in.</p>' +
        '<p>2. Click the <strong>Syllabus to Excel</strong> extension icon in the toolbar.</p>' +
        '<p>3. Choose From/To dates and click <strong>Export to Excel</strong>.</p>' +
        '<p>The calendar will open with data. Use <strong>View calendar</strong> in the popup to open this page again.</p>';
    }
    if (toolbar) toolbar.style.display = 'none';
  }

  try {
    if (typeof chrome === 'undefined' || !chrome.storage || !chrome.storage.local) {
      showEmpty('Extension storage not available.');
    } else {
      chrome.storage.local.get(['syllabusCalendar'], function (result) {
        try {
          const data = result && result.syllabusCalendar;
          if (!data || !data.byDate || !data.sortedDates || !Array.isArray(data.sortedDates) || data.sortedDates.length === 0) {
            showEmpty('No data yet.');
            return;
          }

          lastCalendarData = data;
          const { byDate, sortedDates, fromDate, toDate } = data;
          const from = fromDate ? shortDate(fromDate) : shortDate(sortedDates[0]);
          const to = toDate ? shortDate(toDate) : shortDate(sortedDates[sortedDates.length - 1]);
          if (rangeLabel) rangeLabel.textContent = 'From ' + from + ' to ' + to;

          if (toolbar) toolbar.style.display = 'flex';
          if (emptyEl) emptyEl.style.display = 'none';
          if (calendarEl) calendarEl.innerHTML = '';

          for (let i = 0; i < sortedDates.length; i++) {
            const date = sortedDates[i];
            const items = byDate[date] || [];
            const label = shortDate(date);
            const dayName = weekday(date);

            const card = document.createElement('div');
            card.className = 'day-card';
            card.innerHTML =
              '<div class="day-header">' +
                '<span class="weekday">' + escapeHtml(dayName) + '</span><br>' + escapeHtml(label) +
              '</div>' +
              '<div class="day-items">' +
                items.map(function (item) {
                  return '<div class="item">' + escapeHtml((item || '').trim()) + '</div>';
                }).join('') +
              '</div>';
            if (calendarEl) calendarEl.appendChild(card);
          }
        } catch (err) {
          showEmpty('Error loading data.');
          console.error(err);
        }
      });
    }
  } catch (err) {
    showEmpty('This page must be opened from the extension.');
    console.error(err);
  }
})();
