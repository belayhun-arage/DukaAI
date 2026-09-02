import { useState } from 'react';
import { Search, Plus, Package, AlertTriangle, RefreshCw, X, Trash2, Edit2 } from 'lucide-react';
import type { Product } from '@dukaai/shared';
import { useProducts, useLowStockProducts } from '../hooks/useProducts';
import { useShop } from '../context/ShopContext';

interface ProductFormData {
  name: string;
  price: number;
  stockQty: number;
  description: string;
  variants: string;
  lowStockThreshold: number;
  category: string;
}

const emptyForm: ProductFormData = {
  name: '',
  price: 0,
  stockQty: 0,
  description: '',
  variants: '',
  lowStockThreshold: 10,
  category: '',
};

export default function Products() {
  const { shop } = useShop();
  const [searchQuery, setSearchQuery] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [showStockModal, setShowStockModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [formData, setFormData] = useState<ProductFormData>(emptyForm);
  const [stockChange, setStockChange] = useState({ productId: '', productName: '', quantity: 0, mode: 'set' as 'set' | 'add' | 'subtract' });
  const [isSaving, setIsSaving] = useState(false);

  const {
    products,
    pagination,
    isLoading,
    error,
    refetch,
    createProduct,
    updateProduct,
    updateStock,
    deleteProduct,
  } = useProducts();

  const { products: lowStockProducts } = useLowStockProducts();

  const currency = shop?.settings?.currency || 'ETB';

  const filteredProducts = products.filter((product) =>
    product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (product.category || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  const activeCount = products.filter((p) => p.isActive).length;
  const lowStockCount = lowStockProducts.length;

  const openCreateModal = () => {
    setEditingProduct(null);
    setFormData(emptyForm);
    setShowModal(true);
  };

  const openEditModal = (product: Product) => {
    setEditingProduct(product);
    setFormData({
      name: product.name,
      price: product.price,
      stockQty: product.stockQty,
      description: product.description || '',
      variants: (product.variants || []).join(', '),
      lowStockThreshold: product.lowStockThreshold,
      category: product.category || '',
    });
    setShowModal(true);
  };

  const openStockModal = (product: Product) => {
    setStockChange({
      productId: product.id,
      productName: product.name,
      quantity: product.stockQty,
      mode: 'set',
    });
    setShowStockModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);

    try {
      const data = {
        name: formData.name,
        price: formData.price,
        stockQty: formData.stockQty,
        description: formData.description || undefined,
        variants: formData.variants ? formData.variants.split(',').map((v) => v.trim()) : undefined,
        lowStockThreshold: formData.lowStockThreshold,
        category: formData.category || undefined,
      };

      if (editingProduct) {
        await updateProduct(editingProduct.id, data);
      } else {
        await createProduct(data);
      }

      setShowModal(false);
      setFormData(emptyForm);
      setEditingProduct(null);
    } catch (err: any) {
      alert(err.message || 'Failed to save product');
    } finally {
      setIsSaving(false);
    }
  };

  const handleStockUpdate = async () => {
    setIsSaving(true);
    try {
      if (stockChange.mode === 'set') {
        await updateStock(stockChange.productId, stockChange.quantity);
      } else {
        const delta = stockChange.mode === 'add' ? stockChange.quantity : -stockChange.quantity;
        await updateStock(stockChange.productId, undefined, delta);
      }
      setShowStockModal(false);
    } catch (err: any) {
      alert(err.message || 'Failed to update stock');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (product: Product) => {
    if (!confirm(`Delete "${product.name}"? This action cannot be undone.`)) return;

    try {
      await deleteProduct(product.id);
    } catch (err: any) {
      alert(err.message || 'Failed to delete product');
    }
  };

  if (!shop) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-center">
        <Package className="w-16 h-16 text-gray-300 mb-4" />
        <h2 className="text-xl font-semibold text-gray-600 mb-2">No Shop Selected</h2>
        <p className="text-gray-500 mb-4">Create or select a shop to manage products.</p>
        <a href="/settings" className="btn btn-primary">Go to Settings</a>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-center">
        <AlertTriangle className="w-16 h-16 text-red-300 mb-4" />
        <h2 className="text-xl font-semibold text-gray-600 mb-2">Error Loading Products</h2>
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
          <h1 className="text-2xl font-bold text-gray-900">Products</h1>
          <p className="text-gray-500 mt-1">
            Manage your product catalog and inventory
            {pagination && ` (${pagination.total} total)`}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={refetch}
            className="btn btn-secondary flex items-center gap-2"
            disabled={isLoading}
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
          <button onClick={openCreateModal} className="btn btn-primary flex items-center gap-2">
            <Plus className="w-5 h-5" />
            Add Product
          </button>
        </div>
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
              <p className="text-2xl font-bold text-gray-900">{activeCount}</p>
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
      {isLoading && products.length === 0 ? (
        <div className="flex items-center justify-center py-12">
          <RefreshCw className="w-8 h-8 text-primary-600 animate-spin" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredProducts.map((product) => {
            const isLowStock = product.stockQty <= product.lowStockThreshold;
            return (
              <div key={product.id} className="card hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="font-semibold text-gray-900">{product.name}</h3>
                    <p className="text-sm text-gray-500">{product.category || 'Uncategorized'}</p>
                  </div>
                  <div className="flex items-center gap-1">
                    {isLowStock && (
                      <span className="badge bg-amber-100 text-amber-800">Low Stock</span>
                    )}
                    {!product.isActive && (
                      <span className="badge bg-gray-100 text-gray-800">Inactive</span>
                    )}
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500">Price</span>
                    <span className="font-medium text-gray-900">
                      {currency} {product.price.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500">Stock</span>
                    <span className={`font-medium ${isLowStock ? 'text-amber-600' : 'text-gray-900'}`}>
                      {product.stockQty} units
                    </span>
                  </div>
                  {product.variants && product.variants.length > 0 && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-500">Variants</span>
                      <span className="text-gray-900">{product.variants.join(', ')}</span>
                    </div>
                  )}
                </div>

                <div className="flex gap-2 mt-6 pt-4 border-t border-gray-100">
                  <button
                    onClick={() => openEditModal(product)}
                    className="flex-1 btn btn-secondary text-sm flex items-center justify-center gap-1"
                  >
                    <Edit2 className="w-4 h-4" />
                    Edit
                  </button>
                  <button
                    onClick={() => openStockModal(product)}
                    className="flex-1 btn btn-primary text-sm"
                  >
                    Update Stock
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {filteredProducts.length === 0 && !isLoading && (
        <div className="text-center py-12">
          <Package className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500">No products found</p>
          <button onClick={openCreateModal} className="btn btn-primary mt-4">
            Add your first product
          </button>
        </div>
      )}

      {/* Product Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b">
              <h2 className="text-lg font-semibold">
                {editingProduct ? 'Edit Product' : 'Add Product'}
              </h2>
              <button
                onClick={() => setShowModal(false)}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="input"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Price ({currency}) *</label>
                  <input
                    type="number"
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: Number(e.target.value) })}
                    className="input"
                    min="0"
                    step="0.01"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Stock Qty *</label>
                  <input
                    type="number"
                    value={formData.stockQty}
                    onChange={(e) => setFormData({ ...formData, stockQty: Number(e.target.value) })}
                    className="input"
                    min="0"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                <input
                  type="text"
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className="input"
                  placeholder="e.g., Grains, Oils, Dairy"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Variants (comma-separated)
                </label>
                <input
                  type="text"
                  value={formData.variants}
                  onChange={(e) => setFormData({ ...formData, variants: e.target.value })}
                  className="input"
                  placeholder="e.g., 1kg, 5kg, 25kg"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Low Stock Threshold</label>
                <input
                  type="number"
                  value={formData.lowStockThreshold}
                  onChange={(e) => setFormData({ ...formData, lowStockThreshold: Number(e.target.value) })}
                  className="input"
                  min="0"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="input"
                  rows={3}
                />
              </div>

              <div className="flex gap-3 pt-4">
                {editingProduct && (
                  <button
                    type="button"
                    onClick={() => {
                      handleDelete(editingProduct);
                      setShowModal(false);
                    }}
                    className="btn btn-secondary text-red-600 hover:bg-red-50"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 btn btn-secondary"
                >
                  Cancel
                </button>
                <button type="submit" className="flex-1 btn btn-primary" disabled={isSaving}>
                  {isSaving ? 'Saving...' : editingProduct ? 'Save Changes' : 'Add Product'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Stock Update Modal */}
      {showStockModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-sm w-full">
            <div className="flex items-center justify-between p-6 border-b">
              <h2 className="text-lg font-semibold">Update Stock</h2>
              <button
                onClick={() => setShowStockModal(false)}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <p className="text-gray-600">
                Updating stock for <strong>{stockChange.productName}</strong>
              </p>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Mode</label>
                <div className="flex gap-2">
                  {(['set', 'add', 'subtract'] as const).map((mode) => (
                    <button
                      key={mode}
                      type="button"
                      onClick={() => setStockChange({ ...stockChange, mode, quantity: mode === 'set' ? stockChange.quantity : 0 })}
                      className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium border ${
                        stockChange.mode === mode
                          ? 'bg-primary-600 text-white border-primary-600'
                          : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      {mode.charAt(0).toUpperCase() + mode.slice(1)}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {stockChange.mode === 'set' ? 'New Quantity' : 'Amount'}
                </label>
                <input
                  type="number"
                  value={stockChange.quantity}
                  onChange={(e) => setStockChange({ ...stockChange, quantity: Number(e.target.value) })}
                  className="input"
                  min="0"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowStockModal(false)}
                  className="flex-1 btn btn-secondary"
                >
                  Cancel
                </button>
                <button
                  onClick={handleStockUpdate}
                  className="flex-1 btn btn-primary"
                  disabled={isSaving}
                >
                  {isSaving ? 'Updating...' : 'Update Stock'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
