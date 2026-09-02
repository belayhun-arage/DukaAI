import { collections, getFirestore } from '../config/firebase';
import { Order, OrderItem, OrderStatus, PaginatedResponse, StatusHistoryEntry } from '@dukaai/shared';
import { FieldValue } from 'firebase-admin/firestore';
import * as customerService from './customer.service';

function mapOrder(doc: FirebaseFirestore.DocumentSnapshot, shopId: string): Order | null {
  const data = doc.data();
  if (!data) return null;

  return {
    id: doc.id,
    shopId,
    orderNumber: data.orderNumber,
    customerId: data.customerId,
    customerName: data.customerName,
    items: data.items ?? [],
    totalAmount: data.totalAmount,
    status: data.status,
    statusHistory: (data.statusHistory ?? []).map((h: { status: OrderStatus; timestamp: FirebaseFirestore.Timestamp; note?: string }) => ({
      status: h.status,
      timestamp: h.timestamp?.toDate() ?? new Date(),
      note: h.note,
    })),
    notes: data.notes,
    source: data.source ?? 'telegram',
    createdAt: data.createdAt?.toDate() ?? new Date(),
    updatedAt: data.updatedAt?.toDate() ?? new Date(),
  };
}

function generateOrderNumber(): string {
  const now = new Date();
  const date = now.toISOString().slice(2, 10).replace(/-/g, '');
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `ORD-${date}-${random}`;
}

export async function createOrder(
  shopId: string,
  input: {
    customerId: string;
    customerName: string;
    items: OrderItem[];
    notes?: string;
    source?: 'telegram' | 'dashboard';
  }
): Promise<Order> {
  const db = getFirestore();
  const orderRef = collections.orders(shopId).doc();
  const orderNumber = generateOrderNumber();
  const totalAmount = input.items.reduce((sum, item) => sum + item.unitPrice * item.qty, 0);

  const initialHistory: StatusHistoryEntry = {
    status: 'NEW',
    timestamp: new Date(),
  };

  const orderData = {
    orderNumber,
    customerId: input.customerId,
    customerName: input.customerName,
    items: input.items,
    totalAmount,
    status: 'NEW' as OrderStatus,
    statusHistory: [{ status: 'NEW', timestamp: new Date() }],
    notes: input.notes ?? null,
    source: input.source ?? 'telegram',
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  };

  // Use transaction to update stock and create order atomically
  await db.runTransaction(async (tx) => {
    // Decrement stock for each item
    for (const item of input.items) {
      const productRef = collections.products(shopId).doc(item.productId);
      tx.update(productRef, {
        stockQty: FieldValue.increment(-item.qty),
      });
    }

    tx.set(orderRef, orderData);
  });

  // Update customer stats (outside transaction, non-critical)
  customerService.updateCustomerStats(shopId, input.customerId, totalAmount).catch(console.error);

  return {
    id: orderRef.id,
    shopId,
    orderNumber,
    customerId: input.customerId,
    customerName: input.customerName,
    items: input.items,
    totalAmount,
    status: 'NEW',
    statusHistory: [initialHistory],
    notes: input.notes,
    source: input.source ?? 'telegram',
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

export async function getOrderById(shopId: string, orderId: string): Promise<Order | null> {
  const doc = await collections.orders(shopId).doc(orderId).get();
  return mapOrder(doc, shopId);
}

export async function getOrderByNumber(shopId: string, orderNumber: string): Promise<Order | null> {
  const snapshot = await collections.orders(shopId)
    .where('orderNumber', '==', orderNumber)
    .limit(1)
    .get();

  if (snapshot.empty) return null;
  return mapOrder(snapshot.docs[0], shopId);
}

export async function getOrders(
  shopId: string,
  options: {
    page?: number;
    pageSize?: number;
    status?: OrderStatus;
    customerId?: string;
    startDate?: Date;
    endDate?: Date;
  } = {}
): Promise<PaginatedResponse<Order>> {
  const { page = 1, pageSize = 20, status, customerId, startDate, endDate } = options;

  let query: FirebaseFirestore.Query = collections.orders(shopId);

  if (status) {
    query = query.where('status', '==', status);
  }

  if (customerId) {
    query = query.where('customerId', '==', customerId);
  }

  if (startDate) {
    query = query.where('createdAt', '>=', startDate);
  }

  if (endDate) {
    query = query.where('createdAt', '<=', endDate);
  }

  const countSnapshot = await query.count().get();
  const total = countSnapshot.data().count;

  const offset = (page - 1) * pageSize;
  const snapshot = await query
    .orderBy('createdAt', 'desc')
    .offset(offset)
    .limit(pageSize)
    .get();

  const data = snapshot.docs
    .map((doc) => mapOrder(doc, shopId))
    .filter((o): o is Order => o !== null);

  const totalPages = Math.ceil(total / pageSize);

  return {
    data,
    total,
    page,
    pageSize,
    totalPages,
    hasMore: page < totalPages,
  };
}

export async function updateOrderStatus(
  shopId: string,
  orderId: string,
  newStatus: OrderStatus,
  note?: string
): Promise<Order | null> {
  const orderRef = collections.orders(shopId).doc(orderId);
  const doc = await orderRef.get();

  if (!doc.exists) return null;

  const currentStatus = doc.data()?.status as OrderStatus;

  // Validate status transition
  if (!isValidStatusTransition(currentStatus, newStatus)) {
    throw new Error(`Invalid status transition from ${currentStatus} to ${newStatus}`);
  }

  const historyEntry = {
    status: newStatus,
    timestamp: new Date(),
    note: note ?? null,
  };

  await orderRef.update({
    status: newStatus,
    statusHistory: FieldValue.arrayUnion(historyEntry),
    updatedAt: FieldValue.serverTimestamp(),
  });

  // If cancelled, restore stock
  if (newStatus === 'CANCELLED' && currentStatus !== 'CANCELLED') {
    const db = getFirestore();
    const items = doc.data()?.items as OrderItem[];

    await db.runTransaction(async (tx) => {
      for (const item of items) {
        const productRef = collections.products(shopId).doc(item.productId);
        tx.update(productRef, {
          stockQty: FieldValue.increment(item.qty),
        });
      }
    });
  }

  const updatedDoc = await orderRef.get();
  return mapOrder(updatedDoc, shopId);
}

function isValidStatusTransition(from: OrderStatus, to: OrderStatus): boolean {
  const transitions: Record<OrderStatus, OrderStatus[]> = {
    NEW: ['CONFIRMED', 'CANCELLED'],
    CONFIRMED: ['PAID', 'CANCELLED'],
    PAID: ['READY', 'CANCELLED'],
    READY: ['DELIVERED', 'CANCELLED'],
    DELIVERED: [], // Terminal state
    CANCELLED: [], // Terminal state
  };

  return transitions[from]?.includes(to) ?? false;
}

export async function getOrdersByStatus(
  shopId: string,
  status: OrderStatus,
  limit: number = 50
): Promise<Order[]> {
  const snapshot = await collections.orders(shopId)
    .where('status', '==', status)
    .orderBy('createdAt', 'desc')
    .limit(limit)
    .get();

  return snapshot.docs
    .map((doc) => mapOrder(doc, shopId))
    .filter((o): o is Order => o !== null);
}

export async function getPendingOrders(shopId: string): Promise<Order[]> {
  // Orders that need attention: NEW, CONFIRMED, PAID, READY
  const pendingStatuses: OrderStatus[] = ['NEW', 'CONFIRMED', 'PAID', 'READY'];

  const snapshot = await collections.orders(shopId)
    .where('status', 'in', pendingStatuses)
    .orderBy('createdAt', 'asc')
    .get();

  return snapshot.docs
    .map((doc) => mapOrder(doc, shopId))
    .filter((o): o is Order => o !== null);
}

export async function getTodayOrders(shopId: string): Promise<Order[]> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const snapshot = await collections.orders(shopId)
    .where('createdAt', '>=', today)
    .orderBy('createdAt', 'desc')
    .get();

  return snapshot.docs
    .map((doc) => mapOrder(doc, shopId))
    .filter((o): o is Order => o !== null);
}

export async function getOrderStats(
  shopId: string,
  startDate?: Date,
  endDate?: Date
): Promise<{
  totalOrders: number;
  totalRevenue: number;
  byStatus: Record<OrderStatus, number>;
}> {
  let query: FirebaseFirestore.Query = collections.orders(shopId);

  if (startDate) {
    query = query.where('createdAt', '>=', startDate);
  }
  if (endDate) {
    query = query.where('createdAt', '<=', endDate);
  }

  const snapshot = await query.get();

  const stats = {
    totalOrders: 0,
    totalRevenue: 0,
    byStatus: {
      NEW: 0,
      CONFIRMED: 0,
      PAID: 0,
      READY: 0,
      DELIVERED: 0,
      CANCELLED: 0,
    } as Record<OrderStatus, number>,
  };

  snapshot.docs.forEach((doc) => {
    const data = doc.data();
    stats.totalOrders++;

    // Only count revenue for non-cancelled orders
    if (data.status !== 'CANCELLED') {
      stats.totalRevenue += data.totalAmount ?? 0;
    }

    const status = data.status as OrderStatus;
    stats.byStatus[status] = (stats.byStatus[status] ?? 0) + 1;
  });

  return stats;
}

export async function getCustomerOrders(
  shopId: string,
  customerId: string,
  limit: number = 20
): Promise<Order[]> {
  const snapshot = await collections.orders(shopId)
    .where('customerId', '==', customerId)
    .orderBy('createdAt', 'desc')
    .limit(limit)
    .get();

  return snapshot.docs
    .map((doc) => mapOrder(doc, shopId))
    .filter((o): o is Order => o !== null);
}
