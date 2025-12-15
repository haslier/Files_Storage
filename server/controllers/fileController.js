const File = require('../models/File');
const multer = require('multer');
const { logAction } = require('../middleware/auditLogger');
const path = require('path');

// File type whitelist
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
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/zip',
    'application/x-rar-compressed'
];

// Multer config
const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
    // Check MIME type
    if (!allowedMimeTypes.includes(file.mimetype)) {
        return cb(new Error('File type not allowed'), false);
    }
    
    // Check file extension
    const ext = path.extname(file.originalname).toLowerCase();
    const allowedExts = ['.txt', '.js', '.json', '.html', '.css', '.md', '.xml', '.csv', 
                         '.jpg', '.jpeg', '.png', '.gif', '.webp', '.pdf', 
                         '.doc', '.docx', '.xls', '.xlsx', '.zip', '.rar'];
    
    if (!allowedExts.includes(ext)) {
        return cb(new Error('File extension not allowed'), false);
    }
    
    cb(null, true);
};

const upload = multer({
    storage: storage,
    limits: { 
        fileSize: 16 * 1024 * 1024, // 16MB
        files: 1 // Only 1 file per request
    },
    fileFilter: fileFilter
});

exports.upload = upload;

// UPLOAD FILE
exports.uploadFile = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: 'No file uploaded'
            });
        }

        // Additional security checks
        if (req.file.size === 0) {
            return res.status(400).json({
                success: false,
                message: 'Empty file not allowed'
            });
        }

        // Check storage limit
        const User = require('../models/User');
        const user = await User.findById(req.userId);

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        const newStorageUsed = user.storageUsed + req.file.size;

        if (newStorageUsed > user.storageLimit) {
            const storageInfo = user.getStorageInfo();
            return res.status(413).json({
                success: false,
                message: `❌ Không đủ dung lượng! Bạn đã dùng ${storageInfo.usedGB}GB / ${storageInfo.limitGB}GB`,
                storageInfo: storageInfo
            });
        }

        const file = new File({
            filename: req.file.originalname,
            originalName: req.file.originalname,
            data: req.file.buffer,
            size: req.file.size,
            mimeType: req.file.mimetype,
            owner: req.userId,
            status: 'active'
        });

        await file.save();

        // Update user storage
        user.storageUsed = newStorageUsed;
        await user.save();

        // Log action
        logAction(req.userId, 'FILE_UPLOADED', {
            fileId: file._id,
            fileName: file.originalName,
            size: file.size,
            mimeType: file.mimeType,
            storageUsed: user.storageUsed,
            storageLimit: user.storageLimit
        });

        console.log('✅ File uploaded:', file.originalName);

        res.status(201).json({
            success: true,
            message: 'File uploaded successfully',
            file: {
                _id: file._id,
                originalName: file.originalName,
                size: file.size,
                uploadedAt: file.uploadedAt
            },
            storageInfo: user.getStorageInfo()
        });

    } catch (error) {
        console.error('Upload error:', error);
        
        logAction(req.userId, 'FILE_UPLOAD_FAILED', {
            error: error.message,
            fileName: req.file?.originalname
        });
        
        res.status(500).json({
            success: false,
            message: 'Error uploading file',
            error: error.message
        });
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

// DOWNLOAD FILE
exports.downloadFile = async (req, res) => {
    try {
        const file = await File.findById(req.params.id);

        if (!file) {
            return res.status(404).json({
                success: false,
                message: 'File not found'
            });
        }

        const hasPermission = file.owner.toString() === req.userId ||
                            file.sharedWith.includes(req.userId);

        if (!hasPermission) {
            return res.status(403).json({
                success: false,
                message: 'Access denied'
            });
        }

        res.set('Content-Type', file.mimeType);
        res.set('Content-Disposition', `attachment; filename="${file.originalName}"`);
        res.send(file.data);

    } catch (error) {
        console.error('Download error:', error);
        res.status(500).json({
            success: false,
            message: 'Error downloading file',
            error: error.message
        });
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

        res.json({
            success: true,
            file: {
                _id: file._id,
                originalName: file.originalName,
                mimeType: file.mimeType,
                content: file.data.toString('utf8'),
                isOwner: file.owner.toString() === req.userId,
                canEdit: true
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
exports.deleteFile = async (req, res) => {
    try {
        const file = await File.findById(req.params.id);

        if (!file) {
            return res.status(404).json({
                success: false,
                message: 'File not found'
            });
        }

        if (file.owner.toString() !== req.userId) {
            logAction(req.userId, 'FILE_DELETE_DENIED', {
                fileId: req.params.id,
                reason: 'Not owner'
            });
            
            return res.status(403).json({
                success: false,
                message: 'Only owner can delete'
            });
        }

        file.status = 'bin';
        file.deletedAt = new Date();
        await file.save();

        logAction(req.userId, 'FILE_MOVED_TO_BIN', {
            fileId: file._id,
            fileName: file.originalName
        });

        res.json({
            success: true,
            message: 'File moved to bin'
        });

    } catch (error) {
        console.error('Delete error:', error);
        res.status(500).json({
            success: false,
            message: 'Error deleting file',
            error: error.message
        });
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