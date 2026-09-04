import { Router, Request, Response } from 'express';
import { config } from '../config';
import * as shopService from '../services/shop.service';
import * as orderService from '../services/order.service';
import * as productService from '../services/product.service';
import * as aiService from '../services/ai.service';
import { getBot } from '../bot/telegram';

const router = Router();

// Middleware to verify cron secret
function verifyCronSecret(req: Request, res: Response, next: Function): void {
  const secret = req.headers['x-cron-secret'] as string;

  if (!config.cronSecret) {
    // No secret configured, allow in dev mode
    if (config.isDev) {
      return next();
    }
    res.status(500).json({
      success: false,
      error: 'Cron secret not configured',
    });
    return;
  }

  if (secret !== config.cronSecret) {
    res.status(401).json({
      success: false,
      error: 'Invalid cron secret',
    });
    return;
  }

  next();
}

// Keep-alive endpoint (prevents Railway from sleeping)
router.post('/keep-alive', verifyCronSecret, async (req: Request, res: Response) => {
  res.json({
    success: true,
    data: {
      message: 'Server is alive',
      timestamp: new Date().toISOString(),
    },
  });
});

// Daily summary job - sends AI-generated summary to shop owners
router.post('/daily-summary', verifyCronSecret, async (req: Request, res: Response) => {
  try {
    const bot = getBot();
    if (!bot) {
      console.warn('Telegram bot not available for daily summary');
      return res.json({
        success: true,
        data: {
          message: 'Daily summary skipped - bot not available',
          timestamp: new Date().toISOString(),
        },
      });
    }

    const shops = await shopService.getAllShops();
    const results: Array<{ shopId: string; shopName: string; status: string }> = [];

    for (const shop of shops) {
      try {
        if (!shop.ownerTelegramId) {
          results.push({ shopId: shop.id, shopName: shop.name, status: 'skipped - no telegram id' });
          continue;
        }

        // Get yesterday's date range
        const now = new Date();
        const yesterdayStart = new Date(now);
        yesterdayStart.setDate(yesterdayStart.getDate() - 1);
        yesterdayStart.setHours(0, 0, 0, 0);
        const yesterdayEnd = new Date(yesterdayStart);
        yesterdayEnd.setHours(23, 59, 59, 999);

        // Get orders from yesterday
        const ordersResponse = await orderService.getOrders(shop.id, { page: 1, pageSize: 100 });
        const yesterdayOrders = ordersResponse.data.filter((order) => {
          const orderDate = new Date(order.createdAt);
          return orderDate >= yesterdayStart && orderDate <= yesterdayEnd;
        });

        // Calculate stats
        const ordersCount = yesterdayOrders.length;
        const revenue = yesterdayOrders
          .filter((o) => o.status !== 'CANCELLED')
          .reduce((sum, o) => sum + o.totalAmount, 0);
        const pendingCount = yesterdayOrders.filter((o) => ['NEW', 'CONFIRMED'].includes(o.status)).length;
        const deliveredCount = yesterdayOrders.filter((o) => o.status === 'DELIVERED').length;
        const cancelledCount = yesterdayOrders.filter((o) => o.status === 'CANCELLED').length;

        // Get top products
        const productCounts: Record<string, { name: string; qty: number }> = {};
        for (const order of yesterdayOrders) {
          for (const item of order.items) {
            if (!productCounts[item.productId]) {
              productCounts[item.productId] = { name: item.productName, qty: 0 };
            }
            productCounts[item.productId].qty += item.qty;
          }
        }
        const topProducts = Object.values(productCounts)
          .sort((a, b) => b.qty - a.qty)
          .slice(0, 3);

        // Get low stock products
        const lowStockProducts = await productService.getLowStockProducts(shop.id);

        // Generate AI summary
        const summary = await aiService.generateDailySummary({
          ordersCount,
          revenue,
          currency: shop.settings.currency,
          pendingCount,
          deliveredCount,
          cancelledCount,
          topProducts,
          lowStockProducts: lowStockProducts.map((p) => ({ name: p.name, stockQty: p.stockQty })),
          inactiveCustomers: [], // TODO: implement inactive customer tracking
        });

        // Send to shop owner
        const message = `📊 *Daily Summary for ${shop.name}*\n` +
          `📅 ${yesterdayStart.toLocaleDateString()}\n\n` +
          summary;

        await bot.sendMessage(parseInt(shop.ownerTelegramId), message, { parse_mode: 'Markdown' });
        results.push({ shopId: shop.id, shopName: shop.name, status: 'sent' });

      } catch (shopError) {
        console.error(`Error processing daily summary for shop ${shop.id}:`, shopError);
        results.push({ shopId: shop.id, shopName: shop.name, status: 'error' });
      }
    }

    console.log('Daily summary results:', results);

    res.json({
      success: true,
      data: {
        message: 'Daily summary job executed',
        shopsProcessed: results.length,
        results,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error('Error running daily summary:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to run daily summary',
    });
  }
});

// Inventory check job - alerts shop owners about low stock items
router.post('/inventory-check', verifyCronSecret, async (req: Request, res: Response) => {
  try {
    const bot = getBot();
    if (!bot) {
      console.warn('Telegram bot not available for inventory check');
      return res.json({
        success: true,
        data: {
          message: 'Inventory check skipped - bot not available',
          timestamp: new Date().toISOString(),
        },
      });
    }

    const shops = await shopService.getAllShops();
    const results: Array<{ shopId: string; shopName: string; status: string; lowStockCount: number }> = [];

    for (const shop of shops) {
      try {
        if (!shop.ownerTelegramId) {
          results.push({ shopId: shop.id, shopName: shop.name, status: 'skipped - no telegram id', lowStockCount: 0 });
          continue;
        }

        // Get low stock products
        const lowStockProducts = await productService.getLowStockProducts(shop.id);

        if (lowStockProducts.length === 0) {
          results.push({ shopId: shop.id, shopName: shop.name, status: 'ok - no low stock', lowStockCount: 0 });
          continue;
        }

        // Build alert message
        let message = `⚠️ *Low Stock Alert - ${shop.name}*\n\n`;
        message += `${lowStockProducts.length} item(s) need restocking:\n\n`;

        for (const product of lowStockProducts) {
          const urgency = product.stockQty === 0 ? '🔴' : product.stockQty <= 5 ? '🟠' : '🟡';
          message += `${urgency} *${product.name}*\n`;
          message += `   Stock: ${product.stockQty} (threshold: ${product.lowStockThreshold})\n`;
        }

        message += `\nPlease restock soon to avoid stockouts.`;

        // Send to shop owner
        await bot.sendMessage(parseInt(shop.ownerTelegramId), message, { parse_mode: 'Markdown' });
        results.push({ shopId: shop.id, shopName: shop.name, status: 'alert sent', lowStockCount: lowStockProducts.length });

      } catch (shopError) {
        console.error(`Error processing inventory check for shop ${shop.id}:`, shopError);
        results.push({ shopId: shop.id, shopName: shop.name, status: 'error', lowStockCount: 0 });
      }
    }

    console.log('Inventory check results:', results);

    res.json({
      success: true,
      data: {
        message: 'Inventory check job executed',
        shopsProcessed: results.length,
        results,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error('Error running inventory check:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to run inventory check',
    });
  }
});

export default router;
