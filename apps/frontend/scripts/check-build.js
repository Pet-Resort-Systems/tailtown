const fs = require('fs');
const path = require('path');

console.log('🔍 Verifying production build...\n');

// Check if build directory exists
const buildPath = path.join(__dirname, '../build');
if (!fs.existsSync(buildPath)) {
  console.error('❌ ERROR: Build directory not found!');
  console.error('   Run "npm run build" first.');
  process.exit(1);
}

// Check for localhost references in JS files
const jsPath = path.join(buildPath, 'static/js');
if (!fs.existsSync(jsPath)) {
  console.error('❌ ERROR: Build JS directory not found!');
  process.exit(1);
}

const files = fs.readdirSync(jsPath);
let hasErrors = false;

files.forEach(file => {
  if (file.endsWith('.js')) {
    const content = fs.readFileSync(path.join(jsPath, file), 'utf8');
    
    // Check for localhost API references
    if (content.includes('localhost:4004') || content.includes('localhost:4003')) {
      console.error(`❌ ERROR: ${file} contains localhost API references!`);
      console.error('   This indicates the build was created in development mode.');
      console.error('   Rebuild with: NODE_ENV=production npm run build');
      hasErrors = true;
    }
  }
});

// Check environment file
const envPath = path.join(__dirname, '../.env');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  if (envContent.includes('localhost')) {
    console.warn('⚠️  WARNING: .env file contains localhost references.');
    console.warn('   Make sure production .env is deployed to the server.');
  }
}

if (hasErrors) {
  console.error('\n❌ Build verification FAILED!\n');
  process.exit(1);
}

console.log('✅ Build verification passed!');
console.log('   No localhost references found in production build.\n');
