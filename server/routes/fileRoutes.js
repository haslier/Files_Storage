const express = require('express');
const router = express.Router();
const fileController = require('../controllers/fileController');
const authMiddleware = require('../middleware/authMiddleware');

// Upload
router.post('/upload', 
    authMiddleware, 
    fileController.upload.single('file'), 
    fileController.uploadFile
);

// ============================================
// ✅ NEW: Update existing file (for Office Editor)
// ============================================
router.put('/update/:id', 
    authMiddleware, 
    fileController.upload.single('file'), 
    fileController.updateFile
);

// Get files by sections
router.get('/myfiles', authMiddleware, fileController.getMyFiles);
router.get('/shared-by-you', authMiddleware, fileController.getSharedByYou);
router.get('/shared-to-you', authMiddleware, fileController.getSharedToYou);
router.get('/bin', authMiddleware, fileController.getBinFiles);

// File operations
router.get('/view/:id', authMiddleware, fileController.viewFile);
router.put('/save/:id', authMiddleware, fileController.saveFile);
router.get('/download/:id', authMiddleware, fileController.downloadFile);
router.delete('/:id', authMiddleware, fileController.deleteFile);
router.put('/restore/:id', authMiddleware, fileController.restoreFile);
router.delete('/permanent/:id', authMiddleware, fileController.deletePermanently);
router.post('/share/:id', authMiddleware, fileController.shareFile);

// Get public link for Office files (requires auth)
router.get('/public-link/:id', authMiddleware, fileController.getPublicLink);

// ✅ FIXED: Handle OPTIONS preflight for CORS
router.options('/temp-download/:id', (req, res) => {
    res.set({
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
        'Access-Control-Allow-Headers': 'Origin, X-Requested-With, Content-Type, Accept, Range',
        'Access-Control-Max-Age': '86400' // 24 hours
    });
    res.sendStatus(204); // No Content
});

// ✅ Temporary download with token (NO AUTH - public with token)
// IMPORTANT: This must come AFTER OPTIONS handler
router.get('/temp-download/:id', fileController.tempDownload);

module.exports = router;