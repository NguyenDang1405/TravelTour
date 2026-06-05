#!/usr/bin/env node

/**
 * Script nhanh để restore Convex deployment về giá trị đúng
 * Sử dụng khi .env.local bị ghi đè bởi tài khoản/team khác
 */

const fs = require('fs');
const path = require('path');

const envPath = path.join(process.cwd(), '.env.local');

// Deployment đúng cần restore
const CORRECT_DEPLOYMENT = 'dev:oceanic-setter-659';
const CORRECT_URL = 'https://oceanic-setter-659.convex.cloud';

function restoreDeployment() {
  if (!fs.existsSync(envPath)) {
    console.error('❌ .env.local not found');
    process.exit(1);
  }

  let envContent = fs.readFileSync(envPath, 'utf8');
  let changed = false;

  // Check and restore CONVEX_DEPLOYMENT
  const currentDeploymentMatch = envContent.match(/^CONVEX_DEPLOYMENT=(.+?)(\s*#.*)?$/m);
  const currentDeployment = currentDeploymentMatch ? currentDeploymentMatch[1].trim() : null;

  if (currentDeployment !== CORRECT_DEPLOYMENT) {
    if (currentDeployment) {
      console.log(`⚠️  Found wrong deployment: ${currentDeployment}`);
    }
    
    if (envContent.match(/^CONVEX_DEPLOYMENT=/m)) {
      envContent = envContent.replace(
        /^CONVEX_DEPLOYMENT=.*$/m,
        `CONVEX_DEPLOYMENT=${CORRECT_DEPLOYMENT} # team: duy-tran-ha, project: travel-tour`
      );
    } else {
      // Add it if it doesn't exist
      const convexBackendIndex = envContent.indexOf('# Convex Backend');
      if (convexBackendIndex !== -1) {
        const insertIndex = envContent.indexOf('\n', convexBackendIndex) + 1;
        envContent = envContent.slice(0, insertIndex) + 
                     `CONVEX_DEPLOYMENT=${CORRECT_DEPLOYMENT} # team: duy-tran-ha, project: travel-tour\n` + 
                     envContent.slice(insertIndex);
      }
    }
    changed = true;
    console.log(`✅ Restored CONVEX_DEPLOYMENT: ${CORRECT_DEPLOYMENT}`);
  }

  // Check and restore EXPO_PUBLIC_CONVEX_URL
  const currentUrlMatch = envContent.match(/^EXPO_PUBLIC_CONVEX_URL=(.+)$/m);
  const currentUrl = currentUrlMatch ? currentUrlMatch[1].trim() : null;

  if (currentUrl !== CORRECT_URL) {
    if (currentUrl) {
      console.log(`⚠️  Found wrong URL: ${currentUrl}`);
    }
    
    if (envContent.match(/^EXPO_PUBLIC_CONVEX_URL=/m)) {
      envContent = envContent.replace(
        /^EXPO_PUBLIC_CONVEX_URL=.*$/m,
        `EXPO_PUBLIC_CONVEX_URL=${CORRECT_URL}`
      );
    } else {
      // Add it if it doesn't exist
      const convexBackendIndex = envContent.indexOf('# Convex Backend');
      if (convexBackendIndex !== -1) {
        const insertIndex = envContent.indexOf('\n', convexBackendIndex) + 1;
        envContent = envContent.slice(0, insertIndex) + 
                     `EXPO_PUBLIC_CONVEX_URL=${CORRECT_URL}\n` + 
                     envContent.slice(insertIndex);
      }
    }
    changed = true;
    console.log(`✅ Restored EXPO_PUBLIC_CONVEX_URL: ${CORRECT_URL}`);
  }

  if (changed) {
    fs.writeFileSync(envPath, envContent, 'utf8');
    console.log('\n✅ Deployment restored successfully!');
    
    // Lock deployment
    try {
      const { execSync } = require('child_process');
      execSync('node scripts/lock-convex-deployment.js lock', { stdio: 'inherit' });
    } catch (error) {
      console.log('⚠️  Could not lock deployment (non-critical)');
    }
  } else {
    console.log('✅ Deployment is already correct!');
  }
}

restoreDeployment();

