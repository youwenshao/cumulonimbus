const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

function checkCommand(command) {
  try {
    execSync(`command -v ${command}`, { stdio: 'ignore' });
    return true;
  } catch (e) {
    return false;
  }
}

console.log('\x1b[36m%s\x1b[0m', '🚀 Starting Cumulonimbus Setup...');

// 1. Install dependencies
console.log('\n📦 \x1b[33mInstalling dependencies...\x1b[0m');
try {
  execSync('npm install', { stdio: 'inherit' });
} catch (err) {
  console.error('❌ npm install failed');
  process.exit(1);
}

// 2. Setup .env
if (!fs.existsSync('.env')) {
  console.log('\n📝 \x1b[33mCreating .env from .env.example...\x1b[0m');
  fs.copyFileSync('.env.example', '.env');
  console.log('✅ Created .env file');
} else {
  console.log('\nℹ️  .env file already exists');
}

// 3. Database setup
console.log('\n🗄️  \x1b[33mSetting up database...\x1b[0m');
try {
  // Check if prisma is available
  execSync('npx prisma generate', { stdio: 'inherit' });
  console.log('✅ Prisma client generated');
  
  console.log('ℹ️  Attempting to push schema to database...');
  try {
    execSync('npx prisma db push --skip-generate', { stdio: 'inherit' });
    console.log('✅ Database schema pushed');
  } catch (err) {
    console.warn('⚠️  Could not push to database. Make sure DATABASE_URL in .env is correct and PostgreSQL is running.');
    console.warn('   You can run "npm run db:push" later after configuring .env');
  }
} catch (err) {
  console.error('❌ Prisma setup failed');
}

// 4. AI Provider & Runtime Checks
console.log('\n🤖 \x1b[33mChecking AI Providers & Runtime...\x1b[0m');

if (checkCommand('ollama')) {
  console.log('✅ Ollama detected');
  console.log('   Suggested: ollama pull qwen3-coder:30b');
} else {
  console.log('ℹ️  Ollama not detected (optional for local AI)');
}

if (checkCommand('docker')) {
  console.log('✅ Docker detected (ready for app hosting)');
} else {
  console.log('ℹ️  Docker not detected (optional for isolated app hosting)');
}

// 5. Final Message
console.log('\n\x1b[32m%s\x1b[0m', '🎉 Setup Process Finished!');
console.log('--------------------------------------------------');
console.log('\x1b[1m📋 Next Steps:\x1b[0m');
console.log('1. Open \x1b[34m.env\x1b[0m and verify \x1b[32mDATABASE_URL\x1b[0m');
console.log('2. Add AI provider API keys if not using local models');
console.log('3. Run \x1b[35mnpm run dev\x1b[0m to start the platform');
console.log('4. Access at \x1b[34mhttp://localhost:1000\x1b[0m');
console.log('--------------------------------------------------\n');
