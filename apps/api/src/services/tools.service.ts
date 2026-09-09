import { ToolCall, ToolResult, ToolName, TOOL_SCHEMAS } from '@dukaai/shared';
import * as productService from './product.service';
import * as orderService from './order.service';
import * as customerService from './customer.service';
import { getBot } from '../bot/telegram';

/**
 * Execute a tool call and return the result
 */
export async function executeTool(
  shopId: string,
  toolCall: ToolCall
): Promise<ToolResult> {
  const startTime = Date.now();

  try {
    const result = await executeToolInternal(shopId, toolCall.toolName as ToolName, toolCall.arguments);

    return {
      toolCallId: toolCall.id,
      toolName: toolCall.toolName,
      success: true,
      result,
      executionTimeMs: Date.now() - startTime,
    };
  } catch (error) {
    return {
      toolCallId: toolCall.id,
      toolName: toolCall.toolName,
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      executionTimeMs: Date.now() - startTime,
    };
  }
}

/**
 * Internal tool execution router
 */
async function executeToolInternal(
  shopId: string,
  toolName: ToolName,
  args: Record<string, unknown>
): Promise<unknown> {
  switch (toolName) {
    case 'search_products':
      return searchProducts(shopId, args);

    case 'get_product_details':
      return getProductDetails(shopId, args);

    case 'check_inventory':
      return checkInventory(shopId, args);

    case 'create_order':
      return createOrder(shopId, args);

    case 'get_order_status':
      return getOrderStatus(shopId, args);

    case 'update_order_status':
      return updateOrderStatus(shopId, args);

    case 'get_customer_info':
      return getCustomerInfo(shopId, args);

    case 'get_customer_orders':
      return getCustomerOrders(shopId, args);

    case 'send_notification':
      return sendNotification(args);

    case 'get_daily_stats':
      return getDailyStats(shopId, args);

    case 'get_low_stock_items':
      return getLowStockItems(shopId);

    case 'calculate_order_total':
      return calculateOrderTotal(shopId, args);

    default:
      throw new Error(`Unknown tool: ${toolName}`);
  }
}

// Tool implementations

async function searchProducts(shopId: string, args: Record<string, unknown>) {
  const query = args.query as string;
  const category = args.category as string | undefined;
  const inStockOnly = args.inStockOnly as boolean | undefined;

  const products = await productService.searchProducts(shopId, query);

  let filtered = products;

  if (category) {
    filtered = filtered.filter((p) => p.category?.toLowerCase() === category.toLowerCase());
  }

  if (inStockOnly) {
    filtered = filtered.filter((p) => p.stockQty > 0);
  }

  return {
    count: filtered.length,
    products: filtered.map((p) => ({
      id: p.id,
      name: p.name,
      price: p.price,
      stockQty: p.stockQty,
      category: p.category,
      variants: p.variants,
    })),
  };
}

async function getProductDetails(shopId: string, args: Record<string, unknown>) {
  const productId = args.productId as string;
  const product = await productService.getProductById(shopId, productId);

  if (!product) {
    throw new Error(`Product not found: ${productId}`);
  }

  return {
    id: product.id,
    name: product.name,
    description: product.description,
    price: product.price,
    stockQty: product.stockQty,
    lowStockThreshold: product.lowStockThreshold,
    category: product.category,
    variants: product.variants,
    isLowStock: product.stockQty <= product.lowStockThreshold,
    isOutOfStock: product.stockQty === 0,
  };
}

async function checkInventory(shopId: string, args: Record<string, unknown>) {
  const productIds = args.productIds as string[] | undefined;
  const lowStockOnly = args.lowStockOnly as boolean | undefined;

  if (lowStockOnly || !productIds) {
    const lowStock = await productService.getLowStockProducts(shopId);
    return {
      count: lowStock.length,
      items: lowStock.map((p) => ({
        id: p.id,
        name: p.name,
        stockQty: p.stockQty,
        threshold: p.lowStockThreshold,
        needsRestock: true,
      })),
    };
  }

  const items = await Promise.all(
    productIds.map(async (id) => {
      const product = await productService.getProductById(shopId, id);
      if (!product) return null;
      return {
        id: product.id,
        name: product.name,
        stockQty: product.stockQty,
        threshold: product.lowStockThreshold,
        needsRestock: product.stockQty <= product.lowStockThreshold,
      };
    })
  );

  return {
    count: items.filter(Boolean).length,
    items: items.filter(Boolean),
  };
}

async function createOrder(shopId: string, args: Record<string, unknown>) {
  const customerId = args.customerId as string;
  const customerName = args.customerName as string;
  const items = args.items as Array<{ productId: string; qty: number; variant?: string }>;
  const notes = args.notes as string | undefined;

  // Build order items with prices
  const orderItems = await Promise.all(
    items.map(async (item) => {
      const product = await productService.getProductById(shopId, item.productId);
      if (!product) {
        throw new Error(`Product not found: ${item.productId}`);
      }
      if (product.stockQty < item.qty) {
        throw new Error(`Insufficient stock for ${product.name}: requested ${item.qty}, available ${product.stockQty}`);
      }
      return {
        productId: item.productId,
        productName: product.name,
        qty: item.qty,
        unitPrice: product.price,
        variant: item.variant,
      };
    })
  );

  const totalAmount = orderItems.reduce((sum, item) => sum + item.qty * item.unitPrice, 0);

  // createOrder calculates totalAmount internally and handles stock decrement
  const order = await orderService.createOrder(shopId, {
    customerId,
    customerName,
    items: orderItems,
    notes,
    source: 'telegram',
  });

  return {
    orderId: order.id,
    orderNumber: order.orderNumber,
    totalAmount,
    itemCount: orderItems.length,
    status: order.status,
  };
}

async function getOrderStatus(shopId: string, args: Record<string, unknown>) {
  const orderId = args.orderId as string;

  // Try to find by ID first
  let order = await orderService.getOrderById(shopId, orderId);

  if (!order) {
    // Try to find by order number
    order = await orderService.getOrderByNumber(shopId, orderId);
  }

  if (!order) {
    throw new Error(`Order not found: ${orderId}`);
  }

  return {
    orderId: order.id,
    orderNumber: order.orderNumber,
    status: order.status,
    customerName: order.customerName,
    totalAmount: order.totalAmount,
    itemCount: order.items.length,
    createdAt: order.createdAt,
    statusHistory: order.statusHistory,
  };
}

async function updateOrderStatus(shopId: string, args: Record<string, unknown>) {
  const orderId = args.orderId as string;
  const newStatus = args.newStatus as string;
  const note = args.note as string | undefined;

  const order = await orderService.updateOrderStatus(shopId, orderId, newStatus as any, note);

  if (!order) {
    throw new Error(`Order not found: ${orderId}`);
  }

  return {
    orderId: order.id,
    orderNumber: order.orderNumber,
    previousStatus: order.statusHistory[order.statusHistory.length - 2]?.status,
    newStatus: order.status,
    updatedAt: order.updatedAt,
  };
}

async function getCustomerInfo(shopId: string, args: Record<string, unknown>) {
  const customerId = args.customerId as string | undefined;
  const telegramId = args.telegramId as string | undefined;

  let customer;

  if (customerId) {
    customer = await customerService.getCustomerById(shopId, customerId);
  } else if (telegramId) {
    customer = await customerService.getCustomerByTelegramId(shopId, telegramId);
  }

  if (!customer) {
    throw new Error('Customer not found');
  }

  return {
    id: customer.id,
    name: customer.name,
    telegramId: customer.telegramId,
    phone: customer.phone,
    totalOrders: customer.totalOrders,
    totalSpent: customer.totalSpent,
    segment: customer.segment,
    lastOrderDate: customer.lastOrderDate,
    memberSince: customer.createdAt,
  };
}

async function getCustomerOrders(shopId: string, args: Record<string, unknown>) {
  const customerId = args.customerId as string;
  const limit = (args.limit as number) || 10;

  // Use orderService to get orders filtered by customerId
  const ordersResponse = await orderService.getOrders(shopId, {
    customerId,
    pageSize: limit,
  });

  return {
    count: ordersResponse.data.length,
    orders: ordersResponse.data.map((o) => ({
      orderId: o.id,
      orderNumber: o.orderNumber,
      status: o.status,
      totalAmount: o.totalAmount,
      itemCount: o.items.length,
      createdAt: o.createdAt,
    })),
  };
}

async function sendNotification(args: Record<string, unknown>) {
  const recipientType = args.recipientType as 'customer' | 'owner';
  const recipientId = args.recipientId as string;
  const message = args.message as string;

  const bot = getBot();
  if (!bot) {
    throw new Error('Telegram bot not available');
  }

  await bot.sendMessage(parseInt(recipientId), message);

  return {
    sent: true,
    recipientType,
    recipientId,
    messageLength: message.length,
  };
}

async function getDailyStats(shopId: string, args: Record<string, unknown>) {
  const dateStr = args.date as string | undefined;
  const date = dateStr ? new Date(dateStr) : new Date();

  const stats = await orderService.getOrderStats(shopId);
  const todayOrders = await orderService.getTodayOrders(shopId);

  return {
    date: date.toISOString().split('T')[0],
    ordersCount: todayOrders.length,
    revenue: todayOrders.reduce((sum, o) => sum + o.totalAmount, 0),
    pendingCount: stats.byStatus.NEW + stats.byStatus.CONFIRMED,
    confirmedCount: stats.byStatus.CONFIRMED,
    deliveredCount: stats.byStatus.DELIVERED,
    averageOrderValue: todayOrders.length > 0
      ? todayOrders.reduce((sum, o) => sum + o.totalAmount, 0) / todayOrders.length
      : 0,
  };
}

async function getLowStockItems(shopId: string) {
  const lowStock = await productService.getLowStockProducts(shopId);

  return {
    count: lowStock.length,
    items: lowStock.map((p) => ({
      id: p.id,
      name: p.name,
      stockQty: p.stockQty,
      threshold: p.lowStockThreshold,
      deficit: p.lowStockThreshold - p.stockQty,
    })),
    urgent: lowStock.filter((p) => p.stockQty === 0).map((p) => p.name),
  };
}

async function calculateOrderTotal(shopId: string, args: Record<string, unknown>) {
  const items = args.items as Array<{ productId: string; qty: number }>;

  const lineItems = await Promise.all(
    items.map(async (item) => {
      const product = await productService.getProductById(shopId, item.productId);
      if (!product) {
        throw new Error(`Product not found: ${item.productId}`);
      }
      return {
        productId: item.productId,
        productName: product.name,
        qty: item.qty,
        unitPrice: product.price,
        subtotal: item.qty * product.price,
        inStock: product.stockQty >= item.qty,
      };
    })
  );

  const total = lineItems.reduce((sum, item) => sum + item.subtotal, 0);
  const allInStock = lineItems.every((item) => item.inStock);

  return {
    lineItems,
    total,
    allInStock,
    currency: 'ETB',
  };
}

/**
 * Get tool schemas for Gemini function calling
 */
export function getToolSchemas() {
  return TOOL_SCHEMAS;
}

/**
 * Format tool schemas for Gemini
 */
export function getToolSchemasForGemini() {
  return TOOL_SCHEMAS.map((tool) => ({
    name: tool.name,
    description: tool.description,
    parameters: {
      type: 'object',
      properties: Object.fromEntries(
        tool.parameters.map((p) => [
          p.name,
          {
            type: p.type === 'array' ? 'array' : p.type,
            description: p.description,
            ...(p.enum ? { enum: p.enum } : {}),
          },
        ])
      ),
      required: tool.parameters.filter((p) => p.required).map((p) => p.name),
    },
  }));
}
