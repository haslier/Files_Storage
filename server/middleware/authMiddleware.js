// server/middleware/authMiddleware.js

const jwt = require('jsonwebtoken');
const User = require('../models/User'); // Import User model nếu bạn cần lấy thêm thông tin User

const protect = async (req, res, next) => {
    let token;

    // 1. Kiểm tra Token trong Header Authorization
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        try {
            // Lấy token từ Header (ví dụ: 'Bearer <token>')
            token = req.headers.authorization.split(' ')[1];

            // 2. Xác minh Token (dùng JWT_SECRET)
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            
            // 3. Gắn User ID vào request (cho Controller sử dụng)
            // Lưu ý: Tùy theo payload của bạn, trường user ID có thể là 'id'
            req.userId = decoded.id; 
            
            // Tùy chọn: Lấy toàn bộ User Object (Nếu cần truy cập email, username,...)
            // req.user = await User.findById(decoded.id).select('-password'); 

            next(); // Chuyển sang Controller tiếp theo
        } catch (error) {
            console.error("Lỗi xác minh token:", error.message);
            res.status(401).json({ message: 'Không được phép truy cập, Token không hợp lệ hoặc hết hạn' });
        }
    } else if (!token) {
        res.status(401).json({ message: 'Không được phép truy cập, Không có Token' });
    }
};

module.exports = { protect };