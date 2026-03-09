import { Router } from 'express';
import {
  getAllProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
  adjustInventory,
  getInventoryLogs,
  getLowStockProducts,
  getAllCategories,
  createCategory
} from '../controllers/products.controller';

const router = Router();

// Category routes (must come before /:id routes)
router.get('/categories', getAllCategories);
router.post('/categories', createCategory);

// Product routes
router.get('/', getAllProducts);
router.get('/low-stock', getLowStockProducts);
router.get('/:id', getProductById);
router.post('/', createProduct);
router.put('/:id', updateProduct);
router.delete('/:id', deleteProduct);

// Inventory routes
router.post('/:id/inventory/adjust', adjustInventory);
router.get('/:id/inventory/logs', getInventoryLogs);

export default router;
