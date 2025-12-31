const File = require('../models/File');
const multer = require('multer');
const { logAction } = require('../middleware/auditLogger');
const path = require('path');
const fileEncryption = require('../utils/encryption'); // Import encryption

// Danh sách cho phép
const allowedMimeTypes = [
    'text/plain',
    'text/html',
    'text/css',
    'text/javascript',
    'application/json',
    'application/xml',
    'text/xml',
    'text/csv',
    'text/markdown',
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'application/pdf',
    // Word
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    // Excel
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    // PowerPoint
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    // Compressed
    'application/zip',
    'application/x-rar-compressed'
];

// Multer config
const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
    // 1. Kiểm tra MIME type
    if (!allowedMimeTypes.includes(file.mimetype)) {
        return cb(new Error(`File type not allowed: ${file.mimetype}`), false);
    }
    
    // 2. Kiểm tra đuôi file 
    const ext = path.extname(file.originalname).toLowerCase();
    const allowedExts = [
        '.txt', '.js', '.json', '.html', '.css', '.md', '.xml', '.csv', 
        '.jpg', '.jpeg', '.png', '.gif', '.webp', '.pdf', 
        '.doc', '.docx', 
        '.xls', '.xlsx', 
        '.ppt', '.pptx', // ✅ THÊM: Đuôi file PowerPoint
        '.zip', '.rar'
    ];
    
    if (!allowedExts.includes(ext)) {
        return cb(new Error('File extension not allowed'), false);
    }
    
    cb(null, true);
};

const upload = multer({
    storage: storage,
    limits: { 
        fileSize: 16 * 1024 * 1024, // 16MB
        files: 1 // Chỉ cho phép upload 1 file mỗi lần
    },
    fileFilter: fileFilter
});

exports.upload = upload;


// UPLOAD FILE
exports.uploadFile = async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ success: false, message: 'No file' });

        // ✅ Fix tên file Tiếng Việt có dấu
        const safeName = Buffer.from(req.file.originalname, 'latin1').toString('utf8');

        // ✅ Mã hóa dữ liệu
        const encryptedData = fileEncryption.encrypt(req.file.buffer);

        const file = new File({
            filename: safeName,
            originalName: safeName,
            data: encryptedData,
            size: req.file.size,
            mimeType: req.file.mimetype,
            owner: req.userId,
            encrypted: true // Đánh dấu để giải mã
        });

        await file.save();
        
        // Cập nhật dung lượng user
        const User = require('../models/User');
        await User.findByIdAndUpdate(req.userId, { $inc: { storageUsed: encryptedData.length } });

        res.status(201).json({ success: true, file });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
// GET MY FILES
exports.getMyFiles = async (req, res) => {
    try {
        const { search } = req.query; // Get search query
        
        let query = {
            $or: [
                { owner: req.userId, status: 'active' },
                { sharedWith: req.userId, status: 'active' }
            ]
        };

        // Add search filter if provided
        if (search && search.trim()) {
            query.originalName = { $regex: search.trim(), $options: 'i' }; // Case-insensitive search
        }

        const files = await File.find(query)
            .select('-data')
            .populate('owner', 'username email')
            .sort({ uploadedAt: -1 });

        res.json({ success: true, files });

    } catch (error) {
        console.error('Get my files error:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching files',
            error: error.message
        });
    }
};

// GET SHARED BY YOU
exports.getSharedByYou = async (req, res) => {
    try {
        const files = await File.find({
            owner: req.userId,
            status: 'active',
            sharedWith: { $exists: true, $ne: [] }
        })
        .select('-data')
        .populate('sharedWith', 'username email')
        .sort({ uploadedAt: -1 });

        res.json({ success: true, files });

    } catch (error) {
        console.error('Get shared by you error:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching shared files',
            error: error.message
        });
    }
};

// GET SHARED TO YOU
exports.getSharedToYou = async (req, res) => {
    try {
        const files = await File.find({
            sharedWith: req.userId,
            status: 'active'
        })
        .select('-data')
        .populate('owner', 'username email')
        .sort({ uploadedAt: -1 });

        res.json({ success: true, files });

    } catch (error) {
        console.error('Get shared to you error:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching shared files',
            error: error.message
        });
    }
};

// GET BIN FILES
exports.getBinFiles = async (req, res) => {
    try {
        const files = await File.find({
            owner: req.userId,
            status: 'bin'
        })
        .select('-data')
        .sort({ deletedAt: -1 });

        res.json({ success: true, files });

    } catch (error) {
        console.error('Get bin files error:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching bin files',
            error: error.message
        });
    }
};


exports.downloadFile = async (req, res) => {
    try {
        const file = await File.findById(req.params.id);
        if (!file) return res.status(404).send('File not found');

        let fileData = file.data;

        // Ép kiểu Buffer nếu MongoDB trả về dạng Binary object
        if (!Buffer.isBuffer(fileData)) {
            fileData = fileData.buffer ? fileData.buffer : Buffer.from(fileData);
        }

        // ✅ Giải mã nếu file có flag encrypted
        if (file.encrypted) {
            fileData = fileEncryption.decrypt(fileData);
        }

        res.set({
            'Content-Type': file.mimeType,
            'Content-Length': fileData.length,
            'Content-Disposition': `attachment; filename="${encodeURIComponent(file.originalName)}"`
        });
        res.send(fileData);
    } catch (error) {
        console.error("Download error:", error);
        res.status(500).send('Lỗi khi xử lý file');
    }
};

// VIEW FILE
exports.viewFile = async (req, res) => {
    try {
        const file = await File.findById(req.params.id);

        if (!file) {
            return res.status(404).json({
                success: false,
                message: 'File not found'
            });
        }

        const canView = file.owner.toString() === req.userId ||
                       file.sharedWith.includes(req.userId);

        if (!canView) {
            return res.status(403).json({
                success: false,
                message: 'Access denied'
            });
        }

        // Check if file is editable (text-based)
        const textMimeTypes = [
            'text/plain',
            'text/html',
            'text/css',
            'text/javascript',
            'application/json',
            'application/xml',
            'text/xml',
            'text/csv',
            'text/markdown'
        ];

        const isTextFile = textMimeTypes.includes(file.mimeType) || 
                          file.originalName.match(/\.(txt|js|json|html|css|md|xml|csv|log)$/i);

        if (!isTextFile) {
            return res.status(400).json({
                success: false,
                message: 'This file type cannot be edited. Only text files are supported.',
                canEdit: false
            });
        }

        let fileData = file.data;

        //  DECRYPT if encrypted
        if (file.encrypted) {
            console.log(' Decrypting file for viewing...');
            try {
                fileData = fileEncryption.decrypt(file.data);
                console.log('✅ File decrypted for viewing');
            } catch (decryptError) {
                console.error('❌ Decryption failed:', decryptError);
                return res.status(500).json({
                    success: false,
                    message: 'Failed to decrypt file'
                });
            }
        }

        res.json({
            success: true,
            file: {
                _id: file._id,
                originalName: file.originalName,
                mimeType: file.mimeType,
                content: fileData.toString('utf8'),
                isOwner: file.owner.toString() === req.userId,
                canEdit: true,
                encrypted: file.encrypted
            }
        });

    } catch (error) {
        console.error('View file error:', error);
        res.status(500).json({
            success: false,
            message: 'Error viewing file',
            error: error.message
        });
    }
};

// SAVE FILE
exports.saveFile = async (req, res) => {
    try {
        const { content } = req.body;
        const file = await File.findById(req.params.id);

        if (!file) {
            return res.status(404).json({
                success: false,
                message: 'File not found'
            });
        }

        const canEdit = file.owner.toString() === req.userId ||
                       (file.sharedWith.includes(req.userId) && file.status === 'active');

        if (!canEdit) {
            return res.status(403).json({
                success: false,
                message: 'Access denied'
            });
        }

        file.data = Buffer.from(content, 'utf8');
        file.size = file.data.length;
        file.lastModified = new Date();
        await file.save();

        res.json({
            success: true,
            message: 'File saved successfully'
        });

    } catch (error) {
        console.error('Save file error:', error);
        res.status(500).json({
            success: false,
            message: 'Error saving file',
            error: error.message
        });
    }
};

// DELETE (move to bin)

// DELETE: B xóa thì file vào thùng rác luôn (như A xóa)
exports.deleteFile = async (req, res) => {
    try {
        const file = await File.findById(req.params.id);
        if (!file) return res.status(404).json({ success: false, message: 'File not found' });

        // Quyền: Chủ hoặc người được share
        const hasPermission = file.owner.toString() === req.userId || file.sharedWith.includes(req.userId);
        if (!hasPermission) return res.status(403).json({ success: false, message: 'No permission' });

        file.status = 'bin';
        file.deletedAt = new Date();
        await file.save();

        res.json({ success: true, message: 'File moved to bin' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// SHARE: B có thể share tiếp cho người khác
exports.shareFile = async (req, res) => {
    try {
        const { userEmail } = req.body;
        const file = await File.findById(req.params.id);
        
        const hasPermission = file.owner.toString() === req.userId || file.sharedWith.includes(req.userId);
        if (!hasPermission) return res.status(403).json({ success: false, message: 'No permission' });

        const User = require('../models/User');
        const userToShare = await User.findOne({ email: userEmail });

        if (userToShare && !file.sharedWith.includes(userToShare._id)) {
            file.sharedWith.push(userToShare._id);
            await file.save();
        }

        res.json({ success: true, message: 'Shared successfully' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// RESTORE
exports.restoreFile = async (req, res) => {
    try {
        const file = await File.findById(req.params.id);

        if (!file) {
            return res.status(404).json({
                success: false,
                message: 'File not found'
            });
        }

        if (file.owner.toString() !== req.userId) {
            return res.status(403).json({
                success: false,
                message: 'Only owner can restore'
            });
        }

        file.status = 'active';
        file.deletedAt = null;
        await file.save();

        res.json({
            success: true,
            message: 'File restored'
        });

    } catch (error) {
        console.error('Restore error:', error);
        res.status(500).json({
            success: false,
            message: 'Error restoring file',
            error: error.message
        });
    }
};

// DELETE PERMANENTLY
exports.deletePermanently = async (req, res) => {
    try {
        const file = await File.findById(req.params.id);

        if (!file) {
            return res.status(404).json({
                success: false,
                message: 'File not found'
            });
        }

        if (file.owner.toString() !== req.userId) {
            return res.status(403).json({
                success: false,
                message: 'Only owner can delete permanently'
            });
        }

        // Update user storage
        const User = require('../models/User');
        const user = await User.findById(req.userId);
        if (user) {
            user.storageUsed = Math.max(0, user.storageUsed - file.size);
            await user.save();
        }

        await File.findByIdAndDelete(req.params.id);

        logAction(req.userId, 'FILE_DELETED_PERMANENTLY', {
            fileId: req.params.id,
            fileName: file.originalName,
            sizeFreed: file.size,
            newStorageUsed: user?.storageUsed
        });

        res.json({
            success: true,
            message: 'File deleted permanently',
            storageInfo: user ? user.getStorageInfo() : null
        });

    } catch (error) {
        console.error('Permanent delete error:', error);
        res.status(500).json({
            success: false,
            message: 'Error deleting file permanently',
            error: error.message
        });
    }
};

// SHARE FILE
exports.shareFile = async (req, res) => {
    try {
        const { userEmail } = req.body;
        const file = await File.findById(req.params.id);

        if (!file) {
            return res.status(404).json({
                success: false,
                message: 'File not found'
            });
        }

        if (file.owner.toString() !== req.userId) {
            return res.status(403).json({
                success: false,
                message: 'Only owner can share'
            });
        }

        const User = require('../models/User');
        const userToShare = await User.findOne({ email: userEmail });

        if (!userToShare) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        if (!file.sharedWith.includes(userToShare._id)) {
            file.sharedWith.push(userToShare._id);
            await file.save();
        }

        res.json({
            success: true,
            message: 'File shared successfully'
        });

    } catch (error) {
        console.error('Share error:', error);
        res.status(500).json({
            success: false,
            message: 'Error sharing file',
            error: error.message
        });
    }
};

// 1. Cập nhật file (Dành cho Office Editor)
exports.updateFile = async (req, res) => {
    try {
        const file = await File.findById(req.params.id);
        if (!file) return res.status(404).json({ success: false, message: 'Can not find file' });

        if (!req.file) return res.status(400).json({ success: false, message: 'No new file data provided' });

        // Mã hóa dữ liệu mới trước khi lưu
        const encryptedData = fileEncryption.encrypt(req.file.buffer);

        file.data = encryptedData;
        file.size = req.file.size;
        file.lastModified = new Date();
        await file.save();

        res.json({ success: true, message: 'Update file content successfully' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// 2. Tạo link công khai tạm thời
exports.getPublicLink = async (req, res) => {
    try {
        const file = await File.findById(req.params.id);
        if (!file) return res.status(404).json({ success: false, message: 'File not found' });

        // URL này sẽ trỏ tới route temp-download không cần token auth
        const downloadUrl = `${req.protocol}://${req.get('host')}/api/files/temp-download/${file._id}`;
        
        res.json({ success: true, downloadUrl });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// 3. Tải file tạm thời (Không yêu cầu đăng nhập - dùng cho bộ xem tài liệu)
exports.tempDownload = async (req, res) => {
    try {
        const file = await File.findById(req.params.id);
        if (!file) return res.status(404).send('File not found');

        let fileData = file.data;
        // Giải mã nếu file đang ở trạng thái encrypted
        if (file.encrypted) {
            fileData = fileEncryption.decrypt(file.data);
        }

        res.set('Content-Type', file.mimeType);
        res.set('Content-Disposition', `inline; filename="${file.originalName}"`);
        res.send(fileData);
    } catch (error) {
        res.status(500).send('Error processing file');
    }
};