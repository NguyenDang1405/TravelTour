#!/usr/bin/env node

/**
 * Debug script to test VNPay hash generation
 * Compare our hash with expected format
 */

const crypto = require('crypto');

// VNPay credentials (from user)
const vnp_TmnCode = '99WW9VJ7';
const vnp_HashSecret = '9PSH4M4ZJDI5P7XI9MON7WPNGZ4K7TVF';

// Test parameters (similar to what we generate)
const testParams = {
  vnp_Version: '2.1.0',
  vnp_Command: 'pay',
  vnp_TmnCode: vnp_TmnCode,
  vnp_Amount: '100000', // 1000 VND in cents
  vnp_CurrCode: 'VND',
  vnp_TxnRef: '12345678901234567890',
  vnp_OrderInfo: 'Payment for booking test',
  vnp_OrderType: 'other',
  vnp_Locale: 'vn',
  vnp_ReturnUrl: 'https://rabidly-premorula-odessa.ngrok-free.dev/payment-callback',
  vnp_IpAddr: '127.0.0.1',
  vnp_CreateDate: '20251211120000',
};

console.log('🔍 VNPay Hash Debug Tool\n');
console.log('Test Parameters:');
console.log(JSON.stringify(testParams, null, 2));
console.log('\n');

// Method 1: Current method (no encoding)
console.log('📝 Method 1: No URL encoding (current)');
const sorted1 = Object.entries(testParams)
  .sort(([a], [b]) => a.localeCompare(b))
  .map(([key, value]) => `${key}=${value}`)
  .join('&');
console.log('Sorted string:', sorted1);
const hash1 = crypto.createHmac('sha512', vnp_HashSecret)
  .update(sorted1)
  .digest('hex')
  .toUpperCase();
console.log('Hash:', hash1);
console.log('\n');

// Method 2: URL encode returnUrl only
console.log('📝 Method 2: URL encode returnUrl only');
const testParams2 = { ...testParams };
testParams2.vnp_ReturnUrl = encodeURIComponent(testParams2.vnp_ReturnUrl);
const sorted2 = Object.entries(testParams2)
  .sort(([a], [b]) => a.localeCompare(b))
  .map(([key, value]) => `${key}=${value}`)
  .join('&');
console.log('Sorted string:', sorted2);
const hash2 = crypto.createHmac('sha512', vnp_HashSecret)
  .update(sorted2)
  .digest('hex')
  .toUpperCase();
console.log('Hash:', hash2);
console.log('\n');

// Method 3: URL encode all values
console.log('📝 Method 3: URL encode all values');
const sorted3 = Object.entries(testParams)
  .sort(([a], [b]) => a.localeCompare(b))
  .map(([key, value]) => `${key}=${encodeURIComponent(value)}`)
  .join('&');
console.log('Sorted string:', sorted3);
const hash3 = crypto.createHmac('sha512', vnp_HashSecret)
  .update(sorted3)
  .digest('hex')
  .toUpperCase();
console.log('Hash:', hash3);
console.log('\n');

// Method 4: Check if returnUrl needs special handling
console.log('📝 Method 4: Check returnUrl format');
const returnUrlVariations = [
  'https://rabidly-premorula-odessa.ngrok-free.dev/payment-callback',
  'https://rabidly-premorula-odessa.ngrok-free.dev/payment-callback/',
  encodeURIComponent('https://rabidly-premorula-odessa.ngrok-free.dev/payment-callback'),
];

returnUrlVariations.forEach((url, idx) => {
  const params = { ...testParams, vnp_ReturnUrl: url };
  const sorted = Object.entries(params)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${key}=${value}`)
    .join('&');
  const hash = crypto.createHmac('sha512', vnp_HashSecret)
    .update(sorted)
    .digest('hex')
    .toUpperCase();
  console.log(`  Variation ${idx + 1} (${url.substring(0, 50)}...):`);
  console.log(`  Hash: ${hash.substring(0, 40)}...`);
});

console.log('\n✅ Debug complete');
console.log('\n💡 Note: VNPay typically requires Method 1 (no encoding)');
console.log('   But returnUrl might need special handling if it contains special characters');

