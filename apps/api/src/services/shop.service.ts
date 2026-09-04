import { collections, getFirestore } from '../config/firebase';
import { Shop, ShopSettings } from '@dukaai/shared';
import { FieldValue } from 'firebase-admin/firestore';

const DEFAULT_SETTINGS: ShopSettings = {
  currency: 'ETB',
  timezone: 'Africa/Addis_Ababa',
  lowStockThreshold: 10,
};

function mapShop(doc: FirebaseFirestore.DocumentSnapshot): Shop | null {
  const data = doc.data();
  if (!data) return null;

  return {
    id: doc.id,
    name: data.name,
    ownerTelegramId: data.ownerTelegramId,
    ownerName: data.ownerName,
    createdAt: data.createdAt?.toDate() ?? new Date(),
    settings: data.settings ?? DEFAULT_SETTINGS,
  };
}

export async function createShop(input: {
  name: string;
  ownerTelegramId: string;
  ownerName: string;
}): Promise<Shop> {
  const docRef = collections.shops().doc();

  const shopData = {
    name: input.name,
    ownerTelegramId: input.ownerTelegramId,
    ownerName: input.ownerName,
    settings: DEFAULT_SETTINGS,
    createdAt: FieldValue.serverTimestamp(),
  };

  await docRef.set(shopData);

  return {
    id: docRef.id,
    ...input,
    settings: DEFAULT_SETTINGS,
    createdAt: new Date(),
  };
}

export async function getShopById(shopId: string): Promise<Shop | null> {
  const doc = await collections.shops().doc(shopId).get();
  return mapShop(doc);
}

export async function getAllShops(): Promise<Shop[]> {
  const snapshot = await collections.shops().get();
  return snapshot.docs.map(mapShop).filter((shop): shop is Shop => shop !== null);
}

export async function getShopByOwnerTelegramId(telegramId: string): Promise<Shop | null> {
  const snapshot = await collections.shops()
    .where('ownerTelegramId', '==', telegramId)
    .limit(1)
    .get();

  if (snapshot.empty) return null;
  return mapShop(snapshot.docs[0]);
}

export async function updateShopSettings(
  shopId: string,
  settings: Partial<ShopSettings>
): Promise<Shop | null> {
  const shopRef = collections.shops().doc(shopId);
  const doc = await shopRef.get();

  if (!doc.exists) return null;

  const currentSettings = doc.data()?.settings ?? DEFAULT_SETTINGS;
  const newSettings = { ...currentSettings, ...settings };

  await shopRef.update({ settings: newSettings });

  const updatedDoc = await shopRef.get();
  return mapShop(updatedDoc);
}

export async function updateShop(
  shopId: string,
  updates: Partial<Pick<Shop, 'name' | 'ownerName' | 'ownerTelegramId'>>
): Promise<Shop | null> {
  const shopRef = collections.shops().doc(shopId);
  const doc = await shopRef.get();

  if (!doc.exists) return null;

  await shopRef.update(updates);

  const updatedDoc = await shopRef.get();
  return mapShop(updatedDoc);
}
