import { Server, Socket } from 'socket.io';
import { prisma } from '../lib/prisma';
import { verifyToken } from '../utils/jwt';

export function initializeSocket(io: Server) {
  io.on('connection', (socket: Socket) => {
    console.log('New client connected:', socket.id);

    socket.on('authenticate', (token) => {
      const user = verifyToken(token);
      if (user && user.id) {
        socket.join(`user:${user.id}`);
        console.log(`User ${user.id} authenticated`);
      }
    });

    socket.on('driver:location', async (data) => {
      try {
        await prisma.driverProfile.update({
          where: { id: data.driverId },
          data: {
            currentLocationId: data.locationId,
          },
        });

        if (data.rideId) {
          const ride = await prisma.rideRequest.findUnique({
            where: { id: data.rideId },
            select: { userId: true, sharedRideGroupId: true },
          });

          if (ride) {
            io.to(`user:${ride.userId}`).emit('ride:driverLocation', {
              rideId: data.rideId,
              driverId: data.driverId,
              location: data.location,
            });

            if (ride.sharedRideGroupId) {
              const sharedRide = await prisma.sharedRideGroup.findUnique({
                where: { id: ride.sharedRideGroupId },
                include: {
                  rideRequests: {
                    select: { userId: true },
                  },
                },
              });

              if (sharedRide) {
                sharedRide.rideRequests.forEach((request:any) => {
                  if (request.userId !== ride.userId) {
                    io.to(`user:${request.userId}`).emit('ride:driverLocation', {
                      rideId: data.rideId,
                      driverId: data.driverId,
                      location: data.location,
                    });
                  }
                });
              }
            }
          }
        }
      } catch (error) {
        console.error('Error handling driver location update:', error);
      }
    });

    socket.on('ride:status', async (data) => {
      try {
        const updatedRide = await prisma.rideRequest.update({
          where: { id: data.rideId },
          data: { status: data.status },
          select: {
            id: true,
            userId: true,
            driverId: true,
            status: true,
            sharedRideGroupId: true,
          },
        });

        io.to(`user:${updatedRide.userId}`).emit('ride:statusUpdate', {
          rideId: updatedRide.id,
          status: updatedRide.status,
        });

        if (updatedRide.driverId) {
          const driver = await prisma.driverProfile.findUnique({
            where: { id: updatedRide.driverId },
            select: { userId: true },
          });

          if (driver) {
            io.to(`user:${driver.userId}`).emit('ride:statusUpdate', {
              rideId: updatedRide.id,
              status: updatedRide.status,
            });
          }
        }
      } catch (error) {
        console.error('Error handling ride status update:', error);
      }
    });

    socket.on('emergency:alert', async (data) => {
      try {
        const emergencyRequest = await prisma.emergencyRequest.create({
          data: {
            userId: data.userId,
            serviceType: data.serviceType,
            locationId: data.locationId,
            description: data.description,
            status: 'REQUESTED',
          },
        });

        io.emit('emergency:new', {
          requestId: emergencyRequest.id,
          userId: data.userId,
          serviceType: data.serviceType,
          location: data.location,
          description: data.description,
        });
      } catch (error) {
        console.error('Error handling emergency alert:', error);
      }
    });

    socket.on('store:orderStatus', async (data) => {
      try {
        const updatedOrder = await prisma.storeOrder.update({
          where: { id: data.orderId },
          data: { status: data.status },
          select: {
            id: true,
            userId: true,
            driverId: true,
            status: true,
          },
        });

        io.to(`user:${updatedOrder.userId}`).emit('store:orderStatusUpdate', {
          orderId: updatedOrder.id,
          status: updatedOrder.status,
        });

        if (updatedOrder.driverId) {
          const driver = await prisma.driverProfile.findUnique({
            where: { id: updatedOrder.driverId },
            select: { userId: true },
          });

          if (driver) {
            io.to(`user:${driver.userId}`).emit('store:orderStatusUpdate', {
              orderId: updatedOrder.id,
              status: updatedOrder.status,
            });
          }
        }
      } catch (error) {
        console.error('Error handling store order status update:', error);
      }
    });

    socket.on('houseMove:status', async (data) => {
      try {
        const updatedMove = await prisma.houseMoveRequest.update({
          where: { id: data.requestId },
          data: { status: data.status },
          select: {
            id: true,
            userId: true,
            status: true,
          },
        });

        io.to(`user:${updatedMove.userId}`).emit('houseMove:statusUpdate', {
          requestId: updatedMove.id,
          status: updatedMove.status,
        });
      } catch (error) {
        console.error('Error handling house move status update:', error);
      }
    });

    socket.on('disconnect', () => {
      console.log('Client disconnected:', socket.id);
    });
  });
}