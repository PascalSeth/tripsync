import { Request, Response } from 'express';
import { validationResult } from 'express-validator';
import { prisma } from '../lib/prisma';

export class HouseMoveController {
  static async createRequest(req: Request, res: Response) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const userId = req.user?.id;
      const { originLocationId, destinationLocationId, scheduledDate, timeSlot, estimatedVolume, specialInstructions, numberOfMovers, vehicleSize, inventory } = req.body;

      const [originLocation, destinationLocation] = await Promise.all([
        prisma.location.findUnique({ where: { id: originLocationId } }),
        prisma.location.findUnique({ where: { id: destinationLocationId } }),
      ]);

      if (!originLocation || !destinationLocation) {
        return res.status(404).json({ error: 'Invalid origin or destination location' });
      }

      // Calculate estimated price (example logic)
      const estimatedPrice = estimatedVolume ? estimatedVolume * 50 + numberOfMovers * 100 : 200;

      const houseMoveRequest = await prisma.houseMoveRequest.create({
        data: {
          userId,
          originLocationId,
          destinationLocationId,
          scheduledDate: new Date(scheduledDate),
          timeSlot,
          status: 'SCHEDULED',
          estimatedVolume,
          specialInstructions,
          numberOfMovers,
          estimatedPrice,
          vehicleSize,
          inventory: {
            create: inventory?.map((item: any) => ({
              name: item.name,
              category: item.category,
              quantity: item.quantity,
              specialHandling: item.specialHandling,
              specialInstructions: item.specialInstructions,
            })),
          },
        },
        include: {
          originLocation: true,
          destinationLocation: true,
          inventory: true,
        },
      });

      res.status(201).json(houseMoveRequest);
    } catch (error) {
      console.error('House move request creation error:', error);
      res.status(500).json({ error: 'Failed to create house move request' });
    }
  }

  static async getUserRequests(req: Request, res: Response) {
    try {
      const userId = req.user?.id;

      const requests = await prisma.houseMoveRequest.findMany({
        where: { userId },
        include: {
          originLocation: true,
          destinationLocation: true,
          inventory: true,
          movingCompany: true,
        },
        orderBy: { createdAt: 'desc' },
      });

      res.status(200).json(requests);
    } catch (error) {
      console.error('House move requests fetch error:', error);
      res.status(500).json({ error: 'Failed to fetch house move requests' });
    }
  }

  static async cancelRequest(req: Request, res: Response) {
    try {
      const { requestId } = req.params;
      const userId = req.user?.id;

      const request = await prisma.houseMoveRequest.findUnique({
        where: { id: requestId },
      });

      if (!request) {
        return res.status(404).json({ error: 'House move request not found' });
      }

      if (request.userId !== userId) {
        return res.status(403).json({ error: 'Not authorized to cancel this request' });
      }

      if (['IN_PROGRESS', 'LOADING', 'IN_TRANSIT', 'UNLOADING', 'COMPLETED'].includes(request.status)) {
        return res.status(400).json({ error: 'Cannot cancel a request that is in progress or completed' });
      }

      const updatedRequest = await prisma.houseMoveRequest.update({
        where: { id: requestId },
        data: { status: 'CANCELLED' },
        include: {
          originLocation: true,
          destinationLocation: true,
          inventory: true,
        },
      });

      res.status(200).json(updatedRequest);
    } catch (error) {
      console.error('House move request cancellation error:', error);
      res.status(500).json({ error: 'Failed to cancel house move request' });
    }
  }
}