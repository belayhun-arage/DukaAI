import { Router, Request, Response } from 'express';
import * as shopService from '../services/shop.service';
import { requireShop } from '../middleware/shopContext';

const router = Router();

// Create a new shop
router.post('/', async (req: Request, res: Response) => {
  try {
    const { name, ownerTelegramId, ownerName } = req.body;

    if (!name || !ownerTelegramId || !ownerName) {
      return res.status(400).json({
        success: false,
        error: 'name, ownerTelegramId, and ownerName are required',
      });
    }

    const shop = await shopService.createShop({
      name,
      ownerTelegramId,
      ownerName,
    });

    res.status(201).json({
      success: true,
      data: shop,
    });
  } catch (error) {
    console.error('Error creating shop:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create shop',
    });
  }
});

// Get current shop (requires shopId)
router.get('/current', requireShop, async (req: Request, res: Response) => {
  try {
    const shop = await shopService.getShopById(req.shopId!);

    if (!shop) {
      return res.status(404).json({
        success: false,
        error: 'Shop not found',
      });
    }

    res.json({
      success: true,
      data: shop,
    });
  } catch (error) {
    console.error('Error getting shop:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get shop',
    });
  }
});

// Get shop by ID
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const shop = await shopService.getShopById(req.params.id);

    if (!shop) {
      return res.status(404).json({
        success: false,
        error: 'Shop not found',
      });
    }

    res.json({
      success: true,
      data: shop,
    });
  } catch (error) {
    console.error('Error getting shop:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get shop',
    });
  }
});

// Update shop settings
router.patch('/settings', requireShop, async (req: Request, res: Response) => {
  try {
    const shop = await shopService.updateShopSettings(req.shopId!, req.body);

    if (!shop) {
      return res.status(404).json({
        success: false,
        error: 'Shop not found',
      });
    }

    res.json({
      success: true,
      data: shop,
    });
  } catch (error) {
    console.error('Error updating shop settings:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update shop settings',
    });
  }
});

// Update shop info
router.patch('/', requireShop, async (req: Request, res: Response) => {
  try {
    const { name, ownerName } = req.body;
    const shop = await shopService.updateShop(req.shopId!, { name, ownerName });

    if (!shop) {
      return res.status(404).json({
        success: false,
        error: 'Shop not found',
      });
    }

    res.json({
      success: true,
      data: shop,
    });
  } catch (error) {
    console.error('Error updating shop:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update shop',
    });
  }
});

export default router;
