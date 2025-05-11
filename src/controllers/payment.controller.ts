import { Request, Response } from 'express';
import { validationResult } from 'express-validator';
import { prisma } from '../lib/prisma';

export class PaymentController {
  static async createPayment(req: Request, res: Response) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const userId = req.user?.id;
      const { amount, paymentMethod, rideRequestId, dayBookingId, storeOrderId, houseMoveRequestId } = req.body;

      // Validate that only one service type is associated
      const serviceIds = [rideRequestId, dayBookingId, storeOrderId, houseMoveRequestId].filter(Boolean);
      if (serviceIds.length !== 1) {
        return res.status(400).json({ error: 'Exactly one service ID must be provided' });
      }

      // Verify service exists and belongs to user
      let service;
      if (rideRequestId) {
        service = await prisma.rideRequest.findUnique({ where: { id: rideRequestId } });
        if (!service || service.userId !== userId) {
          return res.status(404).json({ error: 'Ride request not found or unauthorized' });
        }
      } else if (dayBookingId) {
        service = await prisma.dayBooking.findUnique({ where: { id: dayBookingId } });
        if (!service || service.userId !== userId) {
          return res.status(404).json({ error: 'Day booking not found or unauthorized' });
        }
      } else if (storeOrderId) {
        service = await prisma.storeOrder.findUnique({ where: { id: storeOrderId } });
        if (!service || service.userId !== userId) {
          return res.status(404).json({ error: 'Store order not encontrados or unauthorized' });
        }
      } else if (houseMoveRequestId) {
        service = await prisma.houseMoveRequest.findUnique({ where: { id: houseMoveRequestId } });
        if (!service || service.userId !== userId) {
          return res.status(404).json({ error: 'House move request not found or unauthorized' });
        }
      }

      // In a real system, integrate with a payment gateway (e.g., Stripe) here
      const transactionId = `txn_${Date.now()}`; // Placeholder

      const payment = await prisma.payment.create({
        data: {
          userId,
          amount,
          paymentMethod,
          status: 'PAID', // Assume success for now
          transactionId,
          paymentDate: new Date(),
          rideRequestId,
          dayBookingId,
          storeOrderId,
          houseMoveRequestId,
        },
        include: {
          user: {
            select: {
              firstName: true,
              lastName: true,
            },
          },
        },
      });

      // Update service payment status
      if (rideRequestId) {
        await prisma.rideRequest.update({
          where: { id: rideRequestId },
          data: { paymentStatus: 'PAID' },
        });
      } else if (dayBookingId) {
        await prisma.dayBooking.update({
          where: { id: dayBookingId },
          data: { status: 'SCHEDULED' }, // Assuming payment confirms booking
        });
      } else if (storeOrderId) {
        await prisma.storeOrder.update({
          where: { id: storeOrderId },
          data: { status: 'PREPARING' },
        });
      } else if (houseMoveRequestId) {
        await prisma.houseMoveRequest.update({
          where: { id: houseMoveRequestId },
          data: { status: 'CONFIRMED' },
        });
      }

      res.status(201).json(payment);
    } catch (error) {
      console.error('Payment creation error:', error);
      res.status(500).json({ error: 'Failed to create payment' });
    }
  }

  static async getUserPayments(req: Request, res: Response) {
    try {
      const userId = req.user?.id;

      const payments = await prisma.payment.findMany({
        where: { userId },
        include: {
          rideRequest: {
            include: { rideType: true },
          },
          dayBooking: {
            include: { district: true },
          },
          storeOrder: {
            include: { store: true },
          },
          houseMoveRequest: {
            include: { originLocation: true, destinationLocation: true },
          },
        },
        orderBy: { createdAt: 'desc' },
      });

      res.status(200).json(payments);
    } catch (error) {
      console.error('Payments fetch error:', error);
      res.status(500).json({ error: 'Failed to fetch payments' });
    }
  }
}