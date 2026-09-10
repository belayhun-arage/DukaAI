import { GoogleGenerativeAI, SchemaType } from '@google/generative-ai';
import { v4 as uuidv4 } from 'uuid';
import { config } from '../config';
import {
  AgentRunRequest,
  AgentRunResponse,
  AgentTrace,
  AgentThought,
  ToolCall,
  ToolResult,
  TOOL_SCHEMAS,
} from '@dukaai/shared';
import * as toolsService from './tools.service';
import * as traceService from './trace.service';

let genAI: GoogleGenerativeAI | null = null;

export function initializeAgent(): boolean {
  if (!config.gemini.apiKey) {
    console.warn('Gemini API key not configured - agent disabled');
    return false;
  }

  genAI = new GoogleGenerativeAI(config.gemini.apiKey);
  console.log('Agent service initialized');
  return true;
}

/**
 * Run the agent with tool use capability
 */
export async function runAgent(request: AgentRunRequest): Promise<AgentRunResponse> {
  if (!genAI) {
    throw new Error('Agent not initialized');
  }

  const traceId = uuidv4();
  const startTime = Date.now();

  // Initialize trace
  const trace: AgentTrace = {
    id: traceId,
    shopId: request.shopId,
    sessionId: request.context?.sessionId,
    triggeredBy: request.triggeredBy,
    triggerInput: request.input,
    thoughts: [],
    toolCalls: [],
    toolResults: [],
    status: 'running',
    totalExecutionTimeMs: 0,
    toolCallCount: 0,
    startedAt: new Date(),
  };

  try {
    // Get the model with function calling
    const model = genAI.getGenerativeModel({
      model: 'gemini-3.6-flash',
      tools: [{ functionDeclarations: getGeminiFunctionDeclarations() }],
    });

    // Build system prompt
    const systemPrompt = buildSystemPrompt(request);

    // Start conversation
    const chat = model.startChat({
      history: [
        {
          role: 'user',
          parts: [{ text: systemPrompt }],
        },
        {
          role: 'model',
          parts: [{ text: 'I understand. I am ready to help with shop operations. I will use the available tools to assist customers and manage the shop efficiently.' }],
        },
      ],
    });

    // Add initial reasoning
    addThought(trace, 'reasoning', `Received request: "${request.input}". Analyzing intent and determining required actions.`);

    // Send user input
    let response = await chat.sendMessage(request.input);
    let maxIterations = request.maxToolCalls || 5;
    let iteration = 0;
    const toolsUsed: Set<string> = new Set();

    // Tool use loop
    while (iteration < maxIterations) {
      const candidate = response.response.candidates?.[0];
      if (!candidate) break;

      const parts = candidate.content.parts;

      // Check for function calls
      const functionCalls = parts.filter((p): p is typeof p & { functionCall: { name: string; args: Record<string, unknown> } } =>
        'functionCall' in p && p.functionCall !== undefined
      );

      if (functionCalls.length === 0) {
        // No more function calls - we have the final response
        break;
      }

      // Process each function call
      const functionResponseParts: Array<{ functionResponse: { name: string; response: object } }> = [];

      for (const part of functionCalls) {
        const fc = part.functionCall;
        const toolCallId = uuidv4();

        // Log the tool call
        const toolCall: ToolCall = {
          id: toolCallId,
          toolName: fc.name,
          arguments: fc.args || {},
          timestamp: new Date(),
        };
        trace.toolCalls.push(toolCall);
        toolsUsed.add(fc.name);

        addThought(trace, 'decision', `Calling tool: ${fc.name} with args: ${JSON.stringify(fc.args)}`);

        // Execute the tool
        const result = await toolsService.executeTool(request.shopId, toolCall);
        trace.toolResults.push(result);

        addThought(
          trace,
          'observation',
          result.success
            ? `Tool ${fc.name} succeeded: ${JSON.stringify(result.result).substring(0, 200)}`
            : `Tool ${fc.name} failed: ${result.error}`
        );

        functionResponseParts.push({
          functionResponse: {
            name: fc.name,
            response: result.success ? (result.result as object) : { error: result.error },
          },
        });
      }

      // Send function responses back as parts
      response = await chat.sendMessage(functionResponseParts.map(fr => fr));
      iteration++;
    }

    // Extract final response
    const finalText = response.response.candidates?.[0]?.content.parts
      .filter((p) => 'text' in p)
      .map((p) => ('text' in p ? p.text : ''))
      .join('\n')
      .trim();

    // Determine if human review is needed
    const { requiresHumanReview, reviewReason } = assessHumanReviewNeed(trace);

    // Complete the trace
    trace.status = 'completed';
    trace.finalResponse = finalText || 'No response generated';
    trace.toolCallCount = trace.toolCalls.length;
    trace.completedAt = new Date();
    trace.totalExecutionTimeMs = Date.now() - startTime;

    addThought(trace, 'reasoning', `Completed processing. Used ${trace.toolCallCount} tool(s). Final response ready.`);

    // Save trace
    await traceService.saveTrace(trace);

    return {
      traceId,
      response: finalText || 'I was unable to process your request.',
      toolsUsed: Array.from(toolsUsed),
      confidence: calculateConfidence(trace),
      requiresHumanReview,
      reviewReason,
    };
  } catch (error) {
    // Handle errors
    trace.status = 'failed';
    trace.error = error instanceof Error ? error.message : 'Unknown error';
    trace.completedAt = new Date();
    trace.totalExecutionTimeMs = Date.now() - startTime;

    addThought(trace, 'observation', `Error occurred: ${trace.error}`);

    // Save failed trace
    await traceService.saveTrace(trace);

    throw error;
  }
}

/**
 * Build system prompt for the agent
 */
function buildSystemPrompt(request: AgentRunRequest): string {
  const contextParts: string[] = [];

  if (request.context?.customerName) {
    contextParts.push(`Customer: ${request.context.customerName}`);
  }
  if (request.context?.customerId) {
    contextParts.push(`Customer ID: ${request.context.customerId}`);
  }

  const contextStr = contextParts.length > 0 ? `\n\nContext:\n${contextParts.join('\n')}` : '';

  return `You are DukaAI, an intelligent assistant for a small Ethiopian retail shop. Your role is to help customers place orders and help shop owners manage their business.

You have access to tools to:
- Search and look up products
- Check inventory levels
- Create and manage orders
- Get customer information
- Send notifications
- Generate reports

Guidelines:
1. Use tools to get real data before responding - don't guess or make up information
2. Be helpful and conversational while being efficient
3. For orders, always confirm details before creating
4. If something fails, explain clearly and offer alternatives
5. Keep responses concise but friendly
6. Support both English and Amharic customers

Current shop ID: ${request.shopId}${contextStr}

Process the following customer/owner message and use tools as needed to provide a helpful response.`;
}

/**
 * Convert tool schemas to Gemini function declarations
 */
function getGeminiFunctionDeclarations() {
  return TOOL_SCHEMAS.map((tool) => ({
    name: tool.name,
    description: tool.description,
    parameters: {
      type: SchemaType.OBJECT,
      properties: Object.fromEntries(
        tool.parameters.map((p) => [
          p.name,
          buildParameterSchema(p),
        ])
      ),
      required: tool.parameters.filter((p) => p.required).map((p) => p.name),
    },
  }));
}

/**
 * Build parameter schema including items for arrays
 */
function buildParameterSchema(p: { type: string; description: string; enum?: string[]; items?: { type: string; properties?: Record<string, { type: string; description?: string }> } }): Record<string, unknown> {
  const schema: Record<string, unknown> = {
    type: mapToGeminiType(p.type),
    description: p.description,
  };

  if (p.enum) {
    schema.enum = p.enum;
  }

  // Handle array items
  if (p.type === 'array' && p.items) {
    if (p.items.type === 'object' && p.items.properties) {
      schema.items = {
        type: SchemaType.OBJECT,
        properties: Object.fromEntries(
          Object.entries(p.items.properties).map(([key, val]) => [
            key,
            { type: mapToGeminiType(val.type), description: val.description || '' },
          ])
        ),
      };
    } else {
      schema.items = {
        type: mapToGeminiType(p.items.type),
      };
    }
  }

  return schema;
}

/**
 * Map our types to Gemini schema types
 */
function mapToGeminiType(type: string): SchemaType {
  switch (type) {
    case 'string':
      return SchemaType.STRING;
    case 'number':
      return SchemaType.NUMBER;
    case 'boolean':
      return SchemaType.BOOLEAN;
    case 'array':
      return SchemaType.ARRAY;
    case 'object':
      return SchemaType.OBJECT;
    default:
      return SchemaType.STRING;
  }
}

/**
 * Add a thought to the trace
 */
function addThought(
  trace: AgentTrace,
  type: AgentThought['type'],
  content: string
): void {
  trace.thoughts.push({
    id: uuidv4(),
    type,
    content,
    timestamp: new Date(),
  });
}

/**
 * Calculate confidence score based on trace
 */
function calculateConfidence(trace: AgentTrace): number {
  let confidence = 0.8; // Base confidence

  // Reduce confidence for failed tool calls
  const failedCalls = trace.toolResults.filter((r) => !r.success).length;
  confidence -= failedCalls * 0.1;

  // Reduce confidence if no tools were used (might be missing data)
  if (trace.toolCalls.length === 0) {
    confidence -= 0.2;
  }

  // Increase confidence if all tools succeeded
  if (failedCalls === 0 && trace.toolCalls.length > 0) {
    confidence += 0.1;
  }

  return Math.max(0.1, Math.min(1.0, confidence));
}

/**
 * Assess if human review is needed
 */
function assessHumanReviewNeed(trace: AgentTrace): {
  requiresHumanReview: boolean;
  reviewReason?: string;
} {
  // Check for order creation
  const createdOrder = trace.toolCalls.some((tc) => tc.toolName === 'create_order');
  const orderSuccess = trace.toolResults.some(
    (r) => r.toolName === 'create_order' && r.success
  );

  if (createdOrder && orderSuccess) {
    return {
      requiresHumanReview: false,
    };
  }

  // Check for status updates to CANCELLED
  const cancelledOrder = trace.toolCalls.some(
    (tc) =>
      tc.toolName === 'update_order_status' &&
      (tc.arguments as any).newStatus === 'CANCELLED'
  );

  if (cancelledOrder) {
    return {
      requiresHumanReview: true,
      reviewReason: 'Order cancellation requires owner confirmation',
    };
  }

  // Check for multiple failed tool calls
  const failedCount = trace.toolResults.filter((r) => !r.success).length;
  if (failedCount >= 2) {
    return {
      requiresHumanReview: true,
      reviewReason: 'Multiple tool failures - may need manual intervention',
    };
  }

  return { requiresHumanReview: false };
}
