import { Router } from 'express';
import { isFirebaseInitialized } from '../config/firebase';

const router = Router();

router.get('/', (req, res) => {
  res.json({
    success: true,
    data: {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      version: '1.0.0',
    },
  });
});

router.get('/ready', async (req, res) => {
  try {
    res.json({
      success: true,
      data: {
        status: 'ready',
        services: {
          firebase: isFirebaseInitialized() ? 'connected' : 'not_configured',
        },
      },
    });
  } catch (error) {
    res.status(503).json({
      success: false,
      error: 'Service not ready',
    });
  }
});

export default router;
