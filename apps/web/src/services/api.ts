import type {
  Shop,
  Product,
  Order,
  Customer,
  DashboardStats,
  PaginatedResponse,
  ApiResponse,
  OrderStatus,
  AgentTrace,
  AgentRunResponse,
  ToolDefinition,
  ForecastReport,
  RestockRecommendation,
  DemandPrediction,
} from '@dukaai/shared';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

// Store shop ID in localStorage for persistence
let currentShopId: string | null = localStorage.getItem('shopId');

export function setShopId(shopId: string): void {
  currentShopId = shopId;
  localStorage.setItem('shopId', shopId);
}

export function getShopId(): string | null {
  return currentShopId;
}

export function clearShopId(): void {
  currentShopId = null;
  localStorage.removeItem('shopId');
}

// Base fetch helper
async function apiFetch<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (currentShopId) {
    headers['x-shop-id'] = currentShopId;
  }

  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers,
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || 'API request failed');
  }

  return data;
}

// ============ Shop API ============

export const shopApi = {
  async create(input: { name: string; ownerTelegramId: string; ownerName: string }): Promise<Shop> {
    const response = await apiFetch<ApiResponse<Shop>>('/shops', {
      method: 'POST',
      body: JSON.stringify(input),
    });
    return response.data!;
  },

  async getCurrent(): Promise<Shop> {
    const response = await apiFetch<ApiResponse<Shop>>('/shops/current');
    return response.data!;
  },

  async getById(id: string): Promise<Shop> {
    const response = await apiFetch<ApiResponse<Shop>>(`/shops/${id}`);
    return response.data!;
  },

  async updateSettings(settings: Partial<Shop['settings']>): Promise<Shop> {
    const response = await apiFetch<ApiResponse<Shop>>('/shops/settings', {
      method: 'PATCH',
      body: JSON.stringify(settings),
    });
    return response.data!;
  },

  async update(data: { name?: string; ownerName?: string }): Promise<Shop> {
    const response = await apiFetch<ApiResponse<Shop>>('/shops', {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
    return response.data!;
  },
};

// ============ Product API ============

export const productApi = {
  async list(options?: {
    page?: number;
    pageSize?: number;
    activeOnly?: boolean;
    category?: string;
  }): Promise<PaginatedResponse<Product>> {
    const params = new URLSearchParams();
    if (options?.page) params.set('page', String(options.page));
    if (options?.pageSize) params.set('pageSize', String(options.pageSize));
    if (options?.activeOnly !== undefined) params.set('activeOnly', String(options.activeOnly));
    if (options?.category) params.set('category', options.category);

    const response = await apiFetch<ApiResponse<PaginatedResponse<Product>>>(
      `/products?${params}`
    );
    return response.data!;
  },

  async search(q: string): Promise<Product[]> {
    const response = await apiFetch<ApiResponse<Product[]>>(`/products/search?q=${encodeURIComponent(q)}`);
    return response.data!;
  },

  async getLowStock(): Promise<Product[]> {
    const response = await apiFetch<ApiResponse<Product[]>>('/products/low-stock');
    return response.data!;
  },

  async getById(id: string): Promise<Product> {
    const response = await apiFetch<ApiResponse<Product>>(`/products/${id}`);
    return response.data!;
  },

  async create(input: {
    name: string;
    price: number;
    stockQty: number;
    description?: string;
    variants?: string[];
    lowStockThreshold?: number;
    category?: string;
  }): Promise<Product> {
    const response = await apiFetch<ApiResponse<Product>>('/products', {
      method: 'POST',
      body: JSON.stringify(input),
    });
    return response.data!;
  },

  async update(id: string, data: Partial<Product>): Promise<Product> {
    const response = await apiFetch<ApiResponse<Product>>(`/products/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
    return response.data!;
  },

  async updateStock(id: string, quantity?: number, delta?: number): Promise<Product> {
    const response = await apiFetch<ApiResponse<Product>>(`/products/${id}/stock`, {
      method: 'PATCH',
      body: JSON.stringify({ quantity, delta }),
    });
    return response.data!;
  },

  async delete(id: string): Promise<void> {
    await apiFetch<ApiResponse<{ deleted: boolean }>>(`/products/${id}`, {
      method: 'DELETE',
    });
  },
};

// ============ Order API ============

export const orderApi = {
  async list(options?: {
    page?: number;
    pageSize?: number;
    status?: OrderStatus;
    customerId?: string;
  }): Promise<PaginatedResponse<Order>> {
    const params = new URLSearchParams();
    if (options?.page) params.set('page', String(options.page));
    if (options?.pageSize) params.set('pageSize', String(options.pageSize));
    if (options?.status) params.set('status', options.status);
    if (options?.customerId) params.set('customerId', options.customerId);

    const response = await apiFetch<ApiResponse<PaginatedResponse<Order>>>(`/orders?${params}`);
    return response.data!;
  },

  async getPending(): Promise<Order[]> {
    const response = await apiFetch<ApiResponse<Order[]>>('/orders/pending');
    return response.data!;
  },

  async getToday(): Promise<Order[]> {
    const response = await apiFetch<ApiResponse<Order[]>>('/orders/today');
    return response.data!;
  },

  async getStats(startDate?: string, endDate?: string): Promise<{
    totalOrders: number;
    totalRevenue: number;
    byStatus: Record<OrderStatus, number>;
  }> {
    const params = new URLSearchParams();
    if (startDate) params.set('startDate', startDate);
    if (endDate) params.set('endDate', endDate);

    const response = await apiFetch<ApiResponse<{
      totalOrders: number;
      totalRevenue: number;
      byStatus: Record<OrderStatus, number>;
    }>>(`/orders/stats?${params}`);
    return response.data!;
  },

  async getById(id: string): Promise<Order> {
    const response = await apiFetch<ApiResponse<Order>>(`/orders/${id}`);
    return response.data!;
  },

  async create(input: {
    customerId: string;
    customerName: string;
    items: { productId: string; productName: string; qty: number; unitPrice: number; variant?: string }[];
    notes?: string;
  }): Promise<Order> {
    const response = await apiFetch<ApiResponse<Order>>('/orders', {
      method: 'POST',
      body: JSON.stringify(input),
    });
    return response.data!;
  },

  async updateStatus(id: string, status: OrderStatus, note?: string): Promise<Order> {
    const response = await apiFetch<ApiResponse<Order>>(`/orders/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status, note }),
    });
    return response.data!;
  },
};

// ============ Customer API ============

export const customerApi = {
  async list(options?: {
    page?: number;
    pageSize?: number;
    sortBy?: 'totalSpent' | 'totalOrders' | 'lastOrderDate' | 'createdAt';
    sortOrder?: 'asc' | 'desc';
  }): Promise<PaginatedResponse<Customer>> {
    const params = new URLSearchParams();
    if (options?.page) params.set('page', String(options.page));
    if (options?.pageSize) params.set('pageSize', String(options.pageSize));
    if (options?.sortBy) params.set('sortBy', options.sortBy);
    if (options?.sortOrder) params.set('sortOrder', options.sortOrder);

    const response = await apiFetch<ApiResponse<PaginatedResponse<Customer>>>(`/customers?${params}`);
    return response.data!;
  },

  async getTop(limit?: number): Promise<Customer[]> {
    const params = limit ? `?limit=${limit}` : '';
    const response = await apiFetch<ApiResponse<Customer[]>>(`/customers/top${params}`);
    return response.data!;
  },

  async getRecent(limit?: number): Promise<Customer[]> {
    const params = limit ? `?limit=${limit}` : '';
    const response = await apiFetch<ApiResponse<Customer[]>>(`/customers/recent${params}`);
    return response.data!;
  },

  async getById(id: string): Promise<Customer & { recentOrders: Order[] }> {
    const response = await apiFetch<ApiResponse<Customer & { recentOrders: Order[] }>>(`/customers/${id}`);
    return response.data!;
  },

  async create(input: { telegramId: string; name: string; phone?: string }): Promise<Customer> {
    const response = await apiFetch<ApiResponse<Customer>>('/customers', {
      method: 'POST',
      body: JSON.stringify(input),
    });
    return response.data!;
  },

  async update(id: string, data: { name?: string; phone?: string }): Promise<Customer> {
    const response = await apiFetch<ApiResponse<Customer>>(`/customers/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
    return response.data!;
  },

  async getOrders(id: string, limit?: number): Promise<Order[]> {
    const params = limit ? `?limit=${limit}` : '';
    const response = await apiFetch<ApiResponse<Order[]>>(`/customers/${id}/orders${params}`);
    return response.data!;
  },
};

// ============ Analytics API ============

export const analyticsApi = {
  async getDashboard(): Promise<DashboardStats> {
    const response = await apiFetch<ApiResponse<DashboardStats>>('/analytics/dashboard');
    return response.data!;
  },

  async getSales(days?: number): Promise<{ date: string; orders: number; revenue: number }[]> {
    const params = days ? `?days=${days}` : '';
    const response = await apiFetch<ApiResponse<{ date: string; orders: number; revenue: number }[]>>(
      `/analytics/sales${params}`
    );
    return response.data!;
  },

  async getTopProducts(days?: number, limit?: number): Promise<{
    productId: string;
    productName: string;
    qty: number;
    revenue: number;
  }[]> {
    const params = new URLSearchParams();
    if (days) params.set('days', String(days));
    if (limit) params.set('limit', String(limit));

    const response = await apiFetch<ApiResponse<{
      productId: string;
      productName: string;
      qty: number;
      revenue: number;
    }[]>>(`/analytics/top-products?${params}`);
    return response.data!;
  },

  async getCustomerInsights(): Promise<{
    totalCustomers: number;
    topBySpending: Customer[];
    recentlyActive: Customer[];
  }> {
    const response = await apiFetch<ApiResponse<{
      totalCustomers: number;
      topBySpending: Customer[];
      recentlyActive: Customer[];
    }>>('/analytics/customers');
    return response.data!;
  },
};

// ============ Health API ============

export const healthApi = {
  async check(): Promise<{ status: string; timestamp: string; version: string }> {
    const response = await apiFetch<ApiResponse<{ status: string; timestamp: string; version: string }>>('/health');
    return response.data!;
  },

  async ready(): Promise<{ status: string; services: { firebase: string } }> {
    const response = await apiFetch<ApiResponse<{ status: string; services: { firebase: string } }>>('/health/ready');
    return response.data!;
  },
};

// ============ Agent API ============

export const agentApi = {
  async run(input: string, context?: {
    customerId?: string;
    customerName?: string;
    sessionId?: string;
  }): Promise<AgentRunResponse> {
    const response = await apiFetch<ApiResponse<AgentRunResponse>>('/agents/run', {
      method: 'POST',
      body: JSON.stringify({ input, context }),
    });
    return response.data!;
  },

  async listTraces(options?: {
    limit?: number;
    status?: AgentTrace['status'];
    triggeredBy?: AgentTrace['triggeredBy'];
  }): Promise<AgentTrace[]> {
    const params = new URLSearchParams();
    if (options?.limit) params.set('limit', String(options.limit));
    if (options?.status) params.set('status', options.status);
    if (options?.triggeredBy) params.set('triggeredBy', options.triggeredBy);

    const response = await apiFetch<ApiResponse<AgentTrace[]>>(`/agents/traces?${params}`);
    return response.data!;
  },

  async getTrace(traceId: string): Promise<AgentTrace> {
    const response = await apiFetch<ApiResponse<AgentTrace>>(`/agents/traces/${traceId}`);
    return response.data!;
  },

  async getStats(since?: Date): Promise<{
    totalRuns: number;
    successfulRuns: number;
    failedRuns: number;
    avgExecutionTimeMs: number;
    totalToolCalls: number;
    toolUsage: Record<string, number>;
    triggerBreakdown: Record<string, number>;
  }> {
    const params = since ? `?since=${since.toISOString()}` : '';
    const response = await apiFetch<ApiResponse<{
      totalRuns: number;
      successfulRuns: number;
      failedRuns: number;
      avgExecutionTimeMs: number;
      totalToolCalls: number;
      toolUsage: Record<string, number>;
      triggerBreakdown: Record<string, number>;
    }>>(`/agents/stats${params}`);
    return response.data!;
  },

  async getRecentToolCalls(limit?: number): Promise<Array<{
    traceId: string;
    toolName: string;
    success: boolean;
    executionTimeMs: number;
    timestamp: Date;
    arguments: Record<string, unknown>;
  }>> {
    const params = limit ? `?limit=${limit}` : '';
    const response = await apiFetch<ApiResponse<Array<{
      traceId: string;
      toolName: string;
      success: boolean;
      executionTimeMs: number;
      timestamp: Date;
      arguments: Record<string, unknown>;
    }>>>(`/agents/tool-calls${params}`);
    return response.data!;
  },

  async getTools(): Promise<{ tools: ToolDefinition[]; count: number }> {
    const response = await apiFetch<ApiResponse<{ tools: ToolDefinition[]; count: number }>>('/agents/tools');
    return response.data!;
  },
};

// ============ Forecast API ============

export const forecastApi = {
  async generate(periodDays?: number): Promise<ForecastReport> {
    const response = await apiFetch<ApiResponse<ForecastReport>>('/forecast/generate', {
      method: 'POST',
      body: JSON.stringify({ periodDays }),
    });
    return response.data!;
  },

  async getLatest(): Promise<ForecastReport | null> {
    try {
      const response = await apiFetch<ApiResponse<ForecastReport>>('/forecast/latest');
      return response.data!;
    } catch (error) {
      // 404 means no forecast exists
      return null;
    }
  },

  async getHistory(limit?: number): Promise<ForecastReport[]> {
    const params = limit ? `?limit=${limit}` : '';
    const response = await apiFetch<ApiResponse<ForecastReport[]>>(`/forecast/history${params}`);
    return response.data!;
  },

  async getRestock(): Promise<{
    recommendations: RestockRecommendation[];
    totalItems: number;
    criticalCount: number;
    highCount: number;
  }> {
    const response = await apiFetch<ApiResponse<{
      recommendations: RestockRecommendation[];
      totalItems: number;
      criticalCount: number;
      highCount: number;
    }>>('/forecast/restock');
    return response.data!;
  },

  async getProductPrediction(productId: string): Promise<DemandPrediction> {
    const response = await apiFetch<ApiResponse<DemandPrediction>>(`/forecast/product/${productId}`);
    return response.data!;
  },
};
