require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const helmet = require('helmet');
const mongoSanitize = require('express-mongo-sanitize');
const xss = require('xss-clean');
const hpp = require('hpp');
const rateLimit = require('express-rate-limit');
const connectDB = require('./config/db');

const app = express();

// Connect to MongoDB
connectDB();

// =========================
// SECURITY MIDDLEWARE
// =========================

// 1. Helmet - Secure HTTP headers
app.use(helmet({
    contentSecurityPolicy: false, // Tắt CSP cho development
    crossOriginEmbedderPolicy: false
}));



// ✅ ENHANCED CORS Configuration for Office Viewers
const corsOptions = {
    origin: function (origin, callback) {
        // Allow requests with no origin (mobile apps, Postman, etc.)
        if (!origin) return callback(null, true);
        
        // Allow localhost and production URL
        const allowedOrigins = [
            'http://localhost:5500',
            'http://127.0.0.1:5500',
            'https://files-storage-c4s8.onrender.com'
        ];
        
        // Allow Google Docs Viewer, Microsoft Office Viewer, PDF.js
        const viewerDomains = [
            'https://docs.google.com',
            'https://view.officeapps.live.com',
            'https://mozilla.github.io'
        ];
        
        if (allowedOrigins.includes(origin) || 
            viewerDomains.some(domain => origin?.startsWith(domain))) {
            callback(null, true);
        } else if (process.env.NODE_ENV === 'development') {
            // In development, allow all origins
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true,
    optionsSuccessStatus: 200,
    exposedHeaders: ['Content-Length', 'Content-Type', 'Content-Range', 'Accept-Ranges'],
    allowedHeaders: ['Origin', 'X-Requested-With', 'Content-Type', 'Accept', 'Authorization', 'Range']
};

app.use(cors(corsOptions));

// ✅ Additional CORS middleware for temp-download route
app.use('/api/files/temp-download', (req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Range');
    res.header('Access-Control-Expose-Headers', 'Content-Length, Content-Type, Content-Range, Accept-Ranges');
    res.header('X-Frame-Options', 'ALLOWALL'); // Allow embedding in iframes
    next();
});

// 3. Body parser
app.use(express.json({ limit: '16mb' }));
app.use(express.urlencoded({ extended: true, limit: '16mb' }));

// 4. Data sanitization against NoSQL injection
app.use(mongoSanitize());

// 5. Data sanitization against XSS
app.use(xss());

// 6. Prevent HTTP Parameter Pollution
app.use(hpp());

// 7. Rate limiting
const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Limit each IP to 100 requests per windowMs
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
        res.status(429).json({
            success: false,
            message: 'Too many requests from this IP, please try again later.'
        });
    }
});

const authLimiter = rateLimit({
    windowMs: 5 * 60 * 1000, // 5 minutes
    max: 5, // Limit each IP to 5 login attempts per 5 minutes
    message: {
        success: false,
        message: '❌ Bạn đã nhập sai mật khẩu quá 5 lần. Vui lòng thử lại sau 5 phút.',
        retryAfter: 5 * 60 // seconds
    },
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests: true, // Không đếm request thành công
    handler: (req, res) => {
        const retryAfter = Math.ceil((req.rateLimit.resetTime - Date.now()) / 1000);
        const minutes = Math.floor(retryAfter / 60);
        const seconds = retryAfter % 60;
        
        res.status(429).json({
            success: false,
            message: `❌ Bạn đã nhập sai mật khẩu quá 5 lần. Vui lòng thử lại sau ${minutes} phút ${seconds} giây.`,
            retryAfter: retryAfter,
            lockedUntil: new Date(req.rateLimit.resetTime).toISOString()
        });
    }
});

const uploadLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 50, // 50 uploads per hour
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
        res.status(429).json({
            success: false,
            message: 'Upload limit exceeded, please try again later.'
        });
    }
});

// Apply rate limiters - CHỈ ÁP DỤNG CHO LOGIN
// app.use('/api/', apiLimiter); // ← ĐÃ TẮT
app.use('/api/auth/login', authLimiter); // ← CHỈ GIỮ CÁI NÀY
// app.use('/api/auth/register', authLimiter); // ← ĐÃ TẮT
// app.use('/api/files/upload', uploadLimiter); // ← ĐÃ TẮT

console.log('🔒 Login rate limit ENABLED: 5 lần sai → Khóa 5 phút');

// =========================
// LOGGING MIDDLEWARE
// =========================
const auditLogger = require('./middleware/auditLogger');
app.use(auditLogger);

// =========================
// STATIC FILES
// =========================
app.use(express.static(path.join(__dirname, '../client')));

// =========================
// API ROUTES
// =========================
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/files', require('./routes/fileRoutes'));

// Test route
app.get('/api/test', (req, res) => {
    res.json({ 
        success: true,
        message: 'API is working!', 
        timestamp: new Date(),
        environment: process.env.NODE_ENV
    });
});

// Health check
app.get('/api/health', (req, res) => {
    res.json({ 
        status: 'OK',
        uptime: process.uptime(),
        timestamp: new Date()
    });
});

// =========================
// SERVE FRONTEND
// =========================
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../client/index.html'));
});

app.get('/dashboard', (req, res) => {
    res.sendFile(path.join(__dirname, '../client/dashboard.html'));
});

// Redirect HTTP to HTTPS in production
if (process.env.NODE_ENV === 'production') {
    app.use((req, res, next) => {
        if (req.header('x-forwarded-proto') !== 'https') {
            res.redirect(`https://${req.header('host')}${req.url}`);
        } else {
            next();
        }
    });
}

// =========================
// ERROR HANDLING
// =========================
// 404 handler
app.use((req, res) => {
    res.status(404).json({
        success: false,
        message: 'Route not found'
    });
});

// Global error handler
app.use((err, req, res, next) => {
    console.error('❌ Error:', err);
    
    // Mongoose validation error
    if (err.name === 'ValidationError') {
        const errors = Object.values(err.errors).map(e => e.message);
        return res.status(400).json({
            success: false,
            message: 'Validation Error',
            errors
        });
    }
    
    // Mongoose duplicate key error
    if (err.code === 11000) {
        return res.status(400).json({
            success: false,
            message: 'Duplicate field value entered'
        });
    }
    
    // JWT errors
    if (err.name === 'JsonWebTokenError') {
        return res.status(401).json({
            success: false,
            message: 'Invalid token'
        });
    }
    
    if (err.name === 'TokenExpiredError') {
        return res.status(401).json({
            success: false,
            message: 'Token expired'
        });
    }
    
    // Default error
    res.status(err.status || 500).json({
        success: false,
        message: err.message || 'Internal server error',
        error: process.env.NODE_ENV === 'development' ? err.stack : undefined
    });
});

// =========================
// START SERVER
// =========================
const PORT = process.env.PORT || 5500;
const server = app.listen(PORT, () => {
    console.log('='.repeat(50));
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`📂 API: http://localhost:${PORT}/api`);
    console.log(`🌐 Frontend: http://localhost:${PORT}`);
    console.log(`🔒 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log('='.repeat(50));
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
    console.error('❌ Unhandled Rejection:', err);
    server.close(() => process.exit(1));
});

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
    console.error('❌ Uncaught Exception:', err);
    process.exit(1);
});

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('👋 SIGTERM received, shutting down gracefully');
    server.close(() => {
        console.log('✅ Process terminated');
    });
});


