# TSAI EAG – Course & Project

## Course: TSAI EAG

Short description of the **TSAI EAG** course and the capstone project completed as part of it.

---

## Project: Syllabus to Excel (Chrome Extension)

A Chrome extension that helps extract and export **syllabus and schedule** data from a learning portal (e.g. Interview Kickstart schedule page) into **Excel-friendly CSV** and a **downloadable calendar view**.

### What was built

- **Date-range export**: Choose “From” and “To” dates and export only the syllabus in that range.
- **CSV export**: One row per activity; columns are Date (e.g. 15-Jan) and Syllabus. File is tab-separated so it opens correctly in Excel.
- **Calendar view**: After export, a calendar opens in a new tab showing the same data by date. Users can download the calendar as HTML or export the same data as CSV from that page.
- **Activity-level data**: Logic to split combined blocks into one row per activity and to strip percentages/numbers from the syllabus text for cleaner output.

### Tech

- Chrome Extension (Manifest V3), JavaScript, HTML/CSS. Uses Chrome APIs: `scripting`, `storage`, `downloads`, `activeTab`.

---

*Completed as part of the TSAI EAG course.*
