import { GoogleGenerativeAI } from '@google/generative-ai';
import { v4 as uuidv4 } from 'uuid';
import { config } from '../config';
import { collections, isFirebaseInitialized } from '../config/firebase';
import {
  DemandPrediction,
  ForecastReport,
  ForecastInsight,
  RestockRecommendation,
  SalesPattern,
  Product,
  Order,
} from '@dukaai/shared';
import * as productService from './product.service';
import * as orderService from './order.service';

let genAI: GoogleGenerativeAI | null = null;

export function initializeForecastService(): boolean {
  if (!config.gemini.apiKey) {
    console.warn('Gemini API key not configured - forecasting disabled');
    return false;
  }
  genAI = new GoogleGenerativeAI(config.gemini.apiKey);
  console.log('Forecast service initialized');
  return true;
}

/**
 * Generate a comprehensive demand forecast report
 */
export async function generateForecast(
  shopId: string,
  periodDays: number = 30
): Promise<ForecastReport> {
  const reportId = uuidv4();
  const startTime = Date.now();

  // Get all products
  const productsResponse = await productService.getProducts(shopId, { pageSize: 500 });
  const products = productsResponse.data;

  // Get historical orders (last 90 days for better analysis)
  const ninetyDaysAgo = new Date();
  ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

  const ordersResponse = await orderService.getOrders(shopId, {
    startDate: ninetyDaysAgo,
    pageSize: 1000,
  });
  const orders = ordersResponse.data.filter((o) => o.status !== 'CANCELLED');

  // Calculate sales patterns for each product
  const salesByProduct = calculateSalesByProduct(orders, products);

  // Generate predictions for each product
  const predictions: DemandPrediction[] = [];

  for (const product of products) {
    if (!product.isActive) continue;

    const salesData = salesByProduct.get(product.id) || {
      last7Days: 0,
      last30Days: 0,
      dailyAvg: 0,
      trend: 'stable' as const,
      dailySales: [],
    };

    const prediction = generateProductPrediction(product, salesData, periodDays);
    predictions.push(prediction);
  }

  // Sort by urgency
  predictions.sort((a, b) => {
    const urgencyOrder = { critical: 0, high: 1, medium: 2, low: 3, none: 4 };
    return urgencyOrder[a.restockUrgency] - urgencyOrder[b.restockUrgency];
  });

  // Generate AI insights
  const insights = await generateAIInsights(predictions, orders, products);

  // Calculate summary stats
  const criticalCount = predictions.filter((p) => p.restockUrgency === 'critical').length;
  const highCount = predictions.filter((p) => p.restockUrgency === 'high').length;

  const predictedRevenue7Days = predictions.reduce(
    (sum, p) => sum + p.predictedDemand7Days * (products.find((pr) => pr.id === p.productId)?.price || 0),
    0
  );
  const predictedRevenue30Days = predictions.reduce(
    (sum, p) => sum + p.predictedDemand30Days * (products.find((pr) => pr.id === p.productId)?.price || 0),
    0
  );

  const report: ForecastReport = {
    id: reportId,
    shopId,
    generatedAt: new Date(),
    periodDays,
    totalProductsAnalyzed: predictions.length,
    criticalRestockCount: criticalCount,
    highRestockCount: highCount,
    predictedRevenue7Days: Math.round(predictedRevenue7Days),
    predictedRevenue30Days: Math.round(predictedRevenue30Days),
    predictions,
    insights,
    modelUsed: 'gemini-2.5-flash + statistical',
    dataPointsAnalyzed: orders.length,
  };

  // Save report to Firestore
  await saveForecastReport(report);

  return report;
}

/**
 * Calculate sales data by product from orders
 */
function calculateSalesByProduct(
  orders: Order[],
  products: Product[]
): Map<string, {
  last7Days: number;
  last30Days: number;
  dailyAvg: number;
  trend: 'increasing' | 'stable' | 'decreasing';
  dailySales: { date: string; qty: number }[];
}> {
  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const salesMap = new Map<string, {
    last7Days: number;
    last30Days: number;
    dailyAvg: number;
    trend: 'increasing' | 'stable' | 'decreasing';
    dailySales: { date: string; qty: number }[];
  }>();

  // Initialize for all products
  for (const product of products) {
    salesMap.set(product.id, {
      last7Days: 0,
      last30Days: 0,
      dailyAvg: 0,
      trend: 'stable',
      dailySales: [],
    });
  }

  // Daily sales tracking
  const dailySales = new Map<string, Map<string, number>>();

  for (const order of orders) {
    const orderDate = new Date(order.createdAt);
    const dateKey = orderDate.toISOString().split('T')[0];

    for (const item of order.items) {
      const data = salesMap.get(item.productId);
      if (!data) continue;

      // Track daily sales
      if (!dailySales.has(item.productId)) {
        dailySales.set(item.productId, new Map());
      }
      const productDaily = dailySales.get(item.productId)!;
      productDaily.set(dateKey, (productDaily.get(dateKey) || 0) + item.qty);

      // Count by period
      if (orderDate >= sevenDaysAgo) {
        data.last7Days += item.qty;
      }
      if (orderDate >= thirtyDaysAgo) {
        data.last30Days += item.qty;
      }
    }
  }

  // Calculate averages and trends
  for (const [productId, data] of salesMap.entries()) {
    data.dailyAvg = data.last30Days / 30;

    // Calculate trend (compare last 7 days to previous 7 days)
    const first7DaysAvg = (data.last30Days - data.last7Days) / 23 * 7;
    if (data.last7Days > first7DaysAvg * 1.2) {
      data.trend = 'increasing';
    } else if (data.last7Days < first7DaysAvg * 0.8) {
      data.trend = 'decreasing';
    } else {
      data.trend = 'stable';
    }

    // Build daily sales array
    const productDaily = dailySales.get(productId);
    if (productDaily) {
      data.dailySales = Array.from(productDaily.entries())
        .map(([date, qty]) => ({ date, qty }))
        .sort((a, b) => a.date.localeCompare(b.date));
    }
  }

  return salesMap;
}

/**
 * Generate prediction for a single product
 */
function generateProductPrediction(
  product: Product,
  salesData: {
    last7Days: number;
    last30Days: number;
    dailyAvg: number;
    trend: 'increasing' | 'stable' | 'decreasing';
    dailySales: { date: string; qty: number }[];
  },
  periodDays: number
): DemandPrediction {
  // Apply trend multiplier
  const trendMultiplier = salesData.trend === 'increasing' ? 1.15 :
    salesData.trend === 'decreasing' ? 0.85 : 1.0;

  const predictedDaily = salesData.dailyAvg * trendMultiplier;
  const predicted7Days = Math.round(predictedDaily * 7);
  const predicted30Days = Math.round(predictedDaily * 30);

  // Calculate days until stockout
  let daysUntilStockout: number | null = null;
  if (predictedDaily > 0) {
    daysUntilStockout = Math.floor(product.stockQty / predictedDaily);
    if (daysUntilStockout > 365) daysUntilStockout = null; // Effectively no stockout risk
  }

  // Determine urgency
  let urgency: DemandPrediction['restockUrgency'] = 'none';
  if (daysUntilStockout !== null) {
    if (daysUntilStockout <= 3) urgency = 'critical';
    else if (daysUntilStockout <= 7) urgency = 'high';
    else if (daysUntilStockout <= 14) urgency = 'medium';
    else if (daysUntilStockout <= 30) urgency = 'low';
  }

  // Also check against threshold
  if (product.stockQty <= product.lowStockThreshold) {
    if (urgency === 'none') urgency = 'low';
    if (product.stockQty === 0) urgency = 'critical';
  }

  // Calculate recommended restock quantity (30-day supply + buffer)
  const recommendedQty = Math.max(0, Math.round(predicted30Days * 1.2 - product.stockQty));

  // Calculate confidence based on data quality
  let confidence = 0.5;
  if (salesData.dailySales.length >= 30) confidence = 0.85;
  else if (salesData.dailySales.length >= 14) confidence = 0.7;
  else if (salesData.dailySales.length >= 7) confidence = 0.6;

  // Calculate recommended restock date
  let recommendedRestockDate: Date | null = null;
  if (urgency !== 'none' && daysUntilStockout !== null) {
    recommendedRestockDate = new Date();
    // Restock 3 days before stockout, or now if critical
    const daysToRestock = Math.max(0, daysUntilStockout - 3);
    recommendedRestockDate.setDate(recommendedRestockDate.getDate() + daysToRestock);
  }

  return {
    productId: product.id,
    productName: product.name,
    currentStock: product.stockQty,
    salesLast7Days: salesData.last7Days,
    salesLast30Days: salesData.last30Days,
    averageDailySales: Math.round(salesData.dailyAvg * 100) / 100,
    salesTrend: salesData.trend,
    predictedDemand7Days: predicted7Days,
    predictedDemand30Days: predicted30Days,
    confidence,
    daysUntilStockout,
    restockUrgency: urgency,
    recommendedRestockQty: recommendedQty,
    recommendedRestockDate,
  };
}

/**
 * Generate AI-powered insights from the forecast data
 */
async function generateAIInsights(
  predictions: DemandPrediction[],
  orders: Order[],
  products: Product[]
): Promise<ForecastInsight[]> {
  if (!genAI) {
    return generateFallbackInsights(predictions);
  }

  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

    // Prepare summary data for AI
    const criticalProducts = predictions.filter((p) => p.restockUrgency === 'critical');
    const increasingTrend = predictions.filter((p) => p.salesTrend === 'increasing');
    const decreasingTrend = predictions.filter((p) => p.salesTrend === 'decreasing');
    const totalRevenueLast30 = orders.reduce((sum, o) => sum + o.totalAmount, 0);

    const prompt = `You are analyzing demand forecast data for a small Ethiopian retail shop. Generate 3-5 actionable insights.

Data Summary:
- Total products: ${predictions.length}
- Critical restock needed: ${criticalProducts.length} products (${criticalProducts.map(p => p.productName).join(', ') || 'none'})
- Products with increasing demand: ${increasingTrend.length} (${increasingTrend.slice(0, 3).map(p => p.productName).join(', ')})
- Products with decreasing demand: ${decreasingTrend.length} (${decreasingTrend.slice(0, 3).map(p => p.productName).join(', ')})
- Total revenue last 30 days: ${totalRevenueLast30.toLocaleString()} ETB
- Orders analyzed: ${orders.length}

Top sellers (by predicted 7-day demand):
${predictions.slice(0, 5).map(p => `- ${p.productName}: ${p.predictedDemand7Days} units, ${p.currentStock} in stock`).join('\n')}

Respond with a JSON array of insights (no markdown, just JSON):
[
  {
    "type": "trend|anomaly|opportunity|risk|recommendation",
    "severity": "info|warning|critical",
    "title": "Short title (under 60 chars)",
    "description": "Detailed explanation (1-2 sentences)",
    "suggestedAction": "What the shop owner should do"
  }
]`;

    const result = await model.generateContent(prompt);
    let responseText = result.response.text().trim();

    // Clean up response
    if (responseText.startsWith('```')) {
      responseText = responseText.replace(/```json?\n?/g, '').replace(/```/g, '').trim();
    }

    const insights: ForecastInsight[] = JSON.parse(responseText).map((insight: any, index: number) => ({
      id: `insight-${index}`,
      type: insight.type || 'recommendation',
      severity: insight.severity || 'info',
      title: insight.title,
      description: insight.description,
      suggestedAction: insight.suggestedAction,
    }));

    return insights;
  } catch (error) {
    console.error('Error generating AI insights:', error);
    return generateFallbackInsights(predictions);
  }
}

/**
 * Generate basic insights without AI
 */
function generateFallbackInsights(predictions: DemandPrediction[]): ForecastInsight[] {
  const insights: ForecastInsight[] = [];

  const critical = predictions.filter((p) => p.restockUrgency === 'critical');
  if (critical.length > 0) {
    insights.push({
      id: 'insight-critical',
      type: 'risk',
      severity: 'critical',
      title: `${critical.length} products need immediate restocking`,
      description: `${critical.map(p => p.productName).join(', ')} will run out within 3 days.`,
      affectedProducts: critical.map(p => p.productId),
      suggestedAction: 'Order these items today to avoid stockouts.',
    });
  }

  const increasing = predictions.filter((p) => p.salesTrend === 'increasing');
  if (increasing.length > 0) {
    insights.push({
      id: 'insight-trending',
      type: 'opportunity',
      severity: 'info',
      title: `${increasing.length} products showing growth`,
      description: `${increasing.slice(0, 3).map(p => p.productName).join(', ')} have increasing demand.`,
      affectedProducts: increasing.slice(0, 3).map(p => p.productId),
      suggestedAction: 'Consider increasing stock levels for these trending items.',
    });
  }

  const decreasing = predictions.filter((p) => p.salesTrend === 'decreasing' && p.currentStock > 20);
  if (decreasing.length > 0) {
    insights.push({
      id: 'insight-slow',
      type: 'trend',
      severity: 'warning',
      title: `${decreasing.length} products with declining sales`,
      description: `${decreasing.slice(0, 3).map(p => p.productName).join(', ')} are selling slower than before.`,
      affectedProducts: decreasing.slice(0, 3).map(p => p.productId),
      suggestedAction: 'Consider promotions or discounts to move slow inventory.',
    });
  }

  return insights;
}

/**
 * Save forecast report to Firestore
 */
async function saveForecastReport(report: ForecastReport): Promise<void> {
  if (!isFirebaseInitialized()) {
    console.log('Firebase not initialized - forecast not saved');
    return;
  }

  await collections.forecasts(report.shopId).doc(report.id).set({
    ...report,
    predictions: report.predictions.map(p => ({
      ...p,
      recommendedRestockDate: p.recommendedRestockDate || null,
    })),
  });
}

/**
 * Get the latest forecast report for a shop
 */
export async function getLatestForecast(shopId: string): Promise<ForecastReport | null> {
  if (!isFirebaseInitialized()) return null;

  const snapshot = await collections.forecasts(shopId)
    .orderBy('generatedAt', 'desc')
    .limit(1)
    .get();

  if (snapshot.empty) return null;

  const doc = snapshot.docs[0];
  return docToForecastReport(doc);
}

/**
 * Get forecast history
 */
export async function getForecastHistory(
  shopId: string,
  limit: number = 10
): Promise<ForecastReport[]> {
  if (!isFirebaseInitialized()) return [];

  const snapshot = await collections.forecasts(shopId)
    .orderBy('generatedAt', 'desc')
    .limit(limit)
    .get();

  return snapshot.docs.map(docToForecastReport);
}

/**
 * Get restock recommendations (critical and high urgency)
 */
export async function getRestockRecommendations(shopId: string): Promise<RestockRecommendation[]> {
  const forecast = await getLatestForecast(shopId);
  if (!forecast) {
    // Generate a new forecast if none exists
    const newForecast = await generateForecast(shopId);
    return extractRestockRecommendations(newForecast);
  }

  // If forecast is older than 24 hours, regenerate
  const ageHours = (Date.now() - new Date(forecast.generatedAt).getTime()) / (1000 * 60 * 60);
  if (ageHours > 24) {
    const newForecast = await generateForecast(shopId);
    return extractRestockRecommendations(newForecast);
  }

  return extractRestockRecommendations(forecast);
}

/**
 * Extract restock recommendations from a forecast
 */
function extractRestockRecommendations(forecast: ForecastReport): RestockRecommendation[] {
  return forecast.predictions
    .filter((p) => p.restockUrgency === 'critical' || p.restockUrgency === 'high' || p.restockUrgency === 'medium')
    .map((p) => ({
      productId: p.productId,
      productName: p.productName,
      currentStock: p.currentStock,
      recommendedQty: p.recommendedRestockQty,
      estimatedCost: 0, // Would need cost data
      urgency: p.restockUrgency as 'critical' | 'high' | 'medium' | 'low',
      reason: p.daysUntilStockout
        ? `Expected stockout in ${p.daysUntilStockout} days based on ${p.averageDailySales.toFixed(1)} daily sales`
        : `Stock below threshold (${p.currentStock} units)`,
      daysUntilStockout: p.daysUntilStockout,
    }));
}

/**
 * Convert Firestore doc to ForecastReport
 */
function docToForecastReport(doc: FirebaseFirestore.DocumentSnapshot): ForecastReport {
  const data = doc.data()!;
  return {
    id: doc.id,
    shopId: data.shopId,
    generatedAt: data.generatedAt?.toDate?.() || new Date(data.generatedAt),
    periodDays: data.periodDays,
    totalProductsAnalyzed: data.totalProductsAnalyzed,
    criticalRestockCount: data.criticalRestockCount,
    highRestockCount: data.highRestockCount,
    predictedRevenue7Days: data.predictedRevenue7Days,
    predictedRevenue30Days: data.predictedRevenue30Days,
    predictions: data.predictions.map((p: any) => ({
      ...p,
      recommendedRestockDate: p.recommendedRestockDate?.toDate?.() ||
        (p.recommendedRestockDate ? new Date(p.recommendedRestockDate) : null),
    })),
    insights: data.insights || [],
    modelUsed: data.modelUsed,
    dataPointsAnalyzed: data.dataPointsAnalyzed,
  };
}

/**
 * Generate forecast summary for Telegram notification
 */
export async function generateForecastSummary(shopId: string): Promise<string> {
  const forecast = await getLatestForecast(shopId);

  if (!forecast) {
    return 'No forecast data available. Run a forecast first.';
  }

  let message = `📊 *Demand Forecast Report*\n`;
  message += `Generated: ${new Date(forecast.generatedAt).toLocaleDateString()}\n\n`;

  message += `📦 Products Analyzed: ${forecast.totalProductsAnalyzed}\n`;
  message += `💰 Predicted Revenue (7d): ${forecast.predictedRevenue7Days.toLocaleString()} ETB\n`;
  message += `💰 Predicted Revenue (30d): ${forecast.predictedRevenue30Days.toLocaleString()} ETB\n\n`;

  if (forecast.criticalRestockCount > 0) {
    message += `🔴 *CRITICAL:* ${forecast.criticalRestockCount} products need immediate restock\n`;
    const critical = forecast.predictions.filter(p => p.restockUrgency === 'critical');
    critical.forEach(p => {
      message += `   • ${p.productName}: ${p.currentStock} left, ~${p.daysUntilStockout || 0} days\n`;
    });
    message += '\n';
  }

  if (forecast.highRestockCount > 0) {
    message += `🟠 *HIGH:* ${forecast.highRestockCount} products need restock soon\n`;
  }

  if (forecast.insights.length > 0) {
    message += `\n💡 *Insights:*\n`;
    forecast.insights.slice(0, 3).forEach(insight => {
      const emoji = insight.severity === 'critical' ? '🔴' :
                    insight.severity === 'warning' ? '🟠' : 'ℹ️';
      message += `${emoji} ${insight.title}\n`;
    });
  }

  return message;
}
