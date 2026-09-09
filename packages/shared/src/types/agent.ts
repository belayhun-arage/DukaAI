// Tool definitions
export interface ToolDefinition {
  name: string;
  description: string;
  parameters: ToolParameter[];
}

export interface ToolParameter {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'array' | 'object';
  description: string;
  required: boolean;
  enum?: string[];
}

// Tool execution
export interface ToolCall {
  id: string;
  toolName: string;
  arguments: Record<string, unknown>;
  timestamp: Date;
}

export interface ToolResult {
  toolCallId: string;
  toolName: string;
  success: boolean;
  result?: unknown;
  error?: string;
  executionTimeMs: number;
}

// Agent reasoning
export interface AgentThought {
  id: string;
  type: 'reasoning' | 'planning' | 'observation' | 'decision';
  content: string;
  timestamp: Date;
}

// Agent trace (full execution log)
export interface AgentTrace {
  id: string;
  shopId: string;
  sessionId?: string;
  triggeredBy: 'telegram' | 'dashboard' | 'cron' | 'api';
  triggerInput: string;

  // Execution details
  thoughts: AgentThought[];
  toolCalls: ToolCall[];
  toolResults: ToolResult[];

  // Outcome
  status: 'running' | 'completed' | 'failed' | 'timeout';
  finalResponse?: string;
  error?: string;

  // Metrics
  totalTokensUsed?: number;
  totalExecutionTimeMs: number;
  toolCallCount: number;

  // Timestamps
  startedAt: Date;
  completedAt?: Date;
}

// Agent run request
export interface AgentRunRequest {
  shopId: string;
  input: string;
  context?: {
    customerId?: string;
    customerName?: string;
    chatId?: string;
    sessionId?: string;
  };
  maxToolCalls?: number;
  triggeredBy: 'telegram' | 'dashboard' | 'cron' | 'api';
}

// Agent run response
export interface AgentRunResponse {
  traceId: string;
  response: string;
  toolsUsed: string[];
  confidence: number;
  requiresHumanReview: boolean;
  reviewReason?: string;
}

// Available tools enum
export type ToolName =
  | 'search_products'
  | 'get_product_details'
  | 'check_inventory'
  | 'create_order'
  | 'get_order_status'
  | 'update_order_status'
  | 'get_customer_info'
  | 'get_customer_orders'
  | 'send_notification'
  | 'get_daily_stats'
  | 'get_low_stock_items'
  | 'calculate_order_total';

// Tool schemas for Gemini function calling
export const TOOL_SCHEMAS: ToolDefinition[] = [
  {
    name: 'search_products',
    description: 'Search for products in the shop catalog by name or category',
    parameters: [
      { name: 'query', type: 'string', description: 'Search query (product name or keyword)', required: true },
      { name: 'category', type: 'string', description: 'Filter by category', required: false },
      { name: 'inStockOnly', type: 'boolean', description: 'Only return products in stock', required: false },
    ],
  },
  {
    name: 'get_product_details',
    description: 'Get detailed information about a specific product',
    parameters: [
      { name: 'productId', type: 'string', description: 'The product ID', required: true },
    ],
  },
  {
    name: 'check_inventory',
    description: 'Check current stock levels for products',
    parameters: [
      { name: 'productIds', type: 'array', description: 'List of product IDs to check', required: false },
      { name: 'lowStockOnly', type: 'boolean', description: 'Only return low stock items', required: false },
    ],
  },
  {
    name: 'create_order',
    description: 'Create a new order for a customer',
    parameters: [
      { name: 'customerId', type: 'string', description: 'Customer ID', required: true },
      { name: 'customerName', type: 'string', description: 'Customer name', required: true },
      { name: 'items', type: 'array', description: 'Array of {productId, qty, variant?}', required: true },
      { name: 'notes', type: 'string', description: 'Order notes', required: false },
    ],
  },
  {
    name: 'get_order_status',
    description: 'Get the current status of an order',
    parameters: [
      { name: 'orderId', type: 'string', description: 'Order ID or order number', required: true },
    ],
  },
  {
    name: 'update_order_status',
    description: 'Update the status of an order (requires confirmation for some statuses)',
    parameters: [
      { name: 'orderId', type: 'string', description: 'Order ID', required: true },
      { name: 'newStatus', type: 'string', description: 'New status', required: true, enum: ['CONFIRMED', 'PAID', 'READY', 'DELIVERED', 'CANCELLED'] },
      { name: 'note', type: 'string', description: 'Status change note', required: false },
    ],
  },
  {
    name: 'get_customer_info',
    description: 'Get information about a customer',
    parameters: [
      { name: 'customerId', type: 'string', description: 'Customer ID', required: false },
      { name: 'telegramId', type: 'string', description: 'Customer Telegram ID', required: false },
    ],
  },
  {
    name: 'get_customer_orders',
    description: 'Get order history for a customer',
    parameters: [
      { name: 'customerId', type: 'string', description: 'Customer ID', required: true },
      { name: 'limit', type: 'number', description: 'Max orders to return', required: false },
    ],
  },
  {
    name: 'send_notification',
    description: 'Send a notification message to a customer or shop owner',
    parameters: [
      { name: 'recipientType', type: 'string', description: 'Type of recipient', required: true, enum: ['customer', 'owner'] },
      { name: 'recipientId', type: 'string', description: 'Telegram chat ID of recipient', required: true },
      { name: 'message', type: 'string', description: 'Message to send', required: true },
    ],
  },
  {
    name: 'get_daily_stats',
    description: 'Get daily statistics for the shop',
    parameters: [
      { name: 'date', type: 'string', description: 'Date in YYYY-MM-DD format (defaults to today)', required: false },
    ],
  },
  {
    name: 'get_low_stock_items',
    description: 'Get all products that are below their low stock threshold',
    parameters: [],
  },
  {
    name: 'calculate_order_total',
    description: 'Calculate the total price for a list of items',
    parameters: [
      { name: 'items', type: 'array', description: 'Array of {productId, qty}', required: true },
    ],
  },
];
