import { Router } from 'express';
import { body } from 'express-validator';
import { PaymentController } from '../controllers/payment.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

router.post(
  '/',
  authenticate,
  [
    body('amount').isFloat({ min: 0 }).withMessage('Valid amount required'),
    body('paymentMethod').isIn(['CREDIT_CARD', 'DEBIT_CARD', 'MOBILE_MONEY', 'BANK_TRANSFER', 'CASH', 'WALLET']).withMessage('Invalid payment method'),
    body('rideRequestId').optional().isUUID().withMessage('Valid ride request ID required'),
    body('dayBookingId').optional().isUUID().withMessage('Valid day booking ID required'),
    body('storeOrderId').optional().isUUID().withMessage('Valid store order ID required'),
    body('houseMoveRequestId').optional().isUUID().withMessage('Valid house move request ID required'),
  ],
  PaymentController.createPayment
);

router.get('/', authenticate, PaymentController.getUserPayments);

export const paymentRoutes = router;