import { Request, Response } from 'express';
import { validationResult } from 'express-validator';
import { prisma } from '../lib/prisma';

export class DriverController {
  static async getProfile(req: Request, res: Response) {
    try {
      const userId = req.user?.id;

      const driver = await prisma.driverProfile.findUnique({
        where: { userId },
        include: {
          user: {
            select: {
              firstName: true,
              lastName: true,
              email: true,
              phone: true,
              profileImage: true,
            },
          },
          vehicle: true,
          approvedRideTypes: {
            include: { rideType: true },
          },
        },
      });

      if (!driver) {
        return res.status(404).json({ error: 'Driver profile not found' });
      }

      res.status(200).json(driver);
    } catch (error) {
      console.error('Driver profile fetch error:', error);
      res.status(500).json({ error: 'Failed to fetch driver profile' });
    }
  }

  static async createProfile(req: Request, res: Response) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const userId = req.user?.id;
      const { licenseNumber, licenseExpiryDate, vehicleId, insuranceInfo } = req.body;

      const existingProfile = await prisma.driverProfile.findUnique({
        where: { userId },
      });

      if (existingProfile) {
        return res.status(400).json({ error: 'Driver profile already exists' });
      }

      const driver = await prisma.driverProfile.create({
        data: {
          userId,
          licenseNumber,
          licenseExpiryDate: new Date(licenseExpiryDate),
          vehicleId,
          insuranceInfo,
          approvalStatus: 'PENDING',
        },
        include: {
          user: {
            select: {
              firstName: true,
              lastName: true,
              email: true,
              phone: true,
            },
          },
          vehicle: true,
        },
      });

      await prisma.user.update({
        where: { id: userId },
        data: { isDriver: true },
      });

      res.status(201).json(driver);
    } catch (error) {
      console.error('Driver profile creation error:', error);
      res.status(500).json({ error: 'Failed to create driver profile' });
    }
  }

  static async updateProfile(req: Request, res: Response) {
    try {
      const userId = req.user?.id;
      const { licenseNumber, licenseExpiryDate, vehicleId, insuranceInfo, currentStatus } = req.body;

      const driver = await prisma.driverProfile.update({
        where: { userId },
        data: {
          licenseNumber,
          licenseExpiryDate: licenseExpiryDate ? new Date(licenseExpiryDate) : undefined,
          vehicleId,
          insuranceInfo,
          currentStatus,
        },
        include: {
          user: {
            select: {
              firstName: true,
              lastName: true,
              email: true,
              phone: true,
            },
          },
          vehicle: true,
        },
      });

      res.status(200).json(driver);
    } catch (error) {
      console.error('Driver profile update error:', error);
      res.status(500).json({ error: 'Failed to update driver profile' });
    }
  }

  static async addRideType(req: Request, res: Response) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const userId = req.user?.id;
      const { rideTypeId } = req.body;

      const driver = await prisma.driverProfile.findUnique({
        where: { userId },
      });

      if (!driver) {
        return res.status(404).json({ error: 'Driver profile not found' });
      }

      const rideType = await prisma.rideType.findUnique({
        where: { id: rideTypeId },
      });

      if (!rideType) {
        return res.status(404).json({ error: 'Ride type not found' });
      }

      const driverRideType = await prisma.driverRideType.create({
        data: {
          driverProfileId: driver.id,
          rideTypeId,
          isActive: true,
        },
        include: {
          rideType: true,
        },
      });

      res.status(201).json(driverRideType);
    } catch (error) {
      console.error('Add ride type error:', error);
      res.status(500).json({ error: 'Failed to add ride type' });
    }
  }

  static async getAvailableRides(req: Request, res: Response) {
    try {
      const userId = req.user?.id;

      const driver = await prisma.driverProfile.findUnique({
        where: { userId },
        include: { approvedRideTypes: true },
      });

      if (!driver) {
        return res.status(404).json({ error: 'Driver profile not found' });
      }

      const rideTypeIds = driver.approvedRideTypes.map((rt:any) => rt.rideTypeId);

      const rides = await prisma.rideRequest.findMany({
        where: {
          driverId: null,
          status: { in: ['REQUESTED', 'SEARCHING_DRIVER'] },
          rideTypeId: { in: rideTypeIds },
        },
        include: {
          user: {
            select: {
              firstName: true,
              lastName: true,
              phone: true,
            },
          },
          rideType: true,
          pickupLocation: true,
          dropoffLocation: true,
        },
      });

      res.status(200).json(rides);
    } catch (error) {
      console.error('Available rides fetch error:', error);
      res.status(500).json({ error: 'Failed to fetch available rides' });
    }
  }
}