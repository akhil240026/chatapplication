const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const connectDB = require('./config/database');
const Message = require('./models/Message');
const logger = require('./middleware/logger');
const errorHandler = require('./middleware/errorHandler');
const rateLimiter = require('./middleware/rateLimiter');
require('dotenv').config();

// Connect to MongoDB
connectDB();

const app = express();

// Create HTTP server (IMPORTANT: NOT app.listen())
const server = http.createServer(app);

// Configure Socket.IO with CORS for production
const allowedOrigins = process.env.NODE_ENV === 'production' 
  ? [
      'https://chatapplication-jade.vercel.app',
      'https://chatapplication-ud8z.onrender.com',
      process.env.FRONTEND_URL
    ].filter(Boolean)
  : ["http://localhost:3000", "http://127.0.0.1:3000", "http://localhost:5173"];

console.log('CORS Configuration:', {
  NODE_ENV: process.env.NODE_ENV,
  FRONTEND_URL: process.env.FRONTEND_URL,
  allowedOrigins
});

const io = socketIo(server, {
  cors: {
    origin: allowedOrigins,
    methods: ["GET", "POST"],
    credentials: true
  },
  // Production optimizations
  transports: ['websocket', 'polling'],
  pingTimeout: 60000,
  pingInterval: 25000
});

// Middleware
app.use(logger);
app.use(rateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxRequests: 100 // limit each IP to 100 requests per 15 minutes
}));

// CORS middleware with debugging
app.use((req, res, next) => {
  const origin = req.headers.origin;
  console.log(`CORS Request from origin: ${origin}`);
  next();
});

app.use(cors({
  origin: (origin, callback) => {
    console.log(`CORS check for origin: ${origin}`);
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      console.log(`CORS blocked origin: ${origin}`);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json({ limit: '10mb' }));

// Routes
// Make io instance available to routes
app.set('io', io);
app.use('/api/messages', require('./routes/messages'));
app.use('/api/rooms', require('./routes/rooms'));

// Basic route for health check
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'Server is running!', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// 404 handler for unknown routes
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    error: 'Route not found',
    path: req.originalUrl
  });
});

// Error handling middleware (must be last)
app.use(errorHandler);

// Store connected users
const connectedUsers = new Map();

// Socket.IO connection handling with comprehensive logging
io.on('connection', (socket) => {
  console.log(`[SOCKET] User connected: ${socket.id} from ${socket.handshake.address}`);
  
  // Enhanced error handling for socket events
  const handleSocketError = (eventName, error, data = {}) => {
    console.error(`[SOCKET ERROR] ${eventName}:`, {
      socketId: socket.id,
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      data,
      timestamp: new Date().toISOString()
    });
    
    socket.emit('error', {
      event: eventName,
      message: error.message || 'An error occurred',
      timestamp: new Date().toISOString()
    });
  };

  // Handle user joining with enhanced validation
  socket.on('user_join', async (userData) => {
    try {
      // Validate input
      if (!userData || !userData.username) {
        throw new Error('Username is required');
      }
      
      const username = userData.username.trim();
      if (!username || username.length > 50) {
        throw new Error('Username must be 1-50 characters');
      }
      
      const room = (userData.room || 'general').toLowerCase().trim();
      if (room.length > 50) {
        throw new Error('Room name must be less than 50 characters');
      }
      
      // Join the specified room
      await socket.join(room);
      
      connectedUsers.set(socket.id, {
        id: socket.id,
        username: username,
        room: room,
        joinedAt: new Date()
      });
      
      console.log(`[SOCKET] ${username} joined room: ${room}`);
      
      // Broadcast to users in the same room only
      socket.to(room).emit('user_joined', {
        username: username,
        message: `${username} joined the chat`,
        timestamp: new Date(),
        room: room
      });
      
      // Send current online users in this room to the new user
      const roomUsers = Array.from(connectedUsers.values())
        .filter(user => user.room === room);
      socket.emit('online_users', roomUsers);
      
      // Broadcast updated user list to all users in the room
      io.to(room).emit('users_update', roomUsers);
      
    } catch (error) {
      handleSocketError('user_join', error, userData);
    }
  });
  
  // Handle incoming messages with enhanced validation
  socket.on('send_message', async (messageData) => {
    try {
      const user = connectedUsers.get(socket.id);
      
      if (!user) {
        throw new Error('User not found. Please rejoin the chat.');
      }
      
      // Validate message data
      if (!messageData || !messageData.text) {
        throw new Error('Message text is required');
      }
      
      const text = messageData.text.trim();
      if (!text) {
        throw new Error('Message cannot be empty');
      }
      
      if (text.length > 1000) {
        throw new Error('Message too long (max 1000 characters)');
      }
      
      const room = messageData.room || user.room || 'general';
      
      // Create message object
      const messageObj = {
        username: user.username,
        text: text,
        timestamp: new Date(),
        socketId: socket.id,
        room: room
      };
      
      // Save to database with error handling
      const savedMessage = await Message.create(messageObj);
      
      // Create response with database ID
      const message = {
        id: savedMessage._id,
        username: savedMessage.username,
        text: savedMessage.text,
        timestamp: savedMessage.timestamp,
        room: savedMessage.room
      };
      
      console.log(`[SOCKET] Message saved and broadcasting to room: ${room}`, {
        messageId: message.id,
        username: message.username,
        textLength: message.text.length
      });
      
      // Broadcast message to users in the same room only
      io.to(room).emit('receive_message', message);
      
    } catch (error) {
      handleSocketError('send_message', error, messageData);
    }
  });
  
  // Handle typing indicator with error handling
  socket.on('typing_start', () => {
    try {
      const user = connectedUsers.get(socket.id);
      if (user) {
        socket.to(user.room).emit('user_typing', {
          username: user.username,
          isTyping: true
        });
      }
    } catch (error) {
      handleSocketError('typing_start', error);
    }
  });
  
  socket.on('typing_stop', () => {
    try {
      const user = connectedUsers.get(socket.id);
      if (user) {
        socket.to(user.room).emit('user_typing', {
          username: user.username,
          isTyping: false
        });
      }
    } catch (error) {
      handleSocketError('typing_stop', error);
    }
  });
  
  // Handle disconnection with enhanced logging
  socket.on('disconnect', (reason) => {
    try {
      const user = connectedUsers.get(socket.id);
      
      if (user) {
        console.log(`[SOCKET] ${user.username} disconnected from room: ${user.room} (reason: ${reason})`);
        
        // Remove user from connected users
        connectedUsers.delete(socket.id);
        
        // Broadcast to remaining users in the same room
        socket.to(user.room).emit('user_left', {
          username: user.username,
          message: `${user.username} left the chat`,
          timestamp: new Date(),
          room: user.room
        });
        
        // Send updated user list to room
        const roomUsers = Array.from(connectedUsers.values())
          .filter(u => u.room === user.room);
        socket.to(user.room).emit('users_update', roomUsers);
      } else {
        console.log(`[SOCKET] Unknown user disconnected: ${socket.id} (reason: ${reason})`);
      }
    } catch (error) {
      console.error(`[SOCKET ERROR] disconnect:`, {
        socketId: socket.id,
        error: error.message,
        reason
      });
    }
  });

  // Handle socket errors
  socket.on('error', (error) => {
    console.error(`[SOCKET ERROR] Socket error for ${socket.id}:`, error);
  });
});

const PORT = process.env.PORT || 5000;

// Use server.listen() NOT app.listen()
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Frontend URL: ${process.env.FRONTEND_URL}`);
});