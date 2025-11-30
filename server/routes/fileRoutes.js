// server/routes/fileRoutes.js

const express = require('express');
const router = express.Router();
// Tải Middleware bảo vệ
const { protect } = require('../middleware/authMiddleware');

// Tải Controller cho các thao tác với file
const { listMyFiles, uploadFile, downloadFile, deleteFile, shareFile } = require('../controllers/fileController');

// --- TẤT CẢ CÁC ROUTE NÀY PHẢI ĐƯỢC BẢO VỆ BẰNG 'protect' ---

// @route GET /api/files/myfiles
// Lấy danh sách file của người dùng (Bảo mật)
router.get('/myfiles', protect, listMyFiles);

// @route POST /api/files/upload
// Tải lên file (Bảo mật - sẽ thêm Multer ở Controller)
router.post('/upload', protect, uploadFile); 

// @route GET /api/files/:id/download
// Tải xuống file (Bảo mật)
router.get('/:id/download', protect, downloadFile);

// @route DELETE /api/files/:id
// Xóa file (Bảo mật)
router.delete('/:id', protect, deleteFile);

// @route POST /api/files/:id/share
// Chia sẻ file (Bảo mật)
router.post('/:id/share', protect, shareFile);


module.exports = router;