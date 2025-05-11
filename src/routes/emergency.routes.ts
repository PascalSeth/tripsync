import { Router } from 'express';
import { body } from 'express-validator';
import { EmergencyController } from '../controllers/emergency.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

router.post(
  '/',
  authenticate,
  [
    body('serviceType').isIn(['POLICE', 'AMBULANCE', 'FIRE']).withMessage('Invalid service type'),
    body('locationId').isUUID().withMessage('Valid location ID required'),
    body('description').notEmpty().withMessage('Description is required'),
  ],
  EmergencyController.createRequest
);

router.get('/', authenticate, EmergencyController.getUserRequests);

router.put('/:requestId/cancel', authenticate, EmergencyController.cancelRequest);

export const emergencyRoutes = router;