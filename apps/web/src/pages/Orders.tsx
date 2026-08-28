import { useState } from 'react';
import { Search, Filter, Plus } from 'lucide-react';

// Placeholder data
const orders = [
  {
    id: 'ORD-001',
    orderNumber: '2024-001',
    customer: 'Abebe Kebede',
    items: [
      { name: 'Teff Flour (25kg)', qty: 2, price: 500 },
      { name: 'Sugar (50kg)', qty: 1, price: 2000 },
    ],
    total: 3000,
    status: 'NEW',
    source: 'telegram',
    createdAt: '2024-01-15T10:30:00Z',
  },
  {
    id: 'ORD-002',
    orderNumber: '2024-002',
    customer: 'Tigist Haile',
    items: [{ name: 'Sunflower Oil (3L)', qty: 3, price: 400 }],
    total: 1200,
    status: 'CONFIRMED',
    source: 'telegram',
    createdAt: '2024-01-15T11:45:00Z',
  },
  {
    id: 'ORD-003',
    orderNumber: '2024-003',
    customer: 'Dawit Assefa',
    items: [
      { name: 'Rice (25kg)', qty: 1, price: 1500 },
      { name: 'Pasta (500g)', qty: 10, price: 50 },
    ],
    total: 2000,
    status: 'PAID',
    source: 'dashboard',
    createdAt: '2024-01-15T14:20:00Z',
  },
];

const statusOptions = ['ALL', 'NEW', 'CONFIRMED', 'PAID', 'READY', 'DELIVERED', 'CANCELLED'];

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

export default function Orders() {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  const filteredOrders = orders.filter((order) => {
    const matchesSearch =
      order.orderNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.customer.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'ALL' || order.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Orders</h1>
          <p className="text-gray-500 mt-1">Manage and track customer orders</p>
        </div>
        <button className="btn-primary flex items-center gap-2">
          <Plus className="w-5 h-5" />
          New Order
        </button>
      </div>

      {/* Filters */}
      <div className="card">
        <div className="flex flex-col sm:flex-row gap-4">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search orders..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="input pl-10"
            />
          </div>

          {/* Status Filter */}
          <div className="flex items-center gap-2">
            <Filter className="w-5 h-5 text-gray-400" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="input w-auto"
            >
              {statusOptions.map((status) => (
                <option key={status} value={status}>
                  {status === 'ALL' ? 'All Status' : status}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Orders List */}
      <div className="card overflow-hidden p-0">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="text-left px-6 py-4 text-sm font-medium text-gray-500">Order</th>
              <th className="text-left px-6 py-4 text-sm font-medium text-gray-500">Customer</th>
              <th className="text-left px-6 py-4 text-sm font-medium text-gray-500">Items</th>
              <th className="text-left px-6 py-4 text-sm font-medium text-gray-500">Total</th>
              <th className="text-left px-6 py-4 text-sm font-medium text-gray-500">Status</th>
              <th className="text-left px-6 py-4 text-sm font-medium text-gray-500">Source</th>
              <th className="text-left px-6 py-4 text-sm font-medium text-gray-500">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {filteredOrders.map((order) => (
              <tr key={order.id} className="hover:bg-gray-50">
                <td className="px-6 py-4">
                  <p className="font-medium text-gray-900">{order.orderNumber}</p>
                  <p className="text-sm text-gray-500">
                    {new Date(order.createdAt).toLocaleDateString()}
                  </p>
                </td>
                <td className="px-6 py-4 text-gray-900">{order.customer}</td>
                <td className="px-6 py-4 text-gray-500">{order.items.length} items</td>
                <td className="px-6 py-4 font-medium text-gray-900">
                  ETB {order.total.toLocaleString()}
                </td>
                <td className="px-6 py-4">
                  <span className={getStatusBadge(order.status)}>{order.status}</span>
                </td>
                <td className="px-6 py-4">
                  <span className="text-sm text-gray-500 capitalize">{order.source}</span>
                </td>
                <td className="px-6 py-4">
                  <button className="text-primary-600 hover:text-primary-700 text-sm font-medium">
                    View
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {filteredOrders.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500">No orders found</p>
          </div>
        )}
      </div>
    </div>
  );
}
