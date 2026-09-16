# DukaAI

AI-powered Small Shop Operations Assistant for Ethiopian retail businesses.

## Live Demo

- **Web Dashboard**: https://dukaai-web.vercel.app
- **Telegram Bot**: [@fedukaaibot](https://t.me/fedukaaibot)
- **API**: https://dukaaiapi-production.up.railway.app

## Features

- **Telegram Bot** - Voice and text order intake with Amharic/English support
- **AI Order Parsing** - Natural language processing using Gemini AI
- **Voice Transcription** - Whisper API via Groq for voice messages
- **Web Dashboard** - Real-time order management and analytics
- **AI Agent** - Autonomous tool use for shop operations
- **Demand Forecasting** - Predictive analytics and restock recommendations
- **Proactive Automation** - Daily summaries, inventory alerts via cron jobs

## Tech Stack

- **Frontend**: React 18, Vite, TailwindCSS, Recharts
- **Backend**: Node.js, Express, TypeScript
- **Database**: Firebase Firestore (free tier)
- **AI**: Google Gemini API, Whisper via Groq
- **Bot**: Telegram Bot API
- **Hosting**: Railway (backend) + Vercel (frontend)
- **Scheduling**: cron-job.org

All services use free tiers - no credit card required.

## Project Structure

```
DukaAI/
├── apps/
│   ├── api/          # Express backend
│   └── web/          # React frontend
├── packages/
│   └── shared/       # Shared types
└── package.json
```

## Quick Start

```bash
# Install dependencies
npm install

# Set up environment variables
cp apps/api/.env.example apps/api/.env
# Edit .env with your API keys

# Run development
npm run dev
```

## Environment Variables

| Variable | Description |
|----------|-------------|
| `FIREBASE_PROJECT_ID` | Firebase project ID |
| `FIREBASE_CLIENT_EMAIL` | Service account email |
| `FIREBASE_PRIVATE_KEY` | Service account private key |
| `TELEGRAM_BOT_TOKEN` | From BotFather |
| `GEMINI_API_KEY` | Google AI Studio |
| `GROQ_API_KEY` | Groq API for Whisper |

## API Endpoints

### Core
- `GET /api/health` - Health check
- `POST /api/shops` - Create shop
- `GET /api/products` - List products
- `POST /api/orders` - Create order
- `GET /api/analytics/dashboard` - Dashboard data

### AI
- `POST /api/ai/parse-order` - Parse natural language order
- `POST /api/agents/run` - Run AI agent with tools
- `GET /api/forecast/latest` - Get demand forecast

### Automation
- `POST /api/jobs/daily-summary` - Generate daily report
- `POST /api/jobs/inventory-check` - Check low stock

## Telegram Bot Commands

- `/start` - Welcome message
- `/status` - Today's summary
- `/orders` - Pending orders
- `/inventory` - Low stock alerts
- `/forecast` - Demand predictions
- `/agent <message>` - AI agent interaction

Send text or voice messages to place orders in English or Amharic.

## Screenshots

### Dashboard
Real-time order management with analytics

### Telegram Bot
Voice and text order intake with AI parsing

### Analytics
Sales charts and customer insights

## License

MIT
