#!/usr/bin/env node

/**
 * Script to set all API keys from .env.local to Convex
 * This ensures all API keys are properly configured in Convex Dashboard
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const envLocalPath = path.join(process.cwd(), '.env.local');

// Backend variables that should be in Convex
const backendVars = [
  'GEMINI_API_KEY',
  'AMADEUS_API_KEY',
  'AMADEUS_API_SECRET',
  'FOURSQUARE_API_KEY',
  'OPENWEATHER_API_KEY',
  'GEOAPIFY_API_KEY',
  'WIKIPEDIA_ACCESS_TOKEN',
  'SERPAPI_KEY',
  'CLOUDINARY_CLOUD_NAME',
  'CLOUDINARY_API_KEY',
  'CLOUDINARY_API_SECRET',
  'CLOUDINARY_UPLOAD_PRESET',
];
//done
function parseEnvFile(filePath) {
  if (!fs.existsSync(filePath)) {
    console.error(`❌ File not found: ${filePath}`);
    return {};
  }

  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n');
  const env = {};

  lines.forEach(line => {
    const trimmed = line.trim();
    // Skip comments and empty lines
    if (!trimmed || trimmed.startsWith('#')) {
      return;
    }

    const [key, ...valueParts] = trimmed.split('=');
    const keyTrimmed = key.trim();
    const value = valueParts.join('=').trim();

    if (keyTrimmed && value) {
      env[keyTrimmed] = value;
    }
  });

  return env;
}

function setConvexEnv(name, value) {
  try {
    console.log(`   Setting ${name}...`);
    // Escape value for shell
    const escapedValue = value.replace(/"/g, '\\"');
    execSync(`npx convex env set ${name} "${escapedValue}"`, { stdio: 'inherit' });
    console.log(`   ✅ ${name} set successfully\n`);
    return true;
  } catch (error) {
    console.error(`   ❌ Failed to set ${name}:`, error.message);
    return false;
  }
}

async function setAllApiKeys() {
  console.log('🔑 Setting API Keys from .env.local to Convex\n');

  if (!fs.existsSync(envLocalPath)) {
    console.error(`❌ .env.local file not found at: ${envLocalPath}`);
    process.exit(1);
  }

  const env = parseEnvFile(envLocalPath);
  
  console.log('📋 Found API keys in .env.local:\n');
  const keysToSet = [];
  
  backendVars.forEach(key => {
    if (env[key]) {
      const displayValue = env[key].length > 30 ? env[key].substring(0, 30) + '...' : env[key];
      console.log(`   ✓ ${key} = ${displayValue}`);
      keysToSet.push({ key, value: env[key] });
    } else {
      console.log(`   ✗ ${key} (not found)`);
    }
  });

  if (keysToSet.length === 0) {
    console.log('\n⚠️  No API keys found to set. Make sure .env.local contains the required keys.');
    process.exit(0);
  }

  console.log(`\n🚀 Setting ${keysToSet.length} API key(s) to Convex...\n`);

  let successCount = 0;
  let failCount = 0;

  for (const { key, value } of keysToSet) {
    const success = setConvexEnv(key, value);
    if (success) {
      successCount++;
    } else {
      failCount++;
    }
  }

  // Summary
  console.log('\n📊 Summary:');
  console.log(`   ✅ Successfully set: ${successCount}`);
  if (failCount > 0) {
    console.log(`   ❌ Failed: ${failCount}`);
  }
  
  console.log('\n⚠️  Important:');
  console.log('   1. Restart Convex dev server: npm run dev:be');
  console.log('   2. Verify setup: npx convex env list');
  console.log('\n');
}

setAllApiKeys().catch(error => {
  console.error('❌ Failed to set API keys:', error);
  process.exit(1);
});

