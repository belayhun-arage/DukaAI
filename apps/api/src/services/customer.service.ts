import { collections } from '../config/firebase';
import { Customer, PaginatedResponse, CustomerSegment } from '@dukaai/shared';
import { FieldValue } from 'firebase-admin/firestore';

// Calculate customer segment based on RFM (Recency, Frequency, Monetary)
function calculateSegment(
  totalOrders: number,
  totalSpent: number,
  lastOrderDate?: Date
): CustomerSegment {
  const daysSinceLastOrder = lastOrderDate
    ? Math.floor((Date.now() - lastOrderDate.getTime()) / (1000 * 60 * 60 * 24))
    : 365; // Assume very old if never ordered

  // RFM Scoring (simplified)
  // Recency: < 30 days = high, < 90 days = medium, else low
  // Frequency: > 10 orders = high, > 3 orders = medium, else low
  // Monetary: > 10000 = high, > 3000 = medium, else low

  const recencyScore = daysSinceLastOrder < 30 ? 3 : daysSinceLastOrder < 90 ? 2 : 1;
  const frequencyScore = totalOrders > 10 ? 3 : totalOrders > 3 ? 2 : 1;
  const monetaryScore = totalSpent > 10000 ? 3 : totalSpent > 3000 ? 2 : 1;

  const totalScore = recencyScore + frequencyScore + monetaryScore;

  if (totalScore >= 8) return 'CHAMPION';
  if (totalScore >= 6) return 'LOYAL';
  if (totalScore >= 4) return 'POTENTIAL';
  if (recencyScore <= 1 && frequencyScore >= 2) return 'AT_RISK';
  if (recencyScore === 1) return 'LOST';
  return 'POTENTIAL';
}

function mapCustomer(doc: FirebaseFirestore.DocumentSnapshot, shopId: string): Customer | null {
  const data = doc.data();
  if (!data) return null;

  const totalOrders = data.totalOrders ?? 0;
  const totalSpent = data.totalSpent ?? 0;
  const lastOrderDate = data.lastOrderDate?.toDate();

  return {
    id: doc.id,
    shopId,
    telegramId: data.telegramId,
    name: data.name,
    phone: data.phone ?? undefined,
    totalOrders,
    totalSpent,
    lastOrderDate,
    segment: calculateSegment(totalOrders, totalSpent, lastOrderDate),
    createdAt: data.createdAt?.toDate() ?? new Date(),
  };
}

export async function createCustomer(
  shopId: string,
  input: {
    telegramId: string;
    name: string;
    phone?: string;
  }
): Promise<Customer> {
  const docRef = collections.customers(shopId).doc();

  const customerData = {
    telegramId: input.telegramId,
    name: input.name,
    phone: input.phone ?? null,
    totalOrders: 0,
    totalSpent: 0,
    lastOrderDate: null,
    createdAt: FieldValue.serverTimestamp(),
  };

  await docRef.set(customerData);

  return {
    id: docRef.id,
    shopId,
    telegramId: input.telegramId,
    name: input.name,
    phone: input.phone,
    totalOrders: 0,
    totalSpent: 0,
    segment: 'POTENTIAL' as CustomerSegment,
    createdAt: new Date(),
  };
}

export async function getCustomerById(shopId: string, customerId: string): Promise<Customer | null> {
  const doc = await collections.customers(shopId).doc(customerId).get();
  return mapCustomer(doc, shopId);
}

export async function getCustomerByTelegramId(
  shopId: string,
  telegramId: string
): Promise<Customer | null> {
  const snapshot = await collections.customers(shopId)
    .where('telegramId', '==', telegramId)
    .limit(1)
    .get();

  if (snapshot.empty) return null;
  return mapCustomer(snapshot.docs[0], shopId);
}

export async function getOrCreateCustomer(
  shopId: string,
  telegramId: string,
  name: string
): Promise<Customer> {
  const existing = await getCustomerByTelegramId(shopId, telegramId);
  if (existing) return existing;

  return createCustomer(shopId, { telegramId, name });
}

export async function getCustomers(
  shopId: string,
  options: {
    page?: number;
    pageSize?: number;
    sortBy?: 'totalSpent' | 'totalOrders' | 'lastOrderDate' | 'createdAt';
    sortOrder?: 'asc' | 'desc';
  } = {}
): Promise<PaginatedResponse<Customer>> {
  const { page = 1, pageSize = 20, sortBy = 'createdAt', sortOrder = 'desc' } = options;

  const countSnapshot = await collections.customers(shopId).count().get();
  const total = countSnapshot.data().count;

  const offset = (page - 1) * pageSize;
  const snapshot = await collections.customers(shopId)
    .orderBy(sortBy, sortOrder)
    .offset(offset)
    .limit(pageSize)
    .get();

  const data = snapshot.docs
    .map((doc) => mapCustomer(doc, shopId))
    .filter((c): c is Customer => c !== null);

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

export async function updateCustomer(
  shopId: string,
  customerId: string,
  updates: Partial<Pick<Customer, 'name' | 'phone'>>
): Promise<Customer | null> {
  const customerRef = collections.customers(shopId).doc(customerId);
  const doc = await customerRef.get();

  if (!doc.exists) return null;

  await customerRef.update(updates);

  const updatedDoc = await customerRef.get();
  return mapCustomer(updatedDoc, shopId);
}

export async function updateCustomerStats(
  shopId: string,
  customerId: string,
  orderAmount: number
): Promise<void> {
  const customerRef = collections.customers(shopId).doc(customerId);

  await customerRef.update({
    totalOrders: FieldValue.increment(1),
    totalSpent: FieldValue.increment(orderAmount),
    lastOrderDate: FieldValue.serverTimestamp(),
  });
}

export async function getTopCustomers(
  shopId: string,
  limit: number = 10
): Promise<Customer[]> {
  const snapshot = await collections.customers(shopId)
    .orderBy('totalSpent', 'desc')
    .limit(limit)
    .get();

  return snapshot.docs
    .map((doc) => mapCustomer(doc, shopId))
    .filter((c): c is Customer => c !== null);
}

export async function getRecentCustomers(
  shopId: string,
  limit: number = 10
): Promise<Customer[]> {
  const snapshot = await collections.customers(shopId)
    .orderBy('lastOrderDate', 'desc')
    .limit(limit)
    .get();

  return snapshot.docs
    .map((doc) => mapCustomer(doc, shopId))
    .filter((c): c is Customer => c !== null);
}
