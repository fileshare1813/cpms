const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
require('dotenv').config();

// Import routes
const authRoutes = require('./routes/auth');
const clientRoutes = require('./routes/clients');
const employeeRoutes = require('./routes/employees');
const projectRoutes = require('./routes/projects');
const paymentRoutes = require('./routes/payments');
const messageRoutes = require('./routes/messages'); // ADDED MESSAGE ROUTES

const app = express();
const PORT = process.env.PORT || 5000;

// Enhanced CORS configuration
app.use(cors({
  origin: ['http://localhost:3000', 'http://127.0.0.1:3000'],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-requested-with'],
  credentials: true
}));

// Handle preflight requests
app.options('*', cors());

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request logging middleware
app.use((req, res, next) => {
  console.log(`📨 ${req.method} ${req.originalUrl} - ${new Date().toISOString()}`);
  next();
});

// MongoDB Connection
const connectDB = async () => {
  try {
    console.log('🔄 Connecting to MongoDB...');
    console.log('📍 MongoDB URI:', process.env.MONGODB_URI ? 'URI Found' : 'URI Missing');
    
    const conn = await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS: 45000,
    });

    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
    console.log(`📊 Database Name: ${conn.connection.name}`);
    
    // Test the connection
    await mongoose.connection.db.admin().ping();
    console.log('🏓 MongoDB Ping: Success');
    
  } catch (error) {
    console.error('❌ MongoDB Connection Error:', error.message);
    process.exit(1);
  }
};

// Connect to database
connectDB();

// MongoDB connection events
mongoose.connection.on('connected', () => {
  console.log('🟢 Mongoose connected to MongoDB');
});

mongoose.connection.on('error', (err) => {
  console.error('🔴 Mongoose connection error:', err);
});

mongoose.connection.on('disconnected', () => {
  console.log('🟡 Mongoose disconnected from MongoDB');
});

// Routes with enhanced logging
app.use('/api/auth', (req, res, next) => {
  console.log('🔐 Auth route accessed:', req.method, req.originalUrl);
  next();
}, authRoutes);

app.use('/api/clients', (req, res, next) => {
  console.log('👥 Clients route accessed:', req.method, req.originalUrl);
  next();
}, clientRoutes);

app.use('/api/employees', (req, res, next) => {
  console.log('👔 Employees route accessed:', req.method, req.originalUrl);
  next();
}, employeeRoutes);

app.use('/api/projects', (req, res, next) => {
  console.log('📋 Projects route accessed:', req.method, req.originalUrl);
  next();
}, projectRoutes);

app.use('/api/payments', (req, res, next) => {
  console.log('💳 Payments route accessed:', req.method, req.originalUrl);
  next();
}, paymentRoutes);

// FIXED: Message routes properly added
app.use('/api/messages', (req, res, next) => {
  console.log('💌 Messages route accessed:', req.method, req.originalUrl);
  next();
}, messageRoutes);

// Test routes
app.get('/', (req, res) => {
  res.json({ 
    message: 'Client & Project Management System API',
    status: 'Server Running',
    database: mongoose.connection.readyState === 1 ? 'Connected' : 'Disconnected',
    timestamp: new Date().toISOString(),
    availableRoutes: [
      'GET /api/health',
      'POST /api/auth/*',
      'GET /api/clients/*',
      'GET /api/employees/*',
      'GET /api/projects/*',
      'GET /api/payments/*',
      'GET /api/messages/*' // ADDED
    ]
  });
});

// Health check route
app.get('/api/health', async (req, res) => {
  try {
    await mongoose.connection.db.admin().ping();
    
    res.json({
      status: 'OK',
      database: 'Connected',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      routes: {
        auth: '/api/auth/*',
        clients: '/api/clients/*',
        employees: '/api/employees/*',
        projects: '/api/projects/*',
        payments: '/api/payments/*',
        messages: '/api/messages/*' // ADDED
      }
    });
  } catch (error) {
    res.status(500).json({
      status: 'Error',
      database: 'Disconnected',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// 404 handler
app.use('*', (req, res) => {
  console.log('❌ 404 - Route not found:', req.method, req.originalUrl);
  res.status(404).json({
    success: false,
    message: 'Route not found',
    requestedRoute: `${req.method} ${req.originalUrl}`,
    availableRoutes: [
      'POST /api/auth/admin/login',
      'POST /api/auth/employee/login',
      'POST /api/auth/client/login',
      'GET /api/employees',
      'POST /api/employees',
      'GET /api/clients',
      'POST /api/clients',
      'GET /api/projects',
      'GET /api/payments',
      'GET /api/messages', // ADDED
      'POST /api/messages' // ADDED
    ]
  });
});

// Global error handler
app.use((error, req, res, next) => {
  console.error('🚨 Global Error:', error);
  res.status(500).json({
    success: false,
    message: 'Internal Server Error',
    error: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong',
    timestamp: new Date().toISOString()
  });
});

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n🛑 Shutting down gracefully...');
  await mongoose.connection.close();
  console.log('📊 MongoDB connection closed');
  process.exit(0);
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`🌐 API URL: http://localhost:${PORT}`);
  console.log(`📊 Health Check: http://localhost:${PORT}/api/health`);
  console.log(`🔍 Available Routes:`);
  console.log(`   POST http://localhost:${PORT}/api/auth/admin/login`);
  console.log(`   GET  http://localhost:${PORT}/api/employees`);
  console.log(`   POST http://localhost:${PORT}/api/employees`);
  console.log(`   GET  http://localhost:${PORT}/api/clients`);
  console.log(`   POST http://localhost:${PORT}/api/clients`);
  console.log(`   GET  http://localhost:${PORT}/api/messages`); // ADDED
  console.log(`   POST http://localhost:${PORT}/api/messages`); // ADDED
});
