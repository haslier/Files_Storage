// server/config/db.js

const mongoose = require('mongoose');

// Khai báo biến gfs (biến toàn cục)
let gfs; 

const connectDB = async () => {
    try {
        const conn = await mongoose.connect(process.env.MONGO_URI);
        console.log(`MongoDB Connected: ${conn.connection.host}`);
        
        // === KHỞI TẠO GRIDFS BUCKET (QUAN TRỌNG) ===
        // Lấy db object từ connection
        const db = conn.connection.db; 
        
        // Khởi tạo GridFS Bucket
        gfs = new mongoose.mongo.GridFSBucket(db, {
            bucketName: 'uploads' // Đặt tên bucket để lưu trữ file vật lý
        });
        // ==========================================

    } catch (err) {
        console.error(`Error: ${err.message}`);
        process.exit(1); 
    }
};

// Xuất cả hàm kết nối và hàm lấy gfs
module.exports = { 
    connectDB, 
    // Dùng hàm bọc để gfs chỉ được trả về sau khi đã khởi tạo
    gfs: () => gfs 
};