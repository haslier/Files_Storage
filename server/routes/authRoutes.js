// server/routes/authRoutes.js

const express = require('express');
const { registerUser, loginUser } = require('../controllers/authController');
const router = express.Router();

// PHẢI CHẮC CHẮN LÀ .post()
router.post('/register', registerUser); 
router.post('/login', loginUser);

module.exports = router;