const User = require('../models/User');
const jwt = require('jsonwebtoken');
const { logAction } = require('../middleware/auditLogger');
const validator = require('validator');

// Validate password strength
const validatePassword = (password) => {
    const minLength = 8;
    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasNumber = /[0-9]/.test(password);
    const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);
    
    if (password.length < minLength) {
        return { valid: false, message: 'Password must be at least 8 characters long' };
    }
    if (!hasUpperCase) {
        return { valid: false, message: 'Password must contain at least one uppercase letter' };
    }
    if (!hasLowerCase) {
        return { valid: false, message: 'Password must contain at least one lowercase letter' };
    }
    if (!hasNumber) {
        return { valid: false, message: 'Password must contain at least one number' };
    }
    if (!hasSpecialChar) {
        return { valid: false, message: 'Password must contain at least one special character' };
    }
    
    return { valid: true };
};

// Register
exports.register = async (req, res) => {
    try {
        let { username, email, password } = req.body;

        // Validation
        if (!username || !email || !password) {
            return res.status(400).json({
                success: false,
                message: 'Please provide all required fields'
            });
        }

        // Trim and sanitize input
        username = validator.trim(username);
        email = validator.normalizeEmail(email);
        
        // Validate email
        if (!validator.isEmail(email)) {
            return res.status(400).json({
                success: false,
                message: 'Please provide a valid email'
            });
        }

        // Validate username length
        if (username.length < 3 || username.length > 30) {
            return res.status(400).json({
                success: false,
                message: 'Username must be between 3 and 30 characters'
            });
        }

        // Validate username characters (alphanumeric + underscore only)
        if (!/^[a-zA-Z0-9_]+$/.test(username)) {
            return res.status(400).json({
                success: false,
                message: 'Username can only contain letters, numbers, and underscores'
            });
        }

        // Validate password strength
        const passwordCheck = validatePassword(password);
        if (!passwordCheck.valid) {
            return res.status(400).json({
                success: false,
                message: passwordCheck.message
            });
        }

        // Check if user exists
        const existingUser = await User.findOne({
            $or: [{ email }, { username }]
        });

        if (existingUser) {
            const field = existingUser.email === email ? 'Email' : 'Username';
            return res.status(400).json({
                success: false,
                message: `${field} already exists`
            });
        }

        // Create user
        const user = await User.create({
            username,
            email,
            password
        });

        // Log action
        logAction(user._id, 'USER_REGISTERED', {
            username: user.username,
            email: user.email,
            ip: req.ip
        });

        console.log('✅ User registered:', user.email);

        res.status(201).json({
            success: true,
            message: 'User registered successfully',
            user: {
                id: user._id,
                username: user.username,
                email: user.email
            }
        });

    } catch (error) {
        console.error('Register error:', error);
        
        // Log failed registration
        logAction('anonymous', 'REGISTRATION_FAILED', {
            error: error.message,
            ip: req.ip
        });
        
        res.status(500).json({
            success: false,
            message: 'Error registering user',
            error: error.message
        });
    }
};

// Login
exports.login = async (req, res) => {
    try {
        let { email, password } = req.body;

        // Validation
        if (!email || !password) {
            return res.status(400).json({
                success: false,
                message: 'Please provide email and password'
            });
        }

        // Sanitize input
        email = validator.normalizeEmail(email);

        // Validate email format
        if (!validator.isEmail(email)) {
            return res.status(400).json({
                success: false,
                message: 'Please provide a valid email'
            });
        }

        // Find user
        const user = await User.findOne({ email }).select('+password');
        if (!user) {
            // Log failed login attempt
            logAction('anonymous', 'LOGIN_FAILED', {
                email,
                reason: 'User not found',
                ip: req.ip
            });
            
            return res.status(401).json({
                success: false,
                message: 'Invalid email or password'
            });
        }

        // Check password
        const isMatch = await user.comparePassword(password);
        if (!isMatch) {
            // Log failed login attempt
            logAction(user._id, 'LOGIN_FAILED', {
                email,
                reason: 'Invalid password',
                ip: req.ip
            });
            
            return res.status(401).json({
                success: false,
                message: 'Invalid email or password'
            });
        }

        // Create token
        const token = jwt.sign(
            { userId: user._id },
            process.env.JWT_SECRET,
            { expiresIn: '7d' }
        );

        // Create refresh token (optional, for future implementation)
        const refreshToken = jwt.sign(
            { userId: user._id },
            process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET,
            { expiresIn: '30d' }
        );

        // Log successful login
        logAction(user._id, 'LOGIN_SUCCESS', {
            username: user.username,
            email: user.email,
            ip: req.ip,
            userAgent: req.get('user-agent')
        });

        console.log('✅ User logged in:', user.email);

        res.json({
            success: true,
            message: 'Login successful',
            token,
            refreshToken, // Optional
            user: {
                id: user._id,
                username: user.username,
                email: user.email
            }
        });

    } catch (error) {
        console.error('Login error:', error);
        
        logAction('anonymous', 'LOGIN_ERROR', {
            error: error.message,
            ip: req.ip
        });
        
        res.status(500).json({
            success: false,
            message: 'Error logging in',
            error: error.message
        });
    }
};

// Logout (optional - for future session management)
exports.logout = async (req, res) => {
    try {
        // Log logout
        logAction(req.userId, 'LOGOUT', {
            ip: req.ip
        });
        
        res.json({
            success: true,
            message: 'Logged out successfully'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error logging out'
        });
    }
};