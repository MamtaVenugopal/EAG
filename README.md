# Syllabus to Excel – Chrome Extension

Select a date on any syllabus/schedule webpage and export the classes and syllabus for that date to an Excel-friendly file (CSV).

## How to install

1. Open Chrome and go to `chrome://extensions/`.
2. Turn on **Developer mode** (top right).
3. Click **Load unpacked** and choose the `Chrome_Extension` folder (this folder).
4. The extension icon will appear in the toolbar.

## How to use

1. Open the website that shows classes and syllabus (e.g. [Interview Kickstart schedule](https://uplevel.interviewkickstart.com/schedule/) – **sign in first** so the schedule is visible).
2. Click the extension icon in the toolbar.
3. Click **Export to Excel**.
4. The extension **scrapes all syllabus** from the page and downloads a CSV.
5. **One row per date.** If a date has multiple syllabus items (e.g. two classes on the same day), they appear in the **same row** in multiple columns: **Date** | **Syllabus 1** | **Syllabus 2** | …

Open the CSV in Excel or Google Sheets.

### If nothing is exported

- Click **Debug page** in the popup to see how the page was read (tables, date elements, sample text).
- Copy the log (**Copy log** button) to inspect or share. Ensure you are **signed in** and the schedule is visible.

## What the extension looks for on the page

It tries to find syllabus data in several ways:

- **Tables** – Rows where the first column looks like a date matching your selected date; it uses the next columns as class/subject and syllabus/topics.
- **Sections by date** – Headings or elements that contain the selected date, and the content that follows them.
- **Data attributes** – Elements with `data-date` matching the selected date.

If your site uses a different layout, you can customize the extraction logic (see below).

## Customizing for your website

The extraction logic is in **popup.js**, in the function `getSyllabusForDate`. You can edit it to match your site’s HTML:

- Use your page’s CSS selectors (e.g. `document.querySelectorAll('.schedule-row')`).
- Build the `rows` array so each row is `[date, classOrSubject, syllabusOrTopics]`.
- The first row should be the header: `['Date', 'Class / Subject', 'Syllabus / Topics']`.

Example for a custom table:

```javascript
// Example: table with class .my-schedule, columns Date | Subject | Topics
const customRows = [];
document.querySelectorAll('.my-schedule tbody tr').forEach(tr => {
  const cells = tr.querySelectorAll('td');
  if (cells.length >= 3 && normalizeDateStr(text(cells[0])).slice(0, 10) === selected) {
    customRows.push([selected, text(cells[1]), text(cells[2])]);
  }
});
rows.push(...customRows);
```

## File format

The export is **CSV** (UTF-8 with BOM) so that:

- Excel opens it with the correct encoding.
- You get columns: **Date**, **Class / Subject**, **Syllabus / Topics**.

You can open the CSV in Excel, Google Sheets, or any spreadsheet app.

## Permissions

- **activeTab** – To run only on the current tab when you click the extension.
- **scripting** – To run the extraction script on the page and read the syllabus content.

No data is sent to any server; everything runs locally in your browser.
