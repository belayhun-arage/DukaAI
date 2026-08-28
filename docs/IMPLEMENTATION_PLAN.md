# DukaAI Implementation Plan
## AI-Powered Small Shop Operations Manager

---

## 1. Project Structure (Monorepo)

```
dukaai/
├── apps/
│   ├── api/                    # Express backend + Telegram bot
│   │   ├── src/
│   │   │   ├── config/         # Environment, Firebase, Gemini config
│   │   │   ├── controllers/    # Route handlers
│   │   │   ├── services/       # Business logic
│   │   │   ├── routes/         # Express routes
│   │   │   ├── middleware/     # Auth, error handling, validation
│   │   │   ├── bot/            # Telegram bot handlers
│   │   │   ├── jobs/           # Scheduled job handlers
│   │   │   ├── utils/          # Helpers
│   │   │   └── index.ts        # Entry point
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   └── web/                    # React dashboard
│       ├── src/
│       │   ├── components/     # Reusable UI components
│       │   ├── pages/          # Route pages
│       │   ├── hooks/          # Custom React hooks
│       │   ├── services/       # API client
│       │   ├── context/        # React context (auth, shop)
│       │   ├── utils/          # Helpers
│       │   └── App.tsx
│       ├── package.json
│       ├── vite.config.ts
│       └── tailwind.config.js
│
├── packages/
│   └── shared/                 # Shared types and utilities
│       ├── src/
│       │   ├── types/          # TypeScript interfaces
│       │   ├── constants/      # Status enums, etc.
│       │   └── utils/          # Shared utilities
│       └── package.json
│
├── .env.example
├── package.json                # Workspace root
└── README.md
```

---

## 2. Database Schema (Firebase Firestore)

### Collections Structure

```
firestore/
├── shops/                          
│   └── {shopId}/
│       ├── name: string
│       ├── ownerTelegramId: string
│       ├── ownerName: string
│       ├── createdAt: timestamp
│       ├── settings: {
│       │     currency: "ETB",
│       │     timezone: "Africa/Addis_Ababa",
│       │     lowStockThreshold: 10
│       │   }
│       │
│       ├── products/ (subcollection)
│       │   └── {productId}/
│       │       ├── name: string
│       │       ├── variants: string[]
│       │       ├── price: number
│       │       ├── stockQty: number
│       │       ├── lowStockThreshold: number
│       │       ├── isActive: boolean
│       │       └── createdAt: timestamp
│       │
│       ├── customers/ (subcollection)
│       │   └── {customerId}/
│       │       ├── telegramId: string
│       │       ├── name: string
│       │       ├── phone: string | null
│       │       ├── totalOrders: number
│       │       ├── totalSpent: number
│       │       ├── lastOrderDate: timestamp
│       │       └── createdAt: timestamp
│       │
│       └── orders/ (subcollection)
│           └── {orderId}/
│               ├── orderNumber: string
│               ├── customerId: string
│               ├── customerName: string
│               ├── items: [{
│               │     productId, productName, qty, unitPrice, variant
│               │   }]
│               ├── totalAmount: number
│               ├── status: "NEW" | "CONFIRMED" | "PAID" | "READY" | "DELIVERED" | "CANCELLED"
│               ├── statusHistory: [{ status, timestamp, note }]
│               ├── createdAt: timestamp
│               └── updatedAt: timestamp
│
└── telegramSessions/
    └── {telegramChatId}/
        ├── type: "owner" | "customer"
        ├── shopId: string
        ├── customerId: string | null
        ├── currentState: string
        └── pendingOrder: object | null
```

---

## 3. Backend API Endpoints

```
/api
├── /auth
│   └── POST /telegram-login     # Validate Telegram login widget
│
├── /shops
│   ├── GET    /                 # Get current shop details
│   └── PATCH  /settings         # Update shop settings
│
├── /products
│   ├── GET    /                 # List products
│   ├── POST   /                 # Create product
│   ├── GET    /:id              # Get product details
│   ├── PATCH  /:id              # Update product
│   ├── DELETE /:id              # Soft delete product
│   └── PATCH  /:id/stock        # Update stock quantity
│
├── /orders
│   ├── GET    /                 # List orders (filter by status, date)
│   ├── POST   /                 # Create order (from dashboard)
│   ├── GET    /:id              # Get order details
│   ├── PATCH  /:id/status       # Update order status
│   └── GET    /stats            # Order statistics
│
├── /customers
│   ├── GET    /                 # List customers
│   ├── GET    /:id              # Get customer with order history
│   └── PATCH  /:id              # Update customer info
│
├── /analytics
│   ├── GET    /dashboard        # Dashboard summary
│   ├── GET    /sales            # Sales over time
│   └── GET    /top-products     # Best sellers
│
├── /ai
│   ├── POST   /parse-order      # Parse natural language to order
│   └── POST   /generate-summary # Generate daily summary text
│
├── /jobs (called by cron-job.org)
│   ├── POST   /daily-summary    # Generate and send daily summary
│   ├── POST   /inventory-check  # Check and alert low stock
│   └── POST   /keep-alive       # Prevent Render sleep
│
└── /webhook
    └── POST   /telegram         # Telegram webhook handler
```

---

## 4. Telegram Bot Commands

| Command | User Type | Action |
|---------|-----------|--------|
| `/start` | Any | Identify as owner or customer, onboard |
| `/status` | Owner | Today's summary stats |
| `/orders` | Owner | List pending orders |
| `/deliver <id>` | Owner | Mark order as delivered |
| `/pay <id>` | Owner | Mark order as paid |
| `/inventory` | Owner | Show low stock items |
| `/help` | Any | Show available commands |

### Conversation Flow: Customer Order

```
1. Customer sends: "I need 3 iPhone cases"
2. [Gemini] Parse → {product: "iPhone case", qty: 3}
3. Bot sends confirmation: "3x iPhone Case - 450 ETB. Confirm?"
4. Customer clicks [Confirm]
5. Order created → Owner notified → Customer receives confirmation
```

---

## 5. Frontend Pages & Components

### Pages

| Page | Purpose | Key Features |
|------|---------|--------------|
| Dashboard | Overview | Stats cards, charts, alerts |
| Orders | Management | Kanban board, status updates |
| Products | Inventory | CRUD, stock levels |
| Customers | CRM | List, order history |
| Analytics | Insights | Charts, trends |
| Settings | Config | Shop settings |

### Component Structure

```
src/
├── pages/
│   ├── Dashboard.tsx
│   ├── Orders.tsx
│   ├── Products.tsx
│   ├── Customers.tsx
│   ├── Analytics.tsx
│   └── Settings.tsx
│
├── components/
│   ├── layout/
│   │   ├── Sidebar.tsx
│   │   ├── Header.tsx
│   │   └── MainLayout.tsx
│   │
│   ├── dashboard/
│   │   ├── StatCard.tsx
│   │   ├── RecentOrdersList.tsx
│   │   └── SalesChart.tsx
│   │
│   ├── orders/
│   │   ├── OrderKanban.tsx
│   │   ├── OrderCard.tsx
│   │   └── StatusBadge.tsx
│   │
│   └── common/
│       ├── Button.tsx
│       ├── Input.tsx
│       ├── Modal.tsx
│       └── Spinner.tsx
```

---

## 6. AI Integration (Gemini)

### Use Cases

| Feature | Endpoint | Gemini Usage |
|---------|----------|--------------|
| Order parsing | `POST /ai/parse-order` | Extract product, qty, variant from text |
| Intent detection | Internal bot use | Classify GREETING/ORDER/QUESTION |
| Daily summary | `POST /jobs/daily-summary` | Generate natural language report |
| Product matching | Internal | Fuzzy match product names |

### Example: Order Parsing Prompt

```
You are an order parsing assistant for a small shop.

Available products:
- iPhone Case (450 ETB, variants: Black, White, Blue)
- Screen Guard (150 ETB)
- Charger (300 ETB)

Customer message: "I need 3 black phone cases"

Respond in JSON:
{
  "items": [{"productName": "iPhone Case", "qty": 3, "variant": "Black"}],
  "confidence": 0.95,
  "needsClarification": false
}
```

---

## 7. Scheduled Jobs (cron-job.org)

| Job | Schedule | Endpoint | Purpose |
|-----|----------|----------|---------|
| Daily Summary | `0 20 * * *` (8PM) | `POST /jobs/daily-summary` | Send AI summary to owner |
| Inventory Check | `0 9 * * *` (9AM) | `POST /jobs/inventory-check` | Alert low stock items |
| Keep Alive | `*/14 * * * *` | `POST /jobs/keep-alive` | Prevent Render sleep |

### Setup Steps

1. Create account at cron-job.org (free)
2. Add job with:
   - URL: `https://your-app.onrender.com/api/jobs/daily-summary`
   - Method: POST
   - Headers: `x-cron-secret: <your-secret>`
   - Schedule: `0 20 * * *`

---

## 8. Deployment

### Backend (Render)

1. Connect GitHub repo
2. Root directory: `apps/api`
3. Build command: `npm install && npm run build`
4. Start command: `npm start`
5. Environment variables:
   ```
   NODE_ENV=production
   TELEGRAM_BOT_TOKEN=xxx
   GEMINI_API_KEY=xxx
   FIREBASE_SERVICE_ACCOUNT={"type":"service_account",...}
   CRON_SECRET=your-random-secret
   FRONTEND_URL=https://your-app.vercel.app
   ```

### Frontend (Vercel)

1. Import project
2. Root directory: `apps/web`
3. Framework: Vite
4. Environment variables:
   ```
   VITE_API_URL=https://your-app.onrender.com/api
   VITE_TELEGRAM_BOT_USERNAME=YourBotUsername
   ```

### Post-Deployment

1. Set Telegram webhook:
   ```bash
   curl https://api.telegram.org/bot<TOKEN>/setWebhook?url=https://your-app.onrender.com/api/webhook/telegram
   ```
2. Set up cron-job.org jobs
3. Create demo data

---

## 9. Implementation Timeline

### Phase 1: Core Platform (Days 1-4)

| Day | Tasks |
|-----|-------|
| **1** | Project scaffolding, Firebase setup, shared types |
| **2** | Backend: Express setup, Firestore services (Shop, Product, Order), CRUD endpoints |
| **3** | Backend: Telegram bot setup, /start and /status commands, webhook handler |
| **4** | Frontend: React setup, Dashboard page, Orders list with status badges |

### Phase 2: AI Integration (Days 5-7)

| Day | Tasks |
|-----|-------|
| **5** | Gemini integration: order parsing service, intent detection |
| **6** | Bot conversation flow: natural language order intake, confirmation |
| **7** | Frontend: Order Kanban, status updates, customer notifications |

### Phase 3: Automation (Days 8-10)

| Day | Tasks |
|-----|-------|
| **8** | Scheduled jobs: daily summary, inventory check |
| **9** | Analytics endpoints, customer insights |
| **10** | Frontend: Analytics page with Recharts, Settings page |

### Phase 4: Polish (Days 11-14)

| Day | Tasks |
|-----|-------|
| **11** | Error handling, input validation, loading states |
| **12** | Deploy to Render + Vercel, set up cron-job.org |
| **13** | Create demo data, end-to-end testing |
| **14** | Record demo video, finalize documentation |

---

## 10. Environment Variables

### Backend (.env)

```bash
# Server
NODE_ENV=development
PORT=3000

# Firebase
FIREBASE_SERVICE_ACCOUNT={"type":"service_account",...}

# Telegram
TELEGRAM_BOT_TOKEN=123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11

# Gemini AI
GEMINI_API_KEY=AIzaSy...

# SendGrid (optional)
SENDGRID_API_KEY=SG.xxx

# Security
CRON_SECRET=your-random-string
JWT_SECRET=your-jwt-secret

# CORS
FRONTEND_URL=http://localhost:5173
```

### Frontend (.env)

```bash
VITE_API_URL=http://localhost:3000/api
VITE_TELEGRAM_BOT_USERNAME=DukaAIBot
```

---

## 11. Risk Mitigation

| Risk | Mitigation |
|------|------------|
| Render cold starts (15min sleep) | Keep-alive cron job every 14 minutes |
| Gemini rate limits (1500/day) | Cache product catalog, batch requests |
| Firebase read limits (50K/day) | Pagination, cache frequently accessed data |
| Webhook delivery failures | Implement retry logic, log failures |

---

## 12. Testing Checklist

### End-to-End Test Scenarios

- [ ] Customer places order via Telegram → Order appears in dashboard
- [ ] Owner marks order as delivered → Customer receives notification
- [ ] Product stock decreases below threshold → Owner receives alert
- [ ] Daily summary runs at 8PM → Owner receives summary message
- [ ] Owner creates product in dashboard → Product available for orders

---

## 13. Deliverables Checklist

- [ ] Source code (GitHub repository)
- [ ] Deployed backend (Render)
- [ ] Deployed frontend (Vercel)
- [ ] Working Telegram bot
- [ ] cron-job.org jobs configured
- [ ] Demo video recorded
- [ ] README documentation
