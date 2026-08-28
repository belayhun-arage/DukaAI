import { useState } from 'react';
import { Search, Plus, Package, AlertTriangle } from 'lucide-react';

// Placeholder data
const products = [
  {
    id: '1',
    name: 'Teff Flour',
    variants: ['25kg', '50kg'],
    price: 500,
    stockQty: 45,
    lowStockThreshold: 10,
    category: 'Grains',
    isActive: true,
  },
  {
    id: '2',
    name: 'Sunflower Oil',
    variants: ['1L', '3L', '5L'],
    price: 400,
    stockQty: 8,
    lowStockThreshold: 15,
    category: 'Oils',
    isActive: true,
  },
  {
    id: '3',
    name: 'Sugar',
    variants: ['1kg', '5kg', '50kg'],
    price: 2000,
    stockQty: 120,
    lowStockThreshold: 20,
    category: 'Sweeteners',
    isActive: true,
  },
  {
    id: '4',
    name: 'Rice',
    variants: ['5kg', '25kg'],
    price: 1500,
    stockQty: 5,
    lowStockThreshold: 10,
    category: 'Grains',
    isActive: true,
  },
];

export default function Products() {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredProducts = products.filter((product) =>
    product.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const lowStockCount = products.filter((p) => p.stockQty <= p.lowStockThreshold).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Products</h1>
          <p className="text-gray-500 mt-1">Manage your product catalog and inventory</p>
        </div>
        <button className="btn-primary flex items-center gap-2">
          <Plus className="w-5 h-5" />
          Add Product
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="card">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-primary-50 rounded-xl flex items-center justify-center">
              <Package className="w-6 h-6 text-primary-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{products.length}</p>
              <p className="text-sm text-gray-500">Total Products</p>
            </div>
          </div>
        </div>
        <div className="card">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-green-50 rounded-xl flex items-center justify-center">
              <Package className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">
                {products.filter((p) => p.isActive).length}
              </p>
              <p className="text-sm text-gray-500">Active Products</p>
            </div>
          </div>
        </div>
        <div className="card">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-amber-50 rounded-xl flex items-center justify-center">
              <AlertTriangle className="w-6 h-6 text-amber-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{lowStockCount}</p>
              <p className="text-sm text-gray-500">Low Stock Items</p>
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
            placeholder="Search products..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="input pl-10"
          />
        </div>
      </div>

      {/* Products Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredProducts.map((product) => {
          const isLowStock = product.stockQty <= product.lowStockThreshold;
          return (
            <div key={product.id} className="card hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="font-semibold text-gray-900">{product.name}</h3>
                  <p className="text-sm text-gray-500">{product.category}</p>
                </div>
                {isLowStock && (
                  <span className="badge bg-amber-100 text-amber-800">Low Stock</span>
                )}
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500">Price</span>
                  <span className="font-medium text-gray-900">
                    ETB {product.price.toLocaleString()}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500">Stock</span>
                  <span
                    className={`font-medium ${isLowStock ? 'text-amber-600' : 'text-gray-900'}`}
                  >
                    {product.stockQty} units
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500">Variants</span>
                  <span className="text-gray-900">{product.variants.join(', ')}</span>
                </div>
              </div>

              <div className="flex gap-2 mt-6 pt-4 border-t border-gray-100">
                <button className="flex-1 btn-secondary text-sm">Edit</button>
                <button className="flex-1 btn-primary text-sm">Update Stock</button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
