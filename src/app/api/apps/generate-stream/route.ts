/**
 * Streaming Code Generation API
 * Generates app code using Server-Sent Events for real-time streaming
 */

import { NextRequest } from 'next/server';
import { getServerSession } from '@/lib/auth';
import prisma from '@/lib/db';
import { generateId, sleep } from '@/lib/utils';
import { freeformGenerator } from '@/lib/scaffolder-v2/agents';
import { bundleCode } from '@/lib/runtime';
import { bundleAppCode } from '@/lib/runtime/server-bundler';
import type { FreeformDesign } from '@/lib/scaffolder-v2/agents';
import { IS_DEMO_MODE } from '@/lib/config';
import { DEMO_SCENARIOS, type DemoScenario, type SimulationEvent } from '@/lib/demo/seed-data';

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
  type: 'design' | 'chunk' | 'file' | 'progress' | 'complete' | 'error' | 'simulation_event';
  data: {
    design?: FreeformDesign;
    content?: string;
    filename?: string;
    progress?: number;
    appId?: string;
    error?: string;
    message?: string;
    simulationEvent?: SimulationEvent;
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
          headers: { 'Content-Type': 'text/event-stream' }
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
          headers: { 'Content-Type': 'text/event-stream' }
        }
      );
    }

    // Create a readable stream for SSE
    let controllerClosed = false;
    const stream = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder();

        const sendEvent = (event: SSEEvent) => {
          try {
            if (!controllerClosed) {
              controller.enqueue(encoder.encode(encodeSSE(event)));
            }
          } catch (enqueueError) {
            console.error('Failed to enqueue SSE event:', enqueueError);
          }
        };

        try {
          // Check for DEMO mode and matching scenario
          let demoScenario: DemoScenario | undefined;
          if (IS_DEMO_MODE) {
            demoScenario = DEMO_SCENARIOS.find(s => s.trigger.test(prompt));
          }

          if (demoScenario) {
            console.log(`🎮 Demo Mode: Matched scenario "${demoScenario.name}" for freeform generation`);
            
            // 1. Run simulation timeline (Agent thinking process)
            for (const event of demoScenario.timeline) {
              // Skip code_generation event type for now, we handle it explicitly later
              if (event.type === 'code_generation') continue;

              sendEvent({
                type: 'simulation_event',
                data: { simulationEvent: event }
              });
              
              await sleep(event.delay || 1000);
            }

            // 2. Mock Design Phase
            const design: FreeformDesign = {
              appName: demoScenario.spec.name,
              description: demoScenario.spec.description,
              features: demoScenario.spec.views.map(v => v.title), // Approximate from views
              schema: {
                name: 'Item', // Generic name
                label: 'Item',
                fields: demoScenario.spec.dataStore.fields.map(f => ({
                  name: f.name,
                  label: f.label,
                  type: f.type as any,
                  required: f.required
                }))
              },
              uiComponents: ['Card', 'Button', 'Table', 'Form'],
              interactions: ['Create Order', 'Update Status', 'Calculate Total'],
              complexity: 'moderate'
            };

            sendEvent({
              type: 'design',
              data: { design, progress: 15, message: 'App designed!' }
            });

            await sleep(800);

            // 3. Mock Code Generation
            sendEvent({
              type: 'progress',
              data: { progress: 20, message: 'Generating code...' }
            });

            // Use the seeded code from the scenario
            const fullCode = demoScenario.code.pageComponent;
            const chunkSize = 50;
            let chunkCount = 0;

            for (let i = 0; i < fullCode.length; i += chunkSize) {
              const chunk = fullCode.slice(i, i + chunkSize);
              
              sendEvent({
                type: 'chunk',
                data: {
                  content: chunk,
                  progress: Math.min(85, 20 + ((i / fullCode.length) * 65)),
                }
              });
              
              chunkCount++;
              await sleep(20); // Fast typing simulation
            }

            // 4. Bundle and Save (Mocked for speed/reliability in demo)
            sendEvent({
              type: 'progress',
              data: { progress: 90, message: 'Bundling app...' },
            });
            
            await sleep(500);

            const appIdToUse = existingAppId || generateId();

            // Create bundle result manually since we have the code
            const bundle = bundleCode({
              appId: appIdToUse,
              appCode: fullCode,
              schema: design.schema,
            });

            // Save to DB
            const app = await prisma.app.create({
              data: {
                id: appIdToUse,
                userId: session.user.id,
                name: design.appName,
                description: design.description,
                version: 'v2',
                spec: design.schema as unknown as object,
                config: { design, requiredBundles: ['utils'] } as unknown as object,
                componentFiles: { 'App.tsx': fullCode, ...bundle.files } as unknown as object,
                executionMode: 'preview', // Use preview mode for demo to avoid Docker dependency
                data: [],
                status: 'ACTIVE',
                buildStatus: 'COMPLETED',
              },
            });

            // Send files for viewer
            for (const [filename, content] of Object.entries(bundle.files)) {
              sendEvent({
                type: 'file',
                data: { filename, content },
              });
            }

            sendEvent({
              type: 'complete',
              data: {
                appId: app.id,
                progress: 100,
                message: 'App generated successfully!',
              },
            });

            return; // End of demo flow
          }

          // --- STANDARD FLOW (Non-Demo) ---

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

          try {
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
          } catch (streamError) {
            throw streamError; // Re-throw to be caught by outer try-catch
          }

          // Step 3: Bundle the code
          sendEvent({
            type: 'progress',
            data: { progress: 90, message: 'Bundling app...' },
          });

          const appIdToUse = existingAppId || generateId();
          
          const bundle = bundleCode({
            appId: appIdToUse,
            appCode: fullCode,
            schema: design.schema,
          });

          // Step 3.5: Server-side bundling (transpile TSX -> JS)
          let serverBundledCode: string | null = null;
          let requiredBundles: string[] = ['utils']; // Default bundles
          
          try {
            const serverBundle = await bundleAppCode({
              code: fullCode,
              appId: appIdToUse,
              minify: false, // Keep readable for debugging
            });
            
            if (serverBundle.success) {
              serverBundledCode = serverBundle.code;
              requiredBundles = serverBundle.requiredBundles;
            }
          } catch (bundleError) {
            console.error('[generate-stream] Server bundling error:', bundleError);
          }

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
                config: { design, requiredBundles } as unknown as object,
                bundledCode: serverBundledCode,
                executionMode: 'sandbox',
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
                id: appIdToUse,
                userId: session.user.id,
                name: appName || design.appName,
                description: design.description,
                version: 'v2',
                spec: design.schema as unknown as object,
                config: { design, requiredBundles } as unknown as object,
                componentFiles: bundle.files as unknown as object,
                bundledCode: serverBundledCode,
                executionMode: 'preview', // Use preview mode for better development experience
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
