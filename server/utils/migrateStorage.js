require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');
const File = require('../models/File');

async function migrateStorage() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Connected to MongoDB\n');

        const users = await User.find({});
        console.log(`📊 Found ${users.length} users\n`);

        for (const user of users) {
            // Tính tổng dung lượng files của user
            const files = await File.find({ 
                owner: user._id,
                status: 'active'
            });

            const totalSize = files.reduce((sum, file) => sum + file.size, 0);

            // Update user storage
            user.storageUsed = totalSize;
            user.storageLimit = user.storageLimit || 1024 * 1024 * 1024; // 1GB
            await user.save();

            const storageInfo = user.getStorageInfo();

            console.log(`👤 ${user.username}`);
            console.log(`   Files: ${files.length}`);
            console.log(`   Storage: ${storageInfo.usedGB} GB / ${storageInfo.limitGB} GB (${storageInfo.percentage}%)`);
            console.log('');
        }

        await mongoose.disconnect();
        console.log('✅ Migration complete!');

    } catch (error) {
        console.error('❌ Migration error:', error);
        process.exit(1);
    }
}

migrateStorage();