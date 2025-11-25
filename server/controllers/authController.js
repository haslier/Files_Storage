// server/controllers/authController.js

const User = require('../models/User');
const jwt = require('jsonwebtoken');


// === HÀM KIỂM TRA ĐỘ MẠNH MẬT KHẨU (TẠI BACKEND) ===
const validatePassword = (password) => {
    // Console log để kiểm tra mật khẩu nhận được
    console.log(`Kiểm tra mật khẩu: ${password}`); 
    
    if (password.length < 8) return "Mật khẩu phải dài ít nhất 8 ký tự.";
    if (!/[A-Z]/.test(password)) return "Mật khẩu phải chứa ít nhất 1 ký tự viết hoa.";
    if (!/[a-z]/.test(password)) return "Mật khẩu phải chứa ít nhất 1 ký tự viết thường.";
    if (!/[0-9]/.test(password)) return "Mật khẩu phải chứa ít nhất 1 chữ số.";
    if (!/[^A-Za-z0-9]/.test(password)) return "Mật khẩu phải chứa ít nhất 1 ký tự đặc biệt.";
    
    console.log("Mật khẩu HỢP LỆ!"); // Console log thành công
    return null; // Mật khẩu hợp lệ
}

// Hàm tạo JWT
const generateToken = (user) => {
    // PHẦN QUAN TRỌNG: Thêm 'email' và 'username' vào object payload
    return jwt.sign(
        { 
             
            email: user.email, 
            username: user.username 
        }, 
        process.env.JWT_SECRET, 
        { expiresIn: '30d' }
    ); 
};

// @route POST /api/auth/register
exports.registerUser = async (req, res) => {
    


    const { username, email, password } = req.body;
    
    // KIỂM TRA MẬT KHẨU TẠI BACKEND
    const passwordError = validatePassword(password);

    if (passwordError) {
        
        return res.status(400).json({ message: passwordError }); 
         
    }

    

    try {
        const userExists = await User.findOne({ email });

        if (userExists) {
            return res.status(400).json({ message: 'Email đã tồn tại' });
        }

        const user = await User.create({ username, email, password });

        if (user) {
            res.status(201).json({
                username: user.username,
                email: user.email,
                token: generateToken(user), // Tạo token ngay sau khi đăng ký
            });
        } else {
            res.status(400).json({ message: 'Dữ liệu không hợp lệ' });
        }
    } catch (error) {
        res.status(500).json({ message: 'Lỗi server khi đăng ký', error: error.message });
    }
};

// @route POST /api/auth/login
exports.loginUser = async (req, res) => {
    const { username, password } = req.body;

    try {
        // Tìm User bằng username hoặc email
        const user = await User.findOne({ 
            $or: [{ username: username }, { email: username }] 
        });

        // So sánh mật khẩu đã hash
        if (user && (await user.matchPassword(password))) {
            res.json({
                username: user.username,
                email: user.email,
                token: generateToken(user), // Tạo token khi đăng nhập thành công
            });
        } else {
            res.status(401).json({ message: 'Tên người dùng hoặc mật khẩu không đúng' });
        }
    } catch (error) {
        res.status(500).json({ message: 'Lỗi server khi đăng nhập', error: error.message });
    }
};

