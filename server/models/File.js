// server/models/File.js

const mongoose = require('mongoose');

const FileSchema = new mongoose.Schema({
    fileName: {
        type: String,
        required: true
    },
    fileSize: {
        type: Number, // Kích thước tính bằng bytes
        required: true
    },
    ownerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User', // Tham chiếu đến User Model
        required: true
    },
    gridFsId: {
        type: mongoose.Schema.Types.ObjectId,
        required: true // ID tham chiếu đến file vật lý trong GridFS
    },
    uploadDate: {
        type: Date,
        default: Date.now
    },
    isPublic: {
        type: Boolean,
        default: false
    },
    shareWith: [{ // Danh sách User ID được chia sẻ
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }]
});

module.exports = mongoose.model('File', FileSchema);