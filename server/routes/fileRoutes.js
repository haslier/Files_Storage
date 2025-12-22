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

// Get public link for Office files
router.get('/public-link/:id', authMiddleware, fileController.getPublicLink);

// Temporary download with token (NO AUTH - public với token)
router.get('/temp-download/:id', fileController.tempDownload);


module.exports = router;