import { Request, Response } from 'express';
import { validationResult } from 'express-validator';
import { prisma } from '../lib/prisma';

export class EmergencyController {
  static async createRequest(req: Request, res: Response) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const userId = req.user?.id;
      const { serviceType, locationId, description } = req.body;

      const location = await prisma.location.findUnique({
        where: { id: locationId },
      });

      if (!location) {
        return res.status(404).json({ error: 'Location not found' });
      }

      const emergencyRequest = await prisma.emergencyRequest.create({
        data: {
          userId,
          serviceType,
          locationId,
          description,
          status: 'REQUESTED',
        },
        include: {
          user: {
            select: {
              firstName: true,
              lastName: true,
              phone: true,
            },
          },
          location: true,
        },
      });

      // Emit Socket.IO event for real-time emergency alerts (handled in index.ts)
      req.app.get('io').emit('emergency:new', {
        requestId: emergencyRequest.id,
        userId,
        serviceType,
        location: emergencyRequest.location,
        description,
      });

      res.status(201).json(emergencyRequest);
    } catch (error) {
      console.error('Emergency request creation error:', error);
      res.status(500).json({ error: 'Failed to create emergency request' });
    }
  }

  static async getUserRequests(req: Request, res: Response) {
    try {
      const userId = req.user?.id;

      const requests = await prisma.emergencyRequest.findMany({
        where: { userId },
        include: {
          location: true,
        },
        orderBy: { createdAt: 'desc' },
      });

      res.status(200).json(requests);
    } catch (error) {
      console.error('Emergency requests fetch error:', error);
      res.status(500).json({ error: 'Failed to fetch emergency requests' });
    }
  }

  static async cancelRequest(req: Request, res: Response) {
    try {
      const { requestId } = req.params;
      const userId = req.user?.id;

      const request = await prisma.emergencyRequest.findUnique({
        where: { id: requestId },
      });

      if (!request) {
        return res.status(404).json({ error: 'Emergency request not found' });
      }

      if (request.userId !== userId) {
        return res.status(403).json({ error: 'Not authorized to cancel this request' });
      }

      if (['DISPATCHED', 'ARRIVED', 'RESOLVED'].includes(request.status)) {
        return res.status(400).json({ error: 'Cannot cancel a request that is dispatched, arrived, or resolved' });
      }

      const updatedRequest = await prisma.emergencyRequest.update({
        where: { id: requestId },
        data: { status: 'CANCELLED' },
        include: { location: true },
      });

      res.status(200).json(updatedRequest);
    } catch (error) {
      console.error('Emergency request cancellation error:', error);
      res.status(500).json({ error: 'Failed to cancel emergency request' });
    }
  }
}