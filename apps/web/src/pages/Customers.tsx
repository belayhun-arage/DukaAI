import { useState } from 'react';
import { Search, Users, TrendingUp, AlertTriangle, Star } from 'lucide-react';

// Placeholder data
const customers = [
  {
    id: '1',
    name: 'Abebe Kebede',
    phone: '+251911234567',
    totalOrders: 25,
    totalSpent: 45000,
    lastOrderDate: '2024-01-14',
    segment: 'CHAMPION',
  },
  {
    id: '2',
    name: 'Tigist Haile',
    phone: '+251922345678',
    totalOrders: 12,
    totalSpent: 18500,
    lastOrderDate: '2024-01-10',
    segment: 'LOYAL',
  },
  {
    id: '3',
    name: 'Dawit Assefa',
    phone: '+251933456789',
    totalOrders: 5,
    totalSpent: 7200,
    lastOrderDate: '2024-01-05',
    segment: 'POTENTIAL',
  },
  {
    id: '4',
    name: 'Sara Tesfaye',
    phone: '+251944567890',
    totalOrders: 3,
    totalSpent: 4500,
    lastOrderDate: '2023-12-15',
    segment: 'AT_RISK',
  },
];

const segmentColors: Record<string, { bg: string; text: string; label: string }> = {
  CHAMPION: { bg: 'bg-green-100', text: 'text-green-800', label: 'Champion' },
  LOYAL: { bg: 'bg-blue-100', text: 'text-blue-800', label: 'Loyal' },
  POTENTIAL: { bg: 'bg-purple-100', text: 'text-purple-800', label: 'Potential' },
  AT_RISK: { bg: 'bg-amber-100', text: 'text-amber-800', label: 'At Risk' },
  LOST: { bg: 'bg-red-100', text: 'text-red-800', label: 'Lost' },
};

export default function Customers() {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredCustomers = customers.filter(
    (customer) =>
      customer.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      customer.phone.includes(searchQuery)
  );

  const totalCustomers = customers.length;
  const champions = customers.filter((c) => c.segment === 'CHAMPION').length;
  const atRisk = customers.filter((c) => c.segment === 'AT_RISK').length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Customers</h1>
        <p className="text-gray-500 mt-1">View and manage your customer relationships</p>
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
                ETB {(customers.reduce((sum, c) => sum + c.totalSpent, 0) / 1000).toFixed(0)}K
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
                    <p className="text-sm text-gray-500">{customer.phone}</p>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`badge ${segment.bg} ${segment.text}`}>{segment.label}</span>
                  </td>
                  <td className="px-6 py-4 text-gray-900">{customer.totalOrders}</td>
                  <td className="px-6 py-4 font-medium text-gray-900">
                    ETB {customer.totalSpent.toLocaleString()}
                  </td>
                  <td className="px-6 py-4 text-gray-500">
                    {new Date(customer.lastOrderDate).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4">
                    <button className="text-primary-600 hover:text-primary-700 text-sm font-medium">
                      View Profile
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
