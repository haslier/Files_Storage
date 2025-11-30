// server/controllers/fileController.js

const File = require('../models/File');
// LƯU Ý: Bạn sẽ cần import các thư viện cho GridFS/Multer tại đây sau này
// const { gfs } = require('../config/db'); 
// const multer = require('multer'); 
// const { GridFsStorage } = require('multer-gridfs-storage'); 


// @desc Lấy danh sách file của người dùng
// @route GET /api/files/myfiles
exports.listMyFiles = async (req, res) => {
    try {
        // Lấy userId từ Authorization Middleware
        const userId = req.userId; 
        
        // Tìm các file mà user là chủ sở hữu HOẶC được chia sẻ
        const files = await File.find({
            $or: [
                { ownerId: userId },
                { shareWith: userId }
            ]
        }).select('-gridFsId'); // Không gửi GridFS ID ra Frontend

        res.json(files);
    } catch (error) {
        res.status(500).json({ message: 'Lỗi server khi lấy danh sách file' });
    }
};

// @desc Tải lên file 
// @route POST /api/files/upload
exports.uploadFile = async (req, res) => {
    // Sơ khai: Trả về trạng thái đang phát triển
    res.status(501).json({ message: 'Tính năng Upload đang được triển khai' });
};

// @desc Tải xuống file 
// @route GET /api/files/:id/download
exports.downloadFile = async (req, res) => {
    // Sơ khai: Trả về trạng thái đang phát triển
    res.status(501).json({ message: 'Tính năng Download đang được triển khai' });
};

// ===============================================
// === HÀM THIẾU CẦN PHẢI THÊM VÀO (Sơ khai) ===
// ===============================================

// @desc Xóa file
// @route DELETE /api/files/:id
exports.deleteFile = async (req, res) => {
    // Sơ khai: Trả về trạng thái đang phát triển
    res.status(501).json({ message: 'Tính năng Delete đang được triển khai' });
};

// @desc Chia sẻ file
// @route POST /api/files/:id/share
exports.shareFile = async (req, res) => {
    // Sơ khai: Trả về trạng thái đang phát triển
    res.status(501).json({ message: 'Tính năng Share đang được triển khai' });
};

// Hết file - Không dùng dấu ... ở cuối