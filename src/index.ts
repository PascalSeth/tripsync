import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import { userRoutes } from './routes/user.routes';
import { authRoutes } from './routes/auth.routes';
import { rideRoutes } from './routes/ride.routes';
import { driverRoutes } from './routes/driver.routes';
import { storeRoutes } from './routes/store.routes';
import { emergencyRoutes } from './routes/emergency.routes';
import { recommendationRoutes } from './routes/recommendation.routes';
import { houseMoveRoutes } from './routes/houseMove.routes';
import { paymentRoutes } from './routes/payment.routes';
import { initializeSocket } from './websocket';

// Load environment variables
dotenv.config();

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*', // In production, restrict to your frontend domain
    methods: ['GET', 'POST'],
  },
});

const PORT = process.env.PORT || 3000;

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());

// Make io available to controllers
app.set('io', io);

// Initialize Socket.IO
initializeSocket(io);

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/rides', rideRoutes);
app.use('/api/drivers', driverRoutes);
app.use('/api/stores', storeRoutes);
app.use('/api/emergency', emergencyRoutes);
app.use('/api/recommendations', recommendationRoutes);
app.use('/api/house-moves', houseMoveRoutes);
app.use('/api/payments', paymentRoutes);

// Health check route
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Start server
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});