/**
 * POST /api/scaffolder-v3
 * 
 * Journey-First App Generation Pipeline
 * 
 * This endpoint implements the v3 architecture where AI agents
 * collaborate through multi-turn dialogue to design user experiences
 * BEFORE considering data storage.
 * 
 * Flow:
 * 1. User sends request
 * 2. Agents discuss (UX → Interaction → Component → Data)
 * 3. Consensus is reached
 * 4. Code is generated from design spec
 * 
 * NO templates, NO CRUD patterns, NO predefined component types
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth';
import prisma from '@/lib/db';
import { generateId } from '@/lib/utils';
import { IS_DEMO_MODE } from '@/lib/config';
import {
  designSessionManager,
  createJourneyConversationState,
  addJourneyMessage,
  updateWithDesignResults,
} from '@/lib/scaffolder-v2/design-session';
import type {
  JourneyConversationState,
  JourneyMessage,
  DesignSession,
  DesignConsensus,
  GeneratedCode,
} from '@/lib/scaffolder-v2/journey-types';

// ============================================================================
// Request/Response Types
// ============================================================================

interface V3ChatRequest {
  conversationId?: string;
  message: string;
  action?: 'chat' | 'design' | 'build';
}

interface V3ChatResponse {
  conversationId: string;
  messages: JourneyMessage[];
  designSession?: DesignSession;
  consensus?: DesignConsensus;
  generatedCode?: GeneratedCode;
  status: 'designing' | 'consensus' | 'building' | 'complete';
}

// ============================================================================
// Main POST Handler
// ============================================================================

export async function POST(request: NextRequest) {
  const startTime = Date.now();

  try {
    const session = await getServerSession();

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body: V3ChatRequest = await request.json();
    const { conversationId, message, action = 'chat' } = body;

    console.log('\n🚀 === V3 Journey-First Request ===');
    console.log(`📋 Action: ${action}`);
    console.log(`💬 Message: "${message?.substring(0, 100)}${message?.length > 100 ? '...' : ''}"`);
    console.log(`🔑 ConversationId: ${conversationId || 'new'}`);

    // Demo mode check
    if (IS_DEMO_MODE) {
      return NextResponse.json({
        conversationId: conversationId || generateId(),
        messages: [{
          id: generateId(),
          role: 'assistant',
          content: 'Demo Mode: The Journey-First Pipeline (V3) requires live AI services which are disabled in demo mode.',
          timestamp: new Date(),
        }],
        status: 'complete',
      });
    }

    // Load or create conversation state
    let state: JourneyConversationState;
    
    if (conversationId) {
      const conversation = await prisma.conversation.findFirst({
        where: { id: conversationId, userId: session.user.id, version: 'v3' },
      });

      if (conversation?.agentState) {
        state = conversation.agentState as unknown as JourneyConversationState;
        state.id = conversationId;
      } else {
        state = createJourneyConversationState();
      }
    } else {
      state = createJourneyConversationState();
    }

    // Add user message
    state = addJourneyMessage(state, 'user', message);

    // Run design session
    console.log('\n🎨 Running Design Session...');
    
    const { session: designSession, consensus, code, messages } = 
      await designSessionManager.runSession(message);

    // Update state with results
    state = updateWithDesignResults(state, designSession, consensus, code);

    // Add all agent messages to state
    for (const msg of messages) {
      if (msg.role !== 'user') { // Don't duplicate user message
        state.messages.push(msg);
      }
    }

    // Save conversation
    await saveConversation(session.user.id, state);

    const duration = Date.now() - startTime;
    console.log(`\n✅ V3 Request completed in ${duration}ms`);

    return NextResponse.json({
      conversationId: state.id,
      messages: state.messages,
      designSession,
      consensus,
      generatedCode: code,
      status: 'complete',
    } as V3ChatResponse);

  } catch (error) {
    console.error('❌ V3 Scaffolder Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal error' },
      { status: 500 }
    );
  }
}

// ============================================================================
// Helper Functions
// ============================================================================

async function saveConversation(
  userId: string,
  state: JourneyConversationState
): Promise<void> {
  try {
    await prisma.conversation.upsert({
      where: { id: state.id },
      create: {
        id: state.id,
        userId,
        version: 'v3',
        agentState: state as any,
      },
      update: {
        agentState: state as any,
        updatedAt: new Date(),
      },
    });
  } catch (error) {
    console.error('Failed to save conversation:', error);
    // Don't throw - allow request to complete even if save fails
  }
}

// ============================================================================
// GET Handler - Retrieve Conversation
// ============================================================================

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession();

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const conversationId = searchParams.get('id');

    if (!conversationId) {
      // Return list of v3 conversations
      const conversations = await prisma.conversation.findMany({
        where: { userId: session.user.id, version: 'v3' },
        orderBy: { updatedAt: 'desc' },
        take: 20,
        select: {
          id: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      return NextResponse.json({ conversations });
    }

    // Return specific conversation
    const conversation = await prisma.conversation.findFirst({
      where: { id: conversationId, userId: session.user.id, version: 'v3' },
    });

    if (!conversation) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    return NextResponse.json({
      id: conversation.id,
      state: conversation.agentState,
    });

  } catch (error) {
    console.error('V3 GET Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal error' },
      { status: 500 }
    );
  }
}
