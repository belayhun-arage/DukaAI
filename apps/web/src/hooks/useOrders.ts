import { useState, useEffect, useCallback } from 'react';
import type { Order, OrderStatus, PaginatedResponse } from '@dukaai/shared';
import { orderApi } from '../services/api';
import { useShop } from '../context/ShopContext';

interface UseOrdersOptions {
  page?: number;
  pageSize?: number;
  status?: OrderStatus;
  customerId?: string;
  autoFetch?: boolean;
}

interface UseOrdersReturn {
  orders: Order[];
  pagination: { page: number; pageSize: number; total: number; totalPages: number } | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  updateStatus: (orderId: string, status: OrderStatus, note?: string) => Promise<void>;
  createOrder: (input: {
    customerId: string;
    customerName: string;
    items: { productId: string; productName: string; qty: number; unitPrice: number; variant?: string }[];
    notes?: string;
  }) => Promise<Order>;
}

export function useOrders(options: UseOrdersOptions = {}): UseOrdersReturn {
  const { shop } = useShop();
  const { page = 1, pageSize = 20, status, customerId, autoFetch = true } = options;

  const [orders, setOrders] = useState<Order[]>([]);
  const [pagination, setPagination] = useState<{
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  } | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchOrders = useCallback(async () => {
    if (!shop) return;

    setIsLoading(true);
    setError(null);
    try {
      const response: PaginatedResponse<Order> = await orderApi.list({
        page,
        pageSize,
        status,
        customerId,
      });
      setOrders(response.data);
      setPagination({
        page: response.page,
        pageSize: response.pageSize,
        total: response.total,
        totalPages: response.totalPages,
      });
    } catch (err: any) {
      console.error('Failed to fetch orders:', err);
      setError(err.message || 'Failed to fetch orders');
    } finally {
      setIsLoading(false);
    }
  }, [shop, page, pageSize, status, customerId]);

  useEffect(() => {
    if (autoFetch && shop) {
      fetchOrders();
    }
  }, [autoFetch, shop, fetchOrders]);

  const updateStatus = async (orderId: string, newStatus: OrderStatus, note?: string) => {
    try {
      const updated = await orderApi.updateStatus(orderId, newStatus, note);
      setOrders((prev) => prev.map((o) => (o.id === orderId ? updated : o)));
    } catch (err: any) {
      throw new Error(err.message || 'Failed to update order status');
    }
  };

  const createOrder = async (input: {
    customerId: string;
    customerName: string;
    items: { productId: string; productName: string; qty: number; unitPrice: number; variant?: string }[];
    notes?: string;
  }) => {
    const newOrder = await orderApi.create(input);
    setOrders((prev) => [newOrder, ...prev]);
    return newOrder;
  };

  return {
    orders,
    pagination,
    isLoading,
    error,
    refetch: fetchOrders,
    updateStatus,
    createOrder,
  };
}

export function usePendingOrders() {
  const { shop } = useShop();
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchPending = useCallback(async () => {
    if (!shop) return;

    setIsLoading(true);
    setError(null);
    try {
      const data = await orderApi.getPending();
      setOrders(data);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch pending orders');
    } finally {
      setIsLoading(false);
    }
  }, [shop]);

  useEffect(() => {
    if (shop) {
      fetchPending();
    }
  }, [shop, fetchPending]);

  return { orders, isLoading, error, refetch: fetchPending };
}

export function useTodayOrders() {
  const { shop } = useShop();
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchToday = useCallback(async () => {
    if (!shop) return;

    setIsLoading(true);
    setError(null);
    try {
      const data = await orderApi.getToday();
      setOrders(data);
    } catch (err: any) {
      setError(err.message || "Failed to fetch today's orders");
    } finally {
      setIsLoading(false);
    }
  }, [shop]);

  useEffect(() => {
    if (shop) {
      fetchToday();
    }
  }, [shop, fetchToday]);

  return { orders, isLoading, error, refetch: fetchToday };
}
