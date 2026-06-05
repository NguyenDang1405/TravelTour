#!/usr/bin/env node

/**
 * Script để bảo vệ CONVEX_DEPLOYMENT và EXPO_PUBLIC_CONVEX_URL trong .env.local
 * Sử dụng script này trước khi chạy các lệnh Convex có thể ghi đè .env.local
 * 
 * Usage:
 *   node scripts/protect-convex-env.js restore
 *   node scripts/protect-convex-env.js backup
 */

const fs = require('fs');
const path = require('path');

const envPath = path.join(process.cwd(), '.env.local');
const backupPath = path.join(process.cwd(), '.env.local.convex-backup');

function backupConvexConfig() {
  if (!fs.existsSync(envPath)) {
    console.log('⚠️  .env.local not found, nothing to backup');
    return false;
  }

  const envContent = fs.readFileSync(envPath, 'utf8');
  const convexDeploymentMatch = envContent.match(/^CONVEX_DEPLOYMENT=(.+)$/m);
  const convexUrlMatch = envContent.match(/^EXPO_PUBLIC_CONVEX_URL=(.+)$/m);

  const backup = {
    CONVEX_DEPLOYMENT: convexDeploymentMatch ? convexDeploymentMatch[1].trim() : null,
    EXPO_PUBLIC_CONVEX_URL: convexUrlMatch ? convexUrlMatch[1].trim() : null,
  };

  if (backup.CONVEX_DEPLOYMENT || backup.EXPO_PUBLIC_CONVEX_URL) {
    fs.writeFileSync(backupPath, JSON.stringify(backup, null, 2), 'utf8');
    console.log('✅ Convex config backed up:', backup);
    return true;
  }

  console.log('⚠️  No Convex config found to backup');
  return false;
}

function restoreConvexConfig() {
  if (!fs.existsSync(backupPath)) {
    console.log('⚠️  No backup found, nothing to restore');
    return false;
  }

  if (!fs.existsSync(envPath)) {
    console.log('⚠️  .env.local not found, cannot restore');
    return false;
  }

  const backup = JSON.parse(fs.readFileSync(backupPath, 'utf8'));
  let envContent = fs.readFileSync(envPath, 'utf8');

  let restored = false;

  // Restore CONVEX_DEPLOYMENT
  if (backup.CONVEX_DEPLOYMENT) {
    if (envContent.match(/^CONVEX_DEPLOYMENT=/m)) {
      envContent = envContent.replace(
        /^CONVEX_DEPLOYMENT=.*$/m,
        `CONVEX_DEPLOYMENT=${backup.CONVEX_DEPLOYMENT}`
      );
    } else {
      // Add it if it doesn't exist
      const convexBackendIndex = envContent.indexOf('# Convex Backend');
      if (convexBackendIndex !== -1) {
        const insertIndex = envContent.indexOf('\n', convexBackendIndex) + 1;
        envContent = envContent.slice(0, insertIndex) + 
                     `CONVEX_DEPLOYMENT=${backup.CONVEX_DEPLOYMENT}\n` + 
                     envContent.slice(insertIndex);
      }
    }
    restored = true;
  }

  // Restore EXPO_PUBLIC_CONVEX_URL
  if (backup.EXPO_PUBLIC_CONVEX_URL) {
    if (envContent.match(/^EXPO_PUBLIC_CONVEX_URL=/m)) {
      envContent = envContent.replace(
        /^EXPO_PUBLIC_CONVEX_URL=.*$/m,
        `EXPO_PUBLIC_CONVEX_URL=${backup.EXPO_PUBLIC_CONVEX_URL}`
      );
    } else {
      // Add it if it doesn't exist
      const convexBackendIndex = envContent.indexOf('# Convex Backend');
      if (convexBackendIndex !== -1) {
        const insertIndex = envContent.indexOf('\n', convexBackendIndex) + 1;
        envContent = envContent.slice(0, insertIndex) + 
                     `EXPO_PUBLIC_CONVEX_URL=${backup.EXPO_PUBLIC_CONVEX_URL}\n` + 
                     envContent.slice(insertIndex);
      }
    }
    restored = true;
  }

  if (restored) {
    fs.writeFileSync(envPath, envContent, 'utf8');
    console.log('✅ Convex config restored:', backup);
    // Optionally remove backup after successful restore
    // fs.unlinkSync(backupPath);
    return true;
  }

  console.log('⚠️  Nothing to restore');
  return false;
}

// Main
const command = process.argv[2];

if (command === 'backup') {
  backupConvexConfig();
} else if (command === 'restore') {
  restoreConvexConfig();
} else {
  console.log('Usage:');
  console.log('  node scripts/protect-convex-env.js backup   - Backup Convex config');
  console.log('  node scripts/protect-convex-env.js restore - Restore Convex config');
  process.exit(1);
}

