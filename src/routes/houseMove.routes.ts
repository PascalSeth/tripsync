import { Router } from 'express';
import { body } from 'express-validator';
import { HouseMoveController } from '../controllers/houseMove.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

router.post(
  '/',
  authenticate,
  [
    body('originLocationId').isUUID().withMessage('Valid origin location ID required'),
    body('destinationLocationId').isUUID().withMessage('Valid destination location ID required'),
    body('scheduledDate').isISO8601().withMessage('Valid scheduled date required'),
    body('timeSlot').isIn(['Morning', 'Afternoon', 'Evening']).withMessage('Invalid time slot'),
    body('estimatedVolume').optional().isFloat({ min: 0 }).withMessage('Valid estimated volume required'),
    body('specialInstructions').optional().notEmpty().withMessage('Special instructions cannot be empty'),
    body('numberOfMovers').isInt({ min: 1 }).withMessage('Valid number of movers required'),
    body('vehicleSize').optional().isIn(['Small', 'Medium', 'Large']).withMessage('Invalid vehicle size'),
    body('inventory').optional().isArray().withMessage('Inventory must be an array'),
    body('inventory.*.name').optional().notEmpty().withMessage('Inventory item name required'),
    body('inventory.*.category').optional().notEmpty().withMessage('Inventory item category required'),
    body('inventory.*.quantity').optional().isInt({ min: 1 }).withMessage('Inventory item quantity must be at least 1'),
    body('inventory.*.specialHandling').optional().isBoolean().withMessage('Special handling must be a boolean'),
    body('inventory.*.specialInstructions').optional().notEmpty().withMessage('Special instructions cannot be empty'),
  ],
  HouseMoveController.createRequest
);

router.get('/', authenticate, HouseMoveController.getUserRequests);

router.put('/:requestId/cancel', authenticate, HouseMoveController.cancelRequest);

export const houseMoveRoutes = router;