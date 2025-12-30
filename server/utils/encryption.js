const crypto = require('crypto');

class FileEncryption {
    constructor() {
        // Algorithm: AES-256-CBC (Cipher Block Chaining)
        this.algorithm = 'aes-256-cbc';
        
        // Get encryption key from environment
        const keyHex = process.env.ENCRYPTION_KEY;
        
        if (!keyHex) {
            throw new Error('ENCRYPTION_KEY not found in environment variables');
        }
        
        // Convert hex string to Buffer (32 bytes = 256 bits)
        this.key = Buffer.from(keyHex, 'hex');
        
        // Validate key length
        if (this.key.length !== 32) {
            throw new Error('Encryption key must be 32 bytes (64 hex characters)');
        }
        
        console.log('✅ File encryption initialized with AES-256-CBC');
    }

    /**
     * Encrypt file buffer
     * @param {Buffer} buffer - Original file data
     * @returns {Buffer} - IV + Encrypted data
     */
    encrypt(buffer) {
        try {
            console.log(`🔐 Encrypting ${buffer.length} bytes...`);
            
            // Generate random IV (16 bytes for AES)
            // IV MUST be unique for each encryption
            const iv = crypto.randomBytes(16);
            
            // Create cipher with key and IV
            const cipher = crypto.createCipheriv(this.algorithm, this.key, iv);
            
            // Encrypt the data
            let encrypted = cipher.update(buffer);
            encrypted = Buffer.concat([encrypted, cipher.final()]);
            
            // Combine IV + encrypted data
            // We need to store IV to decrypt later
            const result = Buffer.concat([iv, encrypted]);
            
            console.log(`✅ Encrypted successfully: ${result.length} bytes`);
            console.log(`   - IV: 16 bytes`);
            console.log(`   - Encrypted data: ${encrypted.length} bytes`);
            console.log(`   - Overhead: ${result.length - buffer.length} bytes (${((result.length / buffer.length - 1) * 100).toFixed(1)}%)`);
            
            return result;
            
        } catch (error) {
            console.error('❌ Encryption error:', error);
            throw new Error(`Failed to encrypt file: ${error.message}`);
        }
    }

    /**
     * Decrypt file buffer
     * @param {Buffer} encryptedBuffer - IV + Encrypted data
     * @returns {Buffer} - Original file data
     */
    decrypt(encryptedBuffer) {
        try {
            console.log(`🔓 Decrypting ${encryptedBuffer.length} bytes...`);
            
            // Extract IV from the first 16 bytes
            const iv = encryptedBuffer.slice(0, 16);
            
            // Extract encrypted data (everything after IV)
            const encrypted = encryptedBuffer.slice(16);
            
            console.log(`   - IV: ${iv.length} bytes`);
            console.log(`   - Encrypted data: ${encrypted.length} bytes`);
            
            // Create decipher with key and IV
            const decipher = crypto.createDecipheriv(this.algorithm, this.key, iv);
            
            // Decrypt the data
            let decrypted = decipher.update(encrypted);
            decrypted = Buffer.concat([decrypted, decipher.final()]);
            
            console.log(`✅ Decrypted successfully: ${decrypted.length} bytes`);
            
            return decrypted;
            
        } catch (error) {
            console.error('❌ Decryption error:', error);
            throw new Error(`Failed to decrypt file: ${error.message}`);
        }
    }

    /**
     * Get encryption info (for testing/debugging)
     */
    getInfo() {
        return {
            algorithm: this.algorithm,
            keySize: this.key.length * 8, // bits
            ivSize: 16 * 8, // bits
            blockSize: 16 // bytes
        };
    }
}

// Export singleton instance
module.exports = new FileEncryption();