// Popup UI Logic

let agent = null;
let llmClient = null;

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  const apiKeyInput = document.getElementById('api-key');
  const userInput = document.getElementById('user-input');
  const submitBtn = document.getElementById('submit-btn');
  const statusDiv = document.getElementById('status');
  const logArea = document.getElementById('log-area');
  const clearBtn = document.getElementById('clear-btn');
  const downloadSection = document.getElementById('download-section');
  const downloadBtn = document.getElementById('download-btn');
  const downloadInfo = document.getElementById('download-info');

  // Load saved API key
  chrome.storage.local.get(['openai_api_key'], (result) => {
    if (result.openai_api_key) {
      apiKeyInput.value = result.openai_api_key;
    }
  });

  // Save API key on change
  apiKeyInput.addEventListener('change', () => {
    chrome.storage.local.set({ openai_api_key: apiKeyInput.value });
  });

  // Submit button
  submitBtn.addEventListener('click', async () => {
    const apiKey = apiKeyInput.value.trim();
    const query = userInput.value.trim();

    if (!apiKey) {
      setStatus("Please enter your OpenAI API key", "error");
      return;
    }

    if (!query) {
      setStatus("Please enter a query", "error");
      return;
    }

    // Initialize LLM and agent
    llmClient = new LLMClient(apiKey);
    agent = new AgenticAgent(llmClient, getToolDefinitions());

    // Disable button
    submitBtn.disabled = true;
    setStatus("Processing...", "");

    // Clear previous log
    logArea.innerHTML = "";

    // Add user query to log
    addLogEntry("user", query);

    try {
      // Process query with updates
      const result = await agent.processQuery(query, (update) => {
        handleUpdate(update);
      });

      setStatus("Completed!", "success");
      
      // Add final response
      if (result.response) {
        addLogEntry("assistant", result.response);
      }

      // Show full conversation log
      const fullLog = agent.getConversationLog();
      console.log("Full conversation log:", fullLog);

    } catch (error) {
      console.error("Error:", error);
      setStatus(`Error: ${error.message}`, "error");
      addLogEntry("error", error.message);
    } finally {
      submitBtn.disabled = false;
    }
  });

  // Clear log
  clearBtn.addEventListener('click', () => {
    logArea.innerHTML = "";
    downloadSection.style.display = 'none';
    if (agent) {
      agent.reset();
    }
    // Clear stored export data
    chrome.storage.local.remove(['pendingExport']);
  });

  // Download button – use anchor so file saves to default Downloads folder
  downloadBtn.addEventListener('click', () => {
    downloadBtn.disabled = true;
    downloadBtn.textContent = 'Downloading...';
    
    chrome.storage.local.get(['pendingExport'], (result) => {
      if (!result.pendingExport) {
        downloadBtn.disabled = false;
        downloadBtn.textContent = 'Download File';
        return;
      }
      const { csvContent, filename } = result.pendingExport;
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      triggerAnchorDownload(url, filename);
      setTimeout(() => URL.revokeObjectURL(url), 3000);
      setStatus('Saved to default Downloads folder.', 'success');
      downloadBtn.textContent = '✓ Downloaded';
      downloadBtn.disabled = false;
      setTimeout(() => {
        downloadSection.style.display = 'none';
        chrome.storage.local.remove(['pendingExport']);
      }, 2000);
    });
  });

  // Anchor download: saves to Chrome's default Downloads folder
  function triggerAnchorDownload(url, filename) {
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }

  // Check for pending exports on load
  chrome.storage.local.get(['pendingExport'], (result) => {
    if (result.pendingExport) {
      const { filename, rowCount, columnCount } = result.pendingExport;
      downloadInfo.textContent = `File: ${filename} | ${rowCount} rows, ${columnCount} columns`;
      downloadSection.style.display = 'block';
    }
  });

  function setStatus(message, type = "") {
    statusDiv.textContent = message;
    statusDiv.className = type;
  }

  function addLogEntry(type, content, metadata = {}) {
    const entry = document.createElement('div');
    entry.className = `log-entry ${type}`;
    
    const label = document.createElement('div');
    label.className = 'log-label';
    label.textContent = type.toUpperCase();
    
    const contentDiv = document.createElement('div');
    contentDiv.className = 'log-content';
    
    if (typeof content === 'object') {
      contentDiv.textContent = JSON.stringify(content, null, 2);
    } else {
      contentDiv.textContent = content;
    }
    
    entry.appendChild(label);
    entry.appendChild(contentDiv);
    
    // Add metadata if present
    if (metadata.toolName) {
      const metaDiv = document.createElement('div');
      metaDiv.style.fontSize = '10px';
      metaDiv.style.color = '#94a3b8';
      metaDiv.textContent = `Tool: ${metadata.toolName}`;
      entry.appendChild(metaDiv);
    }
    
    logArea.appendChild(entry);
    logArea.scrollTop = logArea.scrollHeight;
  }

  function handleUpdate(update) {
    switch (update.type) {
      case "assistant":
        if (update.content) {
          addLogEntry("assistant", update.content);
        }
        if (update.toolCalls && update.toolCalls.length > 0) {
          update.toolCalls.forEach(tc => {
            addLogEntry("tool", `Calling tool: ${tc.name}\nParams: ${JSON.stringify(tc.params, null, 2)}`, { toolName: tc.name });
          });
        }
        break;

      case "tool_call":
        addLogEntry("tool", `Executing: ${update.toolName}\nParams: ${JSON.stringify(update.params, null, 2)}`, { toolName: update.toolName });
        break;

      case "tool_result":
        const resultStr = typeof update.result === 'object' 
          ? JSON.stringify(update.result, null, 2)
          : String(update.result);
        addLogEntry("tool", `Result: ${resultStr}`, { toolName: update.toolName });
        
        // Check if export_excel completed successfully
        if (update.toolName === 'export_excel' && update.result && update.result.success) {
          // Check storage for export data
          chrome.storage.local.get(['pendingExport'], (result) => {
            if (result.pendingExport) {
              const { filename, rowCount, columnCount } = result.pendingExport;
              downloadInfo.textContent = `File: ${filename} | ${rowCount} rows, ${columnCount} columns`;
              downloadSection.style.display = 'block';
              setStatus("File ready! Click download button below.", "success");
            }
          });
        }
        break;

      case "error":
        addLogEntry("error", update.error);
        break;
    }
  }
});
