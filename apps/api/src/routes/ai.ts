import { Router, Request, Response } from 'express';
import * as aiService from '../services/ai.service';
import * as productService from '../services/product.service';
import { requireShop } from '../middleware/shopContext';

const router = Router();

// Parse an order from natural language
router.post('/parse-order', requireShop, async (req: Request, res: Response) => {
  try {
    const { message, language } = req.body;

    if (!message) {
      return res.status(400).json({
        success: false,
        error: 'message is required',
      });
    }

    // Get shop's products
    const productsResult = await productService.getProducts(req.shopId!, {
      activeOnly: true,
      pageSize: 100,
    });

    const parsedOrder = await aiService.parseOrder(
      message,
      productsResult.data,
      language || 'en'
    );

    res.json({
      success: true,
      data: parsedOrder,
    });
  } catch (error) {
    console.error('Error parsing order:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to parse order',
    });
  }
});

// Detect message intent
router.post('/detect-intent', async (req: Request, res: Response) => {
  try {
    const { message } = req.body;

    if (!message) {
      return res.status(400).json({
        success: false,
        error: 'message is required',
      });
    }

    const intent = await aiService.detectIntent(message);

    res.json({
      success: true,
      data: { intent },
    });
  } catch (error) {
    console.error('Error detecting intent:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to detect intent',
    });
  }
});

// Answer a product question
router.post('/answer-question', requireShop, async (req: Request, res: Response) => {
  try {
    const { question } = req.body;

    if (!question) {
      return res.status(400).json({
        success: false,
        error: 'question is required',
      });
    }

    // Get shop's products
    const productsResult = await productService.getProducts(req.shopId!, {
      activeOnly: true,
      pageSize: 100,
    });

    const answer = await aiService.answerProductQuestion(question, productsResult.data);

    res.json({
      success: true,
      data: { answer },
    });
  } catch (error) {
    console.error('Error answering question:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to answer question',
    });
  }
});

// Generate daily summary
router.post('/generate-summary', requireShop, async (req: Request, res: Response) => {
  try {
    const {
      ordersCount = 0,
      revenue = 0,
      currency = 'ETB',
      pendingCount = 0,
      deliveredCount = 0,
      cancelledCount = 0,
      topProducts = [],
      lowStockProducts = [],
      inactiveCustomers = [],
    } = req.body;

    const summary = await aiService.generateDailySummary({
      ordersCount,
      revenue,
      currency,
      pendingCount,
      deliveredCount,
      cancelledCount,
      topProducts,
      lowStockProducts,
      inactiveCustomers,
    });

    res.json({
      success: true,
      data: { summary },
    });
  } catch (error) {
    console.error('Error generating summary:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate summary',
    });
  }
});

export default router;
