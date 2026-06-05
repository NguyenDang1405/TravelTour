#!/usr/bin/env node

/**
 * Script to create .env file from env.example
 * Usage: node scripts/create-env.js
 */

const fs = require('fs');
const path = require('path');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function question(query) {
  return new Promise(resolve => rl.question(query, resolve));
}

async function createEnvFile() {
  console.log('📝 Creating .env file from env.example...\n');

  const envPath = path.join(process.cwd(), '.env');
  const envLocalPath = path.join(process.cwd(), '.env.local');
  const envExamplePath = path.join(process.cwd(), 'env.example');

  // Check if .env or .env.local already exists
  if (fs.existsSync(envPath)) {
    const overwrite = await question('⚠️  .env already exists. Overwrite? (y/N): ');
    if (overwrite.toLowerCase() !== 'y') {
      console.log('❌ Cancelled. Keeping existing .env file.');
      rl.close();
      return;
    }
  }

  if (fs.existsSync(envLocalPath)) {
    console.log('ℹ️  .env.local exists. Expo will use .env.local if both exist.\n');
  }

  if (!fs.existsSync(envExamplePath)) {
    console.error('❌ env.example not found!');
    rl.close();
    process.exit(1);
  }

  // Read env.example
  const envExample = fs.readFileSync(envExamplePath, 'utf8');
  
  // Create .env with placeholders
  fs.writeFileSync(envPath, envExample);
  
  console.log('✅ .env file created from env.example!\n');
  console.log('📋 Next steps:');
  console.log('   1. Open .env file and fill in your API keys');
  console.log('   2. For VNPay Return URL, use ngrok URL (see NGROK_SETUP_GUIDE.md)');
  console.log('   3. VNPay credentials (TMN_CODE, HASH_SECRET) must be set in Convex Dashboard');
  console.log('   4. Restart Expo dev server after updating .env\n');
  
  rl.close();
}

createEnvFile();

