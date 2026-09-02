import { useState, useEffect, useCallback } from 'react';
import type { Customer, Order, PaginatedResponse } from '@dukaai/shared';
import { customerApi } from '../services/api';
import { useShop } from '../context/ShopContext';

interface UseCustomersOptions {
  page?: number;
  pageSize?: number;
  sortBy?: 'totalSpent' | 'totalOrders' | 'lastOrderDate' | 'createdAt';
  sortOrder?: 'asc' | 'desc';
  autoFetch?: boolean;
}

interface UseCustomersReturn {
  customers: Customer[];
  pagination: { page: number; pageSize: number; total: number; totalPages: number } | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  createCustomer: (input: { telegramId: string; name: string; phone?: string }) => Promise<Customer>;
  updateCustomer: (id: string, data: { name?: string; phone?: string }) => Promise<Customer>;
}

export function useCustomers(options: UseCustomersOptions = {}): UseCustomersReturn {
  const { shop } = useShop();
  const { page = 1, pageSize = 50, sortBy, sortOrder, autoFetch = true } = options;

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [pagination, setPagination] = useState<{
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  } | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchCustomers = useCallback(async () => {
    if (!shop) return;

    setIsLoading(true);
    setError(null);
    try {
      const response: PaginatedResponse<Customer> = await customerApi.list({
        page,
        pageSize,
        sortBy,
        sortOrder,
      });
      setCustomers(response.data);
      setPagination({
        page: response.page,
        pageSize: response.pageSize,
        total: response.total,
        totalPages: response.totalPages,
      });
    } catch (err: any) {
      console.error('Failed to fetch customers:', err);
      setError(err.message || 'Failed to fetch customers');
    } finally {
      setIsLoading(false);
    }
  }, [shop, page, pageSize, sortBy, sortOrder]);

  useEffect(() => {
    if (autoFetch && shop) {
      fetchCustomers();
    }
  }, [autoFetch, shop, fetchCustomers]);

  const createCustomer = async (input: { telegramId: string; name: string; phone?: string }) => {
    const newCustomer = await customerApi.create(input);
    setCustomers((prev) => [newCustomer, ...prev]);
    return newCustomer;
  };

  const updateCustomer = async (id: string, data: { name?: string; phone?: string }) => {
    const updated = await customerApi.update(id, data);
    setCustomers((prev) => prev.map((c) => (c.id === id ? updated : c)));
    return updated;
  };

  return {
    customers,
    pagination,
    isLoading,
    error,
    refetch: fetchCustomers,
    createCustomer,
    updateCustomer,
  };
}

export function useTopCustomers(limit: number = 10) {
  const { shop } = useShop();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchTop = useCallback(async () => {
    if (!shop) return;

    setIsLoading(true);
    setError(null);
    try {
      const data = await customerApi.getTop(limit);
      setCustomers(data);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch top customers');
    } finally {
      setIsLoading(false);
    }
  }, [shop, limit]);

  useEffect(() => {
    if (shop) {
      fetchTop();
    }
  }, [shop, fetchTop]);

  return { customers, isLoading, error, refetch: fetchTop };
}

export function useRecentCustomers(limit: number = 10) {
  const { shop } = useShop();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchRecent = useCallback(async () => {
    if (!shop) return;

    setIsLoading(true);
    setError(null);
    try {
      const data = await customerApi.getRecent(limit);
      setCustomers(data);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch recent customers');
    } finally {
      setIsLoading(false);
    }
  }, [shop, limit]);

  useEffect(() => {
    if (shop) {
      fetchRecent();
    }
  }, [shop, fetchRecent]);

  return { customers, isLoading, error, refetch: fetchRecent };
}

export function useCustomerDetail(customerId: string | null) {
  const [customer, setCustomer] = useState<(Customer & { recentOrders: Order[] }) | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchCustomer = useCallback(async () => {
    if (!customerId) {
      setCustomer(null);
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const data = await customerApi.getById(customerId);
      setCustomer(data);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch customer');
    } finally {
      setIsLoading(false);
    }
  }, [customerId]);

  useEffect(() => {
    fetchCustomer();
  }, [fetchCustomer]);

  return { customer, isLoading, error, refetch: fetchCustomer };
}
