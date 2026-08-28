import { useState } from 'react';
import { Store, Bell, Bot, Save } from 'lucide-react';

export default function Settings() {
  const [settings, setSettings] = useState({
    shopName: 'Demo Shop',
    currency: 'ETB',
    timezone: 'Africa/Addis_Ababa',
    lowStockThreshold: 10,
    telegramNotifications: true,
    emailNotifications: false,
    dailyReports: true,
    lowStockAlerts: true,
  });

  const handleSave = () => {
    // TODO: Save settings to API
    alert('Settings saved successfully!');
  };

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="text-gray-500 mt-1">Configure your shop preferences and notifications</p>
      </div>

      {/* Shop Settings */}
      <div className="card">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-primary-50 rounded-lg flex items-center justify-center">
            <Store className="w-5 h-5 text-primary-600" />
          </div>
          <h2 className="text-lg font-semibold text-gray-900">Shop Settings</h2>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Shop Name</label>
            <input
              type="text"
              value={settings.shopName}
              onChange={(e) => setSettings({ ...settings, shopName: e.target.value })}
              className="input"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Currency</label>
              <select
                value={settings.currency}
                onChange={(e) => setSettings({ ...settings, currency: e.target.value })}
                className="input"
              >
                <option value="ETB">ETB - Ethiopian Birr</option>
                <option value="USD">USD - US Dollar</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Timezone</label>
              <select
                value={settings.timezone}
                onChange={(e) => setSettings({ ...settings, timezone: e.target.value })}
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
              value={settings.lowStockThreshold}
              onChange={(e) =>
                setSettings({ ...settings, lowStockThreshold: parseInt(e.target.value) })
              }
              className="input w-32"
              min="1"
            />
            <p className="text-sm text-gray-500 mt-1">
              Products below this quantity will be flagged as low stock
            </p>
          </div>
        </div>
      </div>

      {/* Notification Settings */}
      <div className="card">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center">
            <Bell className="w-5 h-5 text-blue-600" />
          </div>
          <h2 className="text-lg font-semibold text-gray-900">Notifications</h2>
        </div>

        <div className="space-y-4">
          <label className="flex items-center justify-between p-4 bg-gray-50 rounded-lg cursor-pointer">
            <div>
              <p className="font-medium text-gray-900">Telegram Notifications</p>
              <p className="text-sm text-gray-500">Receive order updates via Telegram bot</p>
            </div>
            <input
              type="checkbox"
              checked={settings.telegramNotifications}
              onChange={(e) =>
                setSettings({ ...settings, telegramNotifications: e.target.checked })
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
              checked={settings.emailNotifications}
              onChange={(e) => setSettings({ ...settings, emailNotifications: e.target.checked })}
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
              checked={settings.dailyReports}
              onChange={(e) => setSettings({ ...settings, dailyReports: e.target.checked })}
              className="w-5 h-5 text-primary-600 rounded"
            />
          </label>

          <label className="flex items-center justify-between p-4 bg-gray-50 rounded-lg cursor-pointer">
            <div>
              <p className="font-medium text-gray-900">Low Stock Alerts</p>
              <p className="text-sm text-gray-500">Get notified when products are running low</p>
            </div>
            <input
              type="checkbox"
              checked={settings.lowStockAlerts}
              onChange={(e) => setSettings({ ...settings, lowStockAlerts: e.target.checked })}
              className="w-5 h-5 text-primary-600 rounded"
            />
          </label>
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
            <span className="badge bg-green-100 text-green-800">Connected</span>
          </div>
        </div>
      </div>

      {/* Save Button */}
      <div className="flex justify-end">
        <button onClick={handleSave} className="btn-primary flex items-center gap-2">
          <Save className="w-5 h-5" />
          Save Settings
        </button>
      </div>
    </div>
  );
}
