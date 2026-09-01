import { Router, Request, Response } from 'express';
import * as orderService from '../services/order.service';
import * as productService from '../services/product.service';
import * as customerService from '../services/customer.service';
import { requireShop } from '../middleware/shopContext';
import { DashboardStats } from '@dukaai/shared';

const router = Router();

// All analytics routes require shop context
router.use(requireShop);

// Dashboard summary
router.get('/dashboard', async (req: Request, res: Response) => {
  try {
    const shopId = req.shopId!;

    // Get today's data
    const todayOrders = await orderService.getTodayOrders(shopId);
    const pendingOrders = await orderService.getPendingOrders(shopId);
    const lowStockProducts = await productService.getLowStockProducts(shopId);

    // Calculate today's revenue (excluding cancelled orders)
    const revenue = todayOrders
      .filter((o) => o.status !== 'CANCELLED')
      .reduce((sum, o) => sum + o.totalAmount, 0);

    // Get top products from today's orders
    const productCounts: Record<string, { productId: string; productName: string; qty: number }> = {};
    todayOrders.forEach((order) => {
      order.items.forEach((item) => {
        if (!productCounts[item.productId]) {
          productCounts[item.productId] = {
            productId: item.productId,
            productName: item.productName,
            qty: 0,
          };
        }
        productCounts[item.productId].qty += item.qty;
      });
    });

    const topProducts = Object.values(productCounts)
      .sort((a, b) => b.qty - a.qty)
      .slice(0, 5);

    // Get recent orders (last 10)
    const recentOrders = todayOrders.slice(0, 10);

    const stats: DashboardStats = {
      ordersToday: todayOrders.length,
      revenue,
      pendingCount: pendingOrders.length,
      lowStockCount: lowStockProducts.length,
      recentOrders,
      topProducts,
      lowStockProducts,
    };

    res.json({
      success: true,
      data: stats,
    });
  } catch (error: any) {
    console.error('Error getting dashboard stats:', error);
    res.status(500).json({
      success: false,
      error: process.env.NODE_ENV === 'development' ? error.message : 'Failed to get dashboard stats',
    });
  }
});

// Sales over time
router.get('/sales', async (req: Request, res: Response) => {
  try {
    const days = parseInt(req.query.days as string) || 7;
    const shopId = req.shopId!;

    const salesData: { date: string; orders: number; revenue: number }[] = [];

    for (let i = days - 1; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      date.setHours(0, 0, 0, 0);

      const nextDate = new Date(date);
      nextDate.setDate(nextDate.getDate() + 1);

      const stats = await orderService.getOrderStats(shopId, date, nextDate);

      salesData.push({
        date: date.toISOString().split('T')[0],
        orders: stats.totalOrders,
        revenue: stats.totalRevenue,
      });
    }

    res.json({
      success: true,
      data: salesData,
    });
  } catch (error) {
    console.error('Error getting sales data:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get sales data',
    });
  }
});

// Top selling products
router.get('/top-products', async (req: Request, res: Response) => {
  try {
    const days = parseInt(req.query.days as string) || 30;
    const limit = parseInt(req.query.limit as string) || 10;
    const shopId = req.shopId!;

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    startDate.setHours(0, 0, 0, 0);

    // Get all orders in date range
    const orders = (await orderService.getOrders(shopId, { pageSize: 1000, startDate })).items;

    // Aggregate product sales
    const productSales: Record<string, { productId: string; productName: string; qty: number; revenue: number }> = {};

    orders
      .filter((o) => o.status !== 'CANCELLED')
      .forEach((order) => {
        order.items.forEach((item) => {
          if (!productSales[item.productId]) {
            productSales[item.productId] = {
              productId: item.productId,
              productName: item.productName,
              qty: 0,
              revenue: 0,
            };
          }
          productSales[item.productId].qty += item.qty;
          productSales[item.productId].revenue += item.qty * item.unitPrice;
        });
      });

    const topProducts = Object.values(productSales)
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, limit);

    res.json({
      success: true,
      data: topProducts,
    });
  } catch (error) {
    console.error('Error getting top products:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get top products',
    });
  }
});

// Customer insights
router.get('/customers', async (req: Request, res: Response) => {
  try {
    const shopId = req.shopId!;

    const topCustomers = await customerService.getTopCustomers(shopId, 10);
    const recentCustomers = await customerService.getRecentCustomers(shopId, 10);

    // Get total customer count
    const allCustomers = await customerService.getCustomers(shopId, { pageSize: 1 });

    res.json({
      success: true,
      data: {
        totalCustomers: allCustomers.total,
        topBySpending: topCustomers,
        recentlyActive: recentCustomers,
      },
    });
  } catch (error) {
    console.error('Error getting customer insights:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get customer insights',
    });
  }
});

export default router;
