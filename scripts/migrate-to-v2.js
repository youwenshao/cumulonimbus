#!/usr/bin/env node

/**
 * V1 to V2 Migration Script
 * Migrates all conversations and apps from V1 to V2 format
 * 
 * Usage:
 *   npm run migrate:v2
 *   npm run migrate:v2 -- --dry-run
 *   npm run migrate:v2 -- --force
 */

const { PrismaClient } = require('@prisma/client');
const { generateId } = require('nanoid');

const prisma = new PrismaClient();

// Parse command line arguments
const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const force = args.includes('--force');
const help = args.includes('--help') || args.includes('-h');

if (help) {
  console.log(`
V1 to V2 Migration Script

Usage:
  npm run migrate:v2 [options]

Options:
  --dry-run    Preview changes without applying them
  --force      Re-migrate already migrated items
  --help, -h   Show this help message

Examples:
  npm run migrate:v2              # Migrate all V1 items to V2
  npm run migrate:v2 -- --dry-run # Preview migration without making changes
  npm run migrate:v2 -- --force   # Re-migrate all items (including V2)
`);
  process.exit(0);
}

// Stats
const stats = {
  conversationsTotal: 0,
  conversationsMigrated: 0,
  conversationsFailed: 0,
  appsTotal: 0,
  appsMigrated: 0,
  appsFailed: 0,
  errors: [],
};

// ============================================================================
// Migration Logic (simplified version - full logic is in TypeScript)
// ============================================================================

function createDynamicConversationState() {
  return {
    id: generateId(),
    phase: 'intent',
    messages: [],
    schemas: [],
    layout: null,
    workflows: [],
    readiness: { schema: 0, ui: 0, workflow: 50, overall: 0 },
    suggestions: [],
    checkpoints: [],
  };
}

function migrateConversation(v1Conversation) {
  const v1State = v1Conversation.agentState || {};
  const v2State = createDynamicConversationState();
  
  v2State.id = v1Conversation.id;
  
  // Migrate messages
  if (v1Conversation.messages && Array.isArray(v1Conversation.messages)) {
    v2State.messages = v1Conversation.messages;
  }
  
  // Migrate schemas
  if (v1State.schemas && Array.isArray(v1State.schemas)) {
    v2State.schemas = v1State.schemas.map(s => ({
      name: s.name || s.entity || 'item',
      label: s.label || s.name || 'Item',
      description: s.description || '',
      fields: ensureRequiredFields(s.fields || []),
      computedFields: s.computedFields || [],
      relationships: s.relationships || [],
    }));
  }
  
  // Migrate layout
  if (v1State.layout) {
    v2State.layout = migrateLayout(v1State.layout);
  }
  
  // Migrate other fields
  if (v1State.suggestedAppName) {
    v2State.suggestedAppName = v1State.suggestedAppName;
  }
  
  // Calculate readiness
  v2State.readiness = inferReadiness(v2State);
  v2State.phase = getPhaseFromReadiness(v2State.readiness);
  
  return v2State;
}

function migrateApp(v1App) {
  const v1Spec = v1App.spec || {};
  
  let v2Schema = null;
  if (v1Spec.schema) {
    v2Schema = {
      name: v1Spec.schema.name || v1Spec.schema.entity || 'item',
      label: v1Spec.schema.label || v1Spec.schema.name || 'Item',
      description: v1Spec.schema.description || '',
      fields: ensureRequiredFields(v1Spec.schema.fields || []),
    };
  }
  
  let v2Layout = null;
  if (v1Spec.layout) {
    v2Layout = migrateLayout(v1Spec.layout);
  }
  
  return {
    version: 'v2',
    spec: {
      schema: v2Schema,
      layout: v2Layout,
      components: v1Spec.components || {},
    },
  };
}

function migrateLayout(v1Layout) {
  if (!v1Layout) {
    return createDefaultLayout();
  }
  
  // If already V2 format
  if (v1Layout.type && (v1Layout.container || v1Layout.component)) {
    return v1Layout;
  }
  
  // Create default layout
  return createDefaultLayout();
}

function createDefaultLayout() {
  return {
    id: generateId(),
    type: 'container',
    container: {
      direction: 'column',
      gap: '1.5rem',
      padding: '1.5rem',
      children: [
        {
          id: generateId(),
          type: 'component',
          component: { type: 'form', props: {} },
        },
        {
          id: generateId(),
          type: 'component',
          component: { type: 'table', props: {} },
        },
      ],
    },
  };
}

function ensureRequiredFields(fields) {
  const result = [...(fields || [])];
  
  // Ensure ID field
  if (!result.find(f => f.name === 'id')) {
    result.unshift({
      name: 'id',
      label: 'ID',
      type: 'string',
      required: true,
      generated: true,
      primaryKey: true,
    });
  }
  
  // Ensure createdAt field
  if (!result.find(f => f.name === 'createdAt')) {
    result.push({
      name: 'createdAt',
      label: 'Created At',
      type: 'datetime',
      required: true,
      generated: true,
    });
  }
  
  return result;
}

function inferReadiness(state) {
  let schema = 0;
  let ui = 0;
  let workflow = 50;
  
  if (state.schemas && state.schemas.length > 0) {
    const fieldCount = state.schemas[0].fields.filter(f => !f.generated).length;
    schema = Math.min(30 + (fieldCount * 15), 100);
  }
  
  if (state.layout) {
    ui = 70;
  }
  
  const overall = Math.round(schema * 0.4 + ui * 0.4 + workflow * 0.2);
  
  return { schema, ui, workflow, overall };
}

function getPhaseFromReadiness(readiness) {
  if (readiness.overall >= 80) return 'finalize';
  if (readiness.overall >= 60) return 'refine';
  if (readiness.overall >= 30) return 'design';
  return 'intent';
}

// ============================================================================
// Main Migration Logic
// ============================================================================

async function migrateConversations() {
  const whereClause = force
    ? {}
    : {
        OR: [
          { version: null },
          { version: 'v1' },
        ],
      };
  
  const conversations = await prisma.conversation.findMany({
    where: whereClause,
  });
  
  stats.conversationsTotal = conversations.length;
  console.log(`\n📝 Found ${conversations.length} conversations to migrate`);
  
  for (const conv of conversations) {
    try {
      const v2State = migrateConversation(conv);
      
      if (!dryRun) {
        await prisma.conversation.update({
          where: { id: conv.id },
          data: {
            version: 'v2',
            agentState: v2State,
          },
        });
      }
      
      stats.conversationsMigrated++;
      console.log(`  ✅ ${dryRun ? '[DRY RUN] Would migrate' : 'Migrated'} conversation ${conv.id}`);
    } catch (error) {
      stats.conversationsFailed++;
      stats.errors.push(`Conversation ${conv.id}: ${error.message || error}`);
      console.error(`  ❌ Failed to migrate conversation ${conv.id}:`, error.message || error);
    }
  }
}

async function migrateApps() {
  const whereClause = force
    ? {}
    : {
        OR: [
          { version: null },
          { version: 'v1' },
        ],
      };
  
  const apps = await prisma.app.findMany({
    where: whereClause,
  });
  
  stats.appsTotal = apps.length;
  console.log(`\n📱 Found ${apps.length} apps to migrate`);
  
  for (const app of apps) {
    try {
      const v2Data = migrateApp(app);
      
      if (!dryRun) {
        await prisma.app.update({
          where: { id: app.id },
          data: v2Data,
        });
      }
      
      stats.appsMigrated++;
      console.log(`  ✅ ${dryRun ? '[DRY RUN] Would migrate' : 'Migrated'} app ${app.id} (${app.name})`);
    } catch (error) {
      stats.appsFailed++;
      stats.errors.push(`App ${app.id} (${app.name}): ${error.message || error}`);
      console.error(`  ❌ Failed to migrate app ${app.id}:`, error.message || error);
    }
  }
}

async function migrate() {
  console.log('\x1b[36m%s\x1b[0m', '\n🚀 V1 to V2 Migration Script');
  console.log('================================');
  
  if (dryRun) {
    console.log('\x1b[33m%s\x1b[0m', '⚠️  DRY RUN MODE - No changes will be made');
  }
  
  if (force) {
    console.log('\x1b[33m%s\x1b[0m', '⚠️  FORCE MODE - Re-migrating all items');
  }
  
  try {
    // Check database connection
    console.log('\n🔌 Checking database connection...');
    await prisma.$connect();
    console.log('✅ Database connected');
    
    // Migrate conversations
    await migrateConversations();
    
    // Migrate apps
    await migrateApps();
    
    // Print summary
    console.log('\n================================');
    console.log('\x1b[36m%s\x1b[0m', '📊 Migration Summary');
    console.log('================================');
    console.log(`\nConversations:`);
    console.log(`  Total: ${stats.conversationsTotal}`);
    console.log(`  Migrated: ${stats.conversationsMigrated}`);
    console.log(`  Failed: ${stats.conversationsFailed}`);
    
    console.log(`\nApps:`);
    console.log(`  Total: ${stats.appsTotal}`);
    console.log(`  Migrated: ${stats.appsMigrated}`);
    console.log(`  Failed: ${stats.appsFailed}`);
    
    if (stats.errors.length > 0) {
      console.log('\n\x1b[31m%s\x1b[0m', '❌ Errors:');
      stats.errors.forEach(err => console.log(`  - ${err}`));
    }
    
    const success = stats.conversationsFailed === 0 && stats.appsFailed === 0;
    
    if (dryRun) {
      console.log('\n\x1b[33m%s\x1b[0m', '👁️  DRY RUN COMPLETE - No changes were made');
      console.log('Run without --dry-run to apply changes');
    } else if (success) {
      console.log('\n\x1b[32m%s\x1b[0m', '✅ Migration completed successfully!');
    } else {
      console.log('\n\x1b[31m%s\x1b[0m', '⚠️  Migration completed with errors');
    }
    
    process.exit(success ? 0 : 1);
  } catch (error) {
    console.error('\n\x1b[31m%s\x1b[0m', '❌ Migration failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run migration
migrate();
