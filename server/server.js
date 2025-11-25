// server/server.js

const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const connectDB = require('./config/db');

// Tải biến môi trường từ .env
dotenv.config();


console.log("Starting Server..."); // <-- Dòng kiểm tra
// Kết nối Database
connectDB();

const app = express();

// Middleware
app.use(cors()); // Cho phép Frontend (Live Server) truy cập API
app.use(express.json()); // Cho phép Express đọc JSON trong body request

// -----------------------------------------------------------------
// Route cho Auth (đăng nhập/đăng ký)
const authRoutes = require('./routes/authRoutes');
app.use('/api/auth', authRoutes);

// Phục vụ file tĩnh (để frontend có thể hiển thị dashboard, v.v.)
const path = require('path');
app.use(express.static(path.join(__dirname, '..', 'client')));
app.get('/', (req, res) => res.sendFile(path.join(__dirname, '..', 'client', 'index.html')));

// -----------------------------------------------------------------

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});