require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const connectDB = require('./config/db');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const { startCronJobs } = require('./utils/cronJobs');

const app = express();
const server = http.createServer(app);

// Parse allowed origins from environment variable
const getAllowedOrigins = () => {
  const origins = process.env.ALLOWED_ORIGINS;
  if (origins) {
    return origins.split(',').map(origin => origin.trim());
  }
  // Default origins if not specified
  return [
    'https://cbt-admin-f.vercel.app', // Replace with your actual Vercel domain
    'cbt-admin-3jzpolk6t-mcdi.vercel.app', // Example domain
    'http://localhost:3000',
    'http://localhost:9002',
    'http://10.0.2.2:3000', // Android emulator
    'http://localhost:3000', // iOS simulator
    '*' // Allow all origins for mobile apps (you can restrict this later)
  ];
};

const allowedOrigins = getAllowedOrigins();

// CORS configuration for production
const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    // Allow all origins for now (you can restrict this later)
    if (allowedOrigins.includes('*') || allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      console.log('CORS blocked origin:', origin);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-auth-token']
};

const io = new Server(server, {
  cors: {
    origin: function (origin, callback) {
      // Allow requests with no origin (like mobile apps or curl requests)
      if (!origin) return callback(null, true);
      
      // Allow all origins for now (you can restrict this later)
      if (allowedOrigins.includes('*') || allowedOrigins.indexOf(origin) !== -1) {
        callback(null, true);
      } else {
        console.log('Socket.io CORS blocked origin:', origin);
        callback(new Error('Not allowed by CORS'));
      }
    },
    methods: ['GET', 'POST'],
    credentials: true
  },
});

// Connect Database
connectDB();

// Init Middleware
app.use(express.json({ extended: false }));
app.use(cookieParser());
app.use(cors(corsOptions));

// Socket.io middleware to attach io to req
app.use((req, res, next) => {
  req.io = io;
  next();
});

// Define Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/users', require('./routes/users'));
app.use('/api/cities', require('./routes/cities'));
app.use('/api/subareas', require('./routes/subAreas'));
app.use('/api/vehicle-categories', require('./routes/vehicleCategories'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api/admin', require('./routes/profile'));
app.use('/api/requests', require('./routes/requests'));
app.use('/api/terms-and-conditions', require('./routes/termsAndConditions'));
app.use('/api/vehicle-status', require('./routes/vehicleStatus'));
app.use('/api/bookings', require('./routes/bookings'));
app.use('/api/app-commission', require('./routes/appCommission'));
app.use('/api/bids', require('./routes/bids'));
app.use('/api/bid-limits', require('./routes/bidLimits'));
app.use('/api/reject-reasons', require('./routes/rejectReasons'));
app.use('/api/deleted-bookings', require('./routes/deletedBookings'));

app.use('/api/push-notifications', require('./routes/pushNotifications'));
app.use('/api/rider-payments', require('./routes/riderPayments'));
app.use('/api/bank-details', require('./routes/bankDetails'));
app.use('/api/user-bank-account', require('./routes/userBankAccount'));
app.use('/api/system-settings', require('./routes/systemSettings'));
app.use('/api/hotel-broker-commission', require('./routes/hotelBrokerCommission'));
app.use('/api/hotel-broker-payments', require('./routes/hotelBrokerPayments'));
app.use('/health', require('./routes/health'));

io.on('connection', (socket) => {
  console.log('🔌 New client connected:', socket.id);

  // Handle new user registration notifications
  socket.on('newUserRegistration', (data) => {
    console.log('📱 New user registration notification:', data);
    // Broadcast to admin dashboard
    io.to('admin').emit('newUserRegistration', data);
  });

  // Handle admin joining
  socket.on('joinAdmin', () => {
    socket.join('admin');
    console.log('👑 Admin joined:', socket.id);
  });

  // Handle room joining for push notifications
  socket.on('joinRoom', (roomName) => {
    socket.join(roomName);
    console.log(`📱 Client ${socket.id} joined room: ${roomName}`);
  });

  // Handle user authentication and offline notification delivery
  socket.on('authenticateUser', async (data) => {
    try {
      const { userId, userRole } = data;
      
      if (userId) {
        // Join user-specific room
        socket.join(`user_${userId}`);
        socket.join(`role_${userRole}`);
        socket.join('mobile_app');
        
        console.log(`📱 User ${userId} (${userRole}) authenticated and joined rooms`);
        
        // Deliver offline notifications
        const PushNotificationService = require('./services/pushNotificationService');
        const pushNotificationService = new PushNotificationService(io);
        
        const deliveryResult = await pushNotificationService.deliverOfflineNotifications(userId);
        console.log(`📱 Offline notification delivery result for user ${userId}:`, deliveryResult);
        
        // Send delivery result to client
        socket.emit('offlineNotificationsDelivered', deliveryResult);
      }
    } catch (error) {
      console.error('❌ Error handling user authentication:', error);
    }
  });

  // Handle notification acknowledgment
  socket.on('notificationAcknowledged', (data) => {
    console.log('📱 Notification acknowledged:', data);
  });

  // Handle client disconnection
  socket.on('disconnect', () => {
    console.log('🔌 Client disconnected:', socket.id);
  });
});

const PORT = process.env.PORT || 3000;

server.listen(PORT, () => {
  console.log(`Server started on port ${PORT}`);
  console.log('Allowed CORS origins:', allowedOrigins);
  // Start cron jobs after server starts
  startCronJobs();
});
