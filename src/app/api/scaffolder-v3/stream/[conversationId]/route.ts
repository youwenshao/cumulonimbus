/**
 * V3 Scaffolder Streaming Endpoint
 * Server-Sent Events (SSE) for real-time code generation streaming
 */

import { NextRequest } from 'next/server';
import { getServerSession } from '@/lib/auth';
import prisma from '@/lib/db';
import { getStreamData, clearStreamData } from '../../route';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/scaffolder-v3/stream/[conversationId]
 * Stream generation progress via SSE
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { conversationId: string } }
) {
  const session = await getServerSession();

  if (!session?.user?.id) {
    return new Response('Unauthorized', { status: 401 });
  }

  const { conversationId } = params;

  // Verify user owns this conversation
  const conversation = await prisma.conversation.findFirst({
    where: {
      id: conversationId,
      userId: session.user.id,
    },
  });

  if (!conversation) {
    return new Response('Conversation not found', { status: 404 });
  }

  // Set up SSE stream
  const encoder = new TextEncoder();
  let lastChunkIndex = 0;

  const stream = new ReadableStream({
    async start(controller) {
      const sendEvent = (event: string, data: unknown) => {
        const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
        controller.enqueue(encoder.encode(payload));
      };

      // Send initial connected event
      sendEvent('connected', { conversationId });

      // Poll for new chunks
      const pollInterval = setInterval(() => {
        const streamData = getStreamData(conversationId);
        
        if (!streamData) {
          // Stream not started yet
          return;
        }

        // Send new chunks
        while (lastChunkIndex < streamData.chunks.length) {
          sendEvent('chunk', { 
            content: streamData.chunks[lastChunkIndex],
            index: lastChunkIndex,
          });
          lastChunkIndex++;
        }

        // Check if done
        if (streamData.done) {
          clearInterval(pollInterval);
          
          if (streamData.error) {
            sendEvent('error', { error: streamData.error });
          } else if (streamData.result) {
            sendEvent('complete', {
              chatSummary: streamData.result.chatSummary,
              modifiedFiles: streamData.result.modifiedFiles,
              createdFiles: streamData.result.createdFiles,
              deletedFiles: streamData.result.deletedFiles,
              addedDependencies: streamData.result.addedDependencies,
              toolExecutions: streamData.result.toolExecutions.length,
            });
          }
          
          // Clean up
          clearStreamData(conversationId);
          controller.close();
        }
      }, 50); // Poll every 50ms for low latency

      // Handle client disconnect
      request.signal.addEventListener('abort', () => {
        clearInterval(pollInterval);
        controller.close();
      });
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
}
