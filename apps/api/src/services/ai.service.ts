import { GoogleGenerativeAI } from '@google/generative-ai';
import { config } from '../config';
import { ParsedOrder, Product } from '@dukaai/shared';

let genAI: GoogleGenerativeAI | null = null;

export function initializeGemini(): boolean {
  if (!config.gemini.apiKey) {
    console.warn('Gemini API key not configured');
    return false;
  }

  genAI = new GoogleGenerativeAI(config.gemini.apiKey);
  console.log('Gemini AI initialized');
  return true;
}

function getModel() {
  if (!genAI) {
    throw new Error('Gemini not initialized');
  }
  return genAI.getGenerativeModel({ model: 'gemini-3.6-flash' });
}

/**
 * Parse a customer's natural language order into structured data
 */
export async function parseOrder(
  message: string,
  products: Product[],
  language: 'en' | 'am' = 'en'
): Promise<ParsedOrder> {
  const model = getModel();

  const productList = products
    .map((p) => {
      const variants = p.variants.length > 0 ? ` (variants: ${p.variants.join(', ')})` : '';
      return `- ${p.name}: ${p.price} ETB${variants}`;
    })
    .join('\n');

  const prompt = `You are an order parsing assistant for a small Ethiopian retail shop.

Available products:
${productList}

Customer message: "${message}"

Parse the customer's order and respond with ONLY a valid JSON object (no markdown, no explanation):
{
  "items": [
    {
      "productName": "exact product name from list above",
      "qty": number,
      "variant": "variant if mentioned, or null"
    }
  ],
  "confidence": 0.0-1.0,
  "needsClarification": true/false,
  "clarificationQuestion": "question to ask if clarification needed, or null"
}

Rules:
- Match product names to the closest available product
- If the product is not in the list, set confidence low and needsClarification to true
- If quantity is unclear, assume 1
- If multiple items are mentioned, include all in the items array
- If the message is not an order (greeting, question, etc.), return empty items with needsClarification: true
- Support both English and Amharic input

JSON response:`;

  try {
    const result = await model.generateContent(prompt);
    const responseText = result.response.text().trim();

    // Clean up the response (remove markdown code blocks if present)
    let jsonStr = responseText;
    if (jsonStr.startsWith('```')) {
      jsonStr = jsonStr.replace(/```json?\n?/g, '').replace(/```/g, '').trim();
    }

    const parsed = JSON.parse(jsonStr);

    // Map product names to IDs
    const items = parsed.items.map((item: { productName: string; qty: number; variant?: string }) => {
      const matchedProduct = findBestProductMatch(item.productName, products);
      return {
        productName: matchedProduct?.name || item.productName,
        qty: item.qty || 1,
        variant: item.variant || undefined,
        matchedProductId: matchedProduct?.id,
      };
    });

    return {
      items,
      confidence: parsed.confidence || 0.5,
      needsClarification: parsed.needsClarification || false,
      clarificationQuestion: parsed.clarificationQuestion || undefined,
    };
  } catch (error) {
    console.error('Error parsing order with Gemini:', error);
    return {
      items: [],
      confidence: 0,
      needsClarification: true,
      clarificationQuestion: 'Sorry, I could not understand your order. Could you please rephrase?',
    };
  }
}

/**
 * Find the best matching product from the catalog
 */
function findBestProductMatch(searchName: string, products: Product[]): Product | null {
  const searchLower = searchName.toLowerCase();

  // Exact match
  const exact = products.find((p) => p.name.toLowerCase() === searchLower);
  if (exact) return exact;

  // Partial match
  const partial = products.find(
    (p) =>
      p.name.toLowerCase().includes(searchLower) || searchLower.includes(p.name.toLowerCase())
  );
  if (partial) return partial;

  // Check variants
  for (const product of products) {
    for (const variant of product.variants) {
      if (variant.toLowerCase().includes(searchLower) || searchLower.includes(variant.toLowerCase())) {
        return product;
      }
    }
  }

  return null;
}

/**
 * Detect the intent of a message
 */
export async function detectIntent(
  message: string
): Promise<'ORDER' | 'GREETING' | 'QUESTION' | 'STATUS_CHECK' | 'COMPLAINT' | 'OTHER'> {
  const model = getModel();

  const prompt = `Classify the intent of this customer message for a retail shop.

Message: "${message}"

Respond with ONLY one of these words (no explanation):
- ORDER: Customer wants to buy something
- GREETING: Hello, hi, good morning, etc.
- QUESTION: Asking about products, prices, availability
- STATUS_CHECK: Asking about their order status
- COMPLAINT: Expressing dissatisfaction
- OTHER: Anything else

Intent:`;

  try {
    const result = await model.generateContent(prompt);
    const intent = result.response.text().trim().toUpperCase();

    const validIntents = ['ORDER', 'GREETING', 'QUESTION', 'STATUS_CHECK', 'COMPLAINT', 'OTHER'];
    return validIntents.includes(intent) ? (intent as any) : 'OTHER';
  } catch (error) {
    console.error('Error detecting intent:', error);
    return 'OTHER';
  }
}

/**
 * Generate a daily summary report
 */
export async function generateDailySummary(data: {
  ordersCount: number;
  revenue: number;
  currency: string;
  pendingCount: number;
  deliveredCount: number;
  cancelledCount: number;
  topProducts: { name: string; qty: number }[];
  lowStockProducts: { name: string; stockQty: number }[];
  inactiveCustomers: { name: string; lastOrderDays: number }[];
}): Promise<string> {
  const model = getModel();

  const prompt = `Generate a friendly daily business summary for a small Ethiopian shop owner.

Data:
- Orders today: ${data.ordersCount}
- Revenue: ${data.revenue.toLocaleString()} ${data.currency}
- Pending orders: ${data.pendingCount}
- Delivered orders: ${data.deliveredCount}
- Cancelled orders: ${data.cancelledCount}
- Top products: ${data.topProducts.map((p) => `${p.name} (${p.qty} sold)`).join(', ') || 'None'}
- Low stock: ${data.lowStockProducts.map((p) => `${p.name} (${p.stockQty} left)`).join(', ') || 'All stocked'}
- Inactive customers: ${data.inactiveCustomers.map((c) => `${c.name} (${c.lastOrderDays} days)`).join(', ') || 'None'}

Write a brief, encouraging summary (2-3 short paragraphs) that:
1. Highlights the day's performance
2. Mentions any items needing attention (low stock, pending orders)
3. Suggests follow-up actions if needed (restock, customer outreach)
4. Ends on a positive note

Use simple language and include relevant emojis. Keep it under 200 words.`;

  try {
    const result = await model.generateContent(prompt);
    return result.response.text().trim();
  } catch (error) {
    console.error('Error generating summary:', error);
    return `📊 Today's Summary: ${data.ordersCount} orders, ${data.revenue.toLocaleString()} ${data.currency} revenue.`;
  }
}

/**
 * Generate customer re-engagement message
 */
export async function generateReengagementMessage(
  customerName: string,
  lastOrderDays: number,
  previousProducts: string[]
): Promise<string> {
  const model = getModel();

  const prompt = `Write a short, friendly Telegram message to re-engage a customer who hasn't ordered recently.

Customer: ${customerName}
Days since last order: ${lastOrderDays}
Previously ordered: ${previousProducts.join(', ')}

Write a warm, non-pushy message (2-3 sentences) that:
- Greets them by name
- Mentions they're missed
- Subtly references their past purchases
- Invites them back

Keep it conversational and include 1-2 emojis. Don't be salesy.`;

  try {
    const result = await model.generateContent(prompt);
    return result.response.text().trim();
  } catch (error) {
    console.error('Error generating re-engagement message:', error);
    return `Hi ${customerName}! 👋 We haven't seen you in a while. Hope to see you again soon!`;
  }
}

/**
 * Answer a customer question about products
 */
export async function answerProductQuestion(
  question: string,
  products: Product[]
): Promise<string> {
  const model = getModel();

  const productInfo = products
    .map((p) => {
      const variants = p.variants.length > 0 ? `, variants: ${p.variants.join(', ')}` : '';
      const stock = p.stockQty > 0 ? `in stock (${p.stockQty})` : 'out of stock';
      return `- ${p.name}: ${p.price} ETB, ${stock}${variants}`;
    })
    .join('\n');

  const prompt = `You are a helpful assistant for a small retail shop. Answer the customer's question based on the available products.

Available products:
${productInfo}

Customer question: "${question}"

Provide a helpful, concise answer (1-3 sentences). If you don't know something, say so politely. Use a friendly tone.`;

  try {
    const result = await model.generateContent(prompt);
    return result.response.text().trim();
  } catch (error) {
    console.error('Error answering question:', error);
    return "I'm sorry, I couldn't find that information. Please contact the shop owner directly.";
  }
}
