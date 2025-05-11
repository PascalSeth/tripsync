import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';

export class UserController {
  static async getProfile(req: Request, res: Response) {
    try {
      const userId = req.user?.id;

      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          phone: true,
          profileImage: true,
          address: true,
          dateOfBirth: true,
          gender: true,
          isDriver: true,
          createdAt: true,
        },
      });

      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      res.status(200).json(user);
    } catch (error) {
      console.error('Profile fetch error:', error);
      res.status(500).json({ error: 'Failed to fetch user profile' });
    }
  }

  static async updateProfile(req: Request, res: Response) {
    try {
      const userId = req.user?.id;
      const { firstName, lastName, phone, address, dateOfBirth, gender, emergencyContact } = req.body;

      const updatedUser = await prisma.user.update({
        where: { id: userId },
        data: {
          firstName,
          lastName,
          phone,
          address,
          dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : undefined,
          gender,
          emergencyContact,
        },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          phone: true,
          profileImage: true,
          address: true,
          dateOfBirth: true,
          gender: true,
          emergencyContact: true,
          isDriver: true,
          createdAt: true,
        },
      });

      res.status(200).json(updatedUser);
    } catch (error) {
      console.error('Profile update error:', error);
      res.status(500).json({ error: 'Failed to update user profile' });
    }
  }

  static async getFavorites(req: Request, res: Response) {
    try {
      const userId = req.user?.id;

      const favorites = await prisma.favoriteLocation.findMany({
        where: { userId },
        include: {
          location: true,
        },
      });

      res.status(200).json(favorites);
    } catch (error) {
      console.error('Favorites fetch error:', error);
      res.status(500).json({ error: 'Failed to fetch favorite locations' });
    }
  }

  static async addFavorite(req: Request, res: Response) {
    try {
      const userId = req.user?.id;
      const { label, locationId, isDefault } = req.body;

      const location = await prisma.location.findUnique({
        where: { id: locationId },
      });

      if (!location) {
        return res.status(404).json({ error: 'Location not found' });
      }

      const favorite = await prisma.favoriteLocation.create({
        data: {
          userId,
          locationId,
          label,
          isDefault: isDefault || false,
        },
        include: {
          location: true,
        },
      });

      res.status(201).json(favorite);
    } catch (error) {
      console.error('Add favorite error:', error);
      res.status(500).json({ error: 'Failed to add favorite location' });
    }
  }
}