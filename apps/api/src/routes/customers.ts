import { Router, Request, Response } from 'express';
import * as customerService from '../services/customer.service';
import * as orderService from '../services/order.service';
import { requireShop } from '../middleware/shopContext';

const router = Router();

// All customer routes require shop context
router.use(requireShop);

// List customers
router.get('/', async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const pageSize = parseInt(req.query.pageSize as string) || 20;
    const sortBy = (req.query.sortBy as 'totalSpent' | 'totalOrders' | 'lastOrderDate' | 'createdAt') || 'createdAt';
    const sortOrder = (req.query.sortOrder as 'asc' | 'desc') || 'desc';

    const result = await customerService.getCustomers(req.shopId!, {
      page,
      pageSize,
      sortBy,
      sortOrder,
    });

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error('Error listing customers:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to list customers',
    });
  }
});

// Get top customers by spending
router.get('/top', async (req: Request, res: Response) => {
  try {
    const limit = parseInt(req.query.limit as string) || 10;
    const customers = await customerService.getTopCustomers(req.shopId!, limit);

    res.json({
      success: true,
      data: customers,
    });
  } catch (error) {
    console.error('Error getting top customers:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get top customers',
    });
  }
});

// Get recent customers
router.get('/recent', async (req: Request, res: Response) => {
  try {
    const limit = parseInt(req.query.limit as string) || 10;
    const customers = await customerService.getRecentCustomers(req.shopId!, limit);

    res.json({
      success: true,
      data: customers,
    });
  } catch (error) {
    console.error('Error getting recent customers:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get recent customers',
    });
  }
});

// Get customer by ID with order history
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const customer = await customerService.getCustomerById(req.shopId!, req.params.id);

    if (!customer) {
      return res.status(404).json({
        success: false,
        error: 'Customer not found',
      });
    }

    // Get recent orders for this customer
    const orders = await orderService.getCustomerOrders(req.shopId!, req.params.id, 10);

    res.json({
      success: true,
      data: {
        ...customer,
        recentOrders: orders,
      },
    });
  } catch (error) {
    console.error('Error getting customer:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get customer',
    });
  }
});

// Create customer
router.post('/', async (req: Request, res: Response) => {
  try {
    const { telegramId, name, phone } = req.body;

    if (!telegramId || !name) {
      return res.status(400).json({
        success: false,
        error: 'telegramId and name are required',
      });
    }

    const customer = await customerService.createCustomer(req.shopId!, {
      telegramId,
      name,
      phone,
    });

    res.status(201).json({
      success: true,
      data: customer,
    });
  } catch (error) {
    console.error('Error creating customer:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create customer',
    });
  }
});

// Update customer
router.patch('/:id', async (req: Request, res: Response) => {
  try {
    const { name, phone } = req.body;
    const customer = await customerService.updateCustomer(req.shopId!, req.params.id, { name, phone });

    if (!customer) {
      return res.status(404).json({
        success: false,
        error: 'Customer not found',
      });
    }

    res.json({
      success: true,
      data: customer,
    });
  } catch (error) {
    console.error('Error updating customer:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update customer',
    });
  }
});

// Get customer orders
router.get('/:id/orders', async (req: Request, res: Response) => {
  try {
    const limit = parseInt(req.query.limit as string) || 20;
    const orders = await orderService.getCustomerOrders(req.shopId!, req.params.id, limit);

    res.json({
      success: true,
      data: orders,
    });
  } catch (error) {
    console.error('Error getting customer orders:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get customer orders',
    });
  }
});

export default router;
