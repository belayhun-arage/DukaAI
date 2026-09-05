import { useState } from 'react';
import { Search, Users, TrendingUp, AlertTriangle, Star, RefreshCw, X } from 'lucide-react';
import type { CustomerSegment, Order } from '@dukaai/shared';
import { useCustomers, useCustomerDetail } from '../hooks/useCustomers';
import { useShop } from '../context/ShopContext';
import { SkeletonTable, Skeleton } from '../components/Skeleton';

const segmentColors: Record<CustomerSegment, { bg: string; text: string; label: string }> = {
  CHAMPION: { bg: 'bg-green-100', text: 'text-green-800', label: 'Champion' },
  LOYAL: { bg: 'bg-blue-100', text: 'text-blue-800', label: 'Loyal' },
  POTENTIAL: { bg: 'bg-purple-100', text: 'text-purple-800', label: 'Potential' },
  AT_RISK: { bg: 'bg-amber-100', text: 'text-amber-800', label: 'At Risk' },
  LOST: { bg: 'bg-red-100', text: 'text-red-800', label: 'Lost' },
};

export default function Customers() {
  const { shop } = useShop();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);

  const {
    customers,
    pagination,
    isLoading,
    error,
    refetch,
  } = useCustomers({ sortBy: 'totalSpent', sortOrder: 'desc' });

  const { customer: selectedCustomer, isLoading: isLoadingDetail } = useCustomerDetail(selectedCustomerId);

  const currency = shop?.settings?.currency || 'ETB';

  const filteredCustomers = customers.filter(
    (customer) =>
      customer.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (customer.phone || '').includes(searchQuery)
  );

  const totalCustomers = pagination?.total || customers.length;
  const champions = customers.filter((c) => c.segment === 'CHAMPION').length;
  const atRisk = customers.filter((c) => c.segment === 'AT_RISK').length;
  const totalRevenue = customers.reduce((sum, c) => sum + c.totalSpent, 0);

  if (!shop) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-center">
        <Users className="w-16 h-16 text-gray-300 mb-4" />
        <h2 className="text-xl font-semibold text-gray-600 mb-2">No Shop Selected</h2>
        <p className="text-gray-500 mb-4">Create or select a shop to view customers.</p>
        <a href="/settings" className="btn btn-primary">Go to Settings</a>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-center">
        <AlertTriangle className="w-16 h-16 text-red-300 mb-4" />
        <h2 className="text-xl font-semibold text-gray-600 mb-2">Error Loading Customers</h2>
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
          <h1 className="text-2xl font-bold text-gray-900">Customers</h1>
          <p className="text-gray-500 mt-1">
            View and manage your customer relationships
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

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="card">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-primary-50 rounded-xl flex items-center justify-center">
              <Users className="w-6 h-6 text-primary-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{totalCustomers}</p>
              <p className="text-sm text-gray-500">Total Customers</p>
            </div>
          </div>
        </div>
        <div className="card">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-green-50 rounded-xl flex items-center justify-center">
              <Star className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{champions}</p>
              <p className="text-sm text-gray-500">Champions</p>
            </div>
          </div>
        </div>
        <div className="card">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-amber-50 rounded-xl flex items-center justify-center">
              <AlertTriangle className="w-6 h-6 text-amber-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{atRisk}</p>
              <p className="text-sm text-gray-500">At Risk</p>
            </div>
          </div>
        </div>
        <div className="card">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">
                {currency} {(totalRevenue / 1000).toFixed(0)}K
              </p>
              <p className="text-sm text-gray-500">Total Revenue</p>
            </div>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="card">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search by name or phone..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="input pl-10"
          />
        </div>
      </div>

      {/* Customers Table */}
      {isLoading && customers.length === 0 ? (
        <SkeletonTable rows={5} columns={6} />
      ) : (
        <div className="card overflow-hidden p-0">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-6 py-4 text-sm font-medium text-gray-500">Customer</th>
                <th className="text-left px-6 py-4 text-sm font-medium text-gray-500">Segment</th>
                <th className="text-left px-6 py-4 text-sm font-medium text-gray-500">Orders</th>
                <th className="text-left px-6 py-4 text-sm font-medium text-gray-500">Total Spent</th>
                <th className="text-left px-6 py-4 text-sm font-medium text-gray-500">Last Order</th>
                <th className="text-left px-6 py-4 text-sm font-medium text-gray-500">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredCustomers.map((customer) => {
                const segment = segmentColors[customer.segment];
                return (
                  <tr key={customer.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <p className="font-medium text-gray-900">{customer.name}</p>
                      <p className="text-sm text-gray-500">{customer.phone || 'No phone'}</p>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`badge ${segment.bg} ${segment.text}`}>{segment.label}</span>
                    </td>
                    <td className="px-6 py-4 text-gray-900">{customer.totalOrders}</td>
                    <td className="px-6 py-4 font-medium text-gray-900">
                      {currency} {customer.totalSpent.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 text-gray-500">
                      {customer.lastOrderDate
                        ? new Date(customer.lastOrderDate).toLocaleDateString()
                        : 'Never'}
                    </td>
                    <td className="px-6 py-4">
                      <button
                        onClick={() => setSelectedCustomerId(customer.id)}
                        className="text-primary-600 hover:text-primary-700 text-sm font-medium"
                      >
                        View Profile
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {filteredCustomers.length === 0 && (
            <div className="text-center py-12">
              <Users className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">No customers found</p>
            </div>
          )}
        </div>
      )}

      {/* Customer Detail Modal */}
      {selectedCustomerId && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b">
              <h2 className="text-lg font-semibold">Customer Profile</h2>
              <button
                onClick={() => setSelectedCustomerId(null)}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {isLoadingDetail ? (
              <div className="p-6 space-y-6">
                {/* Customer Info Skeleton */}
                <div className="text-center">
                  <Skeleton className="w-16 h-16 rounded-full mx-auto mb-4" />
                  <Skeleton className="h-6 w-32 mx-auto mb-2" />
                  <Skeleton className="h-4 w-24 mx-auto mb-2" />
                  <Skeleton className="h-6 w-20 mx-auto rounded-full" />
                </div>
                {/* Stats Skeleton */}
                <div className="grid grid-cols-3 gap-4">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="text-center p-4 bg-gray-50 rounded-lg">
                      <Skeleton className="h-8 w-12 mx-auto mb-2" />
                      <Skeleton className="h-4 w-16 mx-auto" />
                    </div>
                  ))}
                </div>
                {/* Orders Skeleton */}
                <div>
                  <Skeleton className="h-5 w-28 mb-3" />
                  <div className="space-y-3">
                    {Array.from({ length: 3 }).map((_, i) => (
                      <div key={i} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div className="space-y-1">
                          <Skeleton className="h-4 w-20" />
                          <Skeleton className="h-3 w-16" />
                        </div>
                        <div className="text-right space-y-1">
                          <Skeleton className="h-4 w-16" />
                          <Skeleton className="h-4 w-14 rounded-full" />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : selectedCustomer ? (
              <div className="p-6 space-y-6">
                {/* Customer Info */}
                <div className="text-center">
                  <div className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <span className="text-2xl font-bold text-primary-600">
                      {selectedCustomer.name.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900">{selectedCustomer.name}</h3>
                  {selectedCustomer.phone && (
                    <p className="text-gray-500">{selectedCustomer.phone}</p>
                  )}
                  <div className="mt-2">
                    <span className={`badge ${segmentColors[selectedCustomer.segment].bg} ${segmentColors[selectedCustomer.segment].text}`}>
                      {segmentColors[selectedCustomer.segment].label}
                    </span>
                  </div>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-3 gap-4">
                  <div className="text-center p-4 bg-gray-50 rounded-lg">
                    <p className="text-2xl font-bold text-gray-900">{selectedCustomer.totalOrders}</p>
                    <p className="text-sm text-gray-500">Orders</p>
                  </div>
                  <div className="text-center p-4 bg-gray-50 rounded-lg">
                    <p className="text-2xl font-bold text-gray-900">
                      {currency} {(selectedCustomer.totalSpent / 1000).toFixed(1)}K
                    </p>
                    <p className="text-sm text-gray-500">Spent</p>
                  </div>
                  <div className="text-center p-4 bg-gray-50 rounded-lg">
                    <p className="text-2xl font-bold text-gray-900">
                      {selectedCustomer.totalOrders > 0
                        ? Math.round(selectedCustomer.totalSpent / selectedCustomer.totalOrders).toLocaleString()
                        : 0}
                    </p>
                    <p className="text-sm text-gray-500">Avg Order</p>
                  </div>
                </div>

                {/* Recent Orders */}
                <div>
                  <h4 className="font-medium text-gray-900 mb-3">Recent Orders</h4>
                  {selectedCustomer.recentOrders && selectedCustomer.recentOrders.length > 0 ? (
                    <div className="space-y-3">
                      {selectedCustomer.recentOrders.slice(0, 5).map((order: Order) => (
                        <div
                          key={order.id}
                          className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                        >
                          <div>
                            <p className="font-medium text-gray-900">{order.orderNumber}</p>
                            <p className="text-sm text-gray-500">
                              {new Date(order.createdAt).toLocaleDateString()}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="font-medium">{currency} {order.totalAmount.toLocaleString()}</p>
                            <span className={`text-xs badge ${
                              order.status === 'DELIVERED' ? 'bg-green-100 text-green-800' :
                              order.status === 'CANCELLED' ? 'bg-red-100 text-red-800' :
                              'bg-blue-100 text-blue-800'
                            }`}>
                              {order.status}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-gray-500 text-center py-4">No orders yet</p>
                  )}
                </div>

                {/* Customer Since */}
                <div className="text-center text-sm text-gray-500 pt-4 border-t">
                  Customer since {new Date(selectedCustomer.createdAt).toLocaleDateString()}
                </div>
              </div>
            ) : (
              <div className="text-center py-12">
                <p className="text-gray-500">Customer not found</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
