// server/server.js

const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const path = require('path');
const { connectDB } = require('./config/db'); 

// 1. TẢI CÁC ROUTE VÀ CONTROLLER CẦN THIẾT
const { loginUser, registerUser } = require('./controllers/authController'); // Lấy hàm Controller trực tiếp
const authRoutes = require('./routes/authRoutes'); // Route chỉ chứa /register
const fileRoutes = require('./routes/fileRoutes'); 

// =======================================================
// 2. CONFIG VÀ KHỞI TẠO
// =======================================================
dotenv.config(); // Load .env
const app = express(); // KHỞI TẠO APP Ở ĐÂY

// =======================================================
// 3. MIDDLEWARE CHUNG & KẾT NỐI DB
// =======================================================
connectDB(); 
app.use(cors()); 
app.use(express.json()); 


// =======================================================
// 4. BẢO MẬT: RATE LIMITER
// =======================================================
const loginLimiter = rateLimit({
    windowMs: 5 * 60 * 1000, 
    max: 5, 
    message: JSON.stringify({ message: 'Too many failed login attempts. Please try again in 5 minutes.' }),
});

const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, 
    max: 100, 
    message: JSON.stringify({ message: 'You have exceeded the number of allowed requests. Please try again in 15 minutes.' }),
});


// =======================================================
// 5. ROUTES
// =======================================================

// A. ROUTE LOGIN (Áp dụng Limiter và Controller riêng)
// Tạo một Router nhỏ chỉ cho route Login (chỉ cần 'post' vì đường dẫn đã được chỉ rõ)
const loginRoute = express.Router();
loginRoute.post('/', loginUser); // Chỉ cần '/' vì nó sẽ được áp dụng tại /api/auth/login

app.use('/api/auth/login', loginLimiter, loginRoute); 


// B. ROUTE REGISTER (Áp dụng Limiter chung và AuthRoute)
app.use('/api/auth', authLimiter, authRoutes); // AuthRoutes chỉ chứa route /register


// C. FILE ROUTES
app.use('/api/files', fileRoutes);


// =======================================================
// 6. PHỤC VỤ FILE TĨNH (FRONTEND)
// =======================================================
app.use(express.static(path.join(__dirname, '..', 'client')));
app.get('/', (req, res) => res.sendFile(path.join(__dirname, '..', 'client', 'index.html')));


// =======================================================
// 7. KHỞI ĐỘNG SERVER
// =======================================================
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});