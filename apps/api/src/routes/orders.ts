import { Router, Request, Response } from 'express';
import * as orderService from '../services/order.service';
import { requireShop } from '../middleware/shopContext';
import { OrderStatus } from '@dukaai/shared';

const router = Router();

// All order routes require shop context
router.use(requireShop);

// List orders with filters
router.get('/', async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const pageSize = parseInt(req.query.pageSize as string) || 20;
    const status = req.query.status as OrderStatus | undefined;
    const customerId = req.query.customerId as string | undefined;

    const result = await orderService.getOrders(req.shopId!, {
      page,
      pageSize,
      status,
      customerId,
    });

    res.json({
      success: true,
      data: result,
    });
  } catch (error: any) {
    console.error('Error listing orders:', error);
    res.status(500).json({
      success: false,
      error: process.env.NODE_ENV === 'development' ? error.message : 'Failed to list orders',
    });
  }
});

// Get pending orders
router.get('/pending', async (req: Request, res: Response) => {
  try {
    const orders = await orderService.getPendingOrders(req.shopId!);

    res.json({
      success: true,
      data: orders,
    });
  } catch (error) {
    console.error('Error getting pending orders:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get pending orders',
    });
  }
});

// Get today's orders
router.get('/today', async (req: Request, res: Response) => {
  try {
    const orders = await orderService.getTodayOrders(req.shopId!);

    res.json({
      success: true,
      data: orders,
    });
  } catch (error: any) {
    console.error('Error getting today orders:', error);
    res.status(500).json({
      success: false,
      error: process.env.NODE_ENV === 'development' ? error.message : 'Failed to get today orders',
    });
  }
});

// Get order statistics
router.get('/stats', async (req: Request, res: Response) => {
  try {
    const startDate = req.query.startDate ? new Date(req.query.startDate as string) : undefined;
    const endDate = req.query.endDate ? new Date(req.query.endDate as string) : undefined;

    const stats = await orderService.getOrderStats(req.shopId!, startDate, endDate);

    res.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    console.error('Error getting order stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get order stats',
    });
  }
});

// Get order by ID
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const order = await orderService.getOrderById(req.shopId!, req.params.id);

    if (!order) {
      return res.status(404).json({
        success: false,
        error: 'Order not found',
      });
    }

    res.json({
      success: true,
      data: order,
    });
  } catch (error) {
    console.error('Error getting order:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get order',
    });
  }
});

// Create order (from dashboard)
router.post('/', async (req: Request, res: Response) => {
  try {
    const { customerId, customerName, items, notes } = req.body;

    if (!customerId || !customerName || !items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'customerId, customerName, and items array are required',
      });
    }

    // Validate items
    for (const item of items) {
      if (!item.productId || !item.productName || !item.qty || !item.unitPrice) {
        return res.status(400).json({
          success: false,
          error: 'Each item must have productId, productName, qty, and unitPrice',
        });
      }
    }

    const order = await orderService.createOrder(req.shopId!, {
      customerId,
      customerName,
      items,
      notes,
      source: 'dashboard',
    });

    res.status(201).json({
      success: true,
      data: order,
    });
  } catch (error: any) {
    console.error('Error creating order:', error);
    res.status(500).json({
      success: false,
      error: process.env.NODE_ENV === 'development' ? error.message : 'Failed to create order',
    });
  }
});

// Update order status
router.patch('/:id/status', async (req: Request, res: Response) => {
  try {
    const { status, note } = req.body;

    if (!status) {
      return res.status(400).json({
        success: false,
        error: 'status is required',
      });
    }

    const validStatuses: OrderStatus[] = ['NEW', 'CONFIRMED', 'PAID', 'READY', 'DELIVERED', 'CANCELLED'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        error: `Invalid status. Must be one of: ${validStatuses.join(', ')}`,
      });
    }

    const order = await orderService.updateOrderStatus(req.shopId!, req.params.id, status, note);

    if (!order) {
      return res.status(404).json({
        success: false,
        error: 'Order not found',
      });
    }

    res.json({
      success: true,
      data: order,
    });
  } catch (error: any) {
    console.error('Error updating order status:', error);

    if (error.message?.includes('Invalid status transition')) {
      return res.status(400).json({
        success: false,
        error: error.message,
      });
    }

    res.status(500).json({
      success: false,
      error: 'Failed to update order status',
    });
  }
});

export default router;
