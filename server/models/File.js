const mongoose = require('mongoose');

const fileSchema = new mongoose.Schema({
    filename: { type: String, required: true },
    originalName: { type: String, required: true },
    mimeType: { type: String, required: true },
    size: { type: Number, required: true },
    data: { type: Buffer, required: true }, // Lưu dữ liệu file
    owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    sharedWith: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    status: { type: String, default: 'active', enum: ['active', 'bin'] },
    uploadedAt: { type: Date, default: Date.now },
    deletedAt: { type: Date },
    lastModified: { type: Date, default: Date.now },

    // 🔥 QUAN TRỌNG: Phải thêm dòng này để Mongoose lưu trạng thái mã hóa
    encrypted: { type: Boolean, default: false } 
});

module.exports = mongoose.model('File', fileSchema);