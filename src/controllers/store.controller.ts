import { Request, Response } from 'express';
import { validationResult } from 'express-validator';
import { prisma } from '../lib/prisma';

export class StoreController {
  static async getStores(req: Request, res: Response) {
    try {
      const { type, city } = req.query;

      const stores = await prisma.store.findMany({
        where: {
        //   type: type ? { equals: type as string } : undefined,
          location: city ? { city: { equals: city as string } } : undefined,
          isActive: true,
        },
        include: {
          location: true,
        },
      });

      res.status(200).json(stores);
    } catch (error) {
      console.error('Stores fetch error:', error);
      res.status(500).json({ error: 'Failed to fetch stores' });
    }
  }

  static async getStoreProducts(req: Request, res: Response) {
    try {
      const { storeId } = req.params;

      const products = await prisma.product.findMany({
        where: {
          storeId,
          inStock: true,
        },
      });

      res.status(200).json(products);
    } catch (error) {
      console.error('Products fetch error:', error);
      res.status(500).json({ error: 'Failed to fetch store products' });
    }
  }

  static async createOrder(req: Request, res: Response) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const userId = req.user?.id;
      const { storeId, deliveryLocationId, items, deliveryNotes } = req.body;

      // Validate store
      const store = await prisma.store.findUnique({
        where: { id: storeId },
      });
      if (!store) {
        return res.status(404).json({ error: 'Store not found' });
      }

      // Validate location
      const location = await prisma.location.findUnique({
        where: { id: deliveryLocationId },
      });
      if (!location) {
        return res.status(404).json({ error: 'Delivery location not found' });
      }

      // Calculate total amount
      let totalAmount = 0;
      const orderItems = [];

      for (const item of items) {
        const product = await prisma.product.findUnique({
          where: { id: item.productId },
        });
        if (!product || !product.inStock) {
          return res.status(400).json({ error: `Product ${item.productId} not available` });
        }
        totalAmount += product.price * item.quantity;
        orderItems.push({
          productId: item.productId,
          quantity: item.quantity,
          unitPrice: product.price,
          specialRequest: item.specialRequest,
        });
      }

      // Add delivery fee (example logic)
      const deliveryFee = 5.0;
      totalAmount += deliveryFee;

      const order = await prisma.storeOrder.create({
        data: {
          userId,
          storeId,
          deliveryLocationId,
          status: 'PLACED',
          totalAmount,
          deliveryFee,
          deliveryNotes,
          orderItems: {
            create: orderItems,
          },
        },
        include: {
          store: true,
          deliveryLocation: true,
          orderItems: {
            include: { product: true },
          },
        },
      });

      res.status(201).json(order);
    } catch (error) {
      console.error('Order creation error:', error);
      res.status(500).json({ error: 'Failed to create order' });
    }
  }

  static async getUserOrders(req: Request, res: Response) {
    try {
      const userId = req.user?.id;

      const orders = await prisma.storeOrder.findMany({
        where: { userId },
        include: {
          store: true,
          deliveryLocation: true,
          orderItems: {
            include: { product: true },
          },
          driver: {
            include: {
              user: {
                select: {
                  firstName: true,
                  lastName: true,
                  phone: true,
                },
              },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      });

      res.status(200).json(orders);
    } catch (error) {
      console.error('Orders fetch error:', error);
      res.status(500).json({ error: 'Failed to fetch user orders' });
    }
  }

  static async cancelOrder(req: Request, res: Response) {
    try {
      const { orderId } = req.params;
      const userId = req.user?.id;

      const order = await prisma.storeOrder.findUnique({
        where: { id: orderId },
      });

      if (!order) {
        return res.status(404).json({ error: 'Order not found' });
      }

      if (order.userId !== userId) {
        return res.status(403).json({ error: 'Not authorized to cancel this order' });
      }

      if (['OUT_FOR_DELIVERY', 'DELIVERED'].includes(order.status)) {
        return res.status(400).json({ error: 'Cannot cancel an order that is out for delivery or delivered' });
      }

      const updatedOrder = await prisma.storeOrder.update({
        where: { id: orderId },
        data: { status: 'CANCELLED' },
        include: {
          store: true,
          deliveryLocation: true,
          orderItems: {
            include: { product: true },
          },
        },
      });

      res.status(200).json(updatedOrder);
    } catch (error) {
      console.error('Order cancellation error:', error);
      res.status(500).json({ error: 'Failed to cancel order' });
    }
  }
}