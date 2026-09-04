# Cron Jobs Implementation Plan

## Feature: Scheduled Automation via cron-job.org

### Overview

DukaAI uses [cron-job.org](https://cron-job.org) (free tier) to trigger scheduled automation tasks. This enables proactive shop management without manual intervention.

---

## 1. Architecture

```
┌─────────────────┐         POST /api/jobs/*          ┌──────────────────┐
│  cron-job.org   │ ─────────────────────────────────▶│   DukaAI API     │
│  (Scheduler)    │         x-cron-secret header      │   (Railway)      │
└─────────────────┘                                   └────────┬─────────┘
                                                               │
                    ┌──────────────────────────────────────────┼───────────────┐
                    │                                          │               │
                    ▼                                          ▼               ▼
           ┌────────────────┐                      ┌───────────────┐   ┌───────────────┐
           │ Firestore      │                      │ Gemini API    │   │ Telegram API  │
           │ (Read shops,   │                      │ (Generate     │   │ (Send alerts) │
           │  orders, etc)  │                      │  summaries)   │   │               │
           └────────────────┘                      └───────────────┘   └───────────────┘
```

---

## 2. Job Endpoints

### 2.1 Keep-Alive (`POST /api/jobs/keep-alive`)

**Purpose:** Prevent Railway cold starts by pinging the server regularly.

**Schedule:** Every 10 minutes (`*/10 * * * *`)

**Implementation:** Already complete in `apps/api/src/routes/jobs.ts`

```typescript
router.post('/keep-alive', verifyCronSecret, async (req, res) => {
  res.json({
    success: true,
    data: {
      message: 'Server is alive',
      timestamp: new Date().toISOString(),
    },
  });
});
```

**Response:**
```json
{
  "success": true,
  "data": {
    "message": "Server is alive",
    "timestamp": "2026-09-04T08:00:00.000Z"
  }
}
```

---

### 2.2 Daily Summary (`POST /api/jobs/daily-summary`)

**Purpose:** Generate and send AI-powered daily business reports to shop owners via Telegram.

**Schedule:** Daily at 8:00 AM EAT (`0 5 * * *` UTC)

**Current Status:** Endpoint exists, needs full implementation

**Implementation Plan:**

```typescript
// apps/api/src/routes/jobs.ts

router.post('/daily-summary', verifyCronSecret, async (req, res) => {
  try {
    // 1. Get all active shops
    const shops = await shopService.getAllShops();
    
    const results = [];
    
    for (const shop of shops) {
      // 2. Get yesterday's data
      const yesterday = getYesterdayRange();
      const orders = await orderService.getOrdersByDateRange(shop.id, yesterday.start, yesterday.end);
      const stats = await analyticsService.getDailySummary(shop.id, yesterday);
      
      // 3. Generate summary with Gemini
      const summary = await aiService.generateDailySummary({
        shopName: shop.name,
        totalOrders: stats.orderCount,
        totalRevenue: stats.revenue,
        topProducts: stats.topProducts,
        newCustomers: stats.newCustomers,
        pendingOrders: stats.pendingCount,
        lowStockItems: stats.lowStockItems,
      });
      
      // 4. Send to owner via Telegram
      if (shop.ownerTelegramId) {
        await telegramBot.sendMessage(shop.ownerTelegramId, summary);
        results.push({ shopId: shop.id, status: 'sent' });
      }
    }
    
    res.json({
      success: true,
      data: {
        message: 'Daily summaries sent',
        shopsProcessed: results.length,
        results,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error('Error running daily summary:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to run daily summary',
    });
  }
});
```

**AI Prompt Template:**
```
Generate a brief daily business summary for an Ethiopian small shop owner.

Shop: {{shopName}}
Date: {{date}}

Yesterday's Stats:
- Orders: {{totalOrders}}
- Revenue: {{totalRevenue}} ETB
- New customers: {{newCustomers}}
- Top products: {{topProducts}}

Current Status:
- Pending orders: {{pendingOrders}}
- Low stock items: {{lowStockItems}}

Write a friendly, concise summary in 3-4 sentences. Include any actionable insights.
End with an encouraging note.
```

**Sample Output:**
```
Good morning! Yesterday Duka Mobile processed 12 orders for 8,450 ETB.
iPhone Cases were your top seller (5 units). You have 3 orders pending
confirmation and Screen Guards are running low (2 left).

Keep up the great work! 🚀
```

---

### 2.3 Inventory Check (`POST /api/jobs/inventory-check`)

**Purpose:** Alert shop owners about low stock items via Telegram.

**Schedule:** Daily at 9:00 AM EAT (`0 6 * * *` UTC)

**Current Status:** Endpoint exists, needs full implementation

**Implementation Plan:**

```typescript
// apps/api/src/routes/jobs.ts

router.post('/inventory-check', verifyCronSecret, async (req, res) => {
  try {
    // 1. Get all active shops
    const shops = await shopService.getAllShops();
    
    const results = [];
    
    for (const shop of shops) {
      // 2. Get low stock products
      const lowStockProducts = await productService.getLowStockProducts(shop.id);
      
      if (lowStockProducts.length === 0) {
        results.push({ shopId: shop.id, status: 'ok', lowStockCount: 0 });
        continue;
      }
      
      // 3. Format alert message
      const alertMessage = formatLowStockAlert(shop.name, lowStockProducts);
      
      // 4. Send to owner via Telegram
      if (shop.ownerTelegramId) {
        await telegramBot.sendMessage(shop.ownerTelegramId, alertMessage);
        results.push({ 
          shopId: shop.id, 
          status: 'alerted', 
          lowStockCount: lowStockProducts.length 
        });
      }
    }
    
    res.json({
      success: true,
      data: {
        message: 'Inventory check complete',
        shopsProcessed: results.length,
        results,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error('Error running inventory check:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to run inventory check',
    });
  }
});

// Helper function
function formatLowStockAlert(shopName: string, products: Product[]): string {
  const header = `⚠️ Low Stock Alert - ${shopName}\n\n`;
  const items = products.map(p => 
    `• ${p.name}: ${p.stockQty} left (threshold: ${p.lowStockThreshold})`
  ).join('\n');
  const footer = `\n\nPlease restock soon to avoid stockouts.`;
  
  return header + items + footer;
}
```

**Sample Output:**
```
⚠️ Low Stock Alert - Duka Mobile

• Screen Guard: 2 left (threshold: 10)
• USB Cable: 5 left (threshold: 10)
• Earphones: 3 left (threshold: 5)

Please restock soon to avoid stockouts.
```

---

## 3. Security

### Authentication

All job endpoints require the `x-cron-secret` header matching the `CRON_SECRET` environment variable.

```typescript
function verifyCronSecret(req: Request, res: Response, next: Function): void {
  const secret = req.headers['x-cron-secret'] as string;
  
  if (secret !== config.cronSecret) {
    res.status(401).json({
      success: false,
      error: 'Invalid cron secret',
    });
    return;
  }
  
  next();
}
```

### Environment Variable

| Variable | Location | Value |
|----------|----------|-------|
| `CRON_SECRET` | Railway | `dukaai-dev-secret-123` (dev) |

**Production Note:** Generate a strong random secret for production:
```bash
openssl rand -hex 32
```

---

## 4. cron-job.org Configuration

### Account Setup

1. Go to https://cron-job.org
2. Create free account
3. Verify email

### Job Configuration

---

#### Job 1: Keep-Alive

**Basic Settings:**

| Field | Value |
|-------|-------|
| Title | `DukaAI Keep-Alive` |
| URL | `https://dukaaiapi-production.up.railway.app/api/jobs/keep-alive` |
| Enable job | ✅ Checked |
| Save responses in job history | ✅ Checked |

**Execution Schedule:**
- Select: **Every `10` minutes**
- Or use Custom with crontab: `*/10 * * * *`

**Advanced Section (click to expand):**

| Field | Value |
|-------|-------|
| Time zone | `Africa/Addis_Ababa` |
| Request method | `POST` (select from dropdown) |
| Request body | *(leave empty)* |
| Timeout | `30` seconds |

**Headers (click "Add header"):**

| Header Name | Header Value |
|-------------|--------------|
| `x-cron-secret` | `dukaai-dev-secret-123` |
| `Content-Type` | `application/json` |

**Notifications:**
- ✅ Notify me when execution of the cronjob fails (after `1` failure)
- ✅ Notify me when the cronjob will be disabled because of too many failures

---

#### Job 2: Daily Summary

**Basic Settings:**

| Field | Value |
|-------|-------|
| Title | `DukaAI Daily Summary` |
| URL | `https://dukaaiapi-production.up.railway.app/api/jobs/daily-summary` |
| Enable job | ✅ Checked |
| Save responses in job history | ✅ Checked |

**Execution Schedule:**
- Select: **Every day at `8` : `0`**
- Or use Custom with crontab: `0 8 * * *`

**Advanced Section:**

| Field | Value |
|-------|-------|
| Time zone | `Africa/Addis_Ababa` |
| Request method | `POST` |
| Request body | *(leave empty)* |
| Timeout | `60` seconds |

**Headers (click "Add header"):**

| Header Name | Header Value |
|-------------|--------------|
| `x-cron-secret` | `dukaai-dev-secret-123` |
| `Content-Type` | `application/json` |

**Notifications:**
- ✅ Notify me when execution of the cronjob fails (after `1` failure)

---

#### Job 3: Inventory Check

**Basic Settings:**

| Field | Value |
|-------|-------|
| Title | `DukaAI Inventory Check` |
| URL | `https://dukaaiapi-production.up.railway.app/api/jobs/inventory-check` |
| Enable job | ✅ Checked |
| Save responses in job history | ✅ Checked |

**Execution Schedule:**
- Select: **Every day at `9` : `0`**
- Or use Custom with crontab: `0 9 * * *`

**Advanced Section:**

| Field | Value |
|-------|-------|
| Time zone | `Africa/Addis_Ababa` |
| Request method | `POST` |
| Request body | *(leave empty)* |
| Timeout | `60` seconds |

**Headers (click "Add header"):**

| Header Name | Header Value |
|-------------|--------------|
| `x-cron-secret` | `dukaai-dev-secret-123` |
| `Content-Type` | `application/json` |

**Notifications:**
- ✅ Notify me when execution of the cronjob fails (after `1` failure)

---

### Step-by-Step: Adding Headers

1. In the create/edit job page, scroll to **Advanced** section
2. Find **Headers** - it shows "No custom headers defined."
3. Click **Add header** button
4. Enter header name: `x-cron-secret`
5. Enter header value: `dukaai-dev-secret-123`
6. Click **Add header** again
7. Enter header name: `Content-Type`
8. Enter header value: `application/json`
9. Click **Create** to save the job

---

## 5. Testing

### Manual Testing via cURL

```bash
# Test keep-alive
curl -X POST https://dukaaiapi-production.up.railway.app/api/jobs/keep-alive \
  -H "x-cron-secret: dukaai-dev-secret-123" \
  -H "Content-Type: application/json"

# Expected: {"success":true,"data":{"message":"Server is alive","timestamp":"..."}}

# Test daily summary
curl -X POST https://dukaaiapi-production.up.railway.app/api/jobs/daily-summary \
  -H "x-cron-secret: dukaai-dev-secret-123" \
  -H "Content-Type: application/json"

# Expected: {"success":true,"data":{"message":"Daily summary job executed","timestamp":"..."}}

# Test inventory check
curl -X POST https://dukaaiapi-production.up.railway.app/api/jobs/inventory-check \
  -H "x-cron-secret: dukaai-dev-secret-123" \
  -H "Content-Type: application/json"

# Expected: {"success":true,"data":{"message":"Inventory check job executed","timestamp":"..."}}

# Test with invalid secret (should fail)
curl -X POST https://dukaaiapi-production.up.railway.app/api/jobs/keep-alive \
  -H "x-cron-secret: wrong-secret" \
  -H "Content-Type: application/json"

# Expected: {"success":false,"error":"Invalid cron secret"}
```

### Testing in cron-job.org

1. Go to your job in cron-job.org
2. Click "Test run"
3. Verify response shows `{"success":true,...}`
4. Check Railway logs for job execution

---

## 6. Monitoring

### Railway Logs

View job execution in Railway dashboard:
1. Go to Railway project
2. Click on the service
3. View "Logs" tab
4. Filter by timestamp around job execution time

### cron-job.org History

1. Go to job details
2. Click "History" tab
3. View execution results and response codes

### Expected Log Output

```
[2026-09-04T05:00:00.000Z] POST /api/jobs/daily-summary
[2026-09-04T05:00:00.100Z] Processing 3 shops for daily summary
[2026-09-04T05:00:01.500Z] Sent summary to shop: duka-mobile (telegram: 123456789)
[2026-09-04T05:00:02.000Z] Sent summary to shop: habesha-goods (telegram: 987654321)
[2026-09-04T05:00:02.500Z] Daily summary complete: 3 shops processed
```

---

## 7. Error Handling

### Retry Logic

cron-job.org automatically retries failed jobs. Configure:
- **Retry attempts:** 3
- **Retry interval:** 5 minutes

### Error Responses

| Status | Error | Cause |
|--------|-------|-------|
| 401 | Invalid cron secret | Wrong or missing `x-cron-secret` header |
| 500 | Internal server error | Database/API failure |
| 503 | Service unavailable | Railway cold start (rare with keep-alive) |

### Notification Setup

Configure cron-job.org notifications:
1. Go to Account Settings
2. Add email for notifications
3. Enable "Notify on failure" for each job

---

## 8. Implementation Checklist

### Endpoint Setup (Completed)
- [x] `/api/jobs/keep-alive` endpoint
- [x] `/api/jobs/daily-summary` endpoint  
- [x] `/api/jobs/inventory-check` endpoint
- [x] `verifyCronSecret` middleware
- [x] CRON_SECRET environment variable

### Full Implementation (TODO)
- [ ] Implement `shopService.getAllShops()`
- [ ] Implement daily summary logic with Gemini
- [ ] Implement inventory check with Telegram alerts
- [ ] Add logging for job execution
- [ ] Add error tracking

### cron-job.org Setup (TODO)
- [ ] Create cron-job.org account
- [ ] Add Keep-Alive job (every 10 min)
- [ ] Add Daily Summary job (8:00 AM EAT)
- [ ] Add Inventory Check job (9:00 AM EAT)
- [ ] Test all jobs
- [ ] Enable failure notifications

---

## 9. Dependencies

### Services Required

| Service | Used By | Purpose |
|---------|---------|---------|
| `shopService` | All jobs | Get shop list, owner info |
| `orderService` | Daily Summary | Get order stats |
| `productService` | Inventory Check | Get low stock products |
| `aiService` | Daily Summary | Generate summary text |
| `telegramBot` | All jobs | Send notifications |

### Files to Modify

| File | Changes |
|------|---------|
| `apps/api/src/routes/jobs.ts` | Add full implementation |
| `apps/api/src/services/shop.ts` | Add `getAllShops()` |
| `apps/api/src/services/analytics.ts` | Add `getDailySummary()` |
| `apps/api/src/services/ai.ts` | Add summary prompt |

---

## 10. Timeline

| Task | Estimate | Status |
|------|----------|--------|
| Endpoint scaffolding | 1 hour | Done |
| cron-job.org account setup | 15 min | Pending |
| Keep-alive job config | 5 min | Pending |
| Daily summary implementation | 2 hours | Pending |
| Inventory check implementation | 1 hour | Pending |
| Testing & verification | 30 min | Pending |

**Total estimated time:** ~4-5 hours
