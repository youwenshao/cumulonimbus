/**
 * Streaming Code Generation API
 * Generates app code using Server-Sent Events for real-time streaming
 */

import { NextRequest } from 'next/server';
import { getServerSession } from '@/lib/auth';
import prisma from '@/lib/db';
import { generateId } from '@/lib/utils';
import { freeformGenerator } from '@/lib/scaffolder-v2/agents';
import { bundleCode } from '@/lib/runtime';
import type { FreeformDesign } from '@/lib/scaffolder-v2/agents';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface GenerateRequest {
  prompt: string;
  appName?: string;
  conversationId?: string;
  regenerate?: boolean;
  existingAppId?: string;
}

interface SSEEvent {
  type: 'design' | 'chunk' | 'file' | 'progress' | 'complete' | 'error';
  data: {
    design?: FreeformDesign;
    content?: string;
    filename?: string;
    progress?: number;
    appId?: string;
    error?: string;
    message?: string;
  };
}

/**
 * Encode SSE event
 */
function encodeSSE(event: SSEEvent): string {
  return `data: ${JSON.stringify(event)}\n\n`;
}

/**
 * POST /api/apps/generate-stream
 * Stream code generation in real-time
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession();

    if (!session?.user?.id) {
      return new Response(
        encodeSSE({ type: 'error', data: { error: 'Unauthorized' } }),
        { 
          status: 401,
          headers: { 'Content-Type': 'text/event-stream' },
        }
      );
    }

    const body: GenerateRequest = await request.json();
    const { prompt, appName, conversationId, regenerate, existingAppId } = body;

    if (!prompt) {
      return new Response(
        encodeSSE({ type: 'error', data: { error: 'Prompt is required' } }),
        { 
          status: 400,
          headers: { 'Content-Type': 'text/event-stream' },
        }
      );
    }

    // Create a readable stream for SSE
    const stream = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder();

        const sendEvent = (event: SSEEvent) => {
          controller.enqueue(encoder.encode(encodeSSE(event)));
        };

        try {
          // Step 1: Design the app
          sendEvent({
            type: 'progress',
            data: { progress: 5, message: 'Analyzing your request...' },
          });

          const design = await freeformGenerator.designApp(prompt);

          sendEvent({
            type: 'design',
            data: { design, progress: 15, message: 'App designed!' },
          });

          // Step 2: Stream code generation
          sendEvent({
            type: 'progress',
            data: { progress: 20, message: 'Generating code...' },
          });

          let fullCode = '';
          let chunkCount = 0;

          for await (const result of freeformGenerator.streamGenerateCode(prompt, design)) {
            if (result.type === 'chunk') {
              fullCode += result.content;
              chunkCount++;
              
              // Send chunks periodically for smoother UI
              if (chunkCount % 3 === 0) {
                const progress = Math.min(85, 20 + (chunkCount * 0.5));
                sendEvent({
                  type: 'chunk',
                  data: { 
                    content: result.content, 
                    progress,
                  },
                });
              }
            } else if (result.type === 'complete') {
              fullCode = result.content;
            }
          }

          // Step 3: Bundle the code
          sendEvent({
            type: 'progress',
            data: { progress: 90, message: 'Bundling app...' },
          });

          const bundle = bundleCode({
            appId: existingAppId || generateId(),
            appCode: fullCode,
            schema: design.schema,
          });

          // Step 4: Save to database
          sendEvent({
            type: 'progress',
            data: { progress: 95, message: 'Saving app...' },
          });

          let appId: string;

          if (regenerate && existingAppId) {
            // Update existing app
            await prisma.app.update({
              where: { id: existingAppId },
              data: {
                componentFiles: bundle.files as unknown as object,
                spec: design.schema as unknown as object,
                config: { design } as unknown as object,
                buildStatus: 'COMPLETED',
                status: 'ACTIVE',
                updatedAt: new Date(),
              },
            });
            appId = existingAppId;
          } else {
            // Create new app
            const app = await prisma.app.create({
              data: {
                id: generateId(),
                userId: session.user.id,
                name: appName || design.appName,
                description: design.description,
                version: 'v2',
                spec: design.schema as unknown as object,
                config: { design } as unknown as object,
                componentFiles: bundle.files as unknown as object,
                data: [],
                status: 'ACTIVE',
                buildStatus: 'COMPLETED',
              },
            });
            appId = app.id;
          }

          // Step 5: Send complete event
          sendEvent({
            type: 'complete',
            data: {
              appId,
              progress: 100,
              message: 'App generated successfully!',
            },
          });

          // Send file contents for code viewer
          for (const [filename, content] of Object.entries(bundle.files)) {
            sendEvent({
              type: 'file',
              data: { filename, content },
            });
          }
        } catch (error) {
          console.error('Generation error:', error);
          sendEvent({
            type: 'error',
            data: { 
              error: error instanceof Error ? error.message : 'Generation failed',
            },
          });
        } finally {
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'X-Accel-Buffering': 'no',
      },
    });
  } catch (error) {
    console.error('Stream setup error:', error);
    return new Response(
      encodeSSE({ 
        type: 'error', 
        data: { error: error instanceof Error ? error.message : 'Stream setup failed' },
      }),
      { 
        status: 500,
        headers: { 'Content-Type': 'text/event-stream' },
      }
    );
  }
}

/**
 * GET /api/apps/generate-stream
 * Health check for the streaming endpoint
 */
export async function GET() {
  return new Response(
    JSON.stringify({ 
      status: 'ok',
      endpoint: 'generate-stream',
      method: 'POST',
      description: 'Stream AI code generation via SSE',
    }),
    { 
      headers: { 'Content-Type': 'application/json' },
    }
  );
}
