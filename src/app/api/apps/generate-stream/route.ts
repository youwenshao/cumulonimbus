/**
 * Streaming Code Generation API
 * Generates app code using Server-Sent Events for real-time streaming
 * With automatic error detection and feedback loop for self-correction
 */

import { NextRequest } from 'next/server';
import { getServerSession } from '@/lib/auth';
import prisma from '@/lib/db';
import { generateId } from '@/lib/utils';
import { freeformGenerator } from '@/lib/scaffolder-v2/agents';
import { bundleCode } from '@/lib/runtime';
import { bundleAppCode, type ServerBundleResult } from '@/lib/runtime/server-bundler';
import type { FreeformDesign } from '@/lib/scaffolder-v2/agents';
import { FeedbackLoop } from '@/lib/scaffolder-v2/feedback-loop';
import { errorDetectionService, type DetectedError } from '@/lib/scaffolder-v2/error-detection-service';
import { incrementalFixGenerator } from '@/lib/scaffolder-v2/incremental-fix-generator';
import { FEEDBACK_CONFIG, type ErrorStage } from '@/lib/scaffolder-v2/feedback-config';
import type { ErrorCategory } from '@/lib/scaffolder-v2/error-analyzer';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface GenerateRequest {
  prompt: string;
  appName?: string;
  conversationId?: string;
  regenerate?: boolean;
  existingAppId?: string;
}

/** Retry attempt data for UI display */
interface RetryAttemptData {
  attempt: number;
  maxAttempts: number;
  stage: ErrorStage;
  errorCategory: ErrorCategory;
  errorMessage: string;
  errorLine?: number;
  fix?: string;
  strategy?: string;
}

interface SSEEvent {
  type: 'design' | 'chunk' | 'file' | 'progress' | 'complete' | 'error' | 'retry';
  data: {
    design?: FreeformDesign;
    content?: string;
    filename?: string;
    progress?: number;
    appId?: string;
    error?: string;
    message?: string;
    /** Retry attempt information */
    retry?: RetryAttemptData;
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

          // Initialize feedback loop for error correction
          const feedbackLoop = new FeedbackLoop(
            generateId(),
            prompt,
            FEEDBACK_CONFIG.MAX_RETRIES
          );
          feedbackLoop.setDesignInfo(design);

          // Step 2: Stream code generation
          sendEvent({
            type: 'progress',
            data: { progress: 20, message: 'Generating code...' },
          });

          let fullCode = '';
          let chunkCount = 0;

          console.log('[generate-stream] Starting streaming code generation');

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
            console.log('[generate-stream] Streaming loop completed, code length:', fullCode.length);
          } catch (streamError) {
            console.error('[generate-stream] Streaming loop failed:', streamError);
            throw streamError;
          }

          // Step 3: Bundle with retry loop
          sendEvent({
            type: 'progress',
            data: { progress: 88, message: 'Bundling app...' },
          });

          const appIdToUse = existingAppId || generateId();
          feedbackLoop.setCurrentCode(fullCode);

          // Bundle retry loop
          let serverBundledCode: string | null = null;
          let requiredBundles: string[] = ['utils'];
          let bundlingSuccess = false;
          let currentCode = fullCode;
          let lastBundleResult: ServerBundleResult | null = null;

          while (feedbackLoop.isActive() && feedbackLoop.shouldRetry()) {
            const attemptNumber = feedbackLoop.getCurrentAttempt() + 1;
            console.log(`[generate-stream] Bundling attempt ${attemptNumber}/${FEEDBACK_CONFIG.MAX_RETRIES}`);

            // Update progress based on attempt
            const bundleProgress = 88 + (attemptNumber * 1);
            sendEvent({
              type: 'progress',
              data: { 
                progress: bundleProgress, 
                message: attemptNumber === 1 
                  ? 'Bundling app...' 
                  : `Fixing errors (attempt ${attemptNumber}/${FEEDBACK_CONFIG.MAX_RETRIES})...` 
              },
            });

            try {
              // Attempt server bundling
              lastBundleResult = await bundleAppCode({
                code: currentCode,
                appId: appIdToUse,
                minify: false,
              });

              // Check for errors
              const errorDetection = errorDetectionService.detectServerBundlingErrors(lastBundleResult);

              if (!errorDetection.hasErrors && lastBundleResult.success) {
                // Bundling succeeded!
                serverBundledCode = lastBundleResult.code;
                requiredBundles = lastBundleResult.requiredBundles;
                bundlingSuccess = true;
                feedbackLoop.markResolved();
                console.log('[generate-stream] Bundling successful on attempt', attemptNumber);
                break;
              }

              // Bundling failed - attempt fix
              if (errorDetection.hasErrors && errorDetection.primaryError) {
                const primaryError = errorDetection.primaryError;
                console.log('[generate-stream] Bundling error detected:', {
                  category: primaryError.analysis.category,
                  message: primaryError.message.substring(0, 100),
                  line: primaryError.line,
                });

                // Add error to feedback loop
                feedbackLoop.addDetectedError(currentCode, primaryError, 'server_bundling');

                // Send retry event to UI
                sendEvent({
                  type: 'retry',
                  data: {
                    message: `Fixing ${primaryError.analysis.category} error...`,
                    progress: bundleProgress,
                    retry: {
                      attempt: attemptNumber,
                      maxAttempts: FEEDBACK_CONFIG.MAX_RETRIES,
                      stage: 'server_bundling',
                      errorCategory: primaryError.analysis.category,
                      errorMessage: primaryError.analysis.rootCause,
                      errorLine: primaryError.line,
                      strategy: feedbackLoop.shouldUseIncrementalFix() ? 'incremental' : 'full',
                    },
                  },
                });

                // Check if we should continue retrying
                if (!feedbackLoop.shouldRetry()) {
                  console.log('[generate-stream] Max retries reached or error not fixable');
                  feedbackLoop.markFailed();
                  break;
                }

                // Generate fix
                const fixResult = await incrementalFixGenerator.generateFix(
                  currentCode,
                  primaryError,
                  attemptNumber,
                  prompt
                );

                if (fixResult.success) {
                  currentCode = fixResult.fixedCode;
                  feedbackLoop.setCurrentCode(currentCode);
                  console.log('[generate-stream] Fix applied:', fixResult.changeDescription);

                  // Send retry success event
                  sendEvent({
                    type: 'retry',
                    data: {
                      message: fixResult.changeDescription,
                      progress: bundleProgress + 1,
                      retry: {
                        attempt: attemptNumber,
                        maxAttempts: FEEDBACK_CONFIG.MAX_RETRIES,
                        stage: 'server_bundling',
                        errorCategory: primaryError.analysis.category,
                        errorMessage: 'Applying fix...',
                        fix: fixResult.changeDescription,
                        strategy: fixResult.strategy,
                      },
                    },
                  });
                } else {
                  console.error('[generate-stream] Fix generation failed:', fixResult.error);
                  // Continue to next attempt anyway
                }
              } else {
                // No errors detected but bundling not successful - shouldn't happen often
                console.warn('[generate-stream] Bundling failed but no errors detected');
                break;
              }
            } catch (bundleError) {
              console.error('[generate-stream] Bundling exception:', bundleError);
              
              // Try to detect errors from the exception
              if (bundleError instanceof Error) {
                const errorDetection = errorDetectionService.detectGenericError(
                  bundleError,
                  'server_bundling'
                );
                
                if (errorDetection.primaryError) {
                  feedbackLoop.addDetectedError(currentCode, errorDetection.primaryError, 'server_bundling');
                  
                  // Try one more fix
                  if (feedbackLoop.shouldRetry()) {
                    const fixResult = await incrementalFixGenerator.generateFix(
                      currentCode,
                      errorDetection.primaryError,
                      attemptNumber,
                      prompt
                    );
                    
                    if (fixResult.success) {
                      currentCode = fixResult.fixedCode;
                      feedbackLoop.setCurrentCode(currentCode);
                    }
                  }
                }
              }
            }
          }

          // After retry loop - check final status
          if (!bundlingSuccess) {
            console.warn('[generate-stream] Bundling failed after all retries, using raw code');
            // Fall back to client-side bundling by not setting serverBundledCode
            // The runtime will handle transpilation
          }

          // Client-side bundling (for code viewer)
          const bundle = bundleCode({
            appId: appIdToUse,
            appCode: bundlingSuccess ? currentCode : fullCode,
            schema: design.schema,
          });

          console.log('[generate-stream] Client bundling completed, size:', bundle.bundleSize);

          // Step 4: Save to database
          sendEvent({
            type: 'progress',
            data: { progress: 95, message: 'Saving app...' },
          });

          let appId: string;

          // Store feedback session info for analytics
          const feedbackSummary = feedbackLoop.getSummary();
          const generationLog = {
            feedbackSession: feedbackLoop.getSession(),
            bundlingAttempts: feedbackSummary.attempts,
            tokensUsed: feedbackSummary.tokensUsed,
            finalStatus: feedbackSummary.status,
            lastError: feedbackSummary.lastError,
          };

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
                generationLog: generationLog as unknown as object,
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
                executionMode: 'sandbox',
                data: [],
                status: 'ACTIVE',
                buildStatus: 'COMPLETED',
                generationLog: generationLog as unknown as object,
              },
            });
            appId = app.id;
          }

          // Step 5: Send complete event
          const successMessage = bundlingSuccess
            ? 'App generated successfully!'
            : `App generated with warnings (${feedbackSummary.attempts} fix attempts)`;
          
          sendEvent({
            type: 'complete',
            data: {
              appId,
              progress: 100,
              message: successMessage,
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
