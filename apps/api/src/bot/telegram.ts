import TelegramBot from 'node-telegram-bot-api';
import { config } from '../config';
import { isFirebaseInitialized } from '../config/firebase';
import * as shopService from '../services/shop.service';
import * as orderService from '../services/order.service';
import * as productService from '../services/product.service';
import * as customerService from '../services/customer.service';

let bot: TelegramBot | null = null;

export function initializeBot(): TelegramBot | null {
  if (!config.telegram.botToken) {
    console.warn('Telegram bot token not configured');
    return null;
  }

  // Use polling for local development, webhooks for production
  const usePolling = config.isDev && !config.telegram.webhookUrl;

  // Bot options - use custom API URL if configured (for Cloudflare proxy)
  const botOptions: TelegramBot.ConstructorOptions = {
    polling: usePolling,
  };

  // Use Cloudflare Worker proxy if configured (bypasses Railway IP blocks)
  if (config.telegram.apiUrl) {
    botOptions.baseApiUrl = config.telegram.apiUrl;
    console.log(`Using Telegram API proxy: ${config.telegram.apiUrl}`);
  }

  bot = new TelegramBot(config.telegram.botToken, botOptions);

  if (usePolling) {
    console.log('Telegram bot initialized with polling mode');

    // Set up message handler for polling mode
    bot.on('message', (msg) => {
      processUpdate({ update_id: Date.now(), message: msg });
    });

    bot.on('callback_query', (query) => {
      processUpdate({ update_id: Date.now(), callback_query: query });
    });
  } else {
    console.log('Telegram bot initialized (webhook mode)');
  }

  return bot;
}

export function getBot(): TelegramBot | null {
  return bot;
}

// Process incoming Telegram update
export async function processUpdate(update: TelegramBot.Update): Promise<void> {
  if (!bot) {
    console.error('Bot not initialized');
    return;
  }

  try {
    if (update.message) {
      await handleMessage(update.message);
    } else if (update.callback_query) {
      await handleCallbackQuery(update.callback_query);
    }
  } catch (error) {
    console.error('Error processing update:', error);
  }
}

async function handleMessage(message: TelegramBot.Message): Promise<void> {
  if (!bot) return;

  const chatId = message.chat.id;
  const text = message.text || '';
  const userId = message.from?.id.toString() || '';
  const userName = message.from?.first_name || 'User';

  // Handle commands
  if (text.startsWith('/')) {
    const [command, ...args] = text.split(' ');
    await handleCommand(chatId, userId, userName, command.toLowerCase(), args);
    return;
  }

  // Handle natural language (order parsing will be done via Gemini)
  await handleNaturalLanguage(chatId, userId, userName, text);
}

async function handleCommand(
  chatId: number,
  userId: string,
  userName: string,
  command: string,
  args: string[]
): Promise<void> {
  if (!bot) return;

  switch (command) {
    case '/start':
      await handleStart(chatId, userId, userName);
      break;

    case '/help':
      await handleHelp(chatId, userId);
      break;

    case '/status':
      await handleStatus(chatId, userId);
      break;

    case '/orders':
      await handleOrders(chatId, userId);
      break;

    case '/inventory':
      await handleInventory(chatId, userId);
      break;

    case '/deliver':
      await handleDeliver(chatId, userId, args[0]);
      break;

    case '/pay':
      await handlePay(chatId, userId, args[0]);
      break;

    case '/confirm':
      await handleConfirm(chatId, userId, args[0]);
      break;

    default:
      await bot.sendMessage(chatId, 'Unknown command. Type /help for available commands.');
  }
}

// Command handlers
async function handleStart(chatId: number, userId: string, userName: string): Promise<void> {
  if (!bot) return;

  // Check if user is a shop owner
  const shop = await shopService.getShopByOwnerTelegramId(userId);

  if (shop) {
    await bot.sendMessage(
      chatId,
      `Welcome back, ${shop.ownerName}! 👋\n\n` +
        `Your shop "${shop.name}" is active.\n\n` +
        `Commands:\n` +
        `/status - Today's summary\n` +
        `/orders - Pending orders\n` +
        `/inventory - Low stock alerts\n` +
        `/help - All commands`
    );
  } else {
    // Check if they're a known customer
    // For now, treat them as potential customers
    await bot.sendMessage(
      chatId,
      `Welcome to DukaAI! 🛍️\n\n` +
        `I help small shops manage orders.\n\n` +
        `If you're a shop owner, contact the admin to set up your shop.\n\n` +
        `If you're a customer, just tell me what you'd like to order!`
    );
  }
}

async function handleHelp(chatId: number, userId: string): Promise<void> {
  if (!bot) return;

  const shop = await shopService.getShopByOwnerTelegramId(userId);

  if (shop) {
    await bot.sendMessage(
      chatId,
      `📋 *Shop Owner Commands*\n\n` +
        `/status - Today's summary\n` +
        `/orders - View pending orders\n` +
        `/inventory - Low stock alerts\n` +
        `/confirm <order#> - Confirm an order\n` +
        `/pay <order#> - Mark order as paid\n` +
        `/deliver <order#> - Mark order as delivered\n` +
        `/help - Show this message`,
      { parse_mode: 'Markdown' }
    );
  } else {
    await bot.sendMessage(
      chatId,
      `📋 *Customer Commands*\n\n` +
        `Just tell me what you want to order!\n` +
        `Example: "I need 3 iPhone cases"\n\n` +
        `/help - Show this message`,
      { parse_mode: 'Markdown' }
    );
  }
}

async function handleStatus(chatId: number, userId: string): Promise<void> {
  if (!bot) return;

  const shop = await shopService.getShopByOwnerTelegramId(userId);

  if (!shop) {
    await bot.sendMessage(chatId, '❌ You are not registered as a shop owner.');
    return;
  }

  try {
    const todayOrders = await orderService.getTodayOrders(shop.id);
    const pendingOrders = await orderService.getPendingOrders(shop.id);
    const lowStockProducts = await productService.getLowStockProducts(shop.id);

    const revenue = todayOrders
      .filter((o) => o.status !== 'CANCELLED')
      .reduce((sum, o) => sum + o.totalAmount, 0);

    const statusCounts = todayOrders.reduce(
      (acc, o) => {
        acc[o.status] = (acc[o.status] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>
    );

    let message = `📊 *Today's Summary*\n\n`;
    message += `📦 Orders: ${todayOrders.length}\n`;
    message += `💰 Revenue: ${revenue.toLocaleString()} ${shop.settings.currency}\n\n`;

    if (Object.keys(statusCounts).length > 0) {
      message += `*By Status:*\n`;
      if (statusCounts.NEW) message += `🆕 New: ${statusCounts.NEW}\n`;
      if (statusCounts.CONFIRMED) message += `✅ Confirmed: ${statusCounts.CONFIRMED}\n`;
      if (statusCounts.PAID) message += `💵 Paid: ${statusCounts.PAID}\n`;
      if (statusCounts.READY) message += `📦 Ready: ${statusCounts.READY}\n`;
      if (statusCounts.DELIVERED) message += `🚚 Delivered: ${statusCounts.DELIVERED}\n`;
      if (statusCounts.CANCELLED) message += `❌ Cancelled: ${statusCounts.CANCELLED}\n`;
    }

    if (pendingOrders.length > 0) {
      message += `\n⏳ *Pending:* ${pendingOrders.length} orders need attention`;
    }

    if (lowStockProducts.length > 0) {
      message += `\n\n⚠️ *Low Stock:*\n`;
      lowStockProducts.slice(0, 5).forEach((p) => {
        message += `• ${p.name}: ${p.stockQty} left\n`;
      });
    }

    await bot.sendMessage(chatId, message, { parse_mode: 'Markdown' });
  } catch (error) {
    console.error('Error getting status:', error);
    await bot.sendMessage(chatId, '❌ Error getting status. Please try again.');
  }
}

async function handleOrders(chatId: number, userId: string): Promise<void> {
  if (!bot) return;

  const shop = await shopService.getShopByOwnerTelegramId(userId);

  if (!shop) {
    await bot.sendMessage(chatId, '❌ You are not registered as a shop owner.');
    return;
  }

  try {
    const pendingOrders = await orderService.getPendingOrders(shop.id);

    if (pendingOrders.length === 0) {
      await bot.sendMessage(chatId, '✅ No pending orders!');
      return;
    }

    let message = `📋 *Pending Orders* (${pendingOrders.length})\n\n`;

    pendingOrders.slice(0, 10).forEach((order) => {
      const statusEmoji: Record<string, string> = {
        NEW: '🆕',
        CONFIRMED: '✅',
        PAID: '💵',
        READY: '📦',
        DELIVERED: '🚚',
        CANCELLED: '❌',
      };
      const emoji = statusEmoji[order.status] || '❓';

      message += `${emoji} *${order.orderNumber}*\n`;
      message += `   👤 ${order.customerName}\n`;
      message += `   💰 ${order.totalAmount.toLocaleString()} ${shop.settings.currency}\n`;
      message += `   📝 ${order.items.map((i) => `${i.qty}x ${i.productName}`).join(', ')}\n\n`;
    });

    if (pendingOrders.length > 10) {
      message += `... and ${pendingOrders.length - 10} more`;
    }

    await bot.sendMessage(chatId, message, { parse_mode: 'Markdown' });
  } catch (error) {
    console.error('Error getting orders:', error);
    await bot.sendMessage(chatId, '❌ Error getting orders. Please try again.');
  }
}

async function handleInventory(chatId: number, userId: string): Promise<void> {
  if (!bot) return;

  const shop = await shopService.getShopByOwnerTelegramId(userId);

  if (!shop) {
    await bot.sendMessage(chatId, '❌ You are not registered as a shop owner.');
    return;
  }

  try {
    const lowStockProducts = await productService.getLowStockProducts(shop.id);

    if (lowStockProducts.length === 0) {
      await bot.sendMessage(chatId, '✅ All products are well stocked!');
      return;
    }

    let message = `⚠️ *Low Stock Alert* (${lowStockProducts.length} items)\n\n`;

    lowStockProducts.forEach((product) => {
      const urgency = product.stockQty === 0 ? '🔴' : product.stockQty <= 5 ? '🟠' : '🟡';
      message += `${urgency} *${product.name}*\n`;
      message += `   Stock: ${product.stockQty} (threshold: ${product.lowStockThreshold})\n`;
      message += `   Price: ${product.price.toLocaleString()} ${shop.settings.currency}\n\n`;
    });

    await bot.sendMessage(chatId, message, { parse_mode: 'Markdown' });
  } catch (error) {
    console.error('Error getting inventory:', error);
    await bot.sendMessage(chatId, '❌ Error getting inventory. Please try again.');
  }
}

async function handleDeliver(chatId: number, userId: string, orderRef?: string): Promise<void> {
  if (!bot) return;

  if (!orderRef) {
    await bot.sendMessage(chatId, '❌ Please provide an order number: /deliver ORD-XXXXXX-XXXX');
    return;
  }

  const shop = await shopService.getShopByOwnerTelegramId(userId);

  if (!shop) {
    await bot.sendMessage(chatId, '❌ You are not registered as a shop owner.');
    return;
  }

  try {
    const order = await orderService.getOrderByNumber(shop.id, orderRef.toUpperCase());

    if (!order) {
      await bot.sendMessage(chatId, `❌ Order ${orderRef} not found.`);
      return;
    }

    const updatedOrder = await orderService.updateOrderStatus(shop.id, order.id, 'DELIVERED');

    await bot.sendMessage(
      chatId,
      `✅ Order *${order.orderNumber}* marked as DELIVERED!\n\n` +
        `👤 Customer: ${order.customerName}\n` +
        `💰 Amount: ${order.totalAmount.toLocaleString()} ${shop.settings.currency}`,
      { parse_mode: 'Markdown' }
    );

    // TODO: Notify customer
  } catch (error: any) {
    console.error('Error delivering order:', error);
    if (error.message?.includes('Invalid status transition')) {
      await bot.sendMessage(chatId, `❌ Cannot mark as delivered: ${error.message}`);
    } else {
      await bot.sendMessage(chatId, '❌ Error updating order. Please try again.');
    }
  }
}

async function handlePay(chatId: number, userId: string, orderRef?: string): Promise<void> {
  if (!bot) return;

  if (!orderRef) {
    await bot.sendMessage(chatId, '❌ Please provide an order number: /pay ORD-XXXXXX-XXXX');
    return;
  }

  const shop = await shopService.getShopByOwnerTelegramId(userId);

  if (!shop) {
    await bot.sendMessage(chatId, '❌ You are not registered as a shop owner.');
    return;
  }

  try {
    const order = await orderService.getOrderByNumber(shop.id, orderRef.toUpperCase());

    if (!order) {
      await bot.sendMessage(chatId, `❌ Order ${orderRef} not found.`);
      return;
    }

    const updatedOrder = await orderService.updateOrderStatus(shop.id, order.id, 'PAID');

    await bot.sendMessage(
      chatId,
      `💵 Order *${order.orderNumber}* marked as PAID!\n\n` +
        `👤 Customer: ${order.customerName}\n` +
        `💰 Amount: ${order.totalAmount.toLocaleString()} ${shop.settings.currency}`,
      { parse_mode: 'Markdown' }
    );
  } catch (error: any) {
    console.error('Error paying order:', error);
    if (error.message?.includes('Invalid status transition')) {
      await bot.sendMessage(chatId, `❌ Cannot mark as paid: ${error.message}`);
    } else {
      await bot.sendMessage(chatId, '❌ Error updating order. Please try again.');
    }
  }
}

async function handleConfirm(chatId: number, userId: string, orderRef?: string): Promise<void> {
  if (!bot) return;

  if (!orderRef) {
    await bot.sendMessage(chatId, '❌ Please provide an order number: /confirm ORD-XXXXXX-XXXX');
    return;
  }

  const shop = await shopService.getShopByOwnerTelegramId(userId);

  if (!shop) {
    await bot.sendMessage(chatId, '❌ You are not registered as a shop owner.');
    return;
  }

  try {
    const order = await orderService.getOrderByNumber(shop.id, orderRef.toUpperCase());

    if (!order) {
      await bot.sendMessage(chatId, `❌ Order ${orderRef} not found.`);
      return;
    }

    const updatedOrder = await orderService.updateOrderStatus(shop.id, order.id, 'CONFIRMED');

    await bot.sendMessage(
      chatId,
      `✅ Order *${order.orderNumber}* CONFIRMED!\n\n` +
        `👤 Customer: ${order.customerName}\n` +
        `💰 Amount: ${order.totalAmount.toLocaleString()} ${shop.settings.currency}\n` +
        `📝 Items: ${order.items.map((i) => `${i.qty}x ${i.productName}`).join(', ')}`,
      { parse_mode: 'Markdown' }
    );

    // TODO: Notify customer
  } catch (error: any) {
    console.error('Error confirming order:', error);
    if (error.message?.includes('Invalid status transition')) {
      await bot.sendMessage(chatId, `❌ Cannot confirm: ${error.message}`);
    } else {
      await bot.sendMessage(chatId, '❌ Error updating order. Please try again.');
    }
  }
}

// Handle natural language messages (for customer orders)
async function handleNaturalLanguage(
  chatId: number,
  userId: string,
  userName: string,
  text: string
): Promise<void> {
  if (!bot) return;

  // TODO: Integrate with Gemini AI for order parsing
  // For now, send a placeholder response
  await bot.sendMessage(
    chatId,
    `Thanks for your message! 📝\n\n` +
      `AI order parsing is coming soon. For now, please contact the shop directly.\n\n` +
      `Your message: "${text}"`
  );
}

// Handle callback queries (button clicks)
async function handleCallbackQuery(query: TelegramBot.CallbackQuery): Promise<void> {
  if (!bot || !query.data) return;

  const chatId = query.message?.chat.id;
  if (!chatId) return;

  const [action, ...params] = query.data.split(':');

  // Answer the callback to remove loading state
  await bot.answerCallbackQuery(query.id);

  // TODO: Handle callback actions (confirm order, etc.)
  switch (action) {
    case 'confirm_order':
      // Handle order confirmation
      break;
    case 'cancel_order':
      // Handle order cancellation
      break;
    default:
      console.log('Unknown callback action:', action);
  }
}
