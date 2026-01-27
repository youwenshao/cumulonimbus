/**
 * V3 Scaffolder API
 * Main chat endpoint for tool-based code generation
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth';
import prisma from '@/lib/db';
import { generateId, generateSubdomain } from '@/lib/utils';
import type { UserLLMSettings } from '@/lib/llm';
import { enhanceUserSettingsWithApiKeys } from '@/lib/llm';
import { executeAgentStream, type AgentResult } from '@/lib/scaffolder-v3';
import { isV3EnabledForUser } from '@/lib/scaffolder-v3/feature-flags';

// Store active streams for SSE connections
const activeStreams = new Map<string, {
  chunks: string[];
  done: boolean;
  result?: AgentResult;
  error?: string;
}>();

export interface V3ChatRequest {
  conversationId?: string;
  message: string;
  action?: 'chat' | 'create' | 'finalize';
  appId?: string;
}

export interface V3ChatResponse {
  conversationId: string;
  appId?: string;
  message?: string;
  success: boolean;
  error?: string;
}

/**
 * POST /api/scaffolder-v3
 * Main endpoint for V3 chat interactions
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    const session = await getServerSession();

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.id;

    // Check if V3 is enabled for this user
    if (!isV3EnabledForUser(userId)) {
      return NextResponse.json(
        { error: 'V3 scaffolder is not enabled for your account' },
        { status: 403 }
      );
    }

    const body: V3ChatRequest = await request.json();
    const { conversationId, message, action = 'chat', appId } = body;

    console.log('\n🚀 === V3 Scaffolder Request ===');
    console.log(`📋 Action: ${action}`);
    console.log(`💬 Message: "${message?.substring(0, 100)}${message?.length > 100 ? '...' : ''}"`);
    console.log(`🔑 ConversationId: ${conversationId || 'new'}`);
    console.log(`👤 User: ${userId}`);

    // Get user LLM settings
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        preferredLLMProvider: true,
        ollamaEndpoint: true,
        ollamaModel: true,
        ollamaSmallModel: true,
        lmstudioEndpoint: true,
        lmstudioModel: true,
        deepseekApiKey: true,
        openrouterApiKey: true,
        manualModelSelection: true,
        manualOllamaModel: true,
        manualLMStudioModel: true,
      },
    });

    // Build base settings
    const baseSettings: UserLLMSettings = {
      provider: user?.preferredLLMProvider as any,
      ollamaEndpoint: user?.ollamaEndpoint ?? undefined,
      ollamaModel: user?.ollamaModel ?? undefined,
      ollamaSmallModel: user?.ollamaSmallModel ?? undefined,
      lmstudioEndpoint: user?.lmstudioEndpoint ?? undefined,
      lmstudioModel: user?.lmstudioModel ?? undefined,
      userId,
      manualModelSelection: user?.manualModelSelection ?? false,
      manualOllamaModel: user?.manualOllamaModel ?? undefined,
      manualLMStudioModel: user?.manualLMStudioModel ?? undefined,
    };

    // Enhance with decrypted API keys if available
    const userSettings: UserLLMSettings | undefined = user ? enhanceUserSettingsWithApiKeys(
      baseSettings,
      {
        deepseekApiKey: user.deepseekApiKey,
        openrouterApiKey: user.openrouterApiKey,
      }
    ) : undefined;

    switch (action) {
      case 'chat':
        return await handleChat(userId, conversationId, message, appId, userSettings || baseSettings);
      
      case 'create':
        return await handleCreate(userId, message, userSettings || baseSettings);
      
      case 'finalize':
        return await handleFinalize(userId, conversationId!, appId!);
      
      default:
        return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
    }
  } catch (error) {
    console.error('❌ V3 Scaffolder error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * Handle chat message
 */
async function handleChat(
  userId: string,
  conversationId: string | undefined,
  message: string,
  appId: string | undefined,
  userSettings: UserLLMSettings
): Promise<NextResponse<V3ChatResponse>> {
  // Get or create conversation
  let conversation;
  
  if (conversationId) {
    conversation = await prisma.conversation.findFirst({
      where: { id: conversationId, userId },
    });
    
    if (!conversation) {
      return NextResponse.json({ 
        conversationId: conversationId,
        success: false,
        error: 'Conversation not found' 
      }, { status: 404 });
    }
  } else {
    // Create new conversation
    conversation = await prisma.conversation.create({
      data: {
        id: generateId(),
        userId,
        appId: appId || null,
        messages: JSON.stringify([]),
        phase: 'building',
        version: 'v3',
        agentToolHistory: JSON.stringify([]),
      },
    });
  }

  // Get or create app
  let app;
  if (appId) {
    app = await prisma.app.findFirst({
      where: { id: appId, userId },
    });
  } else if (conversation.appId) {
    app = await prisma.app.findUnique({
      where: { id: conversation.appId },
    });
  }
  
  if (!app) {
    // Create new app
    const subdomain = generateSubdomain('app');
    app = await prisma.app.create({
      data: {
        id: generateId(),
        userId,
        name: 'Untitled App',
        description: message.substring(0, 200),
        spec: '{}',
        config: '{}',
        data: '[]',
        status: 'DRAFT',
        buildStatus: 'PENDING',
        version: 'v3',
        scaffoldVersion: 'v3',
        scaffoldId: 'vite-react-shadcn',
        viteComponentFiles: JSON.stringify({}),
        vitePackageJson: JSON.stringify(getDefaultPackageJson()),
        subdomain,
      },
    });

    // Link conversation to app
    await prisma.conversation.update({
      where: { id: conversation.id },
      data: { appId: app.id },
    });
  }

  // Parse existing messages and files
  const existingMessages = JSON.parse(conversation.messages || '[]');
  const componentFiles = JSON.parse(app.viteComponentFiles || '{}');
  const packageJson = JSON.parse(app.vitePackageJson || '{}');

  // Initialize stream storage
  const streamId = conversation.id;
  activeStreams.set(streamId, {
    chunks: [],
    done: false,
  });

  // Run agent in background
  executeAgentStream({
    conversationId: conversation.id,
    appId: app.id,
    userId,
    userMessage: message,
    componentFiles,
    packageJson,
    messages: existingMessages.map((m: any) => ({
      role: m.role,
      content: m.content,
    })),
    userSettings,
    onChunk: (chunk) => {
      const stream = activeStreams.get(streamId);
      if (stream) {
        stream.chunks.push(chunk);
      }
    },
    onToolExecution: (toolName, args, result) => {
      console.log(`🔧 Tool executed: ${toolName}`, { args, result });
    },
    onComplete: async (result) => {
      const stream = activeStreams.get(streamId);
      if (stream) {
        stream.done = true;
        stream.result = result;
      }

      // Save to database
      const newMessages = [
        ...existingMessages,
        { role: 'user', content: message },
        { role: 'assistant', content: result.fullResponse },
      ];

      await prisma.conversation.update({
        where: { id: conversation.id },
        data: {
          messages: JSON.stringify(newMessages),
          agentToolHistory: JSON.stringify(result.toolExecutions),
          componentFilesCache: JSON.stringify(result.componentFiles),
        },
      });

      await prisma.app.update({
        where: { id: app!.id },
        data: {
          name: result.chatSummary || app!.name,
          viteComponentFiles: JSON.stringify(result.componentFiles),
          vitePackageJson: JSON.stringify(result.packageJson),
          buildStatus: 'COMPLETED',
          status: 'ACTIVE',
        },
      });
    },
    onError: (error) => {
      const stream = activeStreams.get(streamId);
      if (stream) {
        stream.done = true;
        stream.error = error.message;
      }
    },
  }).catch(console.error);

  return NextResponse.json({
    conversationId: conversation.id,
    appId: app.id,
    success: true,
    message: 'Stream started. Connect to /api/scaffolder-v3/stream/' + conversation.id,
  });
}

/**
 * Handle create action (quick app creation)
 */
async function handleCreate(
  userId: string,
  prompt: string,
  userSettings: UserLLMSettings
): Promise<NextResponse<V3ChatResponse>> {
  // Create new conversation and app
  const conversationId = generateId();
  const appId = generateId();
  const subdomain = generateSubdomain('app');

  await prisma.app.create({
    data: {
      id: appId,
      userId,
      name: 'New App',
      description: prompt.substring(0, 200),
      spec: '{}',
      config: '{}',
      data: '[]',
      status: 'DRAFT',
      buildStatus: 'GENERATING',
      version: 'v3',
      scaffoldVersion: 'v3',
      scaffoldId: 'vite-react-shadcn',
      viteComponentFiles: JSON.stringify({}),
      vitePackageJson: JSON.stringify(getDefaultPackageJson()),
      subdomain,
    },
  });

  await prisma.conversation.create({
    data: {
      id: conversationId,
      userId,
      appId,
      messages: JSON.stringify([]),
      phase: 'building',
      version: 'v3',
      agentToolHistory: JSON.stringify([]),
    },
  });

  // Start generation (handled via chat)
  return handleChat(userId, conversationId, prompt, appId, userSettings);
}

/**
 * Handle finalize action
 */
async function handleFinalize(
  userId: string,
  conversationId: string,
  appId: string
): Promise<NextResponse<V3ChatResponse>> {
  // Update app status
  await prisma.app.update({
    where: { id: appId, userId },
    data: {
      status: 'ACTIVE',
      buildStatus: 'COMPLETED',
    },
  });

  await prisma.conversation.update({
    where: { id: conversationId },
    data: { phase: 'complete' },
  });

  return NextResponse.json({
    conversationId,
    appId,
    success: true,
  });
}

/**
 * Get active stream data
 */
export function getStreamData(conversationId: string) {
  return activeStreams.get(conversationId);
}

/**
 * Clear stream data
 */
export function clearStreamData(conversationId: string) {
  activeStreams.delete(conversationId);
}

/**
 * Default package.json for V3 apps
 */
function getDefaultPackageJson() {
  return {
    name: 'cumulonimbus-app',
    version: '1.0.0',
    private: true,
    type: 'module',
    scripts: {
      dev: 'vite',
      build: 'vite build',
      preview: 'vite preview',
    },
    dependencies: {
      react: '^19.2.3',
      'react-dom': '^19.2.3',
      'react-router-dom': '^6.26.2',
      '@tanstack/react-query': '^5.56.2',
      'lucide-react': '^0.462.0',
      'clsx': '^2.1.1',
      'tailwind-merge': '^2.5.2',
      'class-variance-authority': '^0.7.1',
      'sonner': '^1.5.0',
      'zod': '^3.23.8',
      'react-hook-form': '^7.53.0',
      '@hookform/resolvers': '^3.9.0',
      'date-fns': '^3.6.0',
    },
    devDependencies: {
      '@types/react': '^19.2.8',
      '@types/react-dom': '^19.2.3',
      '@vitejs/plugin-react-swc': '^3.9.0',
      'typescript': '^5.5.3',
      'vite': '^6.3.4',
      'tailwindcss': '^3.4.11',
      'autoprefixer': '^10.4.20',
      'postcss': '^8.4.47',
    },
  };
}
