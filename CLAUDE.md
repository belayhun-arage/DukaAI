# CLAUDE.md

This file provides guidance to Claude Code when working with DukaAI.

## Project Overview

**DukaAI** - AI-powered Small Shop Operations Assistant for Ethiopian retail businesses.

A full-stack AI automation project for Brain3.ai that automates the **Small Shop Operations Manager** role with:
- Telegram Bot for voice + text order intake (Amharic/English)
- Web Dashboard for order management and analytics
- AI-powered order parsing and demand forecasting
- Workflow automation for reminders and follow-ups

## Monorepo Structure

```
DukaAI/
├── apps/
│   ├── api/          # Express + TypeScript backend
│   └── web/          # React + Vite frontend
├── packages/
│   └── shared/       # Shared types and constants
└── package.json      # Root workspace config
```

## Quick Start

```bash
# Install dependencies (from root)
npm install

# Build shared package first (required before running apps)
npm run build --workspace=packages/shared

# Run both API and web in development
npm run dev

# Or run individually
npm run dev:api     # API on port 3001
npm run dev:web     # Web on port 5173
```

## Tech Stack

| Layer | Technology |
|-------|------------|
| **Frontend** | React 18, Vite, TailwindCSS, Recharts, React Router, Lucide |
| **Backend** | Node.js, Express, TypeScript |
| **Database** | Firebase Firestore (Spark plan - free) |
| **AI** | Google Gemini API, Whisper via Groq |
| **Bot** | node-telegram-bot-api |
| **Workflow** | XState |
| **Validation** | Zod |
| **Hosting** | Railway (backend) + Vercel (frontend) |
| **Telegram Proxy** | Cloudflare Workers (bypasses Railway IP blocks) |
| **Scheduling** | cron-job.org (free, unlimited jobs) |

## Packages

### `@dukaai/api` (apps/api)
Express backend with:
- **Routes**: `src/routes/` - health, shops, products, orders, customers, analytics, jobs, webhooks, ai
- **Services**: `src/services/` - shop, product, order, customer, ai services
- **Bot**: `src/bot/telegram.ts` - Telegram bot initialization and handlers
- **Middleware**: `src/middleware/shopContext.ts` - Shop context extraction
- **Config**: `src/config/` - Environment config and Firebase initialization
- **Entry**: `src/index.ts`

Run: `npm run dev --workspace=apps/api`

### `@dukaai/web` (apps/web)
React dashboard with:
- **Pages**: Dashboard, Orders, Products, Customers, Analytics, Settings
- **Services**: `src/services/api.ts` - API client
- **Context**: `src/context/ShopContext.tsx` - Shop state management
- **Components**: `src/components/Layout.tsx` - Main layout with navigation

Run: `npm run dev --workspace=apps/web`

### `@dukaai/shared` (packages/shared)
Shared TypeScript types and constants:
- `types/index.ts` - Shop, Product, Customer, Order, TelegramSession, AI types
- `constants/index.ts` - Shared constants

Build: `npm run build --workspace=packages/shared`

## Environment Variables

Copy `apps/api/.env.example` to `apps/api/.env` and configure:

| Variable | Service | Notes |
|----------|---------|-------|
| `FIREBASE_*` | Firestore | Spark plan (free) |
| `TELEGRAM_BOT_TOKEN` | Telegram | From BotFather |
| `TELEGRAM_WEBHOOK_URL` | Telegram | Webhook endpoint URL |
| `TELEGRAM_API_URL` | Cloudflare Workers | Proxy to bypass Railway IP blocks |
| `GEMINI_API_KEY` | Google AI Studio | Free tier |
| `GROQ_API_KEY` | Groq | Whisper transcription |
| `SENDGRID_API_KEY` | SendGrid | Optional (skipped - Telegram notifications sufficient) |
| `CRON_SECRET` | cron-job.org | Webhook auth |
| `FRONTEND_URL` | CORS | Frontend URL for CORS |

## Deployment URLs

| Service | URL | Status |
|---------|-----|--------|
| **Frontend** | https://dukaai-web.vercel.app | ✅ Live |
| **Backend API** | https://dukaaiapi-production.up.railway.app | ✅ Live |
| **Telegram Bot** | @fedukaaibot | ✅ Connected |
| **Cloudflare Proxy** | https://aged-tooth-3094.belayhun24arage.workers.dev | ✅ Active |
| **Cron Jobs** | cron-job.org | ✅ Configured |

## Deploying to Railway

### Prerequisites

Install Railway CLI (if not installed):
```bash
curl -fsSL https://railway.com/install.sh | sh
```

The CLI will be installed to `~/.railway/bin/railway`.

### Deploy API

From the DukaAI root directory:

```bash
# Deploy API service
~/.railway/bin/railway up --service @dukaai/api
```

This will:
1. Index and upload the project
2. Build using Nixpacks (runs `npm install` + `tsc`)
3. Deploy to Railway and start the service

### Verify Deployment

```bash
# Check status
~/.railway/bin/railway status

# Check health endpoint
curl -s https://dukaaiapi-production.up.railway.app/api/health

# View logs
~/.railway/bin/railway logs --service @dukaai/api
```

### Deploy Frontend (Vercel)

The frontend auto-deploys via Vercel Git integration. If manual deploy is needed:

```bash
cd apps/web
npx vercel --prod
```

### Troubleshooting

| Issue | Solution |
|-------|----------|
| `railway: Permission denied` | Run `chmod +x ~/.railway/bin/railway` |
| CLI not found | Reinstall: `curl -fsSL https://railway.com/install.sh \| sh` |
| Build fails | Check `railway logs --service @dukaai/api --build` |
| Service offline | Check Railway dashboard for error logs |

## Cron Jobs (cron-job.org)

Scheduled automation using [cron-job.org](https://cron-job.org) (free tier).

### Configuration

All jobs require header: `x-cron-secret: dukaai-dev-secret-123`

| Job | Endpoint | Schedule | Purpose |
|-----|----------|----------|---------|
| **Keep-Alive** | `POST /api/jobs/keep-alive` | Every 10 min | Prevents Railway cold starts |
| **Daily Summary** | `POST /api/jobs/daily-summary` | Daily 8:00 AM (EAT) | Generates daily reports for shop owners |
| **Inventory Check** | `POST /api/jobs/inventory-check` | Daily 9:00 AM (EAT) | Alerts on low stock items |
| **Demand Forecast** | `POST /api/jobs/demand-forecast` | Weekly (Sunday 6:00 AM) | Generates demand forecasts and restock alerts |

### Setup Instructions

1. Create account at https://cron-job.org
2. Go to **Create cronjob**
3. Fill in Title and URL
4. Set schedule (Every X minutes or Every day at HH:MM)
5. Expand **Advanced** section:
   - Time zone: `Africa/Addis_Ababa`
   - Request method: `POST`
6. Click **Add header** twice to add:
   - `x-cron-secret: dukaai-dev-secret-123`
   - `Content-Type: application/json`
7. Enable notifications on failure
8. Click **Create**

See `docs/cron-jobs-implementation.md` for detailed configuration.

### Testing Endpoints

```bash
# Keep-alive
curl -X POST https://dukaaiapi-production.up.railway.app/api/jobs/keep-alive \
  -H "x-cron-secret: dukaai-dev-secret-123" \
  -H "Content-Type: application/json"

# Daily summary
curl -X POST https://dukaaiapi-production.up.railway.app/api/jobs/daily-summary \
  -H "x-cron-secret: dukaai-dev-secret-123" \
  -H "Content-Type: application/json"

# Inventory check
curl -X POST https://dukaaiapi-production.up.railway.app/api/jobs/inventory-check \
  -H "x-cron-secret: dukaai-dev-secret-123" \
  -H "Content-Type: application/json"
```

## Implementation Status (UPDATED - September 9, 2026)

**Completed:**
- Monorepo structure with npm workspaces
- Shared types package (`@dukaai/shared`)
- API scaffolding with Express, middleware, config
- Web scaffolding with React Router, TailwindCSS, page stubs
- Firebase Firestore integration with collection helpers
- Full CRUD services: Shop, Product, Order, Customer
- API routes: shops, products, orders, customers, analytics, jobs, webhooks, ai
- Telegram bot with commands: /start, /status, /orders, /inventory, /deliver, /pay, /confirm
- Gemini AI integration: order parsing, intent detection, daily summaries
- Frontend data fetching hooks: useOrders, useProducts, useCustomers, useAnalytics
- Dashboard page connected to /api/analytics/dashboard
- Orders page with status updates and order detail modal
- Products page with CRUD operations (create, edit, delete, stock updates)
- Customers page with customer list and profile detail modal
- Analytics page with sales charts (Recharts) and top products
- Settings page with shop creation, settings management, notifications
- **Deployment: Railway (API) + Vercel (frontend)**
- **Telegram webhook configured and receiving updates**
- **Cloudflare Workers proxy for Telegram API (bypasses Railway IP blocks)**
- **cron-job.org scheduled jobs (keep-alive, daily summary, inventory check)**
- **Groq/Whisper voice transcription (Amharic + English)**
- **Conversation state management with confirmation flow (inline buttons)**
- **SendGrid skipped** - Telegram notifications sufficient, exceeds 2 API requirement

### AI Agent Enhancements (September 9, 2026)

**Tool Use Architecture:**
- 12 tools defined for the AI agent to use autonomously
- Tools: search_products, get_product_details, check_inventory, create_order, get_order_status, update_order_status, get_customer_info, get_customer_orders, send_notification, get_daily_stats, get_low_stock_items, calculate_order_total
- Gemini function calling integration for intelligent tool selection
- Automatic tool execution with result handling

**Agent Observability:**
- Full execution tracing with thoughts, tool calls, and results
- Agent traces stored in Firestore for history
- Statistics: total runs, success rate, avg duration, tool usage breakdown
- Real-time trace inspection with expandable tool call details

**New Telegram Command:**
- `/agent <message>` - Interact with the AI agent using tool use
- Shows tools used and confidence score in response

**New Dashboard Pages:**
- `/agent` - Agent Observability dashboard
- Test agent directly from the UI
- View recent traces with filtering
- Tool usage charts and trigger source breakdown
- Detailed trace modal with timeline view

### Demand Forecasting Agent (September 9, 2026)

**Autonomous Forecasting:**
- Analyzes 90 days of order history
- Calculates sales patterns and trends (increasing/stable/decreasing)
- Predicts demand for 7 and 30 day periods
- Generates restock recommendations with urgency levels

**AI-Powered Insights:**
- Gemini generates actionable business insights
- Identifies trending products and opportunities
- Warns about declining sales and risks
- Suggests specific actions for shop owners

**Restock Intelligence:**
- Calculates days until stockout per product
- Urgency levels: critical (3 days), high (7 days), medium (14 days), low (30 days)
- Recommended restock quantities based on predicted demand
- Estimated revenue projections

**New Telegram Command:**
- `/forecast` - Shows demand forecast with restock recommendations
- Critical and high-priority items highlighted
- AI insights included in message

**New Dashboard Page:**
- `/forecast` - Demand Forecast dashboard
- Predicted demand charts by product
- Restock recommendations with urgency
- AI insights cards with severity levels
- Product prediction detail modal

## API Endpoints (Implemented)

```
# Health
GET  /api/health            # Health check
GET  /api/health/ready      # Readiness check

# Shops
POST   /api/shops           # Create shop
GET    /api/shops/current   # Get current shop (requires x-shop-id header)
GET    /api/shops/:id       # Get shop by ID
PATCH  /api/shops           # Update shop info
PATCH  /api/shops/settings  # Update shop settings

# Products (requires x-shop-id header)
GET    /api/products             # List products
GET    /api/products/search      # Search products
GET    /api/products/low-stock   # Get low stock products
GET    /api/products/:id         # Get product
POST   /api/products             # Create product
PATCH  /api/products/:id         # Update product
PATCH  /api/products/:id/stock   # Update stock
DELETE /api/products/:id         # Soft delete product

# Orders (requires x-shop-id header)
GET    /api/orders             # List orders
GET    /api/orders/pending     # Get pending orders
GET    /api/orders/today       # Get today's orders
GET    /api/orders/stats       # Get order statistics
GET    /api/orders/:id         # Get order
POST   /api/orders             # Create order
PATCH  /api/orders/:id/status  # Update order status

# Customers (requires x-shop-id header)
GET    /api/customers          # List customers
GET    /api/customers/top      # Top customers by spending
GET    /api/customers/recent   # Recently active customers
GET    /api/customers/:id      # Get customer with order history
POST   /api/customers          # Create customer
PATCH  /api/customers/:id      # Update customer
GET    /api/customers/:id/orders # Get customer orders

# Analytics (requires x-shop-id header)
GET    /api/analytics/dashboard    # Dashboard summary
GET    /api/analytics/sales        # Sales over time
GET    /api/analytics/top-products # Top selling products
GET    /api/analytics/customers    # Customer insights

# AI (requires x-shop-id header for some)
POST   /api/ai/parse-order       # Parse natural language order
POST   /api/ai/detect-intent     # Detect message intent
POST   /api/ai/answer-question   # Answer product question
POST   /api/ai/generate-summary  # Generate daily summary

# Jobs (requires x-cron-secret header)
POST   /api/jobs/keep-alive       # Keep server alive
POST   /api/jobs/daily-summary    # Run daily summary
POST   /api/jobs/inventory-check  # Run inventory check

# Webhooks
POST   /api/webhooks/telegram           # Telegram webhook
GET    /api/webhooks/telegram/info      # Get webhook info
POST   /api/webhooks/telegram/set-webhook # Set webhook URL
DELETE /api/webhooks/telegram/webhook   # Delete webhook

# Agent (requires x-shop-id header)
POST   /api/agents/run          # Run agent with input (returns trace ID)
GET    /api/agents/traces       # List agent traces
GET    /api/agents/traces/:id   # Get specific trace with full details
GET    /api/agents/stats        # Get agent statistics
GET    /api/agents/tool-calls   # Get recent tool calls
GET    /api/agents/tools        # Get available tools and schemas
DELETE /api/agents/traces/cleanup # Delete old traces

# Forecast (requires x-shop-id header)
POST   /api/forecast/generate   # Generate new demand forecast
GET    /api/forecast/latest     # Get latest forecast report
GET    /api/forecast/history    # Get forecast history
GET    /api/forecast/restock    # Get restock recommendations
GET    /api/forecast/summary    # Get text summary (for Telegram)
GET    /api/forecast/product/:id # Get prediction for specific product
```

## Code Conventions

- TypeScript strict mode
- Shared types in `@dukaai/shared`
- Zod for runtime validation
- API responses follow `ApiResponse<T>` and `PaginatedResponse<T>` types
- Order statuses: NEW, CONFIRMED, PAID, READY, DELIVERED, CANCELLED

## Assignment Requirements (All Met)

This project successfully:
1. Uses only free-tier services (no credit card required) ✅
2. Integrates 3+ third-party APIs: Telegram, Gemini AI, Groq Whisper ✅
3. Includes proactive automation via cron-job.org (daily summaries, inventory alerts) ✅
4. Balances frontend (React dashboard) and backend (Express API) implementation ✅
