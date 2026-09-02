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
| **Hosting** | Render (backend) + Vercel (frontend) |

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
| `GEMINI_API_KEY` | Google AI Studio | Free tier |
| `GROQ_API_KEY` | Groq | Whisper transcription |
| `SENDGRID_API_KEY` | SendGrid | Free tier (100/day) |
| `CRON_SECRET` | cron-job.org | Webhook auth |

## Current Implementation Status

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

**TODO:**
- Groq/Whisper voice transcription for voice messages
- XState workflow engine for conversation state management
- SendGrid email notifications
- Deployment to Render (API) + Vercel (web)
- cron-job.org webhook configuration

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
```

## Code Conventions

- TypeScript strict mode
- Shared types in `@dukaai/shared`
- Zod for runtime validation
- API responses follow `ApiResponse<T>` and `PaginatedResponse<T>` types
- Order statuses: NEW, CONFIRMED, PAID, READY, DELIVERED, CANCELLED

## Assignment Requirements

This project must:
1. Use only free-tier services (no credit card required)
2. Integrate at least 2 third-party APIs (Telegram, Gemini, SendGrid)
3. Include proactive automation via cron-job.org
4. Balance frontend and backend implementation
