import { useState } from 'react';
import { Search, Filter, RefreshCw, AlertTriangle, Package, X } from 'lucide-react';
import type { Order, OrderStatus } from '@dukaai/shared';
import { useOrders } from '../hooks/useOrders';
import { useShop } from '../context/ShopContext';
import { SkeletonTable } from '../components/Skeleton';

const statusOptions: (OrderStatus | 'ALL')[] = ['ALL', 'NEW', 'CONFIRMED', 'PAID', 'READY', 'DELIVERED', 'CANCELLED'];

const statusColors: Record<OrderStatus, { bg: string; text: string }> = {
  NEW: { bg: 'bg-blue-100', text: 'text-blue-800' },
  CONFIRMED: { bg: 'bg-purple-100', text: 'text-purple-800' },
  PAID: { bg: 'bg-green-100', text: 'text-green-800' },
  READY: { bg: 'bg-amber-100', text: 'text-amber-800' },
  DELIVERED: { bg: 'bg-gray-100', text: 'text-gray-800' },
  CANCELLED: { bg: 'bg-red-100', text: 'text-red-800' },
};

const nextStatus: Record<OrderStatus, OrderStatus | null> = {
  NEW: 'CONFIRMED',
  CONFIRMED: 'PAID',
  PAID: 'READY',
  READY: 'DELIVERED',
  DELIVERED: null,
  CANCELLED: null,
};

export default function Orders() {
  const { shop } = useShop();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<OrderStatus | 'ALL'>('ALL');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);

  const {
    orders,
    pagination,
    isLoading,
    error,
    refetch,
    updateStatus,
  } = useOrders({
    status: statusFilter === 'ALL' ? undefined : statusFilter,
  });

  const currency = shop?.settings?.currency || 'ETB';

  const filteredOrders = orders.filter((order) => {
    const matchesSearch =
      order.orderNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.customerName.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSearch;
  });

  const handleStatusUpdate = async (orderId: string, newStatus: OrderStatus) => {
    setIsUpdating(true);
    try {
      await updateStatus(orderId, newStatus);
      if (selectedOrder?.id === orderId) {
        setSelectedOrder({ ...selectedOrder, status: newStatus });
      }
    } catch (err: any) {
      alert(err.message || 'Failed to update status');
    } finally {
      setIsUpdating(false);
    }
  };

  if (!shop) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-center">
        <Package className="w-16 h-16 text-gray-300 mb-4" />
        <h2 className="text-xl font-semibold text-gray-600 mb-2">No Shop Selected</h2>
        <p className="text-gray-500 mb-4">Create or select a shop to view orders.</p>
        <a href="/settings" className="btn btn-primary">Go to Settings</a>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-center">
        <AlertTriangle className="w-16 h-16 text-red-300 mb-4" />
        <h2 className="text-xl font-semibold text-gray-600 mb-2">Error Loading Orders</h2>
        <p className="text-gray-500 mb-4">{error}</p>
        <button onClick={refetch} className="btn btn-primary">Try Again</button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Orders</h1>
          <p className="text-gray-500 mt-1">
            Manage and track customer orders
            {pagination && ` (${pagination.total} total)`}
          </p>
        </div>
        <button
          onClick={refetch}
          className="btn btn-secondary flex items-center gap-2"
          disabled={isLoading}
        >
          <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          Refresh
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
              onChange={(e) => setStatusFilter(e.target.value as OrderStatus | 'ALL')}
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
      {isLoading && orders.length === 0 ? (
        <SkeletonTable rows={5} columns={7} />
      ) : (
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
              {filteredOrders.map((order) => {
                const colors = statusColors[order.status];
                const next = nextStatus[order.status];
                return (
                  <tr key={order.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <p className="font-medium text-gray-900">{order.orderNumber}</p>
                      <p className="text-sm text-gray-500">
                        {new Date(order.createdAt).toLocaleDateString()}
                      </p>
                    </td>
                    <td className="px-6 py-4 text-gray-900">{order.customerName}</td>
                    <td className="px-6 py-4 text-gray-500">{order.items.length} items</td>
                    <td className="px-6 py-4 font-medium text-gray-900">
                      {currency} {order.totalAmount.toLocaleString()}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`badge ${colors.bg} ${colors.text}`}>{order.status}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-gray-500 capitalize">{order.source}</span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setSelectedOrder(order)}
                          className="text-primary-600 hover:text-primary-700 text-sm font-medium"
                        >
                          View
                        </button>
                        {next && (
                          <button
                            onClick={() => handleStatusUpdate(order.id, next)}
                            disabled={isUpdating}
                            className="text-green-600 hover:text-green-700 text-sm font-medium"
                          >
                            {next}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {filteredOrders.length === 0 && (
            <div className="text-center py-12">
              <p className="text-gray-500">No orders found</p>
            </div>
          )}
        </div>
      )}

      {/* Order Detail Modal */}
      {selectedOrder && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b">
              <h2 className="text-lg font-semibold">Order {selectedOrder.orderNumber}</h2>
              <button
                onClick={() => setSelectedOrder(null)}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Status */}
              <div className="flex items-center justify-between">
                <span className="text-gray-500">Status</span>
                <span className={`badge ${statusColors[selectedOrder.status].bg} ${statusColors[selectedOrder.status].text}`}>
                  {selectedOrder.status}
                </span>
              </div>

              {/* Customer */}
              <div className="flex items-center justify-between">
                <span className="text-gray-500">Customer</span>
                <span className="font-medium">{selectedOrder.customerName}</span>
              </div>

              {/* Date */}
              <div className="flex items-center justify-between">
                <span className="text-gray-500">Date</span>
                <span>{new Date(selectedOrder.createdAt).toLocaleString()}</span>
              </div>

              {/* Items */}
              <div>
                <h3 className="font-medium text-gray-900 mb-3">Items</h3>
                <div className="bg-gray-50 rounded-lg divide-y">
                  {selectedOrder.items.map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between p-3">
                      <div>
                        <p className="font-medium">{item.productName}</p>
                        {item.variant && (
                          <p className="text-sm text-gray-500">{item.variant}</p>
                        )}
                      </div>
                      <div className="text-right">
                        <p>{item.qty} x {currency} {item.unitPrice.toLocaleString()}</p>
                        <p className="font-medium">
                          {currency} {(item.qty * item.unitPrice).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Total */}
              <div className="flex items-center justify-between text-lg font-semibold border-t pt-4">
                <span>Total</span>
                <span>{currency} {selectedOrder.totalAmount.toLocaleString()}</span>
              </div>

              {/* Notes */}
              {selectedOrder.notes && (
                <div>
                  <h3 className="font-medium text-gray-900 mb-2">Notes</h3>
                  <p className="text-gray-600 bg-gray-50 p-3 rounded-lg">{selectedOrder.notes}</p>
                </div>
              )}

              {/* Status Actions */}
              {nextStatus[selectedOrder.status] && (
                <div className="pt-4 border-t">
                  <button
                    onClick={() => {
                      handleStatusUpdate(selectedOrder.id, nextStatus[selectedOrder.status]!);
                    }}
                    disabled={isUpdating}
                    className="btn btn-primary w-full"
                  >
                    {isUpdating ? 'Updating...' : `Mark as ${nextStatus[selectedOrder.status]}`}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
