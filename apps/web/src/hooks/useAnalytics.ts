import { useState, useEffect, useCallback } from 'react';
import type { Customer } from '@dukaai/shared';
import { analyticsApi } from '../services/api';
import { useShop } from '../context/ShopContext';

interface SalesData {
  date: string;
  orders: number;
  revenue: number;
}

interface TopProduct {
  productId: string;
  productName: string;
  qty: number;
  revenue: number;
}

interface CustomerInsights {
  totalCustomers: number;
  topBySpending: Customer[];
  recentlyActive: Customer[];
}

export function useSalesData(days: number = 7) {
  const { shop } = useShop();
  const [data, setData] = useState<SalesData[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchSales = useCallback(async () => {
    if (!shop) return;

    setIsLoading(true);
    setError(null);
    try {
      const result = await analyticsApi.getSales(days);
      setData(result);
    } catch (err: any) {
      console.error('Failed to fetch sales data:', err);
      setError(err.message || 'Failed to fetch sales data');
    } finally {
      setIsLoading(false);
    }
  }, [shop, days]);

  useEffect(() => {
    if (shop) {
      fetchSales();
    }
  }, [shop, fetchSales]);

  return { data, isLoading, error, refetch: fetchSales };
}

export function useTopProducts(days: number = 30, limit: number = 10) {
  const { shop } = useShop();
  const [products, setProducts] = useState<TopProduct[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchTopProducts = useCallback(async () => {
    if (!shop) return;

    setIsLoading(true);
    setError(null);
    try {
      const result = await analyticsApi.getTopProducts(days, limit);
      setProducts(result);
    } catch (err: any) {
      console.error('Failed to fetch top products:', err);
      setError(err.message || 'Failed to fetch top products');
    } finally {
      setIsLoading(false);
    }
  }, [shop, days, limit]);

  useEffect(() => {
    if (shop) {
      fetchTopProducts();
    }
  }, [shop, fetchTopProducts]);

  return { products, isLoading, error, refetch: fetchTopProducts };
}

export function useCustomerInsights() {
  const { shop } = useShop();
  const [insights, setInsights] = useState<CustomerInsights | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchInsights = useCallback(async () => {
    if (!shop) return;

    setIsLoading(true);
    setError(null);
    try {
      const result = await analyticsApi.getCustomerInsights();
      setInsights(result);
    } catch (err: any) {
      console.error('Failed to fetch customer insights:', err);
      setError(err.message || 'Failed to fetch customer insights');
    } finally {
      setIsLoading(false);
    }
  }, [shop]);

  useEffect(() => {
    if (shop) {
      fetchInsights();
    }
  }, [shop, fetchInsights]);

  return { insights, isLoading, error, refetch: fetchInsights };
}

export function useAnalyticsSummary() {
  const salesData = useSalesData(7);
  const topProducts = useTopProducts(30, 5);
  const customerInsights = useCustomerInsights();

  const isLoading = salesData.isLoading || topProducts.isLoading || customerInsights.isLoading;
  const error = salesData.error || topProducts.error || customerInsights.error;

  const totalRevenue = salesData.data.reduce((sum, d) => sum + d.revenue, 0);
  const totalOrders = salesData.data.reduce((sum, d) => sum + d.orders, 0);
  const avgOrderValue = totalOrders > 0 ? Math.round(totalRevenue / totalOrders) : 0;

  const refetchAll = async () => {
    await Promise.all([
      salesData.refetch(),
      topProducts.refetch(),
      customerInsights.refetch(),
    ]);
  };

  return {
    salesData: salesData.data,
    topProducts: topProducts.products,
    customerInsights: customerInsights.insights,
    totalRevenue,
    totalOrders,
    avgOrderValue,
    isLoading,
    error,
    refetch: refetchAll,
  };
}
