import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { TrendingUp, ShoppingCart, Users, DollarSign } from 'lucide-react';

// Placeholder data
const revenueData = [
  { date: 'Jan 1', revenue: 12000, orders: 8 },
  { date: 'Jan 2', revenue: 15000, orders: 12 },
  { date: 'Jan 3', revenue: 8500, orders: 6 },
  { date: 'Jan 4', revenue: 22000, orders: 15 },
  { date: 'Jan 5', revenue: 18000, orders: 11 },
  { date: 'Jan 6', revenue: 25000, orders: 18 },
  { date: 'Jan 7', revenue: 20000, orders: 14 },
];

const categoryData = [
  { name: 'Grains', value: 45000 },
  { name: 'Oils', value: 28000 },
  { name: 'Sweeteners', value: 35000 },
  { name: 'Dairy', value: 18000 },
  { name: 'Others', value: 12000 },
];

const COLORS = ['#22c55e', '#3b82f6', '#f59e0b', '#8b5cf6', '#6b7280'];

const customerSegments = [
  { segment: 'Champions', count: 15, color: '#22c55e' },
  { segment: 'Loyal', count: 25, color: '#3b82f6' },
  { segment: 'Potential', count: 40, color: '#8b5cf6' },
  { segment: 'At Risk', count: 12, color: '#f59e0b' },
  { segment: 'Lost', count: 8, color: '#ef4444' },
];

export default function Analytics() {
  const totalRevenue = revenueData.reduce((sum, d) => sum + d.revenue, 0);
  const totalOrders = revenueData.reduce((sum, d) => sum + d.orders, 0);
  const avgOrderValue = Math.round(totalRevenue / totalOrders);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Analytics</h1>
        <p className="text-gray-500 mt-1">Track your shop performance and insights</p>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="card">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-primary-50 rounded-xl flex items-center justify-center">
              <DollarSign className="w-6 h-6 text-primary-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">
                ETB {(totalRevenue / 1000).toFixed(0)}K
              </p>
              <p className="text-sm text-gray-500">Weekly Revenue</p>
            </div>
          </div>
        </div>
        <div className="card">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center">
              <ShoppingCart className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{totalOrders}</p>
              <p className="text-sm text-gray-500">Weekly Orders</p>
            </div>
          </div>
        </div>
        <div className="card">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-green-50 rounded-xl flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">ETB {avgOrderValue.toLocaleString()}</p>
              <p className="text-sm text-gray-500">Avg Order Value</p>
            </div>
          </div>
        </div>
        <div className="card">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-purple-50 rounded-xl flex items-center justify-center">
              <Users className="w-6 h-6 text-purple-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">100</p>
              <p className="text-sm text-gray-500">Total Customers</p>
            </div>
          </div>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue Chart */}
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 mb-6">Revenue Trend</h3>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={revenueData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="date" stroke="#6b7280" fontSize={12} />
                <YAxis stroke="#6b7280" fontSize={12} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#fff',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="revenue"
                  stroke="#22c55e"
                  strokeWidth={3}
                  dot={{ fill: '#22c55e', strokeWidth: 2, r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Orders Chart */}
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 mb-6">Daily Orders</h3>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={revenueData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="date" stroke="#6b7280" fontSize={12} />
                <YAxis stroke="#6b7280" fontSize={12} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#fff',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                  }}
                />
                <Bar dataKey="orders" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Bottom Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Category Breakdown */}
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 mb-6">Sales by Category</h3>
          <div className="h-64 flex items-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={categoryData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={2}
                  dataKey="value"
                >
                  {categoryData.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex flex-wrap justify-center gap-4 mt-4">
            {categoryData.map((cat, index) => (
              <div key={cat.name} className="flex items-center gap-2">
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: COLORS[index] }}
                />
                <span className="text-sm text-gray-600">{cat.name}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Customer Segments */}
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 mb-6">Customer Segments (RFM)</h3>
          <div className="space-y-4">
            {customerSegments.map((seg) => {
              const total = customerSegments.reduce((sum, s) => sum + s.count, 0);
              const percentage = ((seg.count / total) * 100).toFixed(0);
              return (
                <div key={seg.segment}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-700">{seg.segment}</span>
                    <span className="text-sm text-gray-500">
                      {seg.count} ({percentage}%)
                    </span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-2">
                    <div
                      className="h-2 rounded-full transition-all"
                      style={{
                        width: `${percentage}%`,
                        backgroundColor: seg.color,
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
