#!/usr/bin/env node

/**
 * Script to migrate backend environment variables from .env to Convex
 * This ensures variables are in the correct location
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const envPath = path.join(process.cwd(), '.env');

// Backend variables that should be in Convex, not .env
const backendVars = [
  'VNPAY_TMN_CODE',
  'VNPAY_HASH_SECRET',
  'GEMINI_API_KEY',
  'AMADEUS_API_KEY',
  'AMADEUS_API_SECRET',
  'FOURSQUARE_API_KEY',
  'OPENWEATHER_API_KEY',
];

// Frontend variables that should stay in .env
const frontendVars = [
  'EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY',
  'EXPO_PUBLIC_CONVEX_URL',
  'EXPO_PUBLIC_VNPAY_RETURN_URL',
];

function question(query) {
  return new Promise(resolve => rl.question(query, resolve));
}

async function setConvexEnv(name, value) {
  try {
    console.log(`   Setting ${name} in Convex...`);
    execSync(`npx convex env set ${name} ${value}`, { stdio: 'inherit' });
    console.log(`   ✅ ${name} set successfully\n`);
    return true;
  } catch (error) {
    console.error(`   ❌ Failed to set ${name}:`, error.message);
    return false;
  }
}

async function migrate() {
  console.log('🔄 Migrating Backend Variables to Convex\n');
  console.log('This script will:');
  console.log('  1. Read backend variables from .env');
  console.log('  2. Set them in Convex Dashboard');
  console.log('  3. Remove them from .env file\n');

  if (!fs.existsSync(envPath)) {
    console.error('❌ .env file not found!');
    rl.close();
    process.exit(1);
  }

  const envContent = fs.readFileSync(envPath, 'utf8');
  const envLines = envContent.split('\n');
  const newEnvLines = [];
  const varsToMigrate = [];

  // Parse .env file
  envLines.forEach(line => {
    const trimmed = line.trim();
    
    // Skip comments and empty lines
    if (!trimmed || trimmed.startsWith('#')) {
      newEnvLines.push(line);
      return;
    }

    const [key, ...valueParts] = trimmed.split('=');
    const keyTrimmed = key.trim();
    const value = valueParts.join('=').trim();

    if (backendVars.includes(keyTrimmed)) {
      // This variable should be migrated to Convex
      varsToMigrate.push({ key: keyTrimmed, value });
      console.log(`📦 Found ${keyTrimmed} in .env (will migrate to Convex)`);
    } else if (keyTrimmed === 'CONVEX_DEPLOYMENT') {
      // Deprecated variable, skip it
      console.log(`⚠️  Skipping deprecated CONVEX_DEPLOYMENT`);
    } else {
      // Keep this line in .env
      newEnvLines.push(line);
    }
  });

  if (varsToMigrate.length === 0) {
    console.log('\n✅ No backend variables found in .env. Everything looks good!');
    rl.close();
    return;
  }

  console.log(`\n📋 Found ${varsToMigrate.length} variable(s) to migrate:\n`);
  varsToMigrate.forEach(v => {
    const displayValue = v.value.length > 20 ? v.value.substring(0, 20) + '...' : v.value;
    console.log(`   - ${v.key} = ${displayValue}`);
  });

  const answer = await question('\n❓ Proceed with migration? (y/n): ');
  if (answer.toLowerCase() !== 'y' && answer.toLowerCase() !== 'yes') {
    console.log('\n❌ Migration cancelled.');
    rl.close();
    return;
  }

  console.log('\n🚀 Starting migration...\n');

  let successCount = 0;
  let failCount = 0;

  // Set variables in Convex
  for (const { key, value } of varsToMigrate) {
    const success = await setConvexEnv(key, value);
    if (success) {
      successCount++;
    } else {
      failCount++;
    }
  }

  // Update .env file (remove migrated variables)
  if (successCount > 0) {
    console.log('📝 Updating .env file (removing migrated variables)...\n');
    fs.writeFileSync(envPath, newEnvLines.join('\n'), 'utf8');
    console.log('✅ .env file updated\n');
  }

  // Summary
  console.log('📊 Migration Summary:');
  console.log(`   ✅ Successfully migrated: ${successCount}`);
  if (failCount > 0) {
    console.log(`   ❌ Failed: ${failCount}`);
  }
  console.log('\n⚠️  Important:');
  console.log('   1. Restart Convex dev server: npm run dev:be');
  console.log('   2. Restart Expo dev server: npm run dev:fe');
  console.log('   3. Verify setup: npm run verify-env\n');

  rl.close();
}

migrate().catch(error => {
  console.error('❌ Migration failed:', error);
  rl.close();
  process.exit(1);
});

