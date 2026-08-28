import * as admin from 'firebase-admin';
import { config } from './index';

let db: admin.firestore.Firestore | null = null;
let isInitialized = false;

export function initializeFirebase(): boolean {
  if (isInitialized) return true;

  // Check if Firebase credentials are configured
  if (!config.firebase.projectId || !config.firebase.clientEmail) {
    console.warn('Firebase not configured - running in mock mode');
    return false;
  }

  try {
    if (admin.apps.length === 0) {
      admin.initializeApp({
        credential: admin.credential.cert({
          projectId: config.firebase.projectId,
          privateKey: config.firebase.privateKey,
          clientEmail: config.firebase.clientEmail,
        }),
      });
    }

    db = admin.firestore();

    // Set Firestore settings
    db.settings({
      ignoreUndefinedProperties: true,
    });

    isInitialized = true;
    console.log('Firebase initialized successfully');
    return true;
  } catch (error) {
    console.error('Firebase initialization failed:', error);
    return false;
  }
}

export function getFirestore(): admin.firestore.Firestore {
  if (!db) {
    throw new Error('Firestore not initialized or running in mock mode.');
  }
  return db;
}

export function isFirebaseInitialized(): boolean {
  return isInitialized;
}

// Collection references
export const collections = {
  shops: () => getFirestore().collection('shops'),
  products: (shopId: string) => getFirestore().collection(`shops/${shopId}/products`),
  orders: (shopId: string) => getFirestore().collection(`shops/${shopId}/orders`),
  customers: (shopId: string) => getFirestore().collection(`shops/${shopId}/customers`),
  sessions: () => getFirestore().collection('sessions'),
  dailyStats: (shopId: string) => getFirestore().collection(`shops/${shopId}/dailyStats`),
};
