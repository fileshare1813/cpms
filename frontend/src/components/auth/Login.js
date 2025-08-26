const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

// Import routes
const authRoutes = require('./routes/auth');
const clientRoutes = require('./routes/clients');
const employeeRoutes = require('./routes/employees');
const projectRoutes = require('./routes/projects');
const paymentRoutes = require('./routes/payments');
const messageRoutes = require('./routes/messages');

const app = express();
const PORT = process.env.PORT || 5000;

// CORS Configuration
const allowedOrigins = [
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  'https://cpms-frontend.onrender.com',
  'https://cms.vibesoft.in'
];

app.use(cors({
  origin: function (origin, callback) {
    if (!origin) return callback(null, true);
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

app.options('*', cors());

// Body Parsing Middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// MongoDB Connection
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI, {
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS: 45000,
    });

    await mongoose.connection.db.admin().ping();
  } catch (error) {
    console.error('MongoDB Connection Error:', error.message);
    process.exit(1);
  }
};
connectDB();

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/clients', clientRoutes);
app.use('/api/employees', employeeRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/messages', messageRoutes);

// Health Check
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

// Serve React Frontend
const possibleBuildPaths = [
  path.join(__dirname, '../frontend/build'),
  path.join(__dirname, '../build'),
  path.join(__dirname, 'build'),
  path.join(__dirname, '../../frontend/build')
];

let buildPath = null;

// Find the correct build path
for (const testPath of possibleBuildPaths) {
  if (fs.existsSync(testPath) && fs.existsSync(path.join(testPath, 'index.html'))) {
    buildPath = testPath;
    break;
  }
}

if (!buildPath) {
  buildPath = path.join(__dirname, '../frontend/build');
}

// Serve static files
if (buildPath && fs.existsSync(buildPath)) {
  app.use(express.static(buildPath, {
    maxAge: '1y',
    etag: true
  }));
}

// Catch-all handler for React Router
app.get('*', (req, res, next) => {
  if (req.originalUrl.startsWith('/api/')) {
    return next();
  }

  const indexPath = buildPath ? path.join(buildPath, 'index.html') : null;

  if (indexPath && fs.existsSync(indexPath)) {
    res.sendFile(indexPath);
  } else {
    res.status(404).json({
      error: 'Frontend build not found',
      message: 'Please build the React app first'
    });
  }
});

// Global Error Handler
app.use((error, req, res, next) => {
  console.error('Global Error:', error);
  res.status(500).json({
    success: false,
    message: 'Internal Server Error',
    error: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong',
    timestamp: new Date().toISOString()
  });
});

// Graceful Shutdown
process.on('SIGINT', async () => {
  console.log('\nShutting down gracefully...');
  await mongoose.connection.close();
  console.log('MongoDB connection closed');
  process.exit(0);
});

// Start Server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`API URL: http://localhost:${PORT}`);
  console.log(`Frontend URL: http://localhost:${PORT}`);
});