import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import type { Shop } from '@dukaai/shared';
import { shopApi, setShopId, getShopId, clearShopId } from '../services/api';

interface ShopContextType {
  shop: Shop | null;
  isLoading: boolean;
  error: string | null;
  selectShop: (shopId: string) => Promise<void>;
  createShop: (name: string, ownerTelegramId: string, ownerName: string) => Promise<Shop>;
  updateShop: (data: { name?: string; ownerName?: string }) => Promise<void>;
  updateSettings: (settings: Partial<Shop['settings']>) => Promise<void>;
  logout: () => void;
}

const ShopContext = createContext<ShopContextType | null>(null);

export function ShopProvider({ children }: { children: ReactNode }) {
  const [shop, setShop] = useState<Shop | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load shop on mount if shopId exists in localStorage
  useEffect(() => {
    const savedShopId = getShopId();
    if (savedShopId) {
      loadShop(savedShopId);
    } else {
      setIsLoading(false);
    }
  }, []);

  async function loadShop(shopId: string) {
    setIsLoading(true);
    setError(null);
    try {
      setShopId(shopId);
      const shopData = await shopApi.getCurrent();
      setShop(shopData);
    } catch (err: any) {
      console.error('Failed to load shop:', err);
      setError(err.message || 'Failed to load shop');
      clearShopId();
    } finally {
      setIsLoading(false);
    }
  }

  async function selectShop(shopId: string) {
    await loadShop(shopId);
  }

  async function createShop(name: string, ownerTelegramId: string, ownerName: string): Promise<Shop> {
    setIsLoading(true);
    setError(null);
    try {
      const newShop = await shopApi.create({ name, ownerTelegramId, ownerName });
      setShopId(newShop.id);
      setShop(newShop);
      return newShop;
    } catch (err: any) {
      setError(err.message || 'Failed to create shop');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }

  async function updateShop(data: { name?: string; ownerName?: string }) {
    if (!shop) return;
    try {
      const updated = await shopApi.update(data);
      setShop(updated);
    } catch (err: any) {
      setError(err.message || 'Failed to update shop');
      throw err;
    }
  }

  async function updateSettings(settings: Partial<Shop['settings']>) {
    if (!shop) return;
    try {
      const updated = await shopApi.updateSettings(settings);
      setShop(updated);
    } catch (err: any) {
      setError(err.message || 'Failed to update settings');
      throw err;
    }
  }

  function logout() {
    clearShopId();
    setShop(null);
    setError(null);
  }

  return (
    <ShopContext.Provider
      value={{
        shop,
        isLoading,
        error,
        selectShop,
        createShop,
        updateShop,
        updateSettings,
        logout,
      }}
    >
      {children}
    </ShopContext.Provider>
  );
}

export function useShop() {
  const context = useContext(ShopContext);
  if (!context) {
    throw new Error('useShop must be used within a ShopProvider');
  }
  return context;
}
