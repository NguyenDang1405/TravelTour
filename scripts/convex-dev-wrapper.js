#!/usr/bin/env node

/**
 * Wrapper script để chạy `npx convex dev` mà không bị ghi đè .env.local
 * Script này sẽ:
 * 1. Backup CONVEX_DEPLOYMENT và EXPO_PUBLIC_CONVEX_URL
 * 2. Set environment variable CONVEX_DEPLOYMENT trước khi chạy
 * 3. Restore .env.local sau khi Convex chạy
 */

const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const envPath = path.join(process.cwd(), '.env.local');
const CORRECT_DEPLOYMENT = 'dev:hearty-emu-374';
const CORRECT_URL = 'https://hearty-emu-374.convex.cloud';

function getCurrentDeployment() {
  if (!fs.existsSync(envPath)) {
    return null;
  }

  const envContent = fs.readFileSync(envPath, 'utf8');
  const match = envContent.match(/^CONVEX_DEPLOYMENT=(.+?)(\s*#.*)?$/m);
  return match ? match[1].trim() : null;
}

function restoreEnvFile() {
  if (!fs.existsSync(envPath)) {
    return;
  }

  let envContent = fs.readFileSync(envPath, 'utf8');
  let changed = false;

  // Restore CONVEX_DEPLOYMENT
  const currentDeployment = getCurrentDeployment();
  if (currentDeployment !== CORRECT_DEPLOYMENT) {
    if (envContent.match(/^CONVEX_DEPLOYMENT=/m)) {
      envContent = envContent.replace(
        /^CONVEX_DEPLOYMENT=.*$/m,
        `CONVEX_DEPLOYMENT=${CORRECT_DEPLOYMENT} # team: duy-tran-ha, project: travel-tour`
      );
    } else {
      const convexBackendIndex = envContent.indexOf('# Convex Backend');
      if (convexBackendIndex !== -1) {
        const insertIndex = envContent.indexOf('\n', convexBackendIndex) + 1;
        envContent = envContent.slice(0, insertIndex) + 
                     `CONVEX_DEPLOYMENT=${CORRECT_DEPLOYMENT} # team: duy-tran-ha, project: travel-tour\n` + 
                     envContent.slice(insertIndex);
      }
    }
    changed = true;
  }

  // Restore EXPO_PUBLIC_CONVEX_URL
  const urlMatch = envContent.match(/^EXPO_PUBLIC_CONVEX_URL=(.+)$/m);
  const currentUrl = urlMatch ? urlMatch[1].trim() : null;

  if (currentUrl !== CORRECT_URL) {
    if (envContent.match(/^EXPO_PUBLIC_CONVEX_URL=/m)) {
      envContent = envContent.replace(
        /^EXPO_PUBLIC_CONVEX_URL=.*$/m,
        `EXPO_PUBLIC_CONVEX_URL=${CORRECT_URL}`
      );
    } else {
      const convexBackendIndex = envContent.indexOf('# Convex Backend');
      if (convexBackendIndex !== -1) {
        const insertIndex = envContent.indexOf('\n', convexBackendIndex) + 1;
        envContent = envContent.slice(0, insertIndex) + 
                     `EXPO_PUBLIC_CONVEX_URL=${CORRECT_URL}\n` + 
                     envContent.slice(insertIndex);
      }
    }
    changed = true;
  }

  if (changed) {
    fs.writeFileSync(envPath, envContent, 'utf8');
    console.log('✅ Restored correct Convex deployment in .env.local');
  }
}

// Set CONVEX_DEPLOYMENT as environment variable before running
process.env.CONVEX_DEPLOYMENT = CORRECT_DEPLOYMENT;

console.log(`🔒 Using locked deployment: ${CORRECT_DEPLOYMENT}`);
console.log('💡 .env.local will be protected from overwrite\n');

// Spawn convex dev with the deployment locked
const convexProcess = spawn('npx', ['convex', 'dev'], {
  stdio: 'inherit',
  shell: true,
  env: {
    ...process.env,
    CONVEX_DEPLOYMENT: CORRECT_DEPLOYMENT,
  }
});

// Restore .env.local when process exits
convexProcess.on('exit', (code) => {
  console.log('\n🔄 Restoring .env.local...');
  restoreEnvFile();
  process.exit(code || 0);
});

// Handle Ctrl+C
process.on('SIGINT', () => {
  console.log('\n\n🔄 Restoring .env.local before exit...');
  restoreEnvFile();
  convexProcess.kill('SIGINT');
  process.exit(0);
});

// Also restore periodically (every 5 seconds) as a safety measure
const restoreInterval = setInterval(() => {
  restoreEnvFile();
}, 5000);

convexProcess.on('exit', () => {
  clearInterval(restoreInterval);
});

