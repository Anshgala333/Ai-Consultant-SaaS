require('dotenv').config();
const express = require('express');
const cors = require('cors');
const connectDB = require('./config/db');

// Import routes
const authRoutes = require('./routes/auth');
const businessRoutes = require('./routes/business');
const uploadRoutes = require('./routes/upload');
const kpiRoutes = require('./routes/kpi');
const issueRoutes = require('./routes/issues');
const feedbackRoutes = require('./routes/feedback');
const staffLogRoutes = require('./routes/staffLogs');
const recommendationRoutes = require('./routes/recommendations');
const experimentRoutes = require('./routes/experiments');
const adminRoutes = require('./routes/admin');
const reportRoutes = require('./routes/reports');
const employeeRoutes = require('./routes/employees');

const app = express();

// Connect to MongoDB
connectDB();

// Middleware
app.use(cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Static files for uploads
app.use('/uploads', express.static('uploads'));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/business', businessRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/kpi', kpiRoutes);
app.use('/api/issues', issueRoutes);
app.use('/api/feedback', feedbackRoutes);
app.use('/api/staff-logs', staffLogRoutes);
app.use('/api/recommendations', recommendationRoutes);
app.use('/api/experiments', experimentRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/employees', employeeRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
    res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        version: '1.0.0'
    });
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Error:', err.stack);
    res.status(500).json({
        message: 'Something went wrong!',
        error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({ message: 'Route not found' });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
    console.log(`
  ╔═══════════════════════════════════════════════════╗
  ║   AI Consultant API Server                         ║
  ║   Running on: http://localhost:${PORT}               ║
  ║   Environment: ${process.env.NODE_ENV || 'development'}                    ║
  ╚═══════════════════════════════════════════════════╝
  `);
});

module.exports = app;
