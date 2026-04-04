#!/usr/bin/env node

/**
 * Script to set VNPay credentials in Convex environment variables
 * Usage: node scripts/set-vnpay-credentials.js [TMN_CODE] [HASH_SECRET]
 * Or: npm run set-vnpay-credentials
 */

const { execSync } = require('child_process');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function question(query) {
  return new Promise(resolve => rl.question(query, resolve));
}

async function setVNPayCredentials() {
  console.log('🔐 VNPay Credentials Setup\n');
  console.log('This script will set VNPay credentials in Convex environment variables.\n');

  let tmnCode = process.argv[2];
  let hashSecret = process.argv[3];

  // If not provided as arguments, ask user
  if (!tmnCode) {
    tmnCode = await question('Enter VNPay Terminal ID (vnp_TmnCode): ');
  }

  if (!hashSecret) {
    hashSecret = await question('Enter VNPay Secret Key (vnp_HashSecret): ');
  }

  // Validate
  if (!tmnCode || !hashSecret) {
    console.error('❌ Error: Both Terminal ID and Secret Key are required');
    process.exit(1);
  }

  if (tmnCode.trim().length === 0 || hashSecret.trim().length === 0) {
    console.error('❌ Error: Terminal ID and Secret Key cannot be empty');
    process.exit(1);
  }

  console.log('\n📝 Setting VNPay credentials in Convex...\n');

  try {
    // Set VNPAY_TMN_CODE
    console.log('Setting VNPAY_TMN_CODE...');
    execSync(`npx convex env set VNPAY_TMN_CODE "${tmnCode.trim()}"`, {
      stdio: 'inherit',
    });
    console.log('✅ VNPAY_TMN_CODE set successfully\n');

    // Set VNPAY_HASH_SECRET
    console.log('Setting VNPAY_HASH_SECRET...');
    execSync(`npx convex env set VNPAY_HASH_SECRET "${hashSecret.trim()}"`, {
      stdio: 'inherit',
    });
    console.log('✅ VNPAY_HASH_SECRET set successfully\n');

    console.log('🎉 VNPay credentials configured successfully!\n');
    console.log('📋 Summary:');
    console.log(`   Terminal ID: ${tmnCode.trim()}`);
    console.log(`   Secret Key: ${hashSecret.trim().substring(0, 10)}... (hidden)\n`);
    console.log('⚠️  Important:');
    console.log('   1. Restart Convex dev server: npm run dev:be');
    console.log('   2. Set EXPO_PUBLIC_VNPAY_RETURN_URL in .env file');
    console.log('   3. Register return URL in VNPay merchant portal\n');

  } catch (error) {
    console.error('❌ Error setting VNPay credentials:', error.message);
    console.error('\n💡 Make sure:');
    console.error('   1. You are logged in to Convex: npx convex login');
    console.error('   2. Convex project is initialized: npx convex dev');
    process.exit(1);
  }

  rl.close();
}

setVNPayCredentials();

