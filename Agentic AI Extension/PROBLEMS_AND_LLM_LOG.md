# Problems Encountered & LLM Call Log

## Summary

| Metric | Value |
|--------|--------|
| **Estimated LLM (AI) turns** from inception to completion | **~18–22** |
| **Major problems resolved** | **10** |
| **Files created/updated** | 12+ |

---

## Problems Encountered (Chronological)

### 1. **Gemini API 400 – Missing `items` on array parameters**
- **Symptom:** `GenerateContentRequest.tools[0].function_declarations[1].parameters.properties[data].items: missing field`
- **Cause:** Gemini requires an `items` field for any parameter of type `array` in function declarations.
- **Fix:** In `tools.js`, added `items: { type: "object" }` for `filter_data.data` and `export_excel.data`, and `items: { type: "string" }` for `export_excel.columns`.

### 2. **Switch from Gemini to OpenAI**
- **Requirement:** Use OpenAI instead of Gemini.
- **Changes:** Replaced `llm.js` (Gemini client) with OpenAI Chat Completions + function calling; updated `manifest.json` host permissions to `api.openai.com`; updated popup/storage to use `openai_api_key`; documented model as **gpt-4o-mini**.

### 3. **filter_data called without `data`**
- **Symptom:** LLM called `filter_data` with only `condition`, leading to "filter_data requires an array".
- **Cause:** LLM did not pass the `data` array from the previous `api_call` result.
- **Fixes:** (a) Stronger system message and tool descriptions; (b) Agent auto-extraction of `data` from the last tool result when LLM omits it; (c) Clearer formatting of tool results (e.g. "Use the 'data' field in filter_data").

### 4. **Content Security Policy – `unsafe-eval`**
- **Symptom:** "Evaluating a string as JavaScript violates the following Content Security Policy directive: script-src 'self'".
- **Cause:** `filter_data` used `new Function(condition)` to evaluate conditions, which is disallowed under extension CSP.
- **Fix:** Replaced dynamic evaluation with a safe condition parser in `tools.js` (`evaluateCondition()`) that parses patterns like `id > 5`, `status === 'active'` without `eval`/`Function`.

### 5. **Export claimed success but file not downloading**
- **Symptom:** Assistant said file was exported but no file appeared in Downloads.
- **Cause:** Downloads triggered from popup/background (e.g. blob URL or context) were not completing or not showing Save As.
- **Fixes:** (a) Stored export payload in `chrome.storage.local` and added a "Download File" button; (b) Background script to handle `download_file` message; (c) Later switched to anchor-based download from popup.

### 6. **Save As dialog not opening**
- **Symptom:** "Ask where to save each file" was on but no Save As dialog appeared.
- **Cause:** `chrome.downloads.download()` from extension popup/background often does not show the Save As dialog in this context.
- **Fix:** Use anchor-based download: create `<a download href={blob URL}>` and programmatically click it in the popup so the file goes to Chrome’s **default** download folder. User sets default location to e.g. `/Users/satta/Downloads` in `chrome://settings/downloads`.

### 7. **Double file extension (.xlsx.csv)**
- **Symptom:** Exported file was named e.g. `users_filtered.xlsx.csv`.
- **Cause:** Code appended `.csv` whenever the filename did not end with `.csv`; LLM often sent `.xlsx`.
- **Fix:** Normalize filename: strip any extension and always append `.csv` (e.g. `users_filtered.xlsx` → `users_filtered.csv`).

### 8. **Reducing unnecessary API calls**
- **Requirement:** Avoid calling the same API too often.
- **Fix:** Added GET response caching in `tools.js`: cache keyed by URL in `chrome.storage.local` with 5-minute TTL; cached response returned when the same URL is requested within TTL.

### 9. **Testing download without running the agent**
- **Requirement:** Verify that the download path works without running the full agent/API.
- **Fix:** Added "Test CSV" and "Test PDF" buttons that trigger a small file download via the same anchor flow (no LLM, no external API). Later removed per user request.

### 10. **Download folder not matching user expectation**
- **Symptom:** User wanted files in `/Users/satta/Downloads`; dialog did not open to choose folder.
- **Fix:** Documented that files go to Chrome’s default download location and instructed user to set **Location** in `chrome://settings/downloads` to `/Users/satta/Downloads`. Anchor download then saves there.

---

## Estimated LLM (AI) Call Count – Inception to Completion

Approximate number of **back-and-forth turns** (user message + model response) used to design, implement, and fix the extension:

| Phase | Estimated turns |
|--------|------------------|
| Initial design (agentic loop, tools, workspace) | 2–3 |
| Gemini integration + first run | 1–2 |
| Fix Gemini 400 (array items) | 1 |
| Switch to OpenAI (rewrite LLM client, manifest, UI) | 1–2 |
| filter_data missing data (system message, auto-extract, tool descriptions) | 2 |
| CSP unsafe-eval (safe filter parser) | 1 |
| Export/download not working (storage, button, background) | 1–2 |
| Save As not opening (anchor download, default folder) | 1–2 |
| Filename .xlsx.csv fix | 1 |
| API caching + test download buttons | 1 |
| Remove test download + doc/log/APIs | 1 |
| **Total (estimate)** | **~18–22** |

*(Exact count depends on how each conversation was split; this reflects a reasonable estimate from the described workflow.)*

---

## Files Touched (Overview)

- `manifest.json` – permissions, background worker, host permissions
- `popup.html` – API key, query input, download section, test buttons (later removed)
- `popup.js` – submit, clear, download button, test download, anchor download, log
- `tools.js` – TOOLS schema (items), api_call cache, filter_data safe parser, export_excel filename and storage
- `llm.js` – Gemini → OpenAI, system message support
- `agent.js` – system message, auto-extract data for filter/export
- `background.js` – download_file handler (test_download later removed)
- `ARCHITECTURE.md` – high-level design
- `README.md` – usage, block diagram, suggested APIs
- `OPENAI_SETUP.md`, `TROUBLESHOOTING.md`, `DOWNLOAD_TROUBLESHOOTING.md` – setup and debugging
- `PROBLEMS_AND_LLM_LOG.md` – this log
