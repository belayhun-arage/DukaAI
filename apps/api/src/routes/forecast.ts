import { Router, Request, Response } from 'express';
import * as forecastService from '../services/forecast.service';

const router = Router();

/**
 * POST /api/forecast/generate
 * Generate a new demand forecast
 */
router.post('/generate', async (req: Request, res: Response) => {
  try {
    const shopId = req.headers['x-shop-id'] as string;
    if (!shopId) {
      return res.status(400).json({ success: false, error: 'Shop ID required' });
    }

    const { periodDays = 30 } = req.body;

    const report = await forecastService.generateForecast(shopId, periodDays);

    res.json({
      success: true,
      data: report,
    });
  } catch (error) {
    console.error('Generate forecast error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to generate forecast',
    });
  }
});

/**
 * GET /api/forecast/latest
 * Get the latest forecast report
 */
router.get('/latest', async (req: Request, res: Response) => {
  try {
    const shopId = req.headers['x-shop-id'] as string;
    if (!shopId) {
      return res.status(400).json({ success: false, error: 'Shop ID required' });
    }

    const report = await forecastService.getLatestForecast(shopId);

    if (!report) {
      return res.status(404).json({
        success: false,
        error: 'No forecast found. Generate one first.',
      });
    }

    res.json({
      success: true,
      data: report,
    });
  } catch (error) {
    console.error('Get latest forecast error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get forecast',
    });
  }
});

/**
 * GET /api/forecast/history
 * Get forecast history
 */
router.get('/history', async (req: Request, res: Response) => {
  try {
    const shopId = req.headers['x-shop-id'] as string;
    if (!shopId) {
      return res.status(400).json({ success: false, error: 'Shop ID required' });
    }

    const { limit } = req.query;
    const reports = await forecastService.getForecastHistory(
      shopId,
      limit ? parseInt(limit as string) : 10
    );

    res.json({
      success: true,
      data: reports,
    });
  } catch (error) {
    console.error('Get forecast history error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get forecast history',
    });
  }
});

/**
 * GET /api/forecast/restock
 * Get restock recommendations
 */
router.get('/restock', async (req: Request, res: Response) => {
  try {
    const shopId = req.headers['x-shop-id'] as string;
    if (!shopId) {
      return res.status(400).json({ success: false, error: 'Shop ID required' });
    }

    const recommendations = await forecastService.getRestockRecommendations(shopId);

    res.json({
      success: true,
      data: {
        recommendations,
        totalItems: recommendations.length,
        criticalCount: recommendations.filter(r => r.urgency === 'critical').length,
        highCount: recommendations.filter(r => r.urgency === 'high').length,
      },
    });
  } catch (error) {
    console.error('Get restock recommendations error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get recommendations',
    });
  }
});

/**
 * GET /api/forecast/summary
 * Get forecast summary (for Telegram)
 */
router.get('/summary', async (req: Request, res: Response) => {
  try {
    const shopId = req.headers['x-shop-id'] as string;
    if (!shopId) {
      return res.status(400).json({ success: false, error: 'Shop ID required' });
    }

    const summary = await forecastService.generateForecastSummary(shopId);

    res.json({
      success: true,
      data: { summary },
    });
  } catch (error) {
    console.error('Get forecast summary error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get summary',
    });
  }
});

/**
 * GET /api/forecast/product/:productId
 * Get prediction for a specific product
 */
router.get('/product/:productId', async (req: Request, res: Response) => {
  try {
    const shopId = req.headers['x-shop-id'] as string;
    if (!shopId) {
      return res.status(400).json({ success: false, error: 'Shop ID required' });
    }

    const { productId } = req.params;
    const report = await forecastService.getLatestForecast(shopId);

    if (!report) {
      return res.status(404).json({
        success: false,
        error: 'No forecast found. Generate one first.',
      });
    }

    const prediction = report.predictions.find(p => p.productId === productId);

    if (!prediction) {
      return res.status(404).json({
        success: false,
        error: 'Product not found in forecast',
      });
    }

    res.json({
      success: true,
      data: prediction,
    });
  } catch (error) {
    console.error('Get product prediction error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get prediction',
    });
  }
});

export default router;
