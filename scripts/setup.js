#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🚀 Setting up Travel Tour App...\n');

// Check if .env.local exists
const envPath = path.join(process.cwd(), '.env.local');
const envExamplePath = path.join(process.cwd(), 'env.example');

if (!fs.existsSync(envPath)) {
  if (fs.existsSync(envExamplePath)) {
    console.log('📝 Creating .env.local from env.example...');
    fs.copyFileSync(envExamplePath, envPath);
    console.log('✅ .env.local created! Please update with your API keys.\n');
  } else {
    console.log('⚠️  env.example not found. Please create .env.local manually.\n');
  }
} else {
  console.log('✅ .env.local already exists.\n');
}

// Install dependencies
console.log('📦 Installing dependencies...');
try {
  execSync('npm install', { stdio: 'inherit' });
  console.log('✅ Dependencies installed!\n');
} catch (error) {
  console.error('❌ Failed to install dependencies:', error.message);
  process.exit(1);
}

// Check if Convex is initialized
const convexPath = path.join(process.cwd(), 'convex');
if (!fs.existsSync(path.join(convexPath, 'convex.json'))) {
  console.log('🔧 Initializing Convex...');
  
  // Backup existing Convex deployment config from .env.local
  let savedConvexDeployment = null;
  let savedConvexUrl = null;
  
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf8');
    const convexDeploymentMatch = envContent.match(/^CONVEX_DEPLOYMENT=(.+)$/m);
    const convexUrlMatch = envContent.match(/^EXPO_PUBLIC_CONVEX_URL=(.+)$/m);
    
    if (convexDeploymentMatch) {
      savedConvexDeployment = convexDeploymentMatch[1].trim();
      console.log(`📋 Found existing CONVEX_DEPLOYMENT: ${savedConvexDeployment}`);
    }
    if (convexUrlMatch) {
      savedConvexUrl = convexUrlMatch[1].trim();
      console.log(`📋 Found existing EXPO_PUBLIC_CONVEX_URL: ${savedConvexUrl}`);
    }
  }
  
  try {
    execSync('npx convex dev --once', { stdio: 'inherit' });
    console.log('✅ Convex initialized!\n');
    
    // Restore saved Convex deployment config if it existed
    if (savedConvexDeployment || savedConvexUrl) {
      console.log('🔄 Restoring saved Convex deployment configuration...');
      if (fs.existsSync(envPath)) {
        let envContent = fs.readFileSync(envPath, 'utf8');
        
        // Restore CONVEX_DEPLOYMENT
        if (savedConvexDeployment) {
          envContent = envContent.replace(
            /^CONVEX_DEPLOYMENT=.*$/m,
            `CONVEX_DEPLOYMENT=${savedConvexDeployment}`
          );
        }
        
        // Restore EXPO_PUBLIC_CONVEX_URL
        if (savedConvexUrl) {
          envContent = envContent.replace(
            /^EXPO_PUBLIC_CONVEX_URL=.*$/m,
            `EXPO_PUBLIC_CONVEX_URL=${savedConvexUrl}`
          );
        }
        
        fs.writeFileSync(envPath, envContent, 'utf8');
        console.log('✅ Convex deployment configuration restored!\n');
        
        // Lock deployment to prevent overwrite by other accounts
        try {
          const lockScriptPath = path.join(process.cwd(), 'scripts', 'lock-convex-deployment.js');
          if (fs.existsSync(lockScriptPath)) {
            execSync('node scripts/lock-convex-deployment.js lock', { stdio: 'inherit' });
          }
        } catch (lockError) {
          console.log('⚠️  Failed to lock deployment (non-critical):', lockError.message);
        }
      }
    }
  } catch (error) {
    console.log('⚠️  Convex initialization failed. Please run "npx convex dev" manually.\n');
  }
} else {
  console.log('✅ Convex already initialized.\n');
  
  // Ensure deployment is locked even if already initialized
  try {
    const lockScriptPath = path.join(process.cwd(), 'scripts', 'lock-convex-deployment.js');
    if (fs.existsSync(lockScriptPath)) {
      execSync('node scripts/lock-convex-deployment.js lock', { stdio: 'inherit' });
    }
  } catch (lockError) {
    // Non-critical, just log
    console.log('ℹ️  Could not lock deployment (non-critical)');
  }
}

// Create necessary directories
const directories = ['store', 'services', 'types'];
directories.forEach(dir => {
  const dirPath = path.join(process.cwd(), dir);
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
    console.log(`📁 Created ${dir}/ directory`);
  }
});

console.log('\n🎉 Setup complete! Next steps:');
console.log('1. Update .env.local with your API keys');
console.log('2. Run "npm run dev:be" to start Convex backend');
console.log('3. Run "npm run dev:fe" to start Expo frontend');
console.log('4. Scan QR code with Expo Go app\n');

console.log('📚 For more information, see README.md');
