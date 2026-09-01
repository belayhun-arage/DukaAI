import { Request, Response, NextFunction } from 'express';

// Extend Express Request to include shopId
declare global {
  namespace Express {
    interface Request {
      shopId?: string;
    }
  }
}

/**
 * Middleware to extract shopId from header or query param.
 * For production, this would validate a JWT and extract the shopId.
 */
export function requireShop(req: Request, res: Response, next: NextFunction): void {
  const shopId = req.headers['x-shop-id'] as string || req.query.shopId as string;

  if (!shopId) {
    res.status(400).json({
      success: false,
      error: 'Shop ID is required. Provide x-shop-id header or shopId query param.',
    });
    return;
  }

  req.shopId = shopId;
  next();
}

/**
 * Optional shop context - doesn't fail if missing
 */
export function optionalShop(req: Request, res: Response, next: NextFunction): void {
  const shopId = req.headers['x-shop-id'] as string || req.query.shopId as string;
  req.shopId = shopId;
  next();
}
