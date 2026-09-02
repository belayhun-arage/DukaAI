import { collections } from '../config/firebase';
import { Product, ProductInput, PaginatedResponse } from '@dukaai/shared';
import { FieldValue } from 'firebase-admin/firestore';

function mapProduct(doc: FirebaseFirestore.DocumentSnapshot, shopId: string): Product | null {
  const data = doc.data();
  if (!data) return null;

  return {
    id: doc.id,
    shopId,
    name: data.name,
    description: data.description,
    variants: data.variants ?? [],
    price: data.price,
    stockQty: data.stockQty,
    lowStockThreshold: data.lowStockThreshold ?? 10,
    category: data.category,
    isActive: data.isActive ?? true,
    createdAt: data.createdAt?.toDate() ?? new Date(),
  };
}

export async function createProduct(shopId: string, input: ProductInput): Promise<Product> {
  const docRef = collections.products(shopId).doc();

  const productData = {
    name: input.name,
    description: input.description ?? null,
    variants: input.variants ?? [],
    price: input.price,
    stockQty: input.stockQty,
    lowStockThreshold: input.lowStockThreshold ?? 10,
    category: input.category ?? null,
    isActive: true,
    createdAt: FieldValue.serverTimestamp(),
  };

  await docRef.set(productData);

  return {
    id: docRef.id,
    shopId,
    name: input.name,
    description: input.description,
    variants: input.variants ?? [],
    price: input.price,
    stockQty: input.stockQty,
    lowStockThreshold: input.lowStockThreshold ?? 10,
    category: input.category,
    isActive: true,
    createdAt: new Date(),
  };
}

export async function getProductById(shopId: string, productId: string): Promise<Product | null> {
  const doc = await collections.products(shopId).doc(productId).get();
  return mapProduct(doc, shopId);
}

export async function getProducts(
  shopId: string,
  options: {
    page?: number;
    pageSize?: number;
    activeOnly?: boolean;
    category?: string;
  } = {}
): Promise<PaginatedResponse<Product>> {
  const { page = 1, pageSize = 20, activeOnly = true, category } = options;

  let query: FirebaseFirestore.Query = collections.products(shopId);

  if (activeOnly) {
    query = query.where('isActive', '==', true);
  }

  if (category) {
    query = query.where('category', '==', category);
  }

  // Get total count (note: this requires reading all docs, consider caching for large datasets)
  const countSnapshot = await query.count().get();
  const total = countSnapshot.data().count;

  // Paginate
  const offset = (page - 1) * pageSize;
  const snapshot = await query
    .orderBy('createdAt', 'desc')
    .offset(offset)
    .limit(pageSize)
    .get();

  const data = snapshot.docs
    .map((doc) => mapProduct(doc, shopId))
    .filter((p): p is Product => p !== null);

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

export async function updateProduct(
  shopId: string,
  productId: string,
  updates: Partial<ProductInput>
): Promise<Product | null> {
  const productRef = collections.products(shopId).doc(productId);
  const doc = await productRef.get();

  if (!doc.exists) return null;

  await productRef.update(updates);

  const updatedDoc = await productRef.get();
  return mapProduct(updatedDoc, shopId);
}

export async function updateStock(
  shopId: string,
  productId: string,
  quantity: number
): Promise<Product | null> {
  const productRef = collections.products(shopId).doc(productId);
  const doc = await productRef.get();

  if (!doc.exists) return null;

  await productRef.update({
    stockQty: quantity,
  });

  const updatedDoc = await productRef.get();
  return mapProduct(updatedDoc, shopId);
}

export async function adjustStock(
  shopId: string,
  productId: string,
  delta: number
): Promise<Product | null> {
  const productRef = collections.products(shopId).doc(productId);
  const doc = await productRef.get();

  if (!doc.exists) return null;

  await productRef.update({
    stockQty: FieldValue.increment(delta),
  });

  const updatedDoc = await productRef.get();
  return mapProduct(updatedDoc, shopId);
}

export async function deleteProduct(shopId: string, productId: string): Promise<boolean> {
  const productRef = collections.products(shopId).doc(productId);
  const doc = await productRef.get();

  if (!doc.exists) return false;

  // Soft delete
  await productRef.update({ isActive: false });
  return true;
}

export async function getLowStockProducts(shopId: string): Promise<Product[]> {
  // Get all active products and filter in memory
  // Firestore doesn't support comparing two fields directly
  const snapshot = await collections.products(shopId)
    .where('isActive', '==', true)
    .get();

  return snapshot.docs
    .map((doc) => mapProduct(doc, shopId))
    .filter((p): p is Product => p !== null && p.stockQty <= p.lowStockThreshold);
}

export async function searchProducts(shopId: string, searchTerm: string): Promise<Product[]> {
  // Basic search - Firestore doesn't support full-text search
  // For production, consider Algolia or Typesense
  const snapshot = await collections.products(shopId)
    .where('isActive', '==', true)
    .get();

  const term = searchTerm.toLowerCase();

  return snapshot.docs
    .map((doc) => mapProduct(doc, shopId))
    .filter((p): p is Product => {
      if (!p) return false;
      return (
        p.name.toLowerCase().includes(term) ||
        p.description?.toLowerCase().includes(term) ||
        p.variants.some((v) => v.toLowerCase().includes(term))
      );
    });
}
