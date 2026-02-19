// Agentic Loop Manager - Manages the Query → LLM → Tool → Result cycle

class AgenticAgent {
  constructor(llmClient, tools) {
    this.llmClient = llmClient;
    this.tools = tools;
    this.conversationHistory = [];
    this.maxIterations = 10; // Prevent infinite loops
  }

  async processQuery(userQuery, onUpdate) {
    // Add system context as first message if history is empty
    if (this.conversationHistory.length === 0) {
      this.conversationHistory.push({
        role: "system",
        content: `You are an AI assistant that helps users by calling tools in sequence to complete complex tasks.

CRITICAL RULES FOR TOOL CALLING:
1. When a tool returns a result, ALWAYS extract the relevant data from that result and pass it as parameters to the next tool.
2. For api_call results: If it returns {success: true, data: [...]}, you MUST pass that data array to filter_data as {data: <previous_result.data>, condition: "..."}.
3. For filter_data results: If it returns {success: true, data: [...]}, you MUST pass that data array to export_excel as {data: <previous_result.data>, filename: "..."}.
4. ALWAYS include ALL required parameters. Never omit the 'data' parameter - it is REQUIRED for filter_data and export_excel.
5. Parse JSON tool results to extract the exact data structure before passing to the next tool.

Example workflow:
- User: "Fetch users, filter by id > 5, export to Excel"
- Step 1: Call api_call({url: "..."})
- Step 2: Extract data from result → Call filter_data({data: <result.data>, condition: "id > 5"})
- Step 3: Extract data from result → Call export_excel({data: <result.data>, filename: "users.csv"})`
      });
    }
    
    // Add user query to history
    this.conversationHistory.push({
      role: "user",
      content: userQuery
    });

    let iteration = 0;
    let finalResponse = "";

    while (iteration < this.maxIterations) {
      iteration++;

      try {
        // Call LLM with full conversation history
        const response = await this.llmClient.generateResponse(
          this.conversationHistory,
          this.tools
        );

        // Add assistant response to history
        const assistantMessage = {
          role: "assistant",
          content: response.text,
          tool_calls: response.toolCalls.length > 0 ? response.toolCalls : undefined
        };
        this.conversationHistory.push(assistantMessage);

        // Notify UI
        if (onUpdate) {
          onUpdate({
            type: "assistant",
            content: response.text,
            toolCalls: response.toolCalls
          });
        }

        // If no tool calls, we're done
        if (response.toolCalls.length === 0) {
          finalResponse = response.text;
          break;
        }

        // Execute tool calls
        for (const toolCall of response.toolCalls) {
          const toolName = toolCall.name;
          let params = toolCall.params;

          // Helper: If filter_data or export_excel is missing 'data', try to extract it from previous tool result
          if ((toolName === "filter_data" || toolName === "export_excel") && !params.data) {
            // Look for the most recent tool result that has data
            for (let i = this.conversationHistory.length - 1; i >= 0; i--) {
              const msg = this.conversationHistory[i];
              if (msg.role === "tool" && msg.content) {
                try {
                  const result = JSON.parse(msg.content);
                  if (result.data && Array.isArray(result.data)) {
                    params.data = result.data;
                    console.log(`[Agent] Auto-extracted data from previous ${msg.tool_name} result`);
                    break;
                  }
                } catch (e) {
                  // Not JSON, skip
                }
              }
            }
          }

          // Notify UI
          if (onUpdate) {
            onUpdate({
              type: "tool_call",
              toolName: toolName,
              params: params
            });
          }

          // Execute tool
          const toolResult = await executeTool(toolName, params);

          // Format tool result for better LLM understanding
          let formattedResult;
          if (toolName === "api_call" && toolResult.success && toolResult.data) {
            // For API calls, format to make data clear and accessible
            const dataArray = Array.isArray(toolResult.data) ? toolResult.data : [toolResult.data];
            // Create a clear, structured response that the LLM can easily parse
            formattedResult = JSON.stringify({
              success: true,
              data: toolResult.data,
              itemCount: dataArray.length,
              summary: `Successfully fetched ${dataArray.length} item(s) from the API.`,
              instruction: "To filter this data, call filter_data with: {data: <this_result.data>, condition: \"your_condition\"}"
            }, null, 2);
          } else if (toolName === "filter_data" && toolResult.success && toolResult.data) {
            // For filter results, make it clear this can be used for export
            formattedResult = JSON.stringify({
              success: true,
              data: toolResult.data,
              filteredCount: toolResult.filteredCount,
              totalCount: toolResult.totalCount,
              summary: `Filtered ${toolResult.filteredCount} items from ${toolResult.totalCount} total.`,
              instruction: "To export this data, call export_excel with: {data: <this_result.data>, filename: \"output.csv\"}"
            }, null, 2);
          } else {
            formattedResult = typeof toolResult === 'string' ? toolResult : JSON.stringify(toolResult, null, 2);
          }

          // Add tool result to history
          this.conversationHistory.push({
            role: "tool",
            tool_name: toolName,
            content: formattedResult
          });

          // Notify UI
          if (onUpdate) {
            onUpdate({
              type: "tool_result",
              toolName: toolName,
              result: toolResult
            });
          }
        }

        // Continue loop to get next LLM response
      } catch (error) {
        console.error("Agent error:", error);
        
        // Add error to history
        this.conversationHistory.push({
          role: "assistant",
          content: `Error: ${error.message}`
        });

        if (onUpdate) {
          onUpdate({
            type: "error",
            error: error.message
          });
        }

        finalResponse = `Error occurred: ${error.message}`;
        break;
      }
    }

    if (iteration >= this.maxIterations) {
      finalResponse = "Maximum iterations reached. The task may be too complex or stuck in a loop.";
    }

    return {
      response: finalResponse,
      history: this.conversationHistory,
      iterations: iteration
    };
  }

  getConversationLog() {
    return this.conversationHistory.map((msg, idx) => {
      if (msg.role === "user") {
        return `[User ${idx + 1}] ${msg.content}`;
      } else if (msg.role === "assistant") {
        let log = `[Assistant ${idx + 1}] ${msg.content || ""}`;
        if (msg.tool_calls) {
          log += `\n  Tool Calls: ${JSON.stringify(msg.tool_calls, null, 2)}`;
        }
        return log;
      } else if (msg.role === "tool") {
        return `[Tool: ${msg.tool_name}] ${msg.content}`;
      }
      return `[${msg.role}] ${JSON.stringify(msg)}`;
    }).join("\n\n");
  }

  reset() {
    this.conversationHistory = [];
  }
}
