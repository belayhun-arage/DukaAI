import { useState, useEffect } from 'react';
import {
  ShoppingCart,
  DollarSign,
  Clock,
  AlertTriangle,
  TrendingUp,
  Package,
  RefreshCw,
} from 'lucide-react';
import { useShop } from '../context/ShopContext';
import { analyticsApi } from '../services/api';
import { DashboardSkeleton } from '../components/Skeleton';
import type { DashboardStats, Order, Product } from '@dukaai/shared';

function getStatusBadge(status: string) {
  const classes: Record<string, string> = {
    NEW: 'badge badge-new',
    CONFIRMED: 'badge badge-confirmed',
    PAID: 'badge badge-paid',
    READY: 'badge badge-ready',
    DELIVERED: 'badge badge-delivered',
    CANCELLED: 'badge badge-cancelled',
  };
  return classes[status] || 'badge';
}

export default function Dashboard() {
  const { shop, isLoading: isShopLoading } = useShop();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const currency = shop?.settings?.currency || 'ETB';

  useEffect(() => {
    if (shop) {
      loadDashboard();
    }
  }, [shop]);

  async function loadDashboard() {
    if (!shop) return;

    setIsLoading(true);
    setError(null);
    try {
      const data = await analyticsApi.getDashboard();
      setStats(data);
    } catch (err: any) {
      console.error('Failed to load dashboard:', err);
      setError(err.message || 'Failed to load dashboard data');
    } finally {
      setIsLoading(false);
    }
  }

  // Show loading skeleton while shop is loading or data is loading
  if (isShopLoading || isLoading) {
    return <DashboardSkeleton />;
  }

  // Show placeholder if no shop selected (only after loading is complete)
  if (!shop) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-center">
        <Package className="w-16 h-16 text-gray-300 mb-4" />
        <h2 className="text-xl font-semibold text-gray-600 mb-2">No Shop Selected</h2>
        <p className="text-gray-500 mb-4">
          Create or select a shop to view your dashboard.
        </p>
        <a href="/settings" className="btn btn-primary">
          Go to Settings
        </a>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-center">
        <AlertTriangle className="w-16 h-16 text-red-300 mb-4" />
        <h2 className="text-xl font-semibold text-gray-600 mb-2">Error Loading Dashboard</h2>
        <p className="text-gray-500 mb-4">{error}</p>
        <button onClick={loadDashboard} className="btn btn-primary">
          Try Again
        </button>
      </div>
    );
  }

  const statCards = [
    {
      name: 'Orders Today',
      value: String(stats?.ordersToday || 0),
      icon: ShoppingCart,
      change: '',
      changeType: 'neutral',
    },
    {
      name: 'Revenue',
      value: `${currency} ${(stats?.revenue || 0).toLocaleString()}`,
      icon: DollarSign,
      change: '',
      changeType: 'neutral',
    },
    {
      name: 'Pending Orders',
      value: String(stats?.pendingCount || 0),
      icon: Clock,
      change: '',
      changeType: stats?.pendingCount && stats.pendingCount > 0 ? 'warning' : 'neutral',
    },
    {
      name: 'Low Stock Items',
      value: String(stats?.lowStockCount || 0),
      icon: AlertTriangle,
      change: '',
      changeType: stats?.lowStockCount && stats.lowStockCount > 0 ? 'negative' : 'neutral',
    },
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-500 mt-1">
            Welcome back! Here's what's happening with {shop.name}.
          </p>
        </div>
        <button
          onClick={loadDashboard}
          className="btn btn-secondary flex items-center gap-2"
          disabled={isLoading}
        >
          <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((stat) => (
          <div key={stat.name} className="card">
            <div className="flex items-center justify-between">
              <div className="w-12 h-12 bg-primary-50 rounded-xl flex items-center justify-center">
                <stat.icon className="w-6 h-6 text-primary-600" />
              </div>
              {stat.change && (
                <span
                  className={`text-sm font-medium ${
                    stat.changeType === 'positive'
                      ? 'text-green-600'
                      : stat.changeType === 'negative'
                      ? 'text-red-600'
                      : stat.changeType === 'warning'
                      ? 'text-amber-600'
                      : 'text-gray-500'
                  }`}
                >
                  {stat.change}
                </span>
              )}
            </div>
            <div className="mt-4">
              <h3 className="text-2xl font-bold text-gray-900">{stat.value}</h3>
              <p className="text-sm text-gray-500">{stat.name}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Recent Orders */}
        <div className="card">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-gray-900">Recent Orders</h2>
            <a href="/orders" className="text-sm text-primary-600 hover:text-primary-700">
              View all
            </a>
          </div>
          <div className="space-y-4">
            {stats?.recentOrders && stats.recentOrders.length > 0 ? (
              stats.recentOrders.slice(0, 5).map((order: Order) => (
                <div
                  key={order.id}
                  className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
                >
                  <div>
                    <p className="font-medium text-gray-900">{order.orderNumber}</p>
                    <p className="text-sm text-gray-500">{order.customerName}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium text-gray-900">
                      {currency} {order.totalAmount.toLocaleString()}
                    </p>
                    <span className={getStatusBadge(order.status)}>{order.status}</span>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-gray-500 text-center py-8">No orders today</p>
            )}
          </div>
        </div>

        {/* Top Products */}
        <div className="card">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-gray-900">Top Products</h2>
            <TrendingUp className="w-5 h-5 text-gray-400" />
          </div>
          <div className="space-y-4">
            {stats?.topProducts && stats.topProducts.length > 0 ? (
              stats.topProducts.slice(0, 5).map((product, index) => (
                <div
                  key={product.productId}
                  className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg"
                >
                  <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center">
                    <span className="text-sm font-bold text-primary-700">{index + 1}</span>
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">{product.productName}</p>
                    <p className="text-sm text-gray-500">{product.qty} units sold</p>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-gray-500 text-center py-8">No sales data yet</p>
            )}
          </div>
        </div>
      </div>

      {/* Low Stock Alert */}
      {stats?.lowStockProducts && stats.lowStockProducts.length > 0 && (
        <div className="card bg-amber-50 border-amber-200">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center flex-shrink-0">
              <Package className="w-5 h-5 text-amber-600" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-amber-900">Low Stock Alert</h3>
              <p className="text-sm text-amber-700 mt-1">
                {stats.lowStockProducts.length} product{stats.lowStockProducts.length > 1 ? 's are' : ' is'} running low on stock.
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {stats.lowStockProducts.slice(0, 5).map((product: Product) => (
                  <span
                    key={product.id}
                    className="inline-flex items-center px-2 py-1 bg-amber-100 text-amber-800 text-xs rounded-full"
                  >
                    {product.name} ({product.stockQty} left)
                  </span>
                ))}
              </div>
              <a
                href="/products?filter=low-stock"
                className="inline-block mt-3 text-sm font-medium text-amber-900 hover:text-amber-700"
              >
                View all low stock items
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
