import { collections } from '../config/firebase';
import { Customer, PaginatedResponse } from '@dukaai/shared';
import { FieldValue } from 'firebase-admin/firestore';

function mapCustomer(doc: FirebaseFirestore.DocumentSnapshot, shopId: string): Customer | null {
  const data = doc.data();
  if (!data) return null;

  return {
    id: doc.id,
    shopId,
    telegramId: data.telegramId,
    name: data.name,
    phone: data.phone ?? undefined,
    totalOrders: data.totalOrders ?? 0,
    totalSpent: data.totalSpent ?? 0,
    lastOrderDate: data.lastOrderDate?.toDate(),
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

  const items = snapshot.docs
    .map((doc) => mapCustomer(doc, shopId))
    .filter((c): c is Customer => c !== null);

  return {
    items,
    total,
    page,
    pageSize,
    hasMore: offset + items.length < total,
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
