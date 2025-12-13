const fs = require('fs');
const path = require('path');

// Tạo thư mục logs nếu chưa có
const logsDir = path.join(__dirname, '../../logs');
if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir, { recursive: true });
}

// Format log entry
const formatLogEntry = (req, details = {}) => {
    return {
        timestamp: new Date().toISOString(),
        method: req.method,
        url: req.originalUrl,
        ip: req.ip || req.connection.remoteAddress,
        userAgent: req.get('user-agent'),
        userId: req.userId || 'anonymous',
        ...details
    };
};

// Write to log file
const writeLog = (logEntry, type = 'access') => {
    const date = new Date().toISOString().split('T')[0];
    const logFile = path.join(logsDir, `${type}-${date}.log`);
    
    const logLine = JSON.stringify(logEntry) + '\n';
    
    fs.appendFile(logFile, logLine, (err) => {
        if (err) console.error('Error writing to log file:', err);
    });
};

// Log specific actions
const logAction = (userId, action, details = {}) => {
    const logEntry = {
        timestamp: new Date().toISOString(),
        userId,
        action,
        ...details
    };
    
    writeLog(logEntry, 'action');
    console.log(`[ACTION] User ${userId}: ${action}`, details);
};

// Middleware
const auditLogger = (req, res, next) => {
    const startTime = Date.now();
    
    // Log response when finished
    res.on('finish', () => {
        const duration = Date.now() - startTime;
        const logEntry = formatLogEntry(req, {
            statusCode: res.statusCode,
            duration: `${duration}ms`
        });
        
        // Chỉ log API requests
        if (req.originalUrl.startsWith('/api')) {
            writeLog(logEntry, 'access');
            
            // Log errors
            if (res.statusCode >= 400) {
                writeLog(logEntry, 'error');
                console.log(`❌ [${res.statusCode}] ${req.method} ${req.originalUrl} - ${duration}ms`);
            } else {
                console.log(`✅ [${res.statusCode}] ${req.method} ${req.originalUrl} - ${duration}ms`);
            }
        }
    });
    
    next();
};

module.exports = auditLogger;
module.exports.logAction = logAction;