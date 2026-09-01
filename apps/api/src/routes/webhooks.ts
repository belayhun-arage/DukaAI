import { Router, Request, Response } from 'express';
import { processUpdate, getBot } from '../bot/telegram';
import { config } from '../config';

const router = Router();

// Telegram webhook
router.post('/telegram', async (req: Request, res: Response) => {
  try {
    const update = req.body;

    if (!update) {
      return res.status(400).json({
        success: false,
        error: 'No update provided',
      });
    }

    // Process update asynchronously
    processUpdate(update).catch((err) => {
      console.error('Error processing Telegram update:', err);
    });

    // Always respond quickly to Telegram
    res.status(200).json({ ok: true });
  } catch (error) {
    console.error('Webhook error:', error);
    res.status(500).json({
      success: false,
      error: 'Webhook processing failed',
    });
  }
});

// Get webhook info (for debugging)
router.get('/telegram/info', async (req: Request, res: Response) => {
  try {
    const bot = getBot();

    if (!bot) {
      return res.json({
        success: true,
        data: {
          configured: false,
          message: 'Bot not configured',
        },
      });
    }

    const webhookInfo = await bot.getWebHookInfo();

    res.json({
      success: true,
      data: {
        configured: true,
        webhookUrl: webhookInfo.url,
        pendingUpdateCount: webhookInfo.pending_update_count,
        lastErrorDate: webhookInfo.last_error_date,
        lastErrorMessage: webhookInfo.last_error_message,
      },
    });
  } catch (error) {
    console.error('Error getting webhook info:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get webhook info',
    });
  }
});

// Set webhook URL (call this to configure Telegram webhook)
router.post('/telegram/set-webhook', async (req: Request, res: Response) => {
  try {
    const bot = getBot();

    if (!bot) {
      return res.status(400).json({
        success: false,
        error: 'Bot not configured',
      });
    }

    const webhookUrl = req.body.url || config.telegram.webhookUrl;

    if (!webhookUrl) {
      return res.status(400).json({
        success: false,
        error: 'Webhook URL is required',
      });
    }

    await bot.setWebHook(webhookUrl);

    res.json({
      success: true,
      data: {
        message: 'Webhook set successfully',
        url: webhookUrl,
      },
    });
  } catch (error) {
    console.error('Error setting webhook:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to set webhook',
    });
  }
});

// Delete webhook (for switching to polling mode)
router.delete('/telegram/webhook', async (req: Request, res: Response) => {
  try {
    const bot = getBot();

    if (!bot) {
      return res.status(400).json({
        success: false,
        error: 'Bot not configured',
      });
    }

    await bot.deleteWebHook();

    res.json({
      success: true,
      data: {
        message: 'Webhook deleted successfully',
      },
    });
  } catch (error) {
    console.error('Error deleting webhook:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete webhook',
    });
  }
});

export default router;
