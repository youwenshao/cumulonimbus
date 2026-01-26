import { NextRequest } from 'next/server';
import { getServerSession } from '@/lib/auth';
import { streamComplete, type ChatMessage } from '@/lib/qwen';
import { wrapError } from '@/lib/error-handling/scaffolder-errors';
import prisma from '@/lib/db';
import type { UserLLMSettings, LLMProvider } from '@/lib/llm';
import { enhanceUserSettingsWithApiKeys } from '@/lib/llm';

/**
 * Streaming API endpoint for AI responses
 * POST /api/scaffolder/stream
 * 
 * Streams AI-generated text responses in real-time for a better UX
 */

// System prompts for different contexts
const SYSTEM_PROMPTS = {
  parse: `You are a friendly assistant helping users build personalized tracker applications. 
Analyze the user's request and explain what kind of app you'll create for them.
Be conversational, warm, and concise. Focus on understanding their needs.`,

  clarify: `You are helping clarify requirements for a tracker app.
Ask thoughtful follow-up questions to better understand the user's needs.
Be specific and suggest options when appropriate.`,

  summarize: `You are summarizing the app that will be built.
Provide a clear, exciting summary of what the app will do and include.
Be enthusiastic but professional.`,
};

export async function POST(request: NextRequest) {
  const encoder = new TextEncoder();

  try {
    const session = await getServerSession();

    if (!session?.user?.id) {
      return new Response('Unauthorized', { status: 401 });
    }

    const body = await request.json();
    const { message, context = 'parse', conversationHistory = [] } = body;

    if (!message || typeof message !== 'string') {
      return new Response(
        JSON.stringify({ error: 'Message is required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    console.log(`🚀 Starting stream for context: ${context}`);

    // Get user LLM settings including API keys
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        preferredLLMProvider: true,
        ollamaEndpoint: true,
        ollamaModel: true,
        ollamaSmallModel: true,
        lmstudioEndpoint: true,
        lmstudioModel: true,
        deepseekApiKey: true,
        openrouterApiKey: true,
      },
    });

    // Build base user settings
    const baseSettings: UserLLMSettings = user ? {
      provider: (user.preferredLLMProvider as LLMProvider) || undefined,
      ollamaEndpoint: user.ollamaEndpoint || undefined,
      ollamaModel: user.ollamaModel || undefined,
      ollamaSmallModel: user.ollamaSmallModel || undefined,
      lmstudioEndpoint: user.lmstudioEndpoint || undefined,
      lmstudioModel: user.lmstudioModel || undefined,
    } : {};

    // Enhance with decrypted API keys if available
    const userSettings: UserLLMSettings | undefined = user ? enhanceUserSettingsWithApiKeys(
      baseSettings,
      {
        deepseekApiKey: user.deepseekApiKey,
        openrouterApiKey: user.openrouterApiKey,
      }
    ) : undefined;

    // Build messages array
    const messages: ChatMessage[] = [
      { role: 'system', content: SYSTEM_PROMPTS[context as keyof typeof SYSTEM_PROMPTS] || SYSTEM_PROMPTS.parse },
      ...conversationHistory.map((m: { role: string; content: string }) => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      })),
      { role: 'user', content: message },
    ];

    // Create streaming response
    const stream = new ReadableStream({
      async start(controller) {
        try {
          let fullContent = '';
          
          // Send start event
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ type: 'start' })}\n\n`)
          );

          // Stream AI response
          for await (const chunk of streamComplete({ messages, temperature: 0.7, userSettings })) {
            fullContent += chunk;
            
            // Send chunk
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({ type: 'chunk', content: chunk })}\n\n`)
            );
          }

          // Send completion event with full content
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ type: 'done', fullContent })}\n\n`)
          );

          console.log(`✅ Stream complete, total length: ${fullContent.length}`);
          controller.close();
        } catch (error) {
          console.error('❌ Streaming error:', error);
          
          const wrappedError = wrapError(error, 'parse');
          
          // Send error event
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ 
              type: 'error', 
              error: wrappedError.message,
              recovery: wrappedError.recovery?.suggestion 
            })}\n\n`)
          );
          
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache, no-transform',
        'Connection': 'keep-alive',
        'X-Accel-Buffering': 'no',
      },
    });
  } catch (error) {
    console.error('❌ Stream endpoint error:', error);
    const wrappedError = wrapError(error, 'parse');
    
    return new Response(
      JSON.stringify({ 
        error: wrappedError.message,
        recovery: wrappedError.recovery?.suggestion,
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
