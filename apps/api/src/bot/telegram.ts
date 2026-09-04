import TelegramBot from 'node-telegram-bot-api';
import { config } from '../config';
import { isFirebaseInitialized } from '../config/firebase';
import * as shopService from '../services/shop.service';
import * as orderService from '../services/order.service';
import * as productService from '../services/product.service';
import * as customerService from '../services/customer.service';
import * as voiceService from '../services/voice.service';
import * as aiService from '../services/ai.service';
import * as sessionService from '../services/session.service';

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
  const userId = message.from?.id.toString() || '';
  const userName = message.from?.first_name || 'User';

  // Handle voice messages
  if (message.voice) {
    await handleVoiceMessage(chatId, userId, userName, message.voice);
    return;
  }

  // Handle audio files (some clients send voice as audio)
  if (message.audio) {
    await bot.sendMessage(
      chatId,
      'Please send a voice message (hold the mic button) instead of an audio file.'
    );
    return;
  }

  const text = message.text || '';

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

  try {
    // Send typing indicator
    await bot.sendChatAction(chatId, 'typing');

    // Detect intent using Gemini
    const intent = await aiService.detectIntent(text);

    switch (intent) {
      case 'GREETING':
        await bot.sendMessage(
          chatId,
          `Hello ${userName}! 👋\n\nHow can I help you today?\n\n` +
            `You can:\n` +
            `• Tell me what you'd like to order\n` +
            `• Ask about product prices or availability\n` +
            `• Type /help for more options`
        );
        break;

      case 'ORDER':
        await handleOrderIntent(chatId, userId, userName, text);
        break;

      case 'QUESTION':
        await handleQuestionIntent(chatId, userId, text);
        break;

      case 'STATUS_CHECK':
        await bot.sendMessage(
          chatId,
          `To check your order status, please provide your order number.\n\n` +
            `Example: "What's the status of ORD-ABC123?"`
        );
        break;

      case 'COMPLAINT':
        await bot.sendMessage(
          chatId,
          `I'm sorry to hear you're having an issue. 😔\n\n` +
            `Please describe your concern and we'll get back to you as soon as possible.\n\n` +
            `Or contact the shop owner directly for immediate assistance.`
        );
        break;

      default:
        await bot.sendMessage(
          chatId,
          `Thanks for your message! 📝\n\n` +
            `I'm not sure I understood. You can:\n` +
            `• Tell me what you'd like to order (e.g., "I need 2 phone cases")\n` +
            `• Ask about products (e.g., "What's the price of chargers?")\n` +
            `• Type /help for more options`
        );
    }
  } catch (error) {
    console.error('Error processing natural language:', error);
    await bot.sendMessage(
      chatId,
      `Sorry, I had trouble processing your message. Please try again or type /help for options.`
    );
  }
}

// Handle order intent - parse and create order
async function handleOrderIntent(
  chatId: number,
  userId: string,
  userName: string,
  text: string
): Promise<void> {
  if (!bot) return;

  // Find shop - first check if user owns a shop, otherwise use first available
  let shop = await shopService.getShopByOwnerTelegramId(userId);

  if (!shop) {
    const shops = await shopService.getAllShops();
    if (shops.length === 0) {
      await bot.sendMessage(
        chatId,
        `Sorry, no shops are available at the moment. Please try again later.`
      );
      return;
    }
    // Use the most recently created shop as default
    shop = shops[shops.length - 1];
  }
  const productsResponse = await productService.getProducts(shop.id, { activeOnly: true });
  const products = productsResponse.data;

  if (products.length === 0) {
    await bot.sendMessage(
      chatId,
      `Sorry, no products are available at the moment. Please try again later.`
    );
    return;
  }

  // Parse order using Gemini
  const parsedOrder = await aiService.parseOrder(text, products);

  if (parsedOrder.needsClarification || parsedOrder.items.length === 0) {
    await bot.sendMessage(
      chatId,
      parsedOrder.clarificationQuestion ||
        `I couldn't understand your order. Could you please rephrase?\n\n` +
        `Example: "I need 3 iPhone cases" or "2 chargers and 1 screen guard"`
    );
    return;
  }

  // Calculate total and prepare order items
  let totalAmount = 0;
  const orderItems: sessionService.PendingOrderItem[] = [];

  for (const item of parsedOrder.items) {
    const product = products.find((p) => p.id === item.matchedProductId);
    if (product) {
      const itemTotal = product.price * item.qty;
      totalAmount += itemTotal;
      orderItems.push({
        productId: product.id,
        productName: product.name,
        qty: item.qty,
        unitPrice: product.price,
        variant: item.variant,
      });
    }
  }

  if (orderItems.length === 0) {
    await bot.sendMessage(
      chatId,
      `Sorry, I couldn't find the products you mentioned. Please try again.`
    );
    return;
  }

  // Store pending order in session
  sessionService.createConfirmingSession(
    chatId,
    userId,
    userName,
    shop.id,
    orderItems,
    totalAmount
  );

  // Build confirmation message
  let confirmMessage = `📦 *Please Confirm Your Order*\n\n`;
  for (const item of orderItems) {
    confirmMessage += `• ${item.qty}x ${item.productName}`;
    if (item.variant) confirmMessage += ` (${item.variant})`;
    confirmMessage += ` - ${(item.unitPrice * item.qty).toLocaleString()} ${shop.settings.currency}\n`;
  }
  confirmMessage += `\n💰 *Total: ${totalAmount.toLocaleString()} ${shop.settings.currency}*`;

  // Send with inline keyboard buttons
  const keyboard: TelegramBot.InlineKeyboardMarkup = {
    inline_keyboard: [
      [
        { text: '✅ Confirm Order', callback_data: 'order:confirm' },
        { text: '❌ Cancel', callback_data: 'order:cancel' },
      ],
    ],
  };

  await bot.sendMessage(chatId, confirmMessage, {
    parse_mode: 'Markdown',
    reply_markup: keyboard,
  });
}

// Handle question intent - answer product questions
async function handleQuestionIntent(
  chatId: number,
  userId: string,
  text: string
): Promise<void> {
  if (!bot) return;

  // Find shop - first check if user owns a shop, otherwise use first available
  let shop = await shopService.getShopByOwnerTelegramId(userId);

  if (!shop) {
    const shops = await shopService.getAllShops();
    if (shops.length === 0) {
      await bot.sendMessage(chatId, `Sorry, no shop information is available at the moment.`);
      return;
    }
    shop = shops[shops.length - 1];
  }

  const productsResponse = await productService.getProducts(shop.id, { activeOnly: true });
  const products = productsResponse.data;

  const answer = await aiService.answerProductQuestion(text, products);
  await bot.sendMessage(chatId, answer);
}

// Handle voice messages
async function handleVoiceMessage(
  chatId: number,
  userId: string,
  userName: string,
  voice: TelegramBot.Voice
): Promise<void> {
  if (!bot) return;

  // Check if Groq is configured
  if (!voiceService.isGroqConfigured()) {
    await bot.sendMessage(
      chatId,
      'Voice messages are not available yet. Please type your message instead.'
    );
    return;
  }

  try {
    // Send typing indicator
    await bot.sendChatAction(chatId, 'typing');

    // Download voice file from Telegram
    const fileLink = await bot.getFileLink(voice.file_id);
    const response = await fetch(fileLink);

    if (!response.ok) {
      throw new Error(`Failed to download voice file: ${response.status}`);
    }

    const audioBuffer = Buffer.from(await response.arrayBuffer());

    // Transcribe using Groq Whisper
    console.log(`Transcribing voice message from user ${userId} (${voice.duration}s)`);
    const transcription = await voiceService.transcribeAudio(audioBuffer, 'voice.ogg');

    if (!transcription.text || transcription.text.trim() === '') {
      await bot.sendMessage(
        chatId,
        "Sorry, I couldn't understand the voice message. Please try again or type your message."
      );
      return;
    }

    const transcribedText = transcription.text.trim();
    console.log(`Transcription [${userId}]: "${transcribedText}" (lang: ${transcription.language})`);

    // Send acknowledgment with transcription
    await bot.sendMessage(
      chatId,
      `🎤 I heard: "${transcribedText}"\n\nProcessing...`
    );

    // Process as text (commands or natural language)
    if (transcribedText.toLowerCase().startsWith('/')) {
      // Handle as command
      const [command, ...args] = transcribedText.split(' ');
      await handleCommand(chatId, userId, userName, command.toLowerCase(), args);
    } else {
      // Handle as natural language order
      await handleNaturalLanguage(chatId, userId, userName, transcribedText);
    }

  } catch (error) {
    console.error('Error processing voice message:', error);
    await bot.sendMessage(
      chatId,
      "Sorry, I couldn't process your voice message. Please try again or type your message."
    );
  }
}

// Handle callback queries (button clicks)
async function handleCallbackQuery(query: TelegramBot.CallbackQuery): Promise<void> {
  if (!bot || !query.data) return;

  const chatId = query.message?.chat.id;
  if (!chatId) return;

  const userId = query.from.id.toString();
  const [action, subAction] = query.data.split(':');

  // Answer the callback to remove loading state
  await bot.answerCallbackQuery(query.id);

  if (action === 'order') {
    await handleOrderCallback(chatId, userId, subAction, query.message?.message_id);
  } else {
    console.log('Unknown callback action:', action);
  }
}

// Handle order confirmation/cancellation callbacks
async function handleOrderCallback(
  chatId: number,
  userId: string,
  action: string,
  messageId?: number
): Promise<void> {
  if (!bot) return;

  const session = sessionService.getSession(chatId);

  if (!session || session.state !== 'confirming') {
    await bot.sendMessage(chatId, 'This order has expired. Please start a new order.');
    return;
  }

  if (action === 'cancel') {
    // Cancel the order
    sessionService.deleteSession(chatId);

    // Edit the original message to show cancelled
    if (messageId) {
      try {
        await bot.editMessageText('❌ Order cancelled.', {
          chat_id: chatId,
          message_id: messageId,
        });
      } catch (err) {
        // Message might have been deleted
      }
    }

    await bot.sendMessage(chatId, 'Order cancelled. Feel free to start a new order anytime!');
    return;
  }

  if (action === 'confirm') {
    try {
      // Get shop details
      const shop = await shopService.getShopById(session.shopId);
      if (!shop) {
        await bot.sendMessage(chatId, 'Sorry, shop not found. Please try again.');
        sessionService.deleteSession(chatId);
        return;
      }

      // Get or create customer
      let customer = await customerService.getCustomerByTelegramId(shop.id, userId);
      if (!customer) {
        customer = await customerService.createCustomer(shop.id, {
          telegramId: userId,
          name: session.userName,
        });
      }

      // Create the order
      const order = await orderService.createOrder(shop.id, {
        customerId: customer.id,
        customerName: customer.name,
        items: session.pendingItems,
        source: 'telegram',
      });

      // Clear session
      sessionService.deleteSession(chatId);

      // Edit the original message
      if (messageId) {
        try {
          let editedMessage = `✅ *Order Confirmed!*\n\nOrder #: *${order.orderNumber}*\n\n`;
          for (const item of session.pendingItems) {
            editedMessage += `• ${item.qty}x ${item.productName}`;
            if (item.variant) editedMessage += ` (${item.variant})`;
            editedMessage += ` - ${(item.unitPrice * item.qty).toLocaleString()} ${shop.settings.currency}\n`;
          }
          editedMessage += `\n💰 *Total: ${session.totalAmount.toLocaleString()} ${shop.settings.currency}*`;

          await bot.editMessageText(editedMessage, {
            chat_id: chatId,
            message_id: messageId,
            parse_mode: 'Markdown',
          });
        } catch (err) {
          // Message might have been deleted
        }
      }

      // Send confirmation to customer
      await bot.sendMessage(
        chatId,
        `🎉 Your order *${order.orderNumber}* has been placed!\n\n` +
          `The shop owner will confirm it shortly. You'll receive a notification when it's ready.`,
        { parse_mode: 'Markdown' }
      );

      // Notify shop owner
      if (shop.ownerTelegramId && shop.ownerTelegramId !== userId) {
        const ownerMessage =
          `🆕 *New Order!*\n\n` +
          `Order #: *${order.orderNumber}*\n` +
          `Customer: ${customer.name}\n` +
          `Items: ${session.pendingItems.map((i) => `${i.qty}x ${i.productName}`).join(', ')}\n` +
          `Total: ${session.totalAmount.toLocaleString()} ${shop.settings.currency}\n\n` +
          `Reply /confirm ${order.orderNumber} to confirm.`;

        try {
          await bot.sendMessage(parseInt(shop.ownerTelegramId), ownerMessage, { parse_mode: 'Markdown' });
        } catch (err) {
          console.error('Failed to notify shop owner:', err);
        }
      }

    } catch (error) {
      console.error('Error creating order:', error);
      await bot.sendMessage(chatId, 'Sorry, there was an error creating your order. Please try again.');
      sessionService.deleteSession(chatId);
    }
  }
}
