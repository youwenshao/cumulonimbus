/**
 * V1 to V2 Migration API Endpoint
 * Handles migration of conversations and apps from V1 to V2 format
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth';
import prisma from '@/lib/db';
import { migrateConversation, migrateApp, type MigrationStats } from '@/lib/migration';
import { serializeDynamicState } from '@/lib/scaffolder-v2/state';

interface MigrationRequest {
  target: 'conversations' | 'apps' | 'all';
  force?: boolean;
  dryRun?: boolean;
}

interface MigrationResponse {
  success: boolean;
  stats: MigrationStats;
  dryRun: boolean;
}

/**
 * POST /api/migration/v1-to-v2
 * Migrate V1 conversations and/or apps to V2 format
 * 
 * Body:
 * - target: 'conversations' | 'apps' | 'all'
 * - force: boolean (optional) - Re-migrate already migrated items
 * - dryRun: boolean (optional) - Preview changes without applying
 */
export async function POST(request: NextRequest): Promise<NextResponse<MigrationResponse>> {
  const session = await getServerSession();
  
  if (!session?.user?.id) {
    return NextResponse.json(
      { success: false, stats: createEmptyStats(), dryRun: false },
      { status: 401 }
    );
  }
  
  const userId = session.user.id;
  
  try {
    const body: MigrationRequest = await request.json();
    const { target, force = false, dryRun = false } = body;
    
    console.log(`\n🔄 === V1 to V2 Migration ===`);
    console.log(`📋 Target: ${target}`);
    console.log(`👤 User: ${userId}`);
    console.log(`🔄 Force: ${force}`);
    console.log(`👁️ Dry Run: ${dryRun}`);
    
    const stats: MigrationStats = {
      conversationsTotal: 0,
      conversationsMigrated: 0,
      conversationsFailed: 0,
      appsTotal: 0,
      appsMigrated: 0,
      appsFailed: 0,
      errors: [],
    };
    
    // Migrate conversations
    if (target === 'conversations' || target === 'all') {
      await migrateConversations(userId, force, dryRun, stats);
    }
    
    // Migrate apps
    if (target === 'apps' || target === 'all') {
      await migrateApps(userId, force, dryRun, stats);
    }
    
    console.log(`\n✅ Migration ${dryRun ? 'preview' : 'complete'}:`);
    console.log(`   Conversations: ${stats.conversationsMigrated}/${stats.conversationsTotal} migrated`);
    console.log(`   Apps: ${stats.appsMigrated}/${stats.appsTotal} migrated`);
    if (stats.errors.length > 0) {
      console.log(`   Errors: ${stats.errors.length}`);
    }
    
    return NextResponse.json({
      success: stats.conversationsFailed === 0 && stats.appsFailed === 0,
      stats,
      dryRun,
    });
  } catch (error) {
    console.error('❌ Migration failed:', error);
    return NextResponse.json(
      { 
        success: false, 
        stats: createEmptyStats(),
        dryRun: false,
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/migration/v1-to-v2
 * Get migration status (count of items needing migration)
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  const session = await getServerSession();
  
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  const userId = session.user.id;
  
  try {
    // Count V1 conversations
    const v1ConversationsCount = await prisma.conversation.count({
      where: {
        userId,
        OR: [
          { version: null },
          { version: 'v1' },
        ],
      },
    });
    
    // Count V2 conversations
    const v2ConversationsCount = await prisma.conversation.count({
      where: {
        userId,
        version: 'v2',
      },
    });
    
    // Count V1 apps
    const v1AppsCount = await prisma.app.count({
      where: {
        userId,
        OR: [
          { version: null },
          { version: 'v1' },
        ],
      },
    });
    
    // Count V2 apps
    const v2AppsCount = await prisma.app.count({
      where: {
        userId,
        version: 'v2',
      },
    });
    
    return NextResponse.json({
      conversations: {
        v1: v1ConversationsCount,
        v2: v2ConversationsCount,
        needsMigration: v1ConversationsCount > 0,
      },
      apps: {
        v1: v1AppsCount,
        v2: v2AppsCount,
        needsMigration: v1AppsCount > 0,
      },
      needsMigration: v1ConversationsCount > 0 || v1AppsCount > 0,
    });
  } catch (error) {
    console.error('Failed to get migration status:', error);
    return NextResponse.json(
      { error: 'Failed to get migration status' },
      { status: 500 }
    );
  }
}

/**
 * Migrate conversations for a user
 */
async function migrateConversations(
  userId: string,
  force: boolean,
  dryRun: boolean,
  stats: MigrationStats
): Promise<void> {
  const whereClause = force
    ? { userId }
    : {
        userId,
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
      const serialized = serializeDynamicState(v2State);
      
      if (!dryRun) {
        await prisma.conversation.update({
          where: { id: conv.id },
          data: {
            version: 'v2',
            agentState: serialized as object,
          },
        });
      }
      
      stats.conversationsMigrated++;
      console.log(`  ✅ ${dryRun ? '[DRY RUN] Would migrate' : 'Migrated'} conversation ${conv.id}`);
    } catch (error) {
      stats.conversationsFailed++;
      const errorMsg = `Conversation ${conv.id}: ${error instanceof Error ? error.message : String(error)}`;
      stats.errors.push(errorMsg);
      console.error(`  ❌ Failed to migrate conversation ${conv.id}:`, error);
    }
  }
}

/**
 * Migrate apps for a user
 */
async function migrateApps(
  userId: string,
  force: boolean,
  dryRun: boolean,
  stats: MigrationStats
): Promise<void> {
  const whereClause = force
    ? { userId }
    : {
        userId,
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
      const errorMsg = `App ${app.id} (${app.name}): ${error instanceof Error ? error.message : String(error)}`;
      stats.errors.push(errorMsg);
      console.error(`  ❌ Failed to migrate app ${app.id}:`, error);
    }
  }
}

/**
 * Create empty stats object
 */
function createEmptyStats(): MigrationStats {
  return {
    conversationsTotal: 0,
    conversationsMigrated: 0,
    conversationsFailed: 0,
    appsTotal: 0,
    appsMigrated: 0,
    appsFailed: 0,
    errors: [],
  };
}
