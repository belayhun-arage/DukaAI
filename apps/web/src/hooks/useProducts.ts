import { useState, useEffect, useCallback } from 'react';
import type { Product, PaginatedResponse } from '@dukaai/shared';
import { productApi } from '../services/api';
import { useShop } from '../context/ShopContext';

interface UseProductsOptions {
  page?: number;
  pageSize?: number;
  activeOnly?: boolean;
  category?: string;
  autoFetch?: boolean;
}

interface UseProductsReturn {
  products: Product[];
  pagination: { page: number; pageSize: number; total: number; totalPages: number } | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  createProduct: (input: {
    name: string;
    price: number;
    stockQty: number;
    description?: string;
    variants?: string[];
    lowStockThreshold?: number;
    category?: string;
  }) => Promise<Product>;
  updateProduct: (id: string, data: Partial<Product>) => Promise<Product>;
  updateStock: (id: string, quantity?: number, delta?: number) => Promise<Product>;
  deleteProduct: (id: string) => Promise<void>;
}

export function useProducts(options: UseProductsOptions = {}): UseProductsReturn {
  const { shop } = useShop();
  const { page = 1, pageSize = 50, activeOnly, category, autoFetch = true } = options;

  const [products, setProducts] = useState<Product[]>([]);
  const [pagination, setPagination] = useState<{
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  } | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchProducts = useCallback(async () => {
    if (!shop) return;

    setIsLoading(true);
    setError(null);
    try {
      const response: PaginatedResponse<Product> = await productApi.list({
        page,
        pageSize,
        activeOnly,
        category,
      });
      setProducts(response.data);
      setPagination({
        page: response.page,
        pageSize: response.pageSize,
        total: response.total,
        totalPages: response.totalPages,
      });
    } catch (err: any) {
      console.error('Failed to fetch products:', err);
      setError(err.message || 'Failed to fetch products');
    } finally {
      setIsLoading(false);
    }
  }, [shop, page, pageSize, activeOnly, category]);

  useEffect(() => {
    if (autoFetch && shop) {
      fetchProducts();
    }
  }, [autoFetch, shop, fetchProducts]);

  const createProduct = async (input: {
    name: string;
    price: number;
    stockQty: number;
    description?: string;
    variants?: string[];
    lowStockThreshold?: number;
    category?: string;
  }) => {
    const newProduct = await productApi.create(input);
    setProducts((prev) => [newProduct, ...prev]);
    return newProduct;
  };

  const updateProduct = async (id: string, data: Partial<Product>) => {
    const updated = await productApi.update(id, data);
    setProducts((prev) => prev.map((p) => (p.id === id ? updated : p)));
    return updated;
  };

  const updateStock = async (id: string, quantity?: number, delta?: number) => {
    const updated = await productApi.updateStock(id, quantity, delta);
    setProducts((prev) => prev.map((p) => (p.id === id ? updated : p)));
    return updated;
  };

  const deleteProduct = async (id: string) => {
    await productApi.delete(id);
    setProducts((prev) => prev.filter((p) => p.id !== id));
  };

  return {
    products,
    pagination,
    isLoading,
    error,
    refetch: fetchProducts,
    createProduct,
    updateProduct,
    updateStock,
    deleteProduct,
  };
}

export function useLowStockProducts() {
  const { shop } = useShop();
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchLowStock = useCallback(async () => {
    if (!shop) return;

    setIsLoading(true);
    setError(null);
    try {
      const data = await productApi.getLowStock();
      setProducts(data);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch low stock products');
    } finally {
      setIsLoading(false);
    }
  }, [shop]);

  useEffect(() => {
    if (shop) {
      fetchLowStock();
    }
  }, [shop, fetchLowStock]);

  return { products, isLoading, error, refetch: fetchLowStock };
}

export function useProductSearch() {
  const [results, setResults] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const search = async (query: string) => {
    if (!query.trim()) {
      setResults([]);
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const data = await productApi.search(query);
      setResults(data);
    } catch (err: any) {
      setError(err.message || 'Search failed');
    } finally {
      setIsLoading(false);
    }
  };

  return { results, isLoading, error, search, clearResults: () => setResults([]) };
}
