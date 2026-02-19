// LLM Client - OpenAI API integration with function calling
// Using model: gpt-4o-mini

class LLMClient {
  constructor(apiKey) {
    this.apiKey = apiKey;
    this.model = "gpt-4o-mini"; // OpenAI model with function calling support
    this.baseUrl = "https://api.openai.com/v1/chat/completions";
  }

  async generateResponse(messages, tools) {
    if (!this.apiKey) {
      throw new Error("API key not set");
    }

    try {
      // Convert messages to OpenAI format
      const openaiMessages = messages.map(msg => {
        if (msg.role === "system") {
          return { role: "system", content: msg.content };
        } else if (msg.role === "user") {
          return { role: "user", content: msg.content };
        } else if (msg.role === "assistant") {
          const message = { role: "assistant", content: msg.content || null };
          // Add function calls if present
          if (msg.tool_calls && msg.tool_calls.length > 0) {
            message.function_call = {
              name: msg.tool_calls[0].name,
              arguments: JSON.stringify(msg.tool_calls[0].params || {})
            };
          }
          return message;
        } else if (msg.role === "tool") {
          return {
            role: "function",
            name: msg.tool_name,
            content: typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content)
          };
        }
        return null;
      }).filter(Boolean);

      // Prepare function definitions for OpenAI
      const functions = tools.map(tool => ({
        name: tool.name,
        description: tool.description,
        parameters: tool.parameters
      }));

      const requestBody = {
        model: this.model,
        messages: openaiMessages,
        functions: functions,
        function_call: "auto" // Let the model decide when to call functions
      };

      const response = await fetch(this.baseUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${this.apiKey}`
        },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`OpenAI API error: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      
      // Parse response
      const choice = data.choices?.[0];
      if (!choice) {
        throw new Error("No choice in response");
      }

      const message = choice.message;
      let text = message.content || "";
      const toolCalls = [];

      // Check if model wants to call a function
      if (message.function_call) {
        try {
          const functionArgs = JSON.parse(message.function_call.arguments || "{}");
          toolCalls.push({
            name: message.function_call.name,
            params: functionArgs
          });
        } catch (e) {
          console.error("Error parsing function arguments:", e);
        }
      }

      return {
        text: text,
        toolCalls: toolCalls,
        finishReason: choice.finish_reason
      };
    } catch (error) {
      console.error("LLM error:", error);
      throw error;
    }
  }

  // Simple text generation without tools (for fallback)
  async generateText(prompt) {
    if (!this.apiKey) {
      throw new Error("API key not set");
    }

    try {
      const response = await fetch(this.baseUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${this.apiKey}`
        },
        body: JSON.stringify({
          model: this.model,
          messages: [
            { role: "user", content: prompt }
          ]
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`OpenAI API error: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      const choice = data.choices?.[0];
      const text = choice?.message?.content || "";

      return { text: text };
    } catch (error) {
      console.error("LLM text generation error:", error);
      throw error;
    }
  }
}
