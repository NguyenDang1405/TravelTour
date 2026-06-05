#!/usr/bin/env node

/**
 * Script to verify environment variables setup
 * Checks if variables are in correct places (.env vs Convex)
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🔍 Verifying Environment Variables Setup...\n');

const envPath = path.join(process.cwd(), '.env');
const issues = [];

// Frontend variables (should be in .env)
const frontendVars = [
  'EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY',
  'EXPO_PUBLIC_CONVEX_URL',
  'EXPO_PUBLIC_VNPAY_RETURN_URL',
];

// Backend variables (should be in Convex, NOT in .env)
const backendVars = [
  'VNPAY_TMN_CODE',
  'VNPAY_HASH_SECRET',
  'GEMINI_API_KEY',
  'AMADEUS_API_KEY',
  'AMADEUS_API_SECRET',
  'FOURSQUARE_API_KEY',
  'OPENWEATHER_API_KEY',
];

// Check .env file
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  const envLines = envContent.split('\n');
  
  console.log('📄 Checking .env file...\n');
  
  // Check for backend variables in .env (should NOT be there)
  backendVars.forEach(varName => {
    const regex = new RegExp(`^${varName}=`, 'm');
    if (regex.test(envContent)) {
      issues.push({
        type: 'error',
        message: `❌ ${varName} should NOT be in .env file. It must be set in Convex Dashboard.`,
        fix: `Remove ${varName} from .env and set it in Convex: npx convex env set ${varName} <value>`,
      });
    }
  });
  
  // Check for frontend variables
  frontendVars.forEach(varName => {
    const regex = new RegExp(`^${varName}=`, 'm');
    if (!regex.test(envContent)) {
      issues.push({
        type: 'warning',
        message: `⚠️  ${varName} not found in .env file.`,
        fix: `Add ${varName} to .env file`,
      });
    } else {
      // Check if value is placeholder
      const line = envLines.find(l => l.startsWith(varName));
      if (line && (line.includes('your_') || line.includes('YOUR_') || line.includes('placeholder'))) {
        issues.push({
          type: 'warning',
          message: `⚠️  ${varName} has placeholder value in .env.`,
          fix: `Update ${varName} with actual value in .env file`,
        });
      }
    }
  });
  
  // Check for CONVEX_DEPLOYMENT (deprecated, should use EXPO_PUBLIC_CONVEX_URL)
  if (envContent.includes('CONVEX_DEPLOYMENT=')) {
    issues.push({
      type: 'info',
      message: `ℹ️  CONVEX_DEPLOYMENT found. This is deprecated. Use EXPO_PUBLIC_CONVEX_URL instead.`,
      fix: `Remove CONVEX_DEPLOYMENT and ensure EXPO_PUBLIC_CONVEX_URL is set`,
    });
  }
} else {
  issues.push({
    type: 'error',
    message: '❌ .env file not found!',
    fix: 'Run: npm run create-env',
  });
}

// Check Convex environment variables
console.log('🔍 Checking Convex environment variables...\n');
try {
  const convexEnvOutput = execSync('npx convex env list', { encoding: 'utf8', stdio: 'pipe' });
  const convexVars = convexEnvOutput.split('\n')
    .filter(line => line.includes('='))
    .map(line => line.split('=')[0].trim());
  
  // Check required backend variables
  const requiredBackendVars = ['VNPAY_TMN_CODE', 'VNPAY_HASH_SECRET'];
  requiredBackendVars.forEach(varName => {
    if (!convexVars.includes(varName)) {
      issues.push({
        type: 'error',
        message: `❌ ${varName} not set in Convex Dashboard.`,
        fix: `Run: npm run set-vnpay-credentials 99WW9VJ7 9PSH4M4ZJDI5P7XI9MON7WPNGZ4K7TVF`,
      });
    }
  });
  
  console.log('✅ Convex variables check completed\n');
} catch (error) {
  issues.push({
    type: 'warning',
    message: '⚠️  Could not check Convex variables. Make sure Convex is initialized.',
    fix: 'Run: npx convex dev',
  });
}

// Summary
console.log('📋 Summary:\n');
if (issues.length === 0) {
  console.log('✅ All environment variables are correctly configured!\n');
} else {
  issues.forEach(issue => {
    console.log(issue.message);
    if (issue.fix) {
      console.log(`   Fix: ${issue.fix}\n`);
    }
  });
  
  console.log('\n💡 Quick fixes:');
  console.log('   1. Remove backend variables from .env (they belong in Convex)');
  console.log('   2. Set VNPay credentials: npm run set-vnpay-credentials 99WW9VJ7 9PSH4M4ZJDI5P7XI9MON7WPNGZ4K7TVF');
  console.log('   3. Restart Convex dev server after changes\n');
}

process.exit(issues.filter(i => i.type === 'error').length > 0 ? 1 : 0);

