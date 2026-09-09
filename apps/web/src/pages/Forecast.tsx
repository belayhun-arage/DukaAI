import { useState, useEffect } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import {
  TrendingUp,
  TrendingDown,
  Minus,
  Package,
  AlertTriangle,
  RefreshCw,
  Clock,
  DollarSign,
  Lightbulb,
  ArrowRight,
  Zap,
} from 'lucide-react';
import { forecastApi } from '../services/api';
import { useShop } from '../context/ShopContext';
import type { ForecastReport, DemandPrediction, ForecastInsight } from '@dukaai/shared';

const urgencyColors: Record<string, string> = {
  critical: 'bg-red-100 text-red-800 border-red-200',
  high: 'bg-orange-100 text-orange-800 border-orange-200',
  medium: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  low: 'bg-blue-100 text-blue-800 border-blue-200',
  none: 'bg-gray-100 text-gray-800 border-gray-200',
};

const trendIcons = {
  increasing: TrendingUp,
  decreasing: TrendingDown,
  stable: Minus,
};

const trendColors = {
  increasing: 'text-green-600',
  decreasing: 'text-red-600',
  stable: 'text-gray-600',
};

export default function Forecast() {
  const { shop, isLoading: isShopLoading } = useShop();
  const [forecast, setForecast] = useState<ForecastReport | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<DemandPrediction | null>(null);

  useEffect(() => {
    if (shop) {
      loadForecast();
    }
  }, [shop]);

  async function loadForecast() {
    setIsLoading(true);
    setError(null);
    try {
      const data = await forecastApi.getLatest();
      setForecast(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load forecast');
    } finally {
      setIsLoading(false);
    }
  }

  async function generateForecast() {
    setIsGenerating(true);
    setError(null);
    try {
      const data = await forecastApi.generate(30);
      setForecast(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate forecast');
    } finally {
      setIsGenerating(false);
    }
  }

  // Show loading state
  if (isShopLoading || isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900">Demand Forecast</h1>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="bg-white rounded-lg shadow p-4 animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-1/2 mb-2"></div>
              <div className="h-8 bg-gray-200 rounded w-3/4"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // No shop selected
  if (!shop) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-center">
        <Package className="w-16 h-16 text-gray-300 mb-4" />
        <h2 className="text-xl font-semibold text-gray-600 mb-2">No Shop Selected</h2>
        <p className="text-gray-500 mb-4">Create or select a shop to view forecasts.</p>
        <a href="/settings" className="btn btn-primary">Go to Settings</a>
      </div>
    );
  }

  // Error state
  if (error && !forecast) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-center">
        <AlertTriangle className="w-16 h-16 text-red-300 mb-4" />
        <h2 className="text-xl font-semibold text-gray-600 mb-2">Error Loading Forecast</h2>
        <p className="text-gray-500 mb-4">{error}</p>
        <button onClick={loadForecast} className="btn btn-primary">Try Again</button>
      </div>
    );
  }

  // No forecast yet
  if (!forecast) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <TrendingUp className="w-8 h-8 text-indigo-600" />
            <h1 className="text-2xl font-bold text-gray-900">Demand Forecast</h1>
          </div>
        </div>

        <div className="flex flex-col items-center justify-center min-h-[400px] text-center bg-white rounded-lg shadow p-8">
          <Zap className="w-16 h-16 text-indigo-400 mb-4" />
          <h2 className="text-xl font-semibold text-gray-700 mb-2">No Forecast Available</h2>
          <p className="text-gray-500 mb-6 max-w-md">
            Generate a demand forecast to see predicted sales, restock recommendations, and AI-powered insights.
          </p>
          <button
            onClick={generateForecast}
            disabled={isGenerating}
            className="flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
          >
            {isGenerating ? (
              <>
                <RefreshCw className="w-5 h-5 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Zap className="w-5 h-5" />
                Generate Forecast
              </>
            )}
          </button>
        </div>
      </div>
    );
  }

  // Prepare chart data
  const restockData = forecast.predictions
    .filter(p => p.restockUrgency !== 'none')
    .slice(0, 10)
    .map(p => ({
      name: p.productName.length > 15 ? p.productName.substring(0, 15) + '...' : p.productName,
      current: p.currentStock,
      predicted: p.predictedDemand30Days,
      recommended: p.recommendedRestockQty,
    }));

  const demandData = forecast.predictions
    .sort((a, b) => b.predictedDemand7Days - a.predictedDemand7Days)
    .slice(0, 8)
    .map(p => ({
      name: p.productName.length > 12 ? p.productName.substring(0, 12) + '...' : p.productName,
      '7 Days': p.predictedDemand7Days,
      '30 Days': p.predictedDemand30Days,
      trend: p.salesTrend,
    }));

  const currency = shop?.settings?.currency || 'ETB';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <TrendingUp className="w-8 h-8 text-indigo-600" />
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Demand Forecast</h1>
            <p className="text-sm text-gray-500">
              Generated {new Date(forecast.generatedAt).toLocaleDateString()} at{' '}
              {new Date(forecast.generatedAt).toLocaleTimeString()}
            </p>
          </div>
        </div>
        <button
          onClick={generateForecast}
          disabled={isGenerating}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
        >
          {isGenerating ? (
            <>
              <RefreshCw className="w-4 h-4 animate-spin" />
              Generating...
            </>
          ) : (
            <>
              <RefreshCw className="w-4 h-4" />
              Refresh Forecast
            </>
          )}
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center gap-2 text-gray-500 text-sm mb-1">
            <Package className="w-4 h-4" />
            Products Analyzed
          </div>
          <div className="text-2xl font-bold text-gray-900">{forecast.totalProductsAnalyzed}</div>
        </div>

        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center gap-2 text-gray-500 text-sm mb-1">
            <DollarSign className="w-4 h-4" />
            Predicted Revenue (7d)
          </div>
          <div className="text-2xl font-bold text-green-600">
            {forecast.predictedRevenue7Days.toLocaleString()} {currency}
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center gap-2 text-gray-500 text-sm mb-1">
            <AlertTriangle className="w-4 h-4 text-red-500" />
            Critical Restock
          </div>
          <div className="text-2xl font-bold text-red-600">{forecast.criticalRestockCount}</div>
        </div>

        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center gap-2 text-gray-500 text-sm mb-1">
            <Clock className="w-4 h-4 text-orange-500" />
            High Priority
          </div>
          <div className="text-2xl font-bold text-orange-600">{forecast.highRestockCount}</div>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Demand Forecast Chart */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Predicted Demand (Top Products)</h2>
          {demandData.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={demandData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="7 Days" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                <Bar dataKey="30 Days" fill="#93c5fd" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-[280px] text-gray-400">
              No demand data available
            </div>
          )}
        </div>

        {/* Restock Recommendations Chart */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Restock Recommendations</h2>
          {restockData.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={restockData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" />
                <YAxis dataKey="name" type="category" width={100} tick={{ fontSize: 11 }} />
                <Tooltip />
                <Legend />
                <Bar dataKey="current" name="Current Stock" fill="#94a3b8" />
                <Bar dataKey="recommended" name="Restock Qty" fill="#f97316" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-[280px] text-gray-400">
              All products well stocked
            </div>
          )}
        </div>
      </div>

      {/* AI Insights */}
      {forecast.insights.length > 0 && (
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Lightbulb className="w-5 h-5 text-yellow-500" />
            AI Insights
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {forecast.insights.map((insight) => (
              <InsightCard key={insight.id} insight={insight} />
            ))}
          </div>
        </div>
      )}

      {/* Product Predictions Table */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">All Product Predictions</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Product</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Stock</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Trend</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">7d Demand</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">30d Demand</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Days Left</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Urgency</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Restock</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {forecast.predictions.map((prediction) => {
                const TrendIcon = trendIcons[prediction.salesTrend];
                return (
                  <tr
                    key={prediction.productId}
                    className="hover:bg-gray-50 cursor-pointer"
                    onClick={() => setSelectedProduct(prediction)}
                  >
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">
                      {prediction.productName}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {prediction.currentStock}
                    </td>
                    <td className="px-4 py-3">
                      <TrendIcon className={`w-4 h-4 ${trendColors[prediction.salesTrend]}`} />
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {prediction.predictedDemand7Days}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {prediction.predictedDemand30Days}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {prediction.daysUntilStockout !== null ? (
                        <span className={prediction.daysUntilStockout <= 7 ? 'text-red-600 font-medium' : ''}>
                          {prediction.daysUntilStockout}
                        </span>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full border ${urgencyColors[prediction.restockUrgency]}`}>
                        {prediction.restockUrgency}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm font-medium text-orange-600">
                      {prediction.recommendedRestockQty > 0 ? `+${prediction.recommendedRestockQty}` : '-'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Product Detail Modal */}
      {selectedProduct && (
        <ProductPredictionModal
          prediction={selectedProduct}
          onClose={() => setSelectedProduct(null)}
        />
      )}
    </div>
  );
}

function InsightCard({ insight }: { insight: ForecastInsight }) {
  const severityStyles = {
    critical: 'border-l-red-500 bg-red-50',
    warning: 'border-l-orange-500 bg-orange-50',
    info: 'border-l-blue-500 bg-blue-50',
  };

  const severityIcons = {
    critical: AlertTriangle,
    warning: Clock,
    info: Lightbulb,
  };

  const Icon = severityIcons[insight.severity];

  return (
    <div className={`border-l-4 rounded-r-lg p-4 ${severityStyles[insight.severity]}`}>
      <div className="flex items-start gap-3">
        <Icon className={`w-5 h-5 mt-0.5 ${
          insight.severity === 'critical' ? 'text-red-500' :
          insight.severity === 'warning' ? 'text-orange-500' : 'text-blue-500'
        }`} />
        <div>
          <h3 className="font-medium text-gray-900">{insight.title}</h3>
          <p className="text-sm text-gray-600 mt-1">{insight.description}</p>
          {insight.suggestedAction && (
            <p className="text-sm text-indigo-600 mt-2 flex items-center gap-1">
              <ArrowRight className="w-3 h-3" />
              {insight.suggestedAction}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

function ProductPredictionModal({
  prediction,
  onClose,
}: {
  prediction: DemandPrediction;
  onClose: () => void;
}) {
  const TrendIcon = trendIcons[prediction.salesTrend];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-lg w-full">
        <div className="p-4 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">{prediction.productName}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <span className="sr-only">Close</span>
            &times;
          </button>
        </div>

        <div className="p-4 space-y-4">
          {/* Current Status */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-xs text-gray-500">Current Stock</p>
              <p className="text-xl font-bold text-gray-900">{prediction.currentStock}</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-xs text-gray-500">Sales Trend</p>
              <div className="flex items-center gap-2">
                <TrendIcon className={`w-5 h-5 ${trendColors[prediction.salesTrend]}`} />
                <span className="text-lg font-medium capitalize">{prediction.salesTrend}</span>
              </div>
            </div>
          </div>

          {/* Sales History */}
          <div className="bg-blue-50 rounded-lg p-4">
            <h3 className="font-medium text-blue-900 mb-2">Sales History</h3>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-2xl font-bold text-blue-700">{prediction.salesLast7Days}</p>
                <p className="text-xs text-blue-600">Last 7 days</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-blue-700">{prediction.salesLast30Days}</p>
                <p className="text-xs text-blue-600">Last 30 days</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-blue-700">{prediction.averageDailySales.toFixed(1)}</p>
                <p className="text-xs text-blue-600">Avg/day</p>
              </div>
            </div>
          </div>

          {/* Predictions */}
          <div className="bg-green-50 rounded-lg p-4">
            <h3 className="font-medium text-green-900 mb-2">Predicted Demand</h3>
            <div className="grid grid-cols-2 gap-4 text-center">
              <div>
                <p className="text-2xl font-bold text-green-700">{prediction.predictedDemand7Days}</p>
                <p className="text-xs text-green-600">Next 7 days</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-green-700">{prediction.predictedDemand30Days}</p>
                <p className="text-xs text-green-600">Next 30 days</p>
              </div>
            </div>
            <p className="text-xs text-green-600 mt-2 text-center">
              Confidence: {Math.round(prediction.confidence * 100)}%
            </p>
          </div>

          {/* Restock Recommendation */}
          {prediction.restockUrgency !== 'none' && (
            <div className={`rounded-lg p-4 border ${urgencyColors[prediction.restockUrgency]}`}>
              <h3 className="font-medium mb-2">Restock Recommendation</h3>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm">
                    {prediction.daysUntilStockout !== null
                      ? `Stockout expected in ${prediction.daysUntilStockout} days`
                      : 'Stock below threshold'}
                  </p>
                  <p className="text-lg font-bold mt-1">
                    Restock: +{prediction.recommendedRestockQty} units
                  </p>
                </div>
                <span className={`px-3 py-1 text-sm font-medium rounded-full border ${urgencyColors[prediction.restockUrgency]}`}>
                  {prediction.restockUrgency.toUpperCase()}
                </span>
              </div>
            </div>
          )}
        </div>

        <div className="p-4 border-t border-gray-200">
          <button
            onClick={onClose}
            className="w-full px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
