import { Request, Response } from 'express';
import { validationResult } from 'express-validator';
import { prisma } from '../lib/prisma';

export class RecommendationController {
  static async createRequest(req: Request, res: Response) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const userId = req.user?.id;
      const { locationId, placeType, keywords, maxPrice, minRating, radius } = req.body;

      const location = await prisma.location.findUnique({
        where: { id: locationId },
      });

      if (!location) {
        return res.status(404).json({ error: 'Location not found' });
      }

      const recommendationRequest = await prisma.recommendationRequest.create({
        data: {
          userId,
          locationId,
          placeType,
          keywords,
          maxPrice,
          minRating,
          radius,
        },
        include: {
          location: true,
        },
      });

      // In a real implementation, integrate with a places API (e.g., Google Places) here
      // For now, return the request; actual place recommendations would be added separately
      res.status(201).json(recommendationRequest);
    } catch (error) {
      console.error('Recommendation request creation error:', error);
      res.status(500).json({ error: 'Failed to create recommendation request' });
    }
  }

  static async getUserRequests(req: Request, res: Response) {
    try {
      const userId = req.user?.id;

      const requests = await prisma.recommendationRequest.findMany({
        where: { userId },
        include: {
          location: true,
          recommendedPlaces: true,
        },
        orderBy: { createdAt: 'desc' },
      });

      res.status(200).json(requests);
    } catch (error) {
      console.error('Recommendation requests fetch error:', error);
      res.status(500).json({ error: 'Failed to fetch recommendation requests' });
    }
  }

  static async getRecommendedPlaces(req: Request, res: Response) {
    try {
      const { requestId } = req.params;
      const userId = req.user?.id;

      const request = await prisma.recommendationRequest.findUnique({
        where: { id: requestId },
        include: { recommendedPlaces: true },
      });

      if (!request) {
        return res.status(404).json({ error: 'Recommendation request not found' });
      }

      if (request.userId !== userId) {
        return res.status(403).json({ error: 'Not authorized to view this request' });
      }

      res.status(200).json(request.recommendedPlaces);
    } catch (error) {
      console.error('Recommended places fetch error:', error);
      res.status(500).json({ error: 'Failed to fetch recommended places' });
    }
  }
}