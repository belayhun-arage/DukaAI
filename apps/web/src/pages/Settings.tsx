import { useState, useEffect } from 'react';
import { Store, Bell, Bot, Save, RefreshCw, Plus } from 'lucide-react';
import { useShop } from '../context/ShopContext';

export default function Settings() {
  const { shop, isLoading, updateShop, updateSettings, createShop, selectShop } = useShop();

  const [shopSettings, setShopSettings] = useState({
    name: '',
    ownerName: '',
  });

  const [notificationSettings, setNotificationSettings] = useState({
    currency: 'ETB',
    timezone: 'Africa/Addis_Ababa',
    lowStockThreshold: 10,
    telegramNotifications: true,
    emailNotifications: false,
    dailyReports: true,
  });

  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // New shop form
  const [showNewShopForm, setShowNewShopForm] = useState(false);
  const [newShopData, setNewShopData] = useState({
    name: '',
    ownerTelegramId: '',
    ownerName: '',
  });

  // Shop ID input for selecting existing shop
  const [shopIdInput, setShopIdInput] = useState('');

  // Load shop data into form
  useEffect(() => {
    if (shop) {
      setShopSettings({
        name: shop.name,
        ownerName: shop.ownerName,
      });
      setNotificationSettings({
        currency: shop.settings?.currency || 'ETB',
        timezone: shop.settings?.timezone || 'Africa/Addis_Ababa',
        lowStockThreshold: shop.settings?.lowStockThreshold || 10,
        telegramNotifications: shop.settings?.telegramNotifications ?? true,
        emailNotifications: shop.settings?.emailNotifications ?? false,
        dailyReports: shop.settings?.dailyReports ?? true,
      });
    }
  }, [shop]);

  const handleSaveShopInfo = async () => {
    if (!shop) return;

    setIsSaving(true);
    setSaveMessage(null);
    try {
      await updateShop({
        name: shopSettings.name,
        ownerName: shopSettings.ownerName,
      });
      setSaveMessage({ type: 'success', text: 'Shop info saved successfully!' });
    } catch (err: any) {
      setSaveMessage({ type: 'error', text: err.message || 'Failed to save shop info' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveSettings = async () => {
    if (!shop) return;

    setIsSaving(true);
    setSaveMessage(null);
    try {
      await updateSettings({
        currency: notificationSettings.currency,
        timezone: notificationSettings.timezone,
        lowStockThreshold: notificationSettings.lowStockThreshold,
        telegramNotifications: notificationSettings.telegramNotifications,
        emailNotifications: notificationSettings.emailNotifications,
        dailyReports: notificationSettings.dailyReports,
      });
      setSaveMessage({ type: 'success', text: 'Settings saved successfully!' });
    } catch (err: any) {
      setSaveMessage({ type: 'error', text: err.message || 'Failed to save settings' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleCreateShop = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setSaveMessage(null);
    try {
      await createShop(newShopData.name, newShopData.ownerTelegramId, newShopData.ownerName);
      setSaveMessage({ type: 'success', text: 'Shop created successfully!' });
      setShowNewShopForm(false);
      setNewShopData({ name: '', ownerTelegramId: '', ownerName: '' });
    } catch (err: any) {
      setSaveMessage({ type: 'error', text: err.message || 'Failed to create shop' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleSelectShop = async () => {
    if (!shopIdInput.trim()) return;

    setIsSaving(true);
    setSaveMessage(null);
    try {
      await selectShop(shopIdInput.trim());
      setSaveMessage({ type: 'success', text: 'Shop loaded successfully!' });
      setShopIdInput('');
    } catch (err: any) {
      setSaveMessage({ type: 'error', text: err.message || 'Failed to load shop' });
    } finally {
      setIsSaving(false);
    }
  };

  // Clear message after 3 seconds
  useEffect(() => {
    if (saveMessage) {
      const timer = setTimeout(() => setSaveMessage(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [saveMessage]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <RefreshCw className="w-8 h-8 text-primary-600 animate-spin" />
      </div>
    );
  }

  // No shop selected - show create/select form
  if (!shop) {
    return (
      <div className="space-y-6 max-w-xl mx-auto">
        <div className="text-center">
          <Store className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900">Welcome to DukaAI</h1>
          <p className="text-gray-500 mt-2">Create a new shop or enter an existing shop ID to get started.</p>
        </div>

        {saveMessage && (
          <div className={`p-4 rounded-lg ${saveMessage.type === 'success' ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'}`}>
            {saveMessage.text}
          </div>
        )}

        {/* Select Existing Shop */}
        <div className="card">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Load Existing Shop</h2>
          <div className="flex gap-2">
            <input
              type="text"
              value={shopIdInput}
              onChange={(e) => setShopIdInput(e.target.value)}
              placeholder="Enter Shop ID..."
              className="input flex-1"
            />
            <button
              onClick={handleSelectShop}
              disabled={isSaving || !shopIdInput.trim()}
              className="btn btn-primary"
            >
              Load
            </button>
          </div>
        </div>

        <div className="text-center text-gray-400">or</div>

        {/* Create New Shop */}
        {showNewShopForm ? (
          <div className="card">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Create New Shop</h2>
            <form onSubmit={handleCreateShop} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Shop Name *</label>
                <input
                  type="text"
                  value={newShopData.name}
                  onChange={(e) => setNewShopData({ ...newShopData, name: e.target.value })}
                  className="input"
                  placeholder="e.g., My Grocery Store"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Owner Name *</label>
                <input
                  type="text"
                  value={newShopData.ownerName}
                  onChange={(e) => setNewShopData({ ...newShopData, ownerName: e.target.value })}
                  className="input"
                  placeholder="e.g., Abebe Kebede"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Telegram ID *</label>
                <input
                  type="text"
                  value={newShopData.ownerTelegramId}
                  onChange={(e) => setNewShopData({ ...newShopData, ownerTelegramId: e.target.value })}
                  className="input"
                  placeholder="e.g., 123456789"
                  required
                />
                <p className="text-sm text-gray-500 mt-1">
                  Your Telegram numeric ID (get it from @userinfobot)
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowNewShopForm(false)}
                  className="flex-1 btn btn-secondary"
                >
                  Cancel
                </button>
                <button type="submit" disabled={isSaving} className="flex-1 btn btn-primary">
                  {isSaving ? 'Creating...' : 'Create Shop'}
                </button>
              </div>
            </form>
          </div>
        ) : (
          <button
            onClick={() => setShowNewShopForm(true)}
            className="w-full btn btn-primary flex items-center justify-center gap-2"
          >
            <Plus className="w-5 h-5" />
            Create New Shop
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="text-gray-500 mt-1">Configure your shop preferences and notifications</p>
      </div>

      {/* Save Message */}
      {saveMessage && (
        <div className={`p-4 rounded-lg ${saveMessage.type === 'success' ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'}`}>
          {saveMessage.text}
        </div>
      )}

      {/* Shop Info */}
      <div className="card">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-primary-50 rounded-lg flex items-center justify-center">
            <Store className="w-5 h-5 text-primary-600" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Shop Information</h2>
            <p className="text-sm text-gray-500">Shop ID: {shop.id}</p>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Shop Name</label>
            <input
              type="text"
              value={shopSettings.name}
              onChange={(e) => setShopSettings({ ...shopSettings, name: e.target.value })}
              className="input"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Owner Name</label>
            <input
              type="text"
              value={shopSettings.ownerName}
              onChange={(e) => setShopSettings({ ...shopSettings, ownerName: e.target.value })}
              className="input"
            />
          </div>

          <button
            onClick={handleSaveShopInfo}
            disabled={isSaving}
            className="btn btn-primary flex items-center gap-2"
          >
            <Save className="w-4 h-4" />
            {isSaving ? 'Saving...' : 'Save Shop Info'}
          </button>
        </div>
      </div>

      {/* Shop Settings */}
      <div className="card">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center">
            <Bell className="w-5 h-5 text-blue-600" />
          </div>
          <h2 className="text-lg font-semibold text-gray-900">Shop Settings</h2>
        </div>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Currency</label>
              <select
                value={notificationSettings.currency}
                onChange={(e) => setNotificationSettings({ ...notificationSettings, currency: e.target.value })}
                className="input"
              >
                <option value="ETB">ETB - Ethiopian Birr</option>
                <option value="USD">USD - US Dollar</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Timezone</label>
              <select
                value={notificationSettings.timezone}
                onChange={(e) => setNotificationSettings({ ...notificationSettings, timezone: e.target.value })}
                className="input"
              >
                <option value="Africa/Addis_Ababa">Africa/Addis_Ababa (EAT)</option>
                <option value="UTC">UTC</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Low Stock Threshold (units)
            </label>
            <input
              type="number"
              value={notificationSettings.lowStockThreshold}
              onChange={(e) =>
                setNotificationSettings({ ...notificationSettings, lowStockThreshold: parseInt(e.target.value) || 10 })
              }
              className="input w-32"
              min="1"
            />
            <p className="text-sm text-gray-500 mt-1">
              Products below this quantity will be flagged as low stock
            </p>
          </div>

          <div className="pt-4 space-y-3">
            <label className="flex items-center justify-between p-4 bg-gray-50 rounded-lg cursor-pointer">
              <div>
                <p className="font-medium text-gray-900">Telegram Notifications</p>
                <p className="text-sm text-gray-500">Receive order updates via Telegram bot</p>
              </div>
              <input
                type="checkbox"
                checked={notificationSettings.telegramNotifications}
                onChange={(e) =>
                  setNotificationSettings({ ...notificationSettings, telegramNotifications: e.target.checked })
                }
                className="w-5 h-5 text-primary-600 rounded"
              />
            </label>

            <label className="flex items-center justify-between p-4 bg-gray-50 rounded-lg cursor-pointer">
              <div>
                <p className="font-medium text-gray-900">Email Notifications</p>
                <p className="text-sm text-gray-500">Receive daily summaries via email</p>
              </div>
              <input
                type="checkbox"
                checked={notificationSettings.emailNotifications}
                onChange={(e) =>
                  setNotificationSettings({ ...notificationSettings, emailNotifications: e.target.checked })
                }
                className="w-5 h-5 text-primary-600 rounded"
              />
            </label>

            <label className="flex items-center justify-between p-4 bg-gray-50 rounded-lg cursor-pointer">
              <div>
                <p className="font-medium text-gray-900">Daily Reports</p>
                <p className="text-sm text-gray-500">Get automated daily business summaries</p>
              </div>
              <input
                type="checkbox"
                checked={notificationSettings.dailyReports}
                onChange={(e) =>
                  setNotificationSettings({ ...notificationSettings, dailyReports: e.target.checked })
                }
                className="w-5 h-5 text-primary-600 rounded"
              />
            </label>
          </div>

          <button
            onClick={handleSaveSettings}
            disabled={isSaving}
            className="btn btn-primary flex items-center gap-2"
          >
            <Save className="w-4 h-4" />
            {isSaving ? 'Saving...' : 'Save Settings'}
          </button>
        </div>
      </div>

      {/* Telegram Bot */}
      <div className="card">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-purple-50 rounded-lg flex items-center justify-center">
            <Bot className="w-5 h-5 text-purple-600" />
          </div>
          <h2 className="text-lg font-semibold text-gray-900">Telegram Bot</h2>
        </div>

        <div className="bg-gray-50 rounded-lg p-4">
          <p className="text-sm text-gray-600 mb-3">
            Connect your shop to the Telegram bot for voice/text order intake.
          </p>
          <div className="flex items-center gap-4">
            <code className="bg-white px-4 py-2 rounded border border-gray-200 text-sm">
              @DukaAIBot
            </code>
            {shop.telegramBotToken ? (
              <span className="badge bg-green-100 text-green-800">Connected</span>
            ) : (
              <span className="badge bg-gray-100 text-gray-800">Not Connected</span>
            )}
          </div>
          <p className="text-sm text-gray-500 mt-3">
            Telegram ID: <code className="bg-white px-2 py-1 rounded border text-xs">{shop.ownerTelegramId}</code>
          </p>
        </div>
      </div>
    </div>
  );
}
