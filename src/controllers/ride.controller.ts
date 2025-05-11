import { Request, Response } from 'express';
import { validationResult } from 'express-validator';
import { prisma } from '../lib/prisma';

export class RideController {
  static async getRideTypes(req: Request, res: Response) {
    try {
      const rideTypes = await prisma.rideType.findMany({
        where: { isActive: true },
      });

      res.status(200).json(rideTypes);
    } catch (error) {
      console.error('Ride types fetch error:', error);
      res.status(500).json({ error: 'Failed to fetch ride types' });
    }
  }

  static async requestRide(req: Request, res: Response) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const userId = req.user?.id;
      const {
        rideTypeId,
        pickupLocationId,
        dropoffLocationId,
        pickupTime,
        estimatedDistance,
        estimatedDuration,
        estimatedPrice,
        isSharingEnabled,
        maxSharedRiders,
        notes,
      } = req.body;

      const rideRequest = await prisma.rideRequest.create({
        data: {
          userId,
          rideTypeId,
          pickupLocationId,
          dropoffLocationId,
          pickupTime: new Date(pickupTime),
          estimatedDistance,
          estimatedDuration,
          estimatedPrice,
          isSharingEnabled: isSharingEnabled || false,
          maxSharedRiders: maxSharedRiders || 1,
          notes,
          status: 'REQUESTED',
        },
        include: {
          rideType: true,
          pickupLocation: true,
          dropoffLocation: true,
        },
      });

      if (isSharingEnabled) {
        const route = await prisma.route.create({
          data: {
            startLocationId: pickupLocationId,
            endLocationId: dropoffLocationId,
            distance: estimatedDistance,
            estimatedTime: estimatedDuration,
            polyline: '',
          },
        });

        const sharedRideGroup = await prisma.sharedRideGroup.create({
          data: {
            routeId: route.id,
            maxCapacity: maxSharedRiders,
            currentCapacity: 1,
            status: 'SEARCHING_DRIVER',
            rideRequests: {
              connect: { id: rideRequest.id },
            },
          },
        });

        await prisma.rideRequest.update({
          where: { id: rideRequest.id },
          data: {
            sharedRideGroupId: sharedRideGroup.id,
          },
        });
      }

      res.status(201).json(rideRequest);
    } catch (error) {
      console.error('Ride request error:', error);
      res.status(500).json({ error: 'Failed to create ride request' });
    }
  }

  static async getRideHistory(req: Request, res: Response) {
    try {
      const userId = req.user?.id;

      const rides = await prisma.rideRequest.findMany({
        where: { userId },
        include: {
          rideType: true,
          pickupLocation: true,
          dropoffLocation: true,
          driver: true,
          review: true,
        },
        orderBy: { createdAt: 'desc' },
      });

      res.status(200).json(rides);
    } catch (error) {
      console.error('Ride history fetch error:', error);
      res.status(500).json({ error: 'Failed to fetch ride history' });
    }
  }

  static async getRideDetails(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const userId = req.user?.id;

      const ride = await prisma.rideRequest.findUnique({
        where: { id },
        include: {
          rideType: true,
          pickupLocation: true,
          dropoffLocation: true,
          driver: {
            include: {
              user: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                  phone: true,
                  profileImage: true,
                },
              },
              vehicle: true,
            },
          },
          payment: true,
          review: true,
          sharedRideGroup: {
            include: {
              rideRequests: {
                select: {
                  id: true,
                  user: {
                    select: {
                      firstName: true,
                      lastName: true,
                      profileImage: true,
                    },
                  },
                },
              },
            },
          },
        },
      });

      if (!ride) {
        return res.status(404).json({ error: 'Ride not found' });
      }

      if (ride.userId !== userId) {
        return res.status(403).json({ error: 'Not authorized to view this ride' });
      }

      res.status(200).json(ride);
    } catch (error) {
      console.error('Ride details fetch error:', error);
      res.status(500).json({ error: 'Failed to fetch ride details' });
    }
  }

  static async cancelRide(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const userId = req.user?.id;

      const ride = await prisma.rideRequest.findUnique({
        where: { id },
      });

      if (!ride) {
        return res.status(404).json({ error: 'Ride not found' });
      }

      if (ride.userId !== userId) {
        return res.status(403).json({ error: 'Not authorized to cancel this ride' });
      }

      if (['IN_PROGRESS', 'COMPLETED'].includes(ride.status)) {
        return res.status(400).json({ error: 'Cannot cancel a ride that is in progress or completed' });
      }

      const updatedRide = await prisma.rideRequest.update({
        where: { id },
        data: { status: 'CANCELLED' },
        include: {
          rideType: true,
          pickupLocation: true,
          dropoffLocation: true,
        },
      });

      if (ride.sharedRideGroupId) {
        await prisma.sharedRideGroup.update({
          where: { id: ride.sharedRideGroupId },
          data: {
            currentCapacity: {
              decrement: 1,
            },
          },
        });
      }

      res.status(200).json(updatedRide);
    } catch (error) {
      console.error('Ride cancellation error:', error);
      res.status(500).json({ error: 'Failed to cancel ride' });
    }
  }
}