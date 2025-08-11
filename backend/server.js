const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const path = require('path');
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

// ===== CORS Configuration =====
const allowedOrigins = [
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  'https://cpms-frontend.onrender.com'
];

app.use(cors({
  origin: function (origin, callback) {
    if (!origin) return callback(null, true); // allow mobile/postman etc.
    if (allowedOrigins.indexOf(origin) === -1) {
      const msg = `The CORS policy for this site does not allow access from ${origin}`;
      return callback(new Error(msg), false);
    }
    return callback(null, true);
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-requested-with'],
  credentials: true,
  optionsSuccessStatus: 204
}));

// Handle preflight requests
app.options('*', cors());

// ===== Body Parsing Middleware =====
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ===== Request Logging =====
app.use((req, res, next) => {
  console.log(`📨 ${req.method} ${req.originalUrl} - ${new Date().toISOString()}`);
  next();
});

// ===== MongoDB Connection =====
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
    await mongoose.connection.db.admin().ping();
    console.log('🏓 MongoDB Ping: Success');
  } catch (error) {
    console.error('❌ MongoDB Connection Error:', error.message);
    process.exit(1);
  }
};
connectDB();

// MongoDB Events
mongoose.connection.on('connected', () => console.log('🟢 Mongoose connected to MongoDB'));
mongoose.connection.on('error', (err) => console.error('🔴 Mongoose connection error:', err));
mongoose.connection.on('disconnected', () => console.log('🟡 Mongoose disconnected from MongoDB'));

// ===== API Routes with Logging =====
app.use('/api/auth', (req, res, next) => { console.log('🔐 Auth route accessed'); next(); }, authRoutes);
app.use('/api/clients', (req, res, next) => { console.log('👥 Clients route accessed'); next(); }, clientRoutes);
app.use('/api/employees', (req, res, next) => { console.log('👔 Employees route accessed'); next(); }, employeeRoutes);
app.use('/api/projects', (req, res, next) => { console.log('📋 Projects route accessed'); next(); }, projectRoutes);
app.use('/api/payments', (req, res, next) => { console.log('💳 Payments route accessed'); next(); }, paymentRoutes);
app.use('/api/messages', (req, res, next) => { console.log('💌 Messages route accessed'); next(); }, messageRoutes);

// ===== Health Check =====
app.get('/api/health', async (req, res) => {
  try {
    await mongoose.connection.db.admin().ping();
    res.json({
      status: 'OK',
      database: 'Connected',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: process.memoryUsage()
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

// ===== Serve React Frontend =====
const frontendPath = path.join(__dirname, 'build'); // build folder from React
app.use(express.static(frontendPath));

// Catch-all route for SPA (React Router)
app.get('*', (req, res) => {
  res.sendFile(path.join(frontendPath, 'index.html'));
});

// ===== Global Error Handler =====
app.use((error, req, res, next) => {
  console.error('🚨 Global Error:', error);
  res.status(500).json({
    success: false,
    message: 'Internal Server Error',
    error: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong',
    timestamp: new Date().toISOString()
  });
});

// ===== Graceful Shutdown =====
process.on('SIGINT', async () => {
  console.log('\n🛑 Shutting down gracefully...');
  await mongoose.connection.close();
  console.log('📊 MongoDB connection closed');
  process.exit(0);
});

// ===== Start Server =====
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`🌐 API URL: http://localhost:${PORT}`);
});
