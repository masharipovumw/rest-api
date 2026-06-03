require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const connectDB = require('./config/db');

// Import routes
const authRoutes = require('./routes/auth');
const adminRoutes = require('./routes/admin');
const materialRoutes = require('./routes/materials');
const testRoutes = require('./routes/tests');
const aiRoutes = require('./routes/ai');
const analyticsRoutes = require('./routes/analytics');
const lessonPlanRoutes = require('./routes/lessonPlans');
const notificationRoutes = require('./routes/notifications');
const studentRoutes = require('./routes/student');

const app = express();
const PORT = process.env.PORT || 5000;

// Connect to MongoDB
connectDB();

// ===== Middleware =====
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Serve uploaded files as static
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ===== API Routes =====
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/materials', materialRoutes);
app.use('/api/tests', testRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/lesson-plans', lessonPlanRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/student', studentRoutes);

// ===== Health Check =====
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    message: 'LMS API is running',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
  });
});

// ===== API Info =====
app.get('/api', (req, res) => {
  res.json({
    success: true,
    message: 'AI-Powered Academic LMS API',
    version: '1.0.0',
    endpoints: {
      auth: '/api/auth',
      admin: '/api/admin',
      materials: '/api/materials',
      tests: '/api/tests',
      ai: '/api/ai',
      analytics: '/api/analytics',
      lessonPlans: '/api/lesson-plans',
      notifications: '/api/notifications',
      studentDashboard: '/api/student',
      health: '/api/health',
    },
  });
});

// ===== 404 Handler =====
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Route ${req.method} ${req.originalUrl} not found`,
  });
});

// ===== Error Handler =====
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);

  // Handle multer errors
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({
      success: false,
      message: 'File too large. Maximum size is 50MB.',
    });
  }

  if (err.message && err.message.includes('File type not allowed')) {
    return res.status(400).json({
      success: false,
      message: err.message,
    });
  }

  res.status(500).json({
    success: false,
    message: 'Internal server error',
  });
});

// ===== Global Error Handlers (keep server alive) =====
process.on('unhandledRejection', (reason, promise) => {
  console.error('⚠️  Unhandled Promise Rejection:', reason);
});

process.on('uncaughtException', (err) => {
  console.error('⚠️  Uncaught Exception:', err);
  // Don't exit — keep the server running
});

// ===== Start Server =====
app.listen(PORT, () => {
  console.log(`\n🚀 LMS API Server running on port ${PORT}`);
  console.log(`📡 API Base URL: http://localhost:${PORT}/api`);
  console.log(`❤️  Health Check: http://localhost:${PORT}/api/health`);
  console.log(`📁 Uploads: http://localhost:${PORT}/uploads\n`);
});
