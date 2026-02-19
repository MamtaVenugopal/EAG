// Tool Registry - Available tools for the agentic AI

const TOOLS = {
  api_call: {
    name: "api_call",
    description: "Fetch data from any HTTP/HTTPS endpoint. Works with any URL (http:// or https://). Returns the JSON response. Handles CORS automatically from extension context.",
    parameters: {
      type: "object",
      properties: {
        url: {
          type: "string",
          description: "Any HTTP/HTTPS API endpoint URL (e.g., 'https://api.example.com/data', 'http://localhost:3000/api', 'https://jsonplaceholder.typicode.com/users')"
        },
        method: {
          type: "string",
          description: "HTTP method (GET, POST, PUT, DELETE). Default: GET",
          enum: ["GET", "POST", "PUT", "DELETE"]
        },
        headers: {
          type: "object",
          description: "Optional HTTP headers as key-value pairs (e.g., {'Authorization': 'Bearer token', 'X-API-Key': 'key'})"
        },
        body: {
          type: "object",
          description: "Optional request body for POST/PUT requests (will be JSON stringified)"
        }
      },
      required: ["url"]
    }
  },

  filter_data: {
    name: "filter_data",
    description: "Filter an array of objects based on a condition. IMPORTANT: You must pass the 'data' array from a previous tool result (e.g., from api_call result.data). The data parameter is REQUIRED and must be an array of objects.",
    parameters: {
      type: "object",
      properties: {
        data: {
          type: "array",
          description: "REQUIRED: Array of objects to filter. This should come from a previous tool call result (e.g., if api_call returned {success: true, data: [...]}, use that data array here).",
          items: {
            type: "object"
          }
        },
        condition: {
          type: "string",
          description: "Filter condition (e.g., 'id > 5', 'age > 25', 'status === \"active\"', 'name.includes(\"John\")'). The condition will be evaluated against each object in the data array."
        }
      },
      required: ["data", "condition"]
    }
  },

  export_excel: {
    name: "export_excel",
    description: "Export an array of objects to Excel/CSV file and trigger download. IMPORTANT: You must pass the 'data' array from a previous tool result (e.g., from filter_data result.data or api_call result.data).",
    parameters: {
      type: "object",
      properties: {
        data: {
          type: "array",
          description: "REQUIRED: Array of objects to export. This should come from a previous tool call result (e.g., if filter_data returned {success: true, data: [...]}, use that data array here).",
          items: {
            type: "object"
          }
        },
        filename: {
          type: "string",
          description: "Output filename (e.g., 'users.xlsx' or 'data.csv')"
        },
        columns: {
          type: "array",
          description: "Optional array of column names. If not provided, uses object keys.",
          items: {
            type: "string"
          }
        }
      },
      required: ["data", "filename"]
    }
  },

  calculator: {
    name: "calculator",
    description: "Perform mathematical calculations. Supports basic operations and functions.",
    parameters: {
      type: "object",
      properties: {
        expression: {
          type: "string",
          description: "Mathematical expression to evaluate (e.g., '2 + 2', 'Math.sqrt(16)', 'Math.pow(2, 3)')"
        }
      },
      required: ["expression"]
    }
  }
};

// Tool execution functions
async function executeTool(toolName, params) {
  console.log(`[Tool] Executing ${toolName} with params:`, params);

  switch (toolName) {
    case "api_call":
      return await executeApiCall(params);
    
    case "filter_data":
      return executeFilterData(params);
    
    case "export_excel":
      return executeExportExcel(params);
    
    case "calculator":
      return executeCalculator(params);
    
    default:
      throw new Error(`Unknown tool: ${toolName}`);
  }
}

// API cache: avoid calling the same URL too often (TTL 5 minutes)
const API_CACHE_KEY = 'api_call_cache';
const API_CACHE_TTL_MS = 5 * 60 * 1000;

async function executeApiCall(params) {
  const { url, method = "GET", headers = {}, body } = params;
  
  if (!url) {
    throw new Error("URL is required for api_call");
  }

  // Only cache GET requests
  if (method === "GET" && chrome.storage && chrome.storage.local) {
    try {
      const stored = await new Promise(resolve => {
        chrome.storage.local.get([API_CACHE_KEY], resolve);
      });
      const cache = stored[API_CACHE_KEY] || {};
      const entry = cache[url];
      if (entry && (Date.now() - entry.timestamp < API_CACHE_TTL_MS)) {
        console.log('[api_call] Using cached response for', url);
        return {
          success: true,
          data: entry.data,
          status: entry.status || 200,
          statusText: entry.statusText || 'OK',
          fromCache: true
        };
      }
    } catch (e) {
      console.warn('[api_call] Cache read failed', e);
    }
  }

  try {
    const options = {
      method: method,
      headers: {
        "Content-Type": "application/json",
        ...headers
      }
    };

    if (body && (method === "POST" || method === "PUT")) {
      options.body = JSON.stringify(body);
    }

    const response = await fetch(url, options);
    
    if (!response.ok) {
      throw new Error(`API call failed: ${response.status} ${response.statusText}`);
    }

    // Try to parse as JSON, but handle non-JSON responses gracefully
    let data;
    const contentType = response.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      data = await response.json();
    } else {
      // If not JSON, try to parse anyway (some APIs return JSON without proper header)
      try {
        const text = await response.text();
        data = JSON.parse(text);
      } catch (e) {
        // If parsing fails, return the text as a single-item array so it can still be exported
        const text = await response.text();
        throw new Error(`API returned non-JSON response. Content-Type: ${contentType}. Response preview: ${text.substring(0, 100)}...`);
      }
    }
    
    // Cache GET response
    if (method === "GET" && chrome.storage && chrome.storage.local) {
      try {
        const stored = await new Promise(resolve => {
          chrome.storage.local.get([API_CACHE_KEY], resolve);
        });
        const cache = stored[API_CACHE_KEY] || {};
        cache[url] = { data, status: response.status, statusText: response.statusText, timestamp: Date.now() };
        await new Promise(resolve => chrome.storage.local.set({ [API_CACHE_KEY]: cache }, resolve));
      } catch (e) {
        console.warn('[api_call] Cache write failed', e);
      }
    }

    return {
      success: true,
      data: data,
      status: response.status,
      statusText: response.statusText
    };
  } catch (error) {
    const msg = error.message || 'Unknown error';
    let hint = '';
    if (msg === 'Failed to fetch' || msg.includes('fetch')) {
      hint = ' Possible causes: URL not reachable (e.g. server down, wrong host, or firewall), invalid SSL, or use a working API like https://jsonplaceholder.typicode.com/users or https://fakestoreapi.com/products for testing.';
    } else if (msg.includes('CORS') || msg.includes('NetworkError')) {
      hint = ' Try the same URL in a new browser tab; if it works there, the extension should also be able to fetch it (extension context bypasses CORS).';
    }
    return {
      success: false,
      error: msg + hint,
      url: url
    };
  }
}

function executeFilterData(params) {
  const { data, condition } = params;
  
  if (!data) {
    throw new Error("filter_data requires a 'data' parameter. Pass the data array from a previous tool result (e.g., from api_call result.data).");
  }
  
  if (!Array.isArray(data)) {
    throw new Error(`filter_data requires an array, but received: ${typeof data}. Make sure you're passing the 'data' field from a previous tool result.`);
  }

  if (!condition) {
    throw new Error("filter condition is required");
  }

  try {
    // Safe condition parser without eval/Function
    const filtered = data.filter(item => {
      return evaluateCondition(item, condition);
    });

    return {
      success: true,
      filteredCount: filtered.length,
      totalCount: data.length,
      data: filtered
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}

// Safe condition evaluator without eval
function evaluateCondition(item, condition) {
  // Remove whitespace
  const cond = condition.trim();
  
  // Parse common patterns: field operator value
  // Examples: "id > 5", "age >= 25", "status === 'active'", "name == 'John'"
  
  // Match: field operator value
  const comparisonMatch = cond.match(/^(\w+)\s*(>|<|>=|<=|===|==|!==|!=)\s*(.+)$/);
  if (comparisonMatch) {
    const [, field, operator, valueStr] = comparisonMatch;
    const itemValue = item[field];
    
    // Parse value (remove quotes, convert numbers)
    let compareValue = valueStr.trim();
    // Remove surrounding quotes
    if ((compareValue.startsWith('"') && compareValue.endsWith('"')) ||
        (compareValue.startsWith("'") && compareValue.endsWith("'"))) {
      compareValue = compareValue.slice(1, -1);
    }
    // Try to convert to number
    const numValue = Number(compareValue);
    const finalValue = isNaN(numValue) || compareValue !== String(numValue) ? compareValue : numValue;
    
    // Perform comparison
    switch (operator) {
      case '>': return itemValue > finalValue;
      case '<': return itemValue < finalValue;
      case '>=': return itemValue >= finalValue;
      case '<=': return itemValue <= finalValue;
      case '===': return itemValue === finalValue;
      case '==': return itemValue == finalValue;
      case '!==': return itemValue !== finalValue;
      case '!=': return itemValue != finalValue;
      default: return false;
    }
  }
  
  // Try to match property access patterns: item.field or just field
  // For simple boolean checks like "active" or "isActive"
  if (item.hasOwnProperty(cond)) {
    return Boolean(item[cond]);
  }
  
  // Try nested property access: "address.city === 'NYC'"
  const nestedMatch = cond.match(/^(\w+(?:\.\w+)+)\s*(===|==|!==|!=|>|<|>=|<=)\s*(.+)$/);
  if (nestedMatch) {
    const [, path, operator, valueStr] = nestedMatch;
    const keys = path.split('.');
    let itemValue = item;
    for (const key of keys) {
      if (itemValue && typeof itemValue === 'object') {
        itemValue = itemValue[key];
      } else {
        return false;
      }
    }
    
    let compareValue = valueStr.trim();
    if ((compareValue.startsWith('"') && compareValue.endsWith('"')) ||
        (compareValue.startsWith("'") && compareValue.endsWith("'"))) {
      compareValue = compareValue.slice(1, -1);
    }
    const numValue = Number(compareValue);
    const finalValue = isNaN(numValue) || compareValue !== String(numValue) ? compareValue : numValue;
    
    switch (operator) {
      case '>': return itemValue > finalValue;
      case '<': return itemValue < finalValue;
      case '>=': return itemValue >= finalValue;
      case '<=': return itemValue <= finalValue;
      case '===': return itemValue === finalValue;
      case '==': return itemValue == finalValue;
      case '!==': return itemValue !== finalValue;
      case '!=': return itemValue != finalValue;
      default: return false;
    }
  }
  
  // If no pattern matches, return false
  console.warn(`Could not parse condition: ${condition}`);
  return false;
}

// Flatten nested objects for CSV (so address, company show real values not [object Object])
function flattenForCsv(obj, prefix = '') {
  const out = {};
  if (obj === null || obj === undefined) return out;
  for (const key of Object.keys(obj)) {
    const val = obj[key];
    const fullKey = prefix ? prefix + '.' + key : key;
    if (val !== null && typeof val === 'object' && !Array.isArray(val) && typeof val.getMonth !== 'function') {
      Object.assign(out, flattenForCsv(val, fullKey));
    } else {
      out[fullKey] = val;
    }
  }
  return out;
}

function executeExportExcel(params) {
  const { data, filename = "export.csv", columns } = params;
  
  console.log('[export_excel] Starting export with params:', { 
    dataLength: Array.isArray(data) ? data.length : 'not an array',
    filename 
  });
  
  if (!Array.isArray(data) || data.length === 0) {
    throw new Error("export_excel requires a non-empty array");
  }

  try {
    // Flatten each row so nested objects (address, company) become readable columns
    const flatRows = data.map(row => flattenForCsv(row));
    
    // Get column names: use provided columns or collect all keys from flattened rows
    let headers = columns;
    if (!headers || headers.length === 0) {
      const keySet = {};
      flatRows.forEach(row => Object.keys(row).forEach(k => { keySet[k] = true; }));
      headers = Object.keys(keySet).sort();
    }
    
    // Convert to CSV
    const csvRows = [];
    
    // Add headers
    csvRows.push(headers.map(h => escapeCSV(h)).join(','));
    
    // Add data rows (values as readable strings; no [object Object])
    for (const row of flatRows) {
      const values = headers.map(header => {
        let value = row[header];
        if (value !== undefined && value !== null && typeof value === 'object') {
          value = JSON.stringify(value);
        }
        return escapeCSV(value !== undefined ? value : '');
      });
      csvRows.push(values.join(','));
    }
    
    const csvContent = '\uFEFF' + csvRows.join('\r\n'); // BOM for Excel UTF-8
    // Normalize filename: always use .csv (e.g. users_filtered.xlsx -> users_filtered.csv)
    const baseName = filename.replace(/\.[^.]+$/, '').trim() || 'export';
    const finalFilename = baseName + '.csv';
    
    // Store export data for download button
    if (chrome.storage && chrome.storage.local) {
      chrome.storage.local.set({
        pendingExport: {
          csvContent: csvContent,
          filename: finalFilename,
          rowCount: data.length,
          columnCount: headers.length,
          timestamp: Date.now()
        }
      }, () => {
        console.log('[export_excel] Export data stored for download button');
      });
    }
    
    // Also try automatic download
    const downloadViaAnchor = (url, fname) => {
      const a = document.createElement('a');
      a.href = url;
      a.download = fname;
      a.style.display = 'none';
      document.body.appendChild(a);
      a.click();
      setTimeout(() => {
        document.body.removeChild(a);
      }, 100);
    };
    
    // Try Chrome downloads API first (for blob URLs)
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const blobUrl = URL.createObjectURL(blob);
    
    if (chrome.downloads && chrome.downloads.download) {
      console.log('[export_excel] Attempting download via chrome.downloads API');
      // Use blob URL with downloads API
      chrome.downloads.download({
        url: blobUrl,
        filename: finalFilename,
        saveAs: true
      }, (downloadId) => {
        if (chrome.runtime.lastError) {
          console.error('[export_excel] Downloads API error:', chrome.runtime.lastError.message);
          console.log('[export_excel] Download button will be available in popup');
          // Don't fallback - let user use download button
        } else {
          console.log('[export_excel] Download started successfully with ID:', downloadId);
          // Clean up blob URL after a delay
          setTimeout(() => URL.revokeObjectURL(blobUrl), 2000);
        }
      });
    } else {
      console.log('[export_excel] chrome.downloads not available, download button will be available');
      URL.revokeObjectURL(blobUrl);
    }
    
    console.log('[export_excel] Export completed:', { filename: finalFilename, rowCount: data.length });

    return {
      success: true,
      filename: filename,
      rowCount: data.length,
      columnCount: headers.length
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}

function escapeCSV(value) {
  const str = String(value ?? '');
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return '"' + str.replace(/"/g, '""') + '"';
  }
  return str;
}

function executeCalculator(params) {
  const { expression } = params;
  
  if (!expression) {
    throw new Error("Calculator expression is required");
  }

  try {
    // Safe evaluation - only allow Math functions and basic operators
    const safeExpression = expression.replace(/[^0-9+\-*/().\s,Math]/g, '');
    const result = Function(`"use strict"; return ${safeExpression}`)();
    
    return {
      success: true,
      expression: expression,
      result: result
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}

// Get tool definitions for LLM
function getToolDefinitions() {
  return Object.values(TOOLS);
}
