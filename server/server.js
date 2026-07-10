import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import connectDB from './config/db.js';
import http from 'http';
import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';

// Register Mongoose models
import './models/User.js';
import './models/Ticket.js';
import './models/TicketResponse.js';
import './models/CannedResponse.js';
import './models/KnowledgeBaseArticle.js';
import './models/SLARecord.js';
import './models/Invoice.js';
import './models/ChatMessage.js';

// Load environment variables
dotenv.config();

// Connect to Database
connectDB();


const app = express();

// Configure CORS
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:5173',
  credentials: true
}));

// Body parsing middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Cookie parser middleware
app.use(cookieParser());

import authRoutes from './routes/authRoutes.js';
import ticketRoutes from './routes/ticketRoutes.js';
import kbRoutes from './routes/kbRoutes.js';
import cannedRoutes from './routes/cannedRoutes.js';
import analyticsRoutes from './routes/analyticsRoutes.js';
import billingRoutes from './routes/billingRoutes.js';

// Health check route
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Auth API routes
app.use('/api/auth', authRoutes);

// Ticket & KB API routes
app.use('/api/tickets', ticketRoutes);
app.use('/api/kb', kbRoutes);
app.use('/api/canned', cannedRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/billing', billingRoutes);




// Wrap app in HTTP server for socket.io
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL || 'http://localhost:5173',
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    credentials: true
  }
});

// Global io binding
global.io = io;

const parseCookies = (cookieStr) => {
  if (!cookieStr) return {};
  return cookieStr.split(';').reduce((acc, cookie) => {
    const [key, value] = cookie.trim().split('=');
    acc[key] = value;
    return acc;
  }, {});
};

// Socket.IO Auth Middleware
io.use((socket, next) => {
  try {
    let token = socket.handshake.auth?.token;
    if (!token && socket.handshake.headers.cookie) {
      const cookies = parseCookies(socket.handshake.headers.cookie);
      token = cookies.token;
    }

    if (!token) {
      return next(new Error('Authentication error: Token not provided'));
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback_secret_key_12345');
    socket.user = decoded;
    next();
  } catch (err) {
    return next(new Error('Authentication error: Invalid signature'));
  }
});

io.on('connection', (socket) => {
  console.log(`Socket Connected: ${socket.id} (User: ${socket.user.id}, Role: ${socket.user.role})`);

  if (['agent', 'admin'].includes(socket.user.role)) {
    socket.join('agents');
  }

  socket.on('join_ticket', (ticketId) => {
    socket.join(`ticket_${ticketId}`);
  });

  socket.on('leave_ticket', (ticketId) => {
    socket.leave(`ticket_${ticketId}`);
  });

  socket.on('typing', ({ ticketId, userName }) => {
    socket.to(`ticket_${ticketId}`).emit('user_typing', { userName });
  });

  socket.on('stop_typing', ({ ticketId }) => {
    socket.to(`ticket_${ticketId}`).emit('user_stop_typing');
  });

  socket.on('disconnect', () => {
    console.log(`Socket Disconnected: ${socket.id}`);
  });
});

import { startSLACheckJob } from './jobs/slaCheck.js';

// Start the server
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server is running in development mode on port ${PORT}`);

  // Start SLA escalation check job (every 60 seconds for demo)
  startSLACheckJob(60000);
});

export default app;

