import { Router } from 'express';
import { body, query } from 'express-validator';
import { StoreController } from '../controllers/store.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

router.get(
  '/',
  [
    query('type').optional().isIn(['GROCERY', 'PHARMACY', 'RESTAURANT', 'RETAIL', 'ELECTRONICS', 'OTHER']).withMessage('Invalid store type'),
    query('city').optional().notEmpty().withMessage('City cannot be empty'),
  ],
  StoreController.getStores
);

router.get('/:storeId/products', StoreController.getStoreProducts);

router.post(
  '/orders',
  authenticate,
  [
    body('storeId').isUUID().withMessage('Valid store ID required'),
    body('deliveryLocationId').isUUID().withMessage('Valid delivery location ID required'),
    body('items').isArray({ min: 1 }).withMessage('At least one item required'),
    body('items.*.productId').isUUID().withMessage('Valid product ID required'),
    body('items.*.quantity').isInt({ min: 1 }).withMessage('Quantity must be at least 1'),
    body('items.*.specialRequest').optional().notEmpty().withMessage('Special request cannot be empty'),
    body('deliveryNotes').optional().notEmpty().withMessage('Delivery notes cannot be empty'),
  ],
  StoreController.createOrder
);

router.get('/orders', authenticate, StoreController.getUserOrders);

router.put('/orders/:orderId/cancel', authenticate, StoreController.cancelOrder);

export const storeRoutes = router;