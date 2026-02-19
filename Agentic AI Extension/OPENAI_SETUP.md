# OpenAI Setup Guide

## Model Information

**Model Used:** `gpt-4o-mini`

This extension uses OpenAI's **GPT-4o-mini** model, which is:
- Cost-effective and fast
- Supports function calling (tool use)
- Optimized for structured outputs
- Well-suited for agentic AI workflows

## Getting Your OpenAI API Key

1. Go to [OpenAI Platform](https://platform.openai.com/)
2. Sign up or log in to your account
3. Navigate to [API Keys](https://platform.openai.com/api-keys)
4. Click "Create new secret key"
5. Copy the key (it starts with `sk-...`)
6. **Important:** Save it securely - you won't be able to see it again!

## Setting Up in Extension

1. Load the extension in Chrome (`chrome://extensions/`)
2. Click the extension icon
3. Paste your OpenAI API key in the input field
4. The key will be saved automatically in Chrome's local storage

## API Usage & Costs

- **Model:** GPT-4o-mini
- **Pricing:** Check current rates at [OpenAI Pricing](https://openai.com/api/pricing/)
- **Function Calling:** Supported (required for this extension)
- **Rate Limits:** Depends on your OpenAI plan

## Testing

Try this query to test the extension:
```
Fetch users from https://jsonplaceholder.typicode.com/users, filter by id > 5, and export to Excel
```

## Troubleshooting

**Error: "API key not set"**
- Make sure you've entered your API key in the extension popup
- Check that the key starts with `sk-`

**Error: "OpenAI API error: 401"**
- Your API key is invalid or expired
- Generate a new key from OpenAI Platform

**Error: "OpenAI API error: 429"**
- You've hit rate limits
- Check your OpenAI account usage and limits

**Error: "Insufficient credits"**
- Add credits to your OpenAI account
- Visit [OpenAI Billing](https://platform.openai.com/account/billing)
