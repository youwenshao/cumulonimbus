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
    let controllerClosed = false;
    const stream = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder();

        const sendEvent = (event: SSEEvent) => {
          // #region agent log
          fetch('http://127.0.0.1:7244/ingest/943e0f46-b287-498e-bc97-8654de1662dc',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'generate-stream/route.ts:81',message:'Attempting to send SSE event',data:{eventType:event.type,controllerClosed},sessionId:'debug-session',runId:'stream-debug',hypothesisId:'H1'})}).catch(()=>{});
          // #endregion
          try {
            if (!controllerClosed) {
              controller.enqueue(encoder.encode(encodeSSE(event)));
            } else {
              console.warn('Attempted to send event after controller closed:', event.type);
            }
          } catch (enqueueError) {
            // #region agent log
            fetch('http://127.0.0.1:7244/ingest/943e0f46-b287-498e-bc97-8654de1662dc',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'generate-stream/route.ts:89',message:'Failed to enqueue SSE event',data:{eventType:event.type,error:(enqueueError as Error).message,controllerClosed},sessionId:'debug-session',runId:'stream-debug',hypothesisId:'H1'})}).catch(()=>{});
            // #endregion
            console.error('Failed to enqueue SSE event:', enqueueError);
          }
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

          // #region agent log
          fetch('http://127.0.0.1:7244/ingest/943e0f46-b287-498e-bc97-8654de1662dc',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'generate-stream/route.ts:108',message:'Starting streaming code generation',data:{promptLength:prompt.length,designFeatures:design.features?.length},sessionId:'debug-session',runId:'stream-debug',hypothesisId:'H3'})}).catch(()=>{});
          // #endregion

          try {
            for await (const result of freeformGenerator.streamGenerateCode(prompt, design)) {
              // #region agent log
              fetch('http://127.0.0.1:7244/ingest/943e0f46-b287-498e-bc97-8654de1662dc',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'generate-stream/route.ts:115',message:'Received streaming result',data:{type:result.type,contentLength:result.content?.length,chunkCount},sessionId:'debug-session',runId:'stream-debug',hypothesisId:'H3'})}).catch(()=>{});
              // #endregion

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
            // #region agent log
            fetch('http://127.0.0.1:7244/ingest/943e0f46-b287-498e-bc97-8654de1662dc',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'generate-stream/route.ts:127',message:'Streaming loop completed',data:{totalChunks:chunkCount,fullCodeLength:fullCode.length},sessionId:'debug-session',runId:'stream-debug',hypothesisId:'H3'})}).catch(()=>{});
            // #endregion
          } catch (streamError) {
            // #region agent log
            fetch('http://127.0.0.1:7244/ingest/943e0f46-b287-498e-bc97-8654de1662dc',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'generate-stream/route.ts:154',message:'Streaming loop failed',data:{errorMessage:streamError instanceof Error ? streamError.message : String(streamError)},sessionId:'debug-session',runId:'stream-debug',hypothesisId:'H3'})}).catch(()=>{});
            // #endregion
            throw streamError; // Re-throw to be caught by outer try-catch
          }

          // Step 3: Bundle the code
          sendEvent({
            type: 'progress',
            data: { progress: 90, message: 'Bundling app...' },
          });

          // #region agent log
          fetch('http://127.0.0.1:7244/ingest/943e0f46-b287-498e-bc97-8654de1662dc',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'generate-stream/route.ts:135',message:'Starting code bundling',data:{fullCodeLength:fullCode.length,hasSchema:!!design.schema},sessionId:'debug-session',runId:'stream-debug',hypothesisId:'H4'})}).catch(()=>{});
          // #endregion

          const bundle = bundleCode({
            appId: existingAppId || generateId(),
            appCode: fullCode,
            schema: design.schema,
          });

          // #region agent log
          fetch('http://127.0.0.1:7244/ingest/943e0f46-b287-498e-bc97-8654de1662dc',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'generate-stream/route.ts:142',message:'Code bundling completed',data:{bundleSize:bundle.bundleSize,filesCount:Object.keys(bundle.files).length},sessionId:'debug-session',runId:'stream-debug',hypothesisId:'H4'})}).catch(()=>{});
          // #endregion

          // Step 4: Save to database
          sendEvent({
            type: 'progress',
            data: { progress: 95, message: 'Saving app...' },
          });

          let appId: string;

          // #region agent log
          fetch('http://127.0.0.1:7244/ingest/943e0f46-b287-498e-bc97-8654de1662dc',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'generate-stream/route.ts:149',message:'Starting database save',data:{regenerate,existingAppId:!!existingAppId},sessionId:'debug-session',runId:'stream-debug',hypothesisId:'H5'})}).catch(()=>{});
          // #endregion

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
          // #region agent log
          fetch('http://127.0.0.1:7244/ingest/943e0f46-b287-498e-bc97-8654de1662dc',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'generate-stream/route.ts:201',message:'Caught generation error',data:{errorMessage:error instanceof Error ? error.message : String(error)},sessionId:'debug-session',runId:'stream-debug',hypothesisId:'H1'})}).catch(()=>{});
          // #endregion
          console.error('Generation error:', error);
          sendEvent({
            type: 'error',
            data: {
              error: error instanceof Error ? error.message : 'Generation failed',
            },
          });
        } finally {
          // #region agent log
          fetch('http://127.0.0.1:7244/ingest/943e0f46-b287-498e-bc97-8654de1662dc',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'generate-stream/route.ts:209',message:'Closing controller in finally block',data:{controllerClosed},sessionId:'debug-session',runId:'stream-debug',hypothesisId:'H2'})}).catch(()=>{});
          // #endregion
          controllerClosed = true;
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
