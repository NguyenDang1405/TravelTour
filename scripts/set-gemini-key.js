#!/usr/bin/env node

/**
 * Helper script to set GEMINI_API_KEY in Convex
 * 
 * Usage:
 *   node scripts/set-gemini-key.js YOUR_API_KEY
 * 
 * Or use Convex CLI directly:
 *   npx convex env set GEMINI_API_KEY YOUR_API_KEY
 */

const { execSync } = require('child_process');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function setGeminiKey(apiKey) {
  if (!apiKey) {
    console.log('❌ Error: API key is required');
    console.log('\nUsage:');
    console.log('  node scripts/set-gemini-key.js YOUR_API_KEY');
    console.log('\nOr use Convex CLI directly:');
    console.log('  npx convex env set GEMINI_API_KEY YOUR_API_KEY');
    process.exit(1);
  }

  try {
    console.log('🔄 Setting GEMINI_API_KEY in Convex...');
    execSync(`npx convex env set GEMINI_API_KEY ${apiKey}`, { stdio: 'inherit' });
    console.log('\n✅ GEMINI_API_KEY đã được set thành công!');
    console.log('\n📝 Next steps:');
    console.log('1. Restart Convex dev server: npm run dev:be');
    console.log('2. Test AI chat - không còn warning nữa');
  } catch (error) {
    console.error('❌ Error setting environment variable:', error.message);
    console.log('\n💡 Alternative: Set manually in Convex Dashboard:');
    console.log('   1. Go to https://dashboard.convex.dev');
    console.log('   2. Select your project');
    console.log('   3. Settings → Environment Variables');
    console.log('   4. Add: GEMINI_API_KEY =', apiKey);
    process.exit(1);
  }
}

// Get API key from command line argument
const apiKey = process.argv[2];

if (apiKey) {
  setGeminiKey(apiKey);
} else {
  console.log('🔑 GEMINI_API_KEY Setup Helper\n');
  console.log('Bạn có thể set GEMINI_API_KEY bằng 2 cách:\n');
  
  console.log('Cách 1: Sử dụng script này');
  console.log('  node scripts/set-gemini-key.js YOUR_API_KEY\n');
  
  console.log('Cách 2: Sử dụng Convex CLI trực tiếp');
  console.log('  npx convex env set GEMINI_API_KEY YOUR_API_KEY\n');
  
  console.log('Cách 3: Set trong Convex Dashboard');
  console.log('  1. Go to https://dashboard.convex.dev');
  console.log('  2. Select your project');
  console.log('  3. Settings → Environment Variables');
  console.log('  4. Add: GEMINI_API_KEY = YOUR_API_KEY\n');
  
  console.log('📝 Lấy API key từ: https://aistudio.google.com/apikey\n');
  
  rl.question('Nhập GEMINI_API_KEY của bạn (hoặc Enter để bỏ qua): ', (answer) => {
    if (answer.trim()) {
      setGeminiKey(answer.trim());
    } else {
      console.log('❌ Không có API key được nhập. Vui lòng thử lại sau.');
    }
    rl.close();
  });
}

