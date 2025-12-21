const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
    username: {
        type: String,
        required: [true, 'Username is required'],
        unique: true,
        trim: true,
        minlength: 3
    },
    email: {
        type: String,
        required: [true, 'Email is required'],
        unique: true,
        lowercase: true,
        trim: true,
        match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email']
    },
    password: {
        type: String,
        required: [true, 'Password is required'],
        minlength: 8,
        select: false // Không trả về password mặc định
    },
    storageUsed: {
        type: Number,
        default: 0 // Bytes
    },
    storageLimit: {
        type: Number,
        default: 1024 * 1024 * 1024 // 1GB in bytes
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

// Hash password trước khi lưu
userSchema.pre('save', async function(next) {
    if (!this.isModified('password')) return next();
    
    try {
        const salt = await bcrypt.genSalt(10);
        this.password = await bcrypt.hash(this.password, salt);
        next();
    } catch (error) {
        next(error);
    }
});

// Method để so sánh password
userSchema.methods.comparePassword = async function(candidatePassword) {
    return await bcrypt.compare(candidatePassword, this.password);
};

// Method để lấy storage info
userSchema.methods.getStorageInfo = function() {
    const usedGB = (this.storageUsed / (1024 * 1024 * 1024)).toFixed(2);
    const limitGB = (this.storageLimit / (1024 * 1024 * 1024)).toFixed(2);
    const percentage = ((this.storageUsed / this.storageLimit) * 100).toFixed(1);
    
    return {
        used: this.storageUsed,
        limit: this.storageLimit,
        usedGB: parseFloat(usedGB),
        limitGB: parseFloat(limitGB),
        percentage: parseFloat(percentage),
        remaining: this.storageLimit - this.storageUsed,
        remainingGB: parseFloat((limitGB - usedGB).toFixed(2))
    };
};

module.exports = mongoose.model('User', userSchema);