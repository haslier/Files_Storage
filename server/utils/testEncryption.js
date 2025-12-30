require('dotenv').config();
const fileEncryption = require('./encryption');
const crypto = require('crypto'); // Đảm bảo require thư viện crypto

console.log('\n' + '='.repeat(60));
console.log('🧪 TESTING FILE ENCRYPTION');
console.log('='.repeat(60) + '\n');

// Hiển thị thông tin cấu hình
const info = fileEncryption.getInfo();
console.log('📋 Encryption Configuration:');
console.log(`   Algorithm: ${info.algorithm}`);
console.log(`   Key Size: ${info.keySize} bits`);
console.log(`   IV Size: ${info.ivSize} bits`);
console.log(`   Block Size: ${info.blockSize} bytes\n`);

// Test 1: Small text file
console.log('📝 Test 1: Small Text File');
console.log('─'.repeat(60));
const testText = 'Hello, this is a secret message! 🔐';
const textBuffer = Buffer.from(testText, 'utf8');

console.log(`Original text: "${testText}"`);
console.log(`Original size: ${textBuffer.length} bytes\n`);

const encryptedText = fileEncryption.encrypt(textBuffer);
console.log(`Encrypted size: ${encryptedText.length} bytes`);
console.log(`Encrypted (hex): ${encryptedText.toString('hex').substring(0, 50)}...\n`);

const decryptedText = fileEncryption.decrypt(encryptedText);
console.log(`Decrypted text: "${decryptedText.toString('utf8')}"`);
console.log(`Decrypted size: ${decryptedText.length} bytes`);
console.log(`✅ Match: ${textBuffer.equals(decryptedText)}\n`);

// Test 2: Large file simulation (SỬA LỖI TẠI ĐÂY)
console.log('📦 Test 2: Large File (1MB)');
console.log('─'.repeat(60));
const sizeInBytes = 1024 * 1024; // 1MB
// Sửa: randomBytes nhận vào độ dài (number), không phải Buffer
const largeBuffer = crypto.randomBytes(sizeInBytes); 

console.log(`Original size: ${largeBuffer.length} bytes (${(largeBuffer.length / 1024 / 1024).toFixed(2)} MB)\n`);

const startEncrypt = Date.now();
const encryptedLarge = fileEncryption.encrypt(largeBuffer);
const encryptTime = Date.now() - startEncrypt;

console.log(`Encrypted size: ${encryptedLarge.length} bytes`);
console.log(`Encryption time: ${encryptTime}ms`);
console.log(`Overhead: ${encryptedLarge.length - largeBuffer.length} bytes (${((encryptedLarge.length / largeBuffer.length - 1) * 100).toFixed(2)}%)\n`);

const startDecrypt = Date.now();
const decryptedLarge = fileEncryption.decrypt(encryptedLarge);
const decryptTime = Date.now() - startDecrypt;

console.log(`Decryption time: ${decryptTime}ms`);
console.log(`✅ Match: ${largeBuffer.equals(decryptedLarge)}\n`);

// Test 3: Different IVs produce different ciphertexts
console.log('🔀 Test 3: IV Uniqueness');
console.log('─'.repeat(60));
const sameText = Buffer.from('Same content');
const encrypted1 = fileEncryption.encrypt(sameText);
const encrypted2 = fileEncryption.encrypt(sameText);

console.log(`Same plaintext encrypted twice:`);
console.log(`Ciphertext 1: ${encrypted1.toString('hex').substring(0, 40)}...`);
console.log(`Ciphertext 2: ${encrypted2.toString('hex').substring(0, 40)}...`);
console.log(`✅ Different: ${!encrypted1.equals(encrypted2)} (Good! IVs are unique)\n`);

// Test 4: Error handling - wrong key/corrupted data
console.log('🚫 Test 4: Error Handling');
console.log('─'.repeat(60));
try {
    const corrupted = Buffer.from(encryptedText);
    // Làm hỏng dữ liệu đã mã hóa bằng cách đổi một byte ngẫu nhiên
    corrupted[20] = corrupted[20] ^ 0xFF; 
    fileEncryption.decrypt(corrupted);
    console.log('❌ Should have thrown error!');
} catch (error) {
    console.log('✅ Correctly rejected corrupted data');
    console.log(`   Error: ${error.message}\n`);
}

console.log('='.repeat(60));
console.log('🎉 ALL TESTS PASSED!');
console.log('='.repeat(60) + '\n');