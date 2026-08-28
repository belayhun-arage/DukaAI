// Shop types
export interface Shop {
  id: string;
  name: string;
  ownerTelegramId: string;
  ownerName: string;
  createdAt: Date;
  settings: ShopSettings;
}

export interface ShopSettings {
  currency: string;
  timezone: string;
  lowStockThreshold: number;
}

// Product types
export interface Product {
  id: string;
  shopId: string;
  name: string;
  description?: string;
  variants: string[];
  price: number;
  stockQty: number;
  lowStockThreshold: number;
  category?: string;
  isActive: boolean;
  createdAt: Date;
}

export interface ProductInput {
  name: string;
  description?: string;
  variants?: string[];
  price: number;
  stockQty: number;
  lowStockThreshold?: number;
  category?: string;
}

// Customer types
export interface Customer {
  id: string;
  shopId: string;
  telegramId: string;
  name: string;
  phone?: string;
  totalOrders: number;
  totalSpent: number;
  lastOrderDate?: Date;
  createdAt: Date;
}

// Order types
export interface Order {
  id: string;
  shopId: string;
  orderNumber: string;
  customerId: string;
  customerName: string;
  items: OrderItem[];
  totalAmount: number;
  status: OrderStatus;
  statusHistory: StatusHistoryEntry[];
  notes?: string;
  source: 'telegram' | 'dashboard';
  createdAt: Date;
  updatedAt: Date;
}

export interface OrderItem {
  productId: string;
  productName: string;
  qty: number;
  unitPrice: number;
  variant?: string;
}

export interface StatusHistoryEntry {
  status: OrderStatus;
  timestamp: Date;
  note?: string;
}

export type OrderStatus =
  | 'NEW'
  | 'CONFIRMED'
  | 'PAID'
  | 'READY'
  | 'DELIVERED'
  | 'CANCELLED';

// Telegram session types
export interface TelegramSession {
  chatId: string;
  type: 'owner' | 'customer';
  shopId: string;
  customerId?: string;
  currentState: string;
  pendingOrder?: ParsedOrder;
  lastActiveAt: Date;
}

// AI types
export interface ParsedOrder {
  items: ParsedOrderItem[];
  confidence: number;
  needsClarification: boolean;
  clarificationQuestion?: string;
}

export interface ParsedOrderItem {
  productName: string;
  qty: number;
  variant?: string;
  matchedProductId?: string;
}

// Analytics types
export interface DashboardStats {
  ordersToday: number;
  revenue: number;
  pendingCount: number;
  lowStockCount: number;
  recentOrders: Order[];
  topProducts: { productId: string; productName: string; qty: number }[];
  lowStockProducts: Product[];
}

export interface DailyStats {
  date: string;
  ordersCount: number;
  revenue: number;
  pendingCount: number;
  topProduct?: string;
  lowStockItems: string[];
}

// API Response types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}
