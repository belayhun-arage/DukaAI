import {
  ShoppingCart,
  DollarSign,
  Clock,
  AlertTriangle,
  TrendingUp,
  Package,
} from 'lucide-react';

// Placeholder data - will be replaced with API calls
const stats = [
  { name: 'Orders Today', value: '12', icon: ShoppingCart, change: '+20%', changeType: 'positive' },
  { name: 'Revenue', value: 'ETB 15,430', icon: DollarSign, change: '+15%', changeType: 'positive' },
  { name: 'Pending Orders', value: '4', icon: Clock, change: '-2', changeType: 'positive' },
  { name: 'Low Stock Items', value: '3', icon: AlertTriangle, change: '+1', changeType: 'negative' },
];

const recentOrders = [
  { id: 'ORD-001', customer: 'Abebe Kebede', items: 3, total: 1250, status: 'NEW' },
  { id: 'ORD-002', customer: 'Tigist Haile', items: 1, total: 450, status: 'CONFIRMED' },
  { id: 'ORD-003', customer: 'Dawit Assefa', items: 5, total: 3200, status: 'PAID' },
  { id: 'ORD-004', customer: 'Sara Tesfaye', items: 2, total: 890, status: 'READY' },
];

const topProducts = [
  { name: 'Teff Flour (25kg)', sold: 45, revenue: 22500 },
  { name: 'Sunflower Oil (3L)', sold: 38, revenue: 15200 },
  { name: 'Sugar (50kg)', sold: 28, revenue: 56000 },
];

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
  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-500 mt-1">Welcome back! Here's what's happening with your shop.</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat) => (
          <div key={stat.name} className="card">
            <div className="flex items-center justify-between">
              <div className="w-12 h-12 bg-primary-50 rounded-xl flex items-center justify-center">
                <stat.icon className="w-6 h-6 text-primary-600" />
              </div>
              <span
                className={`text-sm font-medium ${
                  stat.changeType === 'positive' ? 'text-green-600' : 'text-red-600'
                }`}
              >
                {stat.change}
              </span>
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
            {recentOrders.map((order) => (
              <div
                key={order.id}
                className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
              >
                <div>
                  <p className="font-medium text-gray-900">{order.id}</p>
                  <p className="text-sm text-gray-500">{order.customer}</p>
                </div>
                <div className="text-right">
                  <p className="font-medium text-gray-900">ETB {order.total.toLocaleString()}</p>
                  <span className={getStatusBadge(order.status)}>{order.status}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Top Products */}
        <div className="card">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-gray-900">Top Products</h2>
            <TrendingUp className="w-5 h-5 text-gray-400" />
          </div>
          <div className="space-y-4">
            {topProducts.map((product, index) => (
              <div
                key={product.name}
                className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg"
              >
                <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center">
                  <span className="text-sm font-bold text-primary-700">{index + 1}</span>
                </div>
                <div className="flex-1">
                  <p className="font-medium text-gray-900">{product.name}</p>
                  <p className="text-sm text-gray-500">{product.sold} units sold</p>
                </div>
                <div className="text-right">
                  <p className="font-medium text-gray-900">
                    ETB {product.revenue.toLocaleString()}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Low Stock Alert */}
      <div className="card bg-amber-50 border-amber-200">
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center flex-shrink-0">
            <Package className="w-5 h-5 text-amber-600" />
          </div>
          <div>
            <h3 className="font-semibold text-amber-900">Low Stock Alert</h3>
            <p className="text-sm text-amber-700 mt-1">
              3 products are running low on stock. Restock soon to avoid stockouts.
            </p>
            <a
              href="/products?filter=low-stock"
              className="inline-block mt-3 text-sm font-medium text-amber-900 hover:text-amber-700"
            >
              View low stock items →
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
