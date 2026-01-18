
import { NextRequest } from 'next/server';
import { getServerSession } from '@/lib/auth';
import {
  globalStatusEmitters,
  pendingMessages,
  connectionTimestamps,
  encoder,
  HEARTBEAT_INTERVAL,
  cleanupConnection,
  flushBufferedMessages,
} from '@/lib/scaffolder/status/emitter';

/**
 * SSE endpoint for streaming status updates during app generation
 * GET /api/scaffolder/status/[conversationId]
 * 
 * Features:
 * - Message buffering for reliability (handles race conditions)
 * - Connection acknowledgment (ready event)
 * - Heartbeat for connection health
 * - Automatic buffer flushing on connect
 */

export async function GET(
  request: NextRequest,
  { params }: { params: { conversationId: string } }
) {
  try {
    const session = await getServerSession();

    if (!session?.user?.id) {
      console.log('📡 SSE: Unauthorized request');
      return new Response('Unauthorized', { status: 401 });
    }

    const conversationId = params.conversationId;
    console.log(`📡 SSE: Connection request for ${conversationId}`);

    // Create SSE stream with buffering support
    const stream = new ReadableStream({
      start(controller) {
        // Store controller in global map FIRST
        globalStatusEmitters.set(conversationId, controller);
        connectionTimestamps.set(conversationId, Date.now());
        console.log(`📡 SSE: Controller registered for ${conversationId} (total: ${globalStatusEmitters.size})`);
        
        // Send initial connection acknowledgment
        const connectedMsg = {
          id: `connected-${Date.now()}`,
          type: 'connected',
          conversationId,
          timestamp: new Date().toISOString(),
          bufferedCount: pendingMessages.get(conversationId)?.length || 0,
        };
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(connectedMsg)}\n\n`));
        console.log(`📡 SSE: Sent connected event for ${conversationId}`);
        
        // Flush any buffered messages immediately
        flushBufferedMessages(conversationId);
        
        // Keep connection alive with heartbeat
        const heartbeat = setInterval(() => {
          try {
            if (!globalStatusEmitters.has(conversationId)) {
              clearInterval(heartbeat);
              return;
            }
            controller.enqueue(encoder.encode(`: heartbeat ${Date.now()}\n\n`));
          } catch {
            clearInterval(heartbeat);
            cleanupConnection(conversationId);
          }
        }, HEARTBEAT_INTERVAL);

        // Cleanup on client disconnect
        request.signal.addEventListener('abort', () => {
          console.log(`📡 SSE: Client disconnected ${conversationId}`);
          clearInterval(heartbeat);
          cleanupConnection(conversationId);
          try {
            controller.close();
          } catch {
            // Already closed
          }
        });
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache, no-transform',
        'Connection': 'keep-alive',
        'X-Accel-Buffering': 'no', // Disable nginx buffering
      },
    });
  } catch (error) {
    console.error('📡 SSE: Endpoint error:', error);
    return new Response('Internal Server Error', { status: 500 });
  }
}
