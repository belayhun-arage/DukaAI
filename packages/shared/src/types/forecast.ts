// Demand Forecasting Types

/**
 * Product demand prediction for a future period
 */
export interface DemandPrediction {
  productId: string;
  productName: string;
  currentStock: number;

  // Historical data
  salesLast7Days: number;
  salesLast30Days: number;
  averageDailySales: number;
  salesTrend: 'increasing' | 'stable' | 'decreasing';

  // Predictions
  predictedDemand7Days: number;
  predictedDemand30Days: number;
  confidence: number; // 0-1

  // Recommendations
  daysUntilStockout: number | null;
  restockUrgency: 'critical' | 'high' | 'medium' | 'low' | 'none';
  recommendedRestockQty: number;
  recommendedRestockDate: Date | null;
}

/**
 * Overall forecast report for a shop
 */
export interface ForecastReport {
  id: string;
  shopId: string;
  generatedAt: Date;
  periodDays: number;

  // Summary
  totalProductsAnalyzed: number;
  criticalRestockCount: number;
  highRestockCount: number;
  predictedRevenue7Days: number;
  predictedRevenue30Days: number;

  // Predictions by product
  predictions: DemandPrediction[];

  // AI insights
  insights: ForecastInsight[];

  // Model info
  modelUsed: string;
  dataPointsAnalyzed: number;
}

/**
 * AI-generated insight about demand patterns
 */
export interface ForecastInsight {
  id: string;
  type: 'trend' | 'anomaly' | 'opportunity' | 'risk' | 'recommendation';
  severity: 'info' | 'warning' | 'critical';
  title: string;
  description: string;
  affectedProducts?: string[];
  suggestedAction?: string;
}

/**
 * Restock recommendation
 */
export interface RestockRecommendation {
  productId: string;
  productName: string;
  currentStock: number;
  recommendedQty: number;
  estimatedCost: number;
  urgency: 'critical' | 'high' | 'medium' | 'low';
  reason: string;
  daysUntilStockout: number | null;
}

/**
 * Sales pattern for a product
 */
export interface SalesPattern {
  productId: string;
  dailySales: { date: string; qty: number; revenue: number }[];
  weeklySales: { week: string; qty: number; revenue: number }[];
  peakDays: string[]; // Day names with highest sales
  averageOrderSize: number;
  repeatCustomerRate: number;
}

/**
 * Forecast job status
 */
export interface ForecastJobStatus {
  shopId: string;
  lastRunAt: Date | null;
  nextRunAt: Date | null;
  status: 'idle' | 'running' | 'completed' | 'failed';
  lastError?: string;
  lastReportId?: string;
}

/**
 * Request to generate a forecast
 */
export interface GenerateForecastRequest {
  shopId: string;
  periodDays?: number; // Default 30
  includeInsights?: boolean; // Default true
  notifyOwner?: boolean; // Default false
}

/**
 * Seasonal pattern detected in sales
 */
export interface SeasonalPattern {
  type: 'daily' | 'weekly' | 'monthly';
  pattern: string; // Description
  peakPeriods: string[];
  lowPeriods: string[];
  confidence: number;
}
