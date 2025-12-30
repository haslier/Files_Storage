const crypto = require('crypto');

// Generate 256-bit (32 bytes) encryption key
const key = crypto.randomBytes(32).toString('hex');

console.log('\n='.repeat(60));
console.log('🔐 GENERATED ENCRYPTION KEY');
console.log('='.repeat(60));
console.log('\nAdd this to your .env file:');
console.log('\n' + '─'.repeat(60));
console.log(`ENCRYPTION_KEY=${key}`);
console.log('─'.repeat(60));
console.log('\n⚠️  CRITICAL SECURITY WARNINGS:');
console.log('   1. Keep this key SECRET - Never commit to Git');
console.log('   2. Backup this key SECURELY - Store in password manager');
console.log('   3. If you LOSE this key, ALL encrypted files are LOST FOREVER');
console.log('   4. Use DIFFERENT keys for dev and production');
console.log('='.repeat(60) + '\n');