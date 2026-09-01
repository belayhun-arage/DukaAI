import { Router, Request, Response } from 'express';
import { config } from '../config';

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

// Keep-alive endpoint (prevents Render from sleeping)
router.post('/keep-alive', verifyCronSecret, async (req: Request, res: Response) => {
  res.json({
    success: true,
    data: {
      message: 'Server is alive',
      timestamp: new Date().toISOString(),
    },
  });
});

// Daily summary job
router.post('/daily-summary', verifyCronSecret, async (req: Request, res: Response) => {
  try {
    // TODO: Implement daily summary generation
    // 1. Get all shops
    // 2. For each shop, generate summary using Gemini
    // 3. Send summary via Telegram to shop owner

    res.json({
      success: true,
      data: {
        message: 'Daily summary job executed',
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

// Inventory check job
router.post('/inventory-check', verifyCronSecret, async (req: Request, res: Response) => {
  try {
    // TODO: Implement inventory check
    // 1. Get all shops
    // 2. For each shop, get low stock products
    // 3. Send alerts via Telegram to shop owner

    res.json({
      success: true,
      data: {
        message: 'Inventory check job executed',
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
