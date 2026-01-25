/**
 * Conversations API
 * List user's conversations with optional filtering
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth';
import prisma from '@/lib/db';

/**
 * GET /api/conversations
 * List user's conversations with pagination
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession();

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const limit = parseInt(searchParams.get('limit') || '20', 10);
    const offset = parseInt(searchParams.get('offset') || '0', 10);
    const includeCompleted = searchParams.get('includeCompleted') === 'true';

    // Build where clause
    const where: any = {
      userId: session.user.id,
    };

    // Optionally filter out completed conversations
    if (!includeCompleted) {
      where.phase = {
        not: 'COMPLETE',
      };
    }

    // Get conversations with related app info
    const [conversations, total] = await Promise.all([
      prisma.conversation.findMany({
        where,
        orderBy: { updatedAt: 'desc' },
        take: limit,
        skip: offset,
        select: {
          id: true,
          appId: true,
          messages: true,
          phase: true,
          spec: true,
          createdAt: true,
          updatedAt: true,
          version: true,
        },
      }),
      prisma.conversation.count({ where }),
    ]);

    // Get associated apps
    const appIds = conversations
      .filter(c => c.appId)
      .map(c => c.appId as string);

    const apps = appIds.length > 0
      ? await prisma.app.findMany({
          where: { id: { in: appIds } },
          select: {
            id: true,
            name: true,
            status: true,
            subdomain: true,
          },
        })
      : [];

    const appsMap = new Map(apps.map(a => [a.id, a]));

    // Transform conversations for response
    const conversationsWithDetails = conversations.map(conv => {
      // Parse messages to get preview
      let lastMessage = '';
      let messageCount = 0;
      let readinessScore = 0;

      try {
        const messages = JSON.parse(conv.messages || '[]');
        messageCount = messages.length;
        if (messages.length > 0) {
          const lastMsg = messages[messages.length - 1];
          lastMessage = lastMsg.content?.substring(0, 100) || '';
          if (lastMessage.length === 100) lastMessage += '...';
        }
      } catch {
        // Ignore parse errors
      }

      // Parse spec to get readiness score
      try {
        const spec = conv.spec ? JSON.parse(conv.spec) : null;
        readinessScore = spec?.readinessScore || 0;
      } catch {
        // Ignore parse errors
      }

      const app = conv.appId ? appsMap.get(conv.appId) : null;

      return {
        id: conv.id,
        appId: conv.appId,
        phase: conv.phase,
        createdAt: conv.createdAt,
        updatedAt: conv.updatedAt,
        version: conv.version,
        lastMessage,
        messageCount,
        readinessScore,
        app: app ? {
          id: app.id,
          name: app.name,
          status: app.status,
          subdomain: app.subdomain,
        } : null,
      };
    });

    return NextResponse.json({
      conversations: conversationsWithDetails,
      total,
      limit,
      offset,
      hasMore: offset + conversations.length < total,
    });
  } catch (error) {
    console.error('Conversations API error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
