const express = require('express');
const cors = require('cors');
require('dotenv').config();
require('./config/database'); // Connect to MongoDB

const app = express();
const PORT = process.env.PORT || 9091;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
    next();
});

// Routes
const otpAuthRoutes = require('./routes/otpAuth');
const userRoutes = require('./routes/user');
const interviewRoutes = require('./routes/interview');

app.use('/otp-auth', otpAuthRoutes);
app.use('/user', userRoutes);
app.use('/interview', interviewRoutes);

// Health check endpoint
app.get('/health', (req, res) => {
    res.status(200).json({
        status: 'OK',
        message: 'NiyuktiSetu Node Backend is running',
        timestamp: new Date().toISOString()
    });
});

// Root endpoint
app.get('/', (req, res) => {
    res.status(200).json({
        message: 'NiyuktiSetu Node Backend API',
        version: '1.0.0',
        endpoints: {
            health: '/health',
            otpAuth: {
                send: 'POST /otp-auth/send',
                verify: 'POST /otp-auth/verify'
            },
            interview: {
                login: 'POST /interview/interview-login',
                verifyLive: 'POST /interview/verify-live'
            },
            user: {
                profile: 'GET /user/profile (protected)',
                updateProfile: 'PUT /user/profile (protected)'
            }
        }
    });
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({ message: 'Route not found' });
});

// Error handler
app.use((err, req, res, next) => {
    console.error('Error:', err);
    res.status(500).json({
        message: 'Internal server error',
        error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
});

// Start server
app.listen(PORT, () => {
    console.log(`\n🚀 NiyuktiSetu Node Backend running on port ${PORT}`);
    console.log(`📍 http://localhost:${PORT}`);
    console.log(`🏥 Health check: http://localhost:${PORT}/health\n`);
});

module.exports = app;
