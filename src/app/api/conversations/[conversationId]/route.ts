/**
 * Single Conversation API
 * Get, update, or delete a specific conversation
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth';
import prisma from '@/lib/db';

/**
 * GET /api/conversations/[conversationId]
 * Get a single conversation with full details
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { conversationId: string } }
) {
  try {
    const session = await getServerSession();

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const conversation = await prisma.conversation.findFirst({
      where: {
        id: params.conversationId,
        userId: session.user.id,
      },
    });

    if (!conversation) {
      return NextResponse.json({ error: 'Conversation not found' }, { status: 404 });
    }

    // Get associated app if exists
    let app = null;
    if (conversation.appId) {
      app = await prisma.app.findUnique({
        where: { id: conversation.appId },
        select: {
          id: true,
          name: true,
          description: true,
          status: true,
          subdomain: true,
        },
      });
    }

    // Parse stored data
    let messages = [];
    let spec = null;

    try {
      messages = JSON.parse(conversation.messages || '[]');
    } catch {
      // Ignore parse errors
    }

    try {
      spec = conversation.spec ? JSON.parse(conversation.spec) : null;
    } catch {
      // Ignore parse errors
    }

    return NextResponse.json({
      conversation: {
        id: conversation.id,
        appId: conversation.appId,
        phase: conversation.phase,
        createdAt: conversation.createdAt,
        updatedAt: conversation.updatedAt,
        version: conversation.version,
        messages,
        spec,
        app,
      },
    });
  } catch (error) {
    console.error('Get conversation error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/conversations/[conversationId]
 * Delete a conversation
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { conversationId: string } }
) {
  try {
    const session = await getServerSession();

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify ownership
    const conversation = await prisma.conversation.findFirst({
      where: {
        id: params.conversationId,
        userId: session.user.id,
      },
    });

    if (!conversation) {
      return NextResponse.json({ error: 'Conversation not found' }, { status: 404 });
    }

    // Delete the conversation
    await prisma.conversation.delete({
      where: { id: params.conversationId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete conversation error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
