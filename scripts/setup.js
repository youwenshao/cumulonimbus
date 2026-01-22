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
  let envContent = fs.readFileSync('.env.example', 'utf8');
  
  // Check if we should default to SQLite if Postgres is not found
  if (!checkCommand('pg_isready')) {
    console.log('ℹ️  PostgreSQL not detected. Defaulting to SQLite in .env');
    envContent = envContent.replace(
      /DATABASE_URL="postgresql:\/\/.*"/,
      'DATABASE_URL="file:./dev.db"'
    );
  }
  
  fs.writeFileSync('.env', envContent);
  console.log('✅ Created .env file');
} else {
  console.log('\nℹ️  .env file already exists');
  let envContent = fs.readFileSync('.env', 'utf8');
  if (envContent.includes('postgresql://') && !checkCommand('pg_isready')) {
    console.log('⚠️  PostgreSQL is configured in .env but not detected on system.');
    console.log('🔄 Switching .env to SQLite for local development...');
    envContent = envContent.replace(
      /DATABASE_URL="postgresql:\/\/.*"/,
      'DATABASE_URL="file:./dev.db"'
    );
    fs.writeFileSync('.env', envContent);
    console.log('✅ Updated .env to use SQLite');
  }
}

// 3. Database setup
console.log('\n🗄️  \x1b[33mSetting up database...\x1b[0m');

const env = fs.readFileSync('.env', 'utf8');
const isSqlite = env.includes('DATABASE_URL="file:');

if (!isSqlite) {
  // Check for PostgreSQL
  if (checkCommand('pg_isready')) {
    try {
      execSync('pg_isready', { stdio: 'ignore' });
      console.log('✅ PostgreSQL is running');
    } catch (e) {
      console.warn('⚠️  PostgreSQL is installed but not running.');
      console.warn('   Suggested: brew services start postgresql@14 (or your version)');
    }
  } else {
    console.warn('ℹ️  pg_isready not found. Cannot verify if PostgreSQL is running.');
  }
} else {
  console.log('ℹ️  Using SQLite database');
  
  // Update prisma schema for SQLite if needed
  const schemaPath = 'prisma/schema.prisma';
  let schema = fs.readFileSync(schemaPath, 'utf8');
  if (schema.includes('provider = "postgresql"')) {
    console.log('📝 Updating prisma/schema.prisma to use sqlite...');
    schema = schema.replace('provider = "postgresql"', 'provider = "sqlite"');
    // SQLite doesn't support enums, so we need to convert them to String
    schema = schema.replace(/enum\s+(\w+)\s+\{[\s\S]*?\}/g, (match, p1) => {
      console.log(`   - Converting enum ${p1} to String (SQLite limitation)`);
      return `// Enum ${p1} converted to String for SQLite compatibility`;
    });
    // Replace enum usages with String
    schema = schema.replace(/(\s+)(\w+)(\s+)(AppStatus|BuildStatus|ConversationPhase|Plan)/g, '$1$2$3String');
    // Replace Json with String for SQLite
    schema = schema.replace(/(\s+)(\w+)(\s+)Json/g, '$1$2$3String');
    // Replace @default(PARSE) etc with @default("PARSE")
    schema = schema.replace(/@default\((DRAFT|PENDING|PARSE|FREE)\)/g, '@default("$1")');
    
    fs.writeFileSync(schemaPath, schema);
    console.log('✅ Updated prisma/schema.prisma for SQLite');
  }
}

try {
  // Check if prisma is available
  execSync('npx prisma generate', { stdio: 'inherit' });
  console.log('✅ Prisma client generated');
  
  console.log('ℹ️  Attempting to push schema to database...');
  try {
    execSync('npx prisma db push --skip-generate', { stdio: 'inherit' });
    console.log('✅ Database schema pushed');
  } catch (err) {
    console.warn('\n❌ \x1b[31mDatabase connection failed!\x1b[0m');
    console.warn('   Could not push to database. Make sure:');
    console.warn('   1. PostgreSQL is running (check with: pg_isready)');
    console.warn('   2. DATABASE_URL in .env is correct');
    console.warn('   3. The database specified in DATABASE_URL exists');
    console.warn('\n   You can run "npm run db:push" later after fixing the connection.');
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

// 5. Build Demo App
console.log('\n🏗️  \x1b[33mBuilding demo app...\x1b[0m');
try {
  execSync('npm run build:demo', { stdio: 'inherit' });
  console.log('✅ Demo app built');
} catch (err) {
  console.warn('⚠️  Could not build demo app. The home page demo might not work.');
}

// 6. Final Message
console.log('\n\x1b[32m%s\x1b[0m', '🎉 Setup Process Finished!');
console.log('--------------------------------------------------');
console.log('\x1b[1m📋 Next Steps:\x1b[0m');
console.log('1. Open \x1b[34m.env\x1b[0m and verify \x1b[32mDATABASE_URL\x1b[0m');
console.log('2. Add AI provider API keys if not using local models');
console.log('3. Run \x1b[35mnpm run dev\x1b[0m to start the platform');
console.log('4. Access at \x1b[34mhttp://localhost:1000\x1b[0m');
console.log('--------------------------------------------------\n');
