const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const authMiddleware = require('../middleware/authMiddleware');

// Register
router.post('/register', authController.register);

// Login
router.post('/login', authController.login);

// Get storage info (protected)
router.get('/storage', authMiddleware, authController.getStorageInfo);

module.exports = router;