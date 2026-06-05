#!/usr/bin/env node

/**
 * Script để "lock" Convex deployment bằng cách tạo file convex.json
 * File này sẽ ngăn Convex CLI tạo deployment mới khi chạy với tài khoản khác
 */

const fs = require('fs');
const path = require('path');

const envPath = path.join(process.cwd(), '.env.local');
const convexJsonPath = path.join(process.cwd(), 'convex', 'convex.json');

function lockDeployment() {
  if (!fs.existsSync(envPath)) {
    console.error('❌ .env.local not found. Please set CONVEX_DEPLOYMENT first.');
    process.exit(1);
  }

  const envContent = fs.readFileSync(envPath, 'utf8');
  const convexDeploymentMatch = envContent.match(/^CONVEX_DEPLOYMENT=(.+?)(\s*#.*)?$/m);
  
  if (!convexDeploymentMatch) {
    console.error('❌ CONVEX_DEPLOYMENT not found in .env.local');
    console.log('💡 Please set CONVEX_DEPLOYMENT in .env.local first:');
    console.log('   CONVEX_DEPLOYMENT=dev:oceanic-setter-659');
    process.exit(1);
  }

  const deployment = convexDeploymentMatch[1].trim();
  console.log(`🔒 Locking Convex deployment: ${deployment}`);

  // Ensure convex directory exists
  const convexDir = path.join(process.cwd(), 'convex');
  if (!fs.existsSync(convexDir)) {
    fs.mkdirSync(convexDir, { recursive: true });
    console.log('📁 Created convex/ directory');
  }

  // Create convex.json with deployment info
  const convexJson = {
    deployment: deployment,
    // Add a comment to prevent accidental edits
    _comment: "This file locks the Convex deployment. Do not edit manually unless you know what you're doing."
  };

  fs.writeFileSync(convexJsonPath, JSON.stringify(convexJson, null, 2), 'utf8');
  console.log(`✅ Created ${convexJsonPath}`);
  console.log(`🔒 Deployment locked: ${deployment}`);
  console.log('\n💡 This will prevent Convex CLI from creating a new deployment');
  console.log('   when running with a different account/team.');
}

function unlockDeployment() {
  if (fs.existsSync(convexJsonPath)) {
    fs.unlinkSync(convexJsonPath);
    console.log('✅ Removed convex.json - deployment unlocked');
  } else {
    console.log('ℹ️  No convex.json found - deployment is not locked');
  }
}

// Main
const command = process.argv[2];

if (command === 'lock') {
  lockDeployment();
} else if (command === 'unlock') {
  unlockDeployment();
} else {
  console.log('Usage:');
  console.log('  node scripts/lock-convex-deployment.js lock   - Lock current deployment');
  console.log('  node scripts/lock-convex-deployment.js unlock - Unlock deployment');
  process.exit(1);
}

