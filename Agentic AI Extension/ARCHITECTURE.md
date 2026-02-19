# Agentic AI Chrome Extension - Architecture

## Problem: Parse JSON API Response, Filter Data, and Export to Excel

**Use Case:** User wants to fetch data from a JSON API, filter it based on criteria, and export the filtered results to Excel - all through natural language interaction with an AI agent.

---

## High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                         USER QUERY                                  │
│  "Fetch users from API, filter by age >25, export to Excel"        │
└─────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    AGENTIC AI LOOP                                  │
│                                                                     │
│  Query 1: "Fetch users from API, filter by age >25, export Excel"  │
│    │                                                                 │
│    ├─► LLM (OpenAI GPT-4o-mini) analyzes query                      │
│    │    Response: "I need to call API tool to fetch users"          │
│    │                                                                 │
│    ├─► Tool Call: api_call(url="https://api.example.com/users")    │
│    │    Tool Result: JSON response with user data                   │
│    │                                                                 │
│    ├─► Query 2: [Previous context] + "Filter users by age >25"     │
│    │    LLM Response: "I'll filter the data using filter tool"     │
│    │                                                                 │
│    ├─► Tool Call: filter_data(data=users, condition="age > 25")    │
│    │    Tool Result: Filtered array of users                       │
│    │                                                                 │
│    ├─► Query 3: [All previous context] + "Export to Excel"        │
│    │    LLM Response: "I'll use Excel export tool"                 │
│    │                                                                 │
│    └─► Tool Call: export_excel(data=filtered_users, filename="...") │
│         Tool Result: Excel file downloaded                          │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│                      FINAL RESULT                                   │
│  Excel file with filtered user data downloaded                      │
└─────────────────────────────────────────────────────────────────────┘
```

## System Components

```
┌─────────────────────────────────────────────────────────────────────┐
│                    CHROME EXTENSION                                  │
│                                                                     │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │  UI Layer (popup.html/popup.js)                            │   │
│  │  - User input textarea                                      │   │
│  │  - Conversation log display                                 │   │
│  │  - Tool execution status                                    │   │
│  └──────────────────────────────────────────────────────────────┘   │
│                                                                     │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │  Agentic Loop Manager (agent.js)                            │   │
│  │  - Maintains conversation context                           │   │
│  │  - Manages Query → LLM → Tool → Result cycles               │   │
│  │  - Stores all interactions                                  │   │
│  └──────────────────────────────────────────────────────────────┘   │
│                                                                     │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │  LLM Client (llm.js)                                        │   │
│  │  - OpenAI API integration (GPT-4o-mini)                     │   │
│  │  - Function calling / tool detection                        │   │
│  │  - Response parsing                                         │   │
│  └──────────────────────────────────────────────────────────────┘   │
│                                                                     │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │  Tool Registry (tools.js)                                   │   │
│  │  - api_call: Fetch JSON from API                           │   │
│  │  - filter_data: Filter JSON array by condition              │   │
│  │  - export_excel: Convert data to Excel/CSV                  │   │
│  │  - calculator: Math operations                              │   │
│  └──────────────────────────────────────────────────────────────┘   │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

## Agentic Loop Flow

```
┌─────────────────────────────────────────────────────────────────────┐
│                    AGENTIC LOOP DETAIL                               │
└─────────────────────────────────────────────────────────────────────┘

Step 1: User Query
    "Fetch users from API, filter by age >25, export to Excel"
    │
    ▼
Step 2: Context Management
    conversation_history = []
    │
    ▼
Step 3: LLM Call (with tools available)
    prompt = conversation_history + user_query + available_tools
    │
    ├─► LLM Response: "I'll call the API tool to fetch users"
    │   tool_call: { name: "api_call", params: { url: "..." } }
    │
    ▼
Step 4: Tool Execution
    api_call(url) → JSON response
    │
    ▼
Step 5: Update Context
    conversation_history.push({
        query: user_query,
        llm_response: "...",
        tool_call: "api_call",
        tool_result: JSON_data
    })
    │
    ▼
Step 6: Next LLM Call (with full context)
    prompt = conversation_history + "Now filter the data by age >25"
    │
    ├─► LLM Response: "I'll filter using filter_data tool"
    │   tool_call: { name: "filter_data", params: {...} }
    │
    ▼
Step 7: Tool Execution
    filter_data(data, condition) → filtered_array
    │
    ▼
Step 8: Update Context
    conversation_history.push({...})
    │
    ▼
Step 9: Final LLM Call
    prompt = conversation_history + "Export to Excel"
    │
    ├─► LLM Response: "I'll export using export_excel tool"
    │   tool_call: { name: "export_excel", params: {...} }
    │
    ▼
Step 10: Tool Execution
    export_excel(data) → file download
    │
    ▼
Step 11: Final Response
    LLM: "I've fetched the users, filtered by age >25, and exported to Excel"
```

## Tool Definitions

### 1. api_call
```javascript
{
  name: "api_call",
  description: "Fetch data from a JSON API endpoint",
  parameters: {
    url: "string - API endpoint URL",
    method: "string - HTTP method (GET, POST, etc.)",
    headers: "object - Optional request headers",
    body: "object - Optional request body"
  },
  returns: "JSON response data"
}
```

### 2. filter_data
```javascript
{
  name: "filter_data",
  description: "Filter an array of objects based on a condition",
  parameters: {
    data: "array - Array of objects to filter",
    condition: "string - Filter condition (e.g., 'age > 25', 'status === active')",
    field: "string - Optional field name to filter on"
  },
  returns: "Filtered array"
}
```

### 3. export_excel
```javascript
{
  name: "export_excel",
  description: "Export data array to Excel/CSV file",
  parameters: {
    data: "array - Data to export",
    filename: "string - Output filename",
    columns: "array - Optional column names"
  },
  returns: "File download triggered"
}
```

## Context Management

```javascript
conversation_context = [
  {
    role: "user",
    content: "Fetch users from API, filter by age >25, export to Excel"
  },
  {
    role: "assistant",
    content: "I'll help you fetch users, filter them, and export to Excel.",
    tool_calls: [
      {
        name: "api_call",
        params: { url: "https://api.example.com/users" }
      }
    ]
  },
  {
    role: "tool",
    content: JSON.stringify(api_response_data)
  },
  {
    role: "assistant",
    content: "I've fetched the users. Now I'll filter by age >25.",
    tool_calls: [
      {
        name: "filter_data",
        params: { data: [...], condition: "age > 25" }
      }
    ]
  },
  {
    role: "tool",
    content: JSON.stringify(filtered_data)
  },
  // ... continues until final response
]
```

## Key Features

1. **Multi-step Reasoning**: LLM breaks complex tasks into steps
2. **Context Preservation**: All previous interactions included in each LLM call
3. **Tool Calling**: LLM decides which tools to use and when
4. **Error Handling**: If tool fails, LLM can retry or suggest alternatives
5. **Logging**: Full conversation log for debugging and submission
