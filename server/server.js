import 'dotenv/config';
import express from 'express';
import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import cors from 'cors';
import swaggerUi from 'swagger-ui-express';
import { connectDB } from './config/db.js';
import { requestLogger } from './middleware/logger.js';
import { errorHandler } from './middleware/errorHandler.js';
import { authLimiter, apiLimiter } from './middleware/rateLimiter.js';
import { swaggerSpec } from './config/swagger.js';
import ChatMessage from './models/ChatMessage.js';

import authRoutes from './routes/authRoutes.js';
import jobRoutes from './routes/jobRoutes.js';
import applicationRoutes from './routes/applicationRoutes.js';
import adminRoutes from './routes/adminRoutes.js';
import aiRoutes from './routes/aiRoutes.js';
import chatRoutes from './routes/chatRoutes.js';
import profileRoutes from './routes/profileRoutes.js';
import interviewRoutes from './routes/interviewRoutes.js';

const app  = express();
app.set('trust proxy', 1);
const httpServer = createServer(app);
const PORT = process.env.PORT || 5000;

// Dynamic CORS options to support testing on phones (local IP) and sharing (tunnels) in development
const allowedOrigins = process.env.CLIENT_URL
  ? process.env.CLIENT_URL.split(',')
  : ['http://localhost:5173', 'http://127.0.0.1:5173'];

const corsOptions = {
  origin: (origin, callback) => {
    if (!process.env.CLIENT_URL || !origin || allowedOrigins.includes(origin) || origin.startsWith('http://192.168.') || origin.includes('localhost') || origin.endsWith('.ngrok-free.app') || origin.endsWith('.localtunnel.me') || origin.endsWith('.trycloudflare.com')) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
};

// ── Socket.io setup ───────────────────────────────────────────────────────────
const io = new SocketIOServer(httpServer, {
  cors: {
    ...corsOptions,
    methods: ['GET', 'POST'],
  },
});

io.on('connection', (socket) => {
  // Join a chat room (roomId = applicationId)
  socket.on('join-room', (roomId) => {
    socket.join(roomId);
    console.log(`[Socket] ${socket.id} joined room: ${roomId}`);
  });

  // Receive a message, save to DB, broadcast to room
  socket.on('send-message', async (data) => {
    try {
      const { roomId, senderId, senderName, senderRole, text } = data;
      if (!roomId || !text?.trim()) return;

      const msg = await ChatMessage.create({
        roomId,
        senderId,
        senderName,
        senderRole,
        text: text.trim(),
      });

      // Broadcast to everyone in the room (including sender)
      io.to(roomId).emit('receive-message', {
        _id:        msg._id,
        roomId:     msg.roomId,
        senderId:   msg.senderId,
        senderName: msg.senderName,
        senderRole: msg.senderRole,
        text:       msg.text,
        createdAt:  msg.createdAt,
      });
    } catch (err) {
      console.error('[Socket] Error saving message:', err.message);
    }
  });

  socket.on('disconnect', () => {
    console.log(`[Socket] ${socket.id} disconnected`);
  });
});

// ── Core middleware ───────────────────────────────────────────────────────────
app.use(cors(corsOptions));
app.use(express.json());
app.use(requestLogger);

// ── Swagger API Docs ──────────────────────────────────────────────────────────
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
  customSiteTitle: 'HireHub API Docs',
  swaggerOptions: { persistAuthorization: true },
}));

// ── REST Routes ───────────────────────────────────────────────────────────────
app.use('/api/auth',         authLimiter, authRoutes);
app.use('/api/jobs',         apiLimiter,  jobRoutes);
app.use('/api/applications', apiLimiter,  applicationRoutes);
app.use('/api/admin',        apiLimiter,  adminRoutes);
app.use('/api/ai',           apiLimiter,  aiRoutes);
app.use('/api/chat',         apiLimiter,  chatRoutes);
app.use('/api/profile',      apiLimiter,  profileRoutes);
app.use('/api/interview',    apiLimiter,  interviewRoutes);

// ── Health check ──────────────────────────────────────────────────────────────
app.get('/api/health', (_req, res) => res.json({ ok: true, socket: 'enabled' }));

// ── 404 + Error handler ───────────────────────────────────────────────────────
app.use((_req, res) => res.status(404).json({ message: 'Route not found' }));
app.use(errorHandler);

// ── Start ─────────────────────────────────────────────────────────────────────
await connectDB();

httpServer.listen(PORT, () => {
  console.log(`HireHub API listening on port ${PORT}`);
  console.log(`Socket.io real-time chat: ENABLED`);
});
