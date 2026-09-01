import { Router, Request, Response } from 'express';
import * as productService from '../services/product.service';
import { requireShop } from '../middleware/shopContext';

const router = Router();

// All product routes require shop context
router.use(requireShop);

// List products
router.get('/', async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const pageSize = parseInt(req.query.pageSize as string) || 20;
    const activeOnly = req.query.activeOnly !== 'false';
    const category = req.query.category as string | undefined;

    const result = await productService.getProducts(req.shopId!, {
      page,
      pageSize,
      activeOnly,
      category,
    });

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error('Error listing products:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to list products',
    });
  }
});

// Search products
router.get('/search', async (req: Request, res: Response) => {
  try {
    const q = req.query.q as string;

    if (!q) {
      return res.status(400).json({
        success: false,
        error: 'Search query (q) is required',
      });
    }

    const products = await productService.searchProducts(req.shopId!, q);

    res.json({
      success: true,
      data: products,
    });
  } catch (error) {
    console.error('Error searching products:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to search products',
    });
  }
});

// Get low stock products
router.get('/low-stock', async (req: Request, res: Response) => {
  try {
    const products = await productService.getLowStockProducts(req.shopId!);

    res.json({
      success: true,
      data: products,
    });
  } catch (error) {
    console.error('Error getting low stock products:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get low stock products',
    });
  }
});

// Get product by ID
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const product = await productService.getProductById(req.shopId!, req.params.id);

    if (!product) {
      return res.status(404).json({
        success: false,
        error: 'Product not found',
      });
    }

    res.json({
      success: true,
      data: product,
    });
  } catch (error) {
    console.error('Error getting product:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get product',
    });
  }
});

// Create product
router.post('/', async (req: Request, res: Response) => {
  try {
    const { name, price, stockQty, description, variants, lowStockThreshold, category } = req.body;

    if (!name || price === undefined || stockQty === undefined) {
      return res.status(400).json({
        success: false,
        error: 'name, price, and stockQty are required',
      });
    }

    const product = await productService.createProduct(req.shopId!, {
      name,
      price,
      stockQty,
      description,
      variants,
      lowStockThreshold,
      category,
    });

    res.status(201).json({
      success: true,
      data: product,
    });
  } catch (error) {
    console.error('Error creating product:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create product',
    });
  }
});

// Update product
router.patch('/:id', async (req: Request, res: Response) => {
  try {
    const product = await productService.updateProduct(req.shopId!, req.params.id, req.body);

    if (!product) {
      return res.status(404).json({
        success: false,
        error: 'Product not found',
      });
    }

    res.json({
      success: true,
      data: product,
    });
  } catch (error) {
    console.error('Error updating product:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update product',
    });
  }
});

// Update stock quantity
router.patch('/:id/stock', async (req: Request, res: Response) => {
  try {
    const { quantity, delta } = req.body;

    let product;
    if (delta !== undefined) {
      product = await productService.adjustStock(req.shopId!, req.params.id, delta);
    } else if (quantity !== undefined) {
      product = await productService.updateStock(req.shopId!, req.params.id, quantity);
    } else {
      return res.status(400).json({
        success: false,
        error: 'Either quantity or delta is required',
      });
    }

    if (!product) {
      return res.status(404).json({
        success: false,
        error: 'Product not found',
      });
    }

    res.json({
      success: true,
      data: product,
    });
  } catch (error) {
    console.error('Error updating stock:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update stock',
    });
  }
});

// Delete product (soft delete)
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const deleted = await productService.deleteProduct(req.shopId!, req.params.id);

    if (!deleted) {
      return res.status(404).json({
        success: false,
        error: 'Product not found',
      });
    }

    res.json({
      success: true,
      data: { deleted: true },
    });
  } catch (error) {
    console.error('Error deleting product:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete product',
    });
  }
});

export default router;
