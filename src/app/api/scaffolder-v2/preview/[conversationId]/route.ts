
/**
 * V2 Preview SSE Endpoint
 * Stream generated components for live preview
 */

import { NextRequest } from 'next/server';
import { v2PreviewEmitter, V2PreviewEvent } from '@/lib/scaffolder-v2/preview/emitter';

/**
 * GET /api/scaffolder-v2/preview/[conversationId]
 * SSE endpoint for live preview updates
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { conversationId: string } }
) {
  const conversationId = params.conversationId;

  const stream = new TransformStream();
  const writer = stream.writable.getWriter();
  const encoder = new TextEncoder();

  // Write event to stream
  const writeEvent = async (eventType: string, event: V2PreviewEvent) => {
    try {
      const data = `event: ${eventType}\ndata: ${JSON.stringify(event)}\n\n`;
      await writer.write(encoder.encode(data));
    } catch (error) {
      console.error('Error writing SSE preview event:', error);
    }
  };

  // Send initial connection event
  await writeEvent('connected', {
    type: 'layout',
    progress: 0,
  });

  // Listen for preview events
  const handler = async (event: V2PreviewEvent) => {
    await writeEvent(event.type, event);
  };

  v2PreviewEmitter.on(`preview:${conversationId}`, handler);

  // Handle client disconnect
  request.signal.addEventListener('abort', () => {
    v2PreviewEmitter.off(`preview:${conversationId}`, handler);
    writer.close().catch(() => {});
  });

  // Keep connection alive with heartbeat
  const heartbeat = setInterval(async () => {
    try {
      await writer.write(encoder.encode(': heartbeat\n\n'));
    } catch {
      clearInterval(heartbeat);
    }
  }, 30000);

  return new Response(stream.readable, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}
