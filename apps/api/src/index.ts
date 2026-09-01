import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { config, validateConfig } from './config';
import { initializeFirebase } from './config/firebase';

// Import routes
import healthRoutes from './routes/health';
import shopRoutes from './routes/shops';
import productRoutes from './routes/products';
import orderRoutes from './routes/orders';
import customerRoutes from './routes/customers';
import analyticsRoutes from './routes/analytics';
import jobRoutes from './routes/jobs';
import webhookRoutes from './routes/webhooks';
import aiRoutes from './routes/ai';
import { initializeBot } from './bot/telegram';
import { initializeGemini } from './services/ai.service';

const app = express();

// Validate environment
validateConfig();

// Initialize Firebase (may fail if not configured)
const firebaseReady = initializeFirebase();

// Initialize Telegram bot
const botReady = initializeBot() !== null;

// Initialize Gemini AI
const geminiReady = initializeGemini();

// Middleware
app.use(helmet());
app.use(cors({
  origin: config.frontendUrl,
  credentials: true,
}));
app.use(morgan(config.isDev ? 'dev' : 'combined'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api/health', healthRoutes);
app.use('/api/shops', shopRoutes);
app.use('/api/products', productRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/jobs', jobRoutes);
app.use('/api/webhooks', webhookRoutes);
app.use('/api/ai', aiRoutes);

// Error handling middleware
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Error:', err.message);
  console.error(err.stack);

  res.status(500).json({
    success: false,
    error: config.isDev ? err.message : 'Internal server error',
  });
});

// 404 handler
app.use((req: express.Request, res: express.Response) => {
  res.status(404).json({
    success: false,
    error: 'Not found',
  });
});

// Start server
app.listen(config.port, () => {
  console.log(`
╔════════════════════════════════════════╗
║         DukaAI API Server              ║
╠════════════════════════════════════════╣
║  Port: ${String(config.port).padEnd(28)}║
║  Environment: ${config.nodeEnv.padEnd(20)}║
║  Firebase: ${(firebaseReady ? 'Connected' : 'Mock mode').padEnd(24)}║
║  Telegram Bot: ${(botReady ? 'Ready' : 'Not configured').padEnd(20)}║
║  Gemini AI: ${(geminiReady ? 'Ready' : 'Not configured').padEnd(23)}║
╚════════════════════════════════════════╝
  `);
});

export default app;
