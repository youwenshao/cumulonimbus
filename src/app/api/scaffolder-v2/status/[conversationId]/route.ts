
/**
 * V2 Status SSE Endpoint
 * Real-time status updates for v2 scaffolder operations
 */

import { NextRequest } from 'next/server';
import { v2StatusEmitter, V2StatusEvent } from '@/lib/scaffolder-v2/status/emitter';

/**
 * GET /api/scaffolder-v2/status/[conversationId]
 * SSE endpoint for real-time status updates
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { conversationId: string } }
) {
  const conversationId = params.conversationId;

  const stream = new TransformStream();
  const writer = stream.writable.getWriter();
  const encoder = new TextEncoder();

  // Write initial connection message
  const writeEvent = async (event: V2StatusEvent) => {
    try {
      const data = `data: ${JSON.stringify(event)}\n\n`;
      await writer.write(encoder.encode(data));
    } catch (error) {
      console.error('Error writing SSE event:', error);
    }
  };

  // Send initial connection event
  await writeEvent({
    phase: 'connected',
    message: 'Connected to status stream',
    progress: 0,
    severity: 'info',
  });

  // Listen for status events
  const handler = async (event: V2StatusEvent) => {
    await writeEvent(event);
  };

  v2StatusEmitter.on(`status:${conversationId}`, handler);

  // Handle client disconnect
  request.signal.addEventListener('abort', () => {
    v2StatusEmitter.off(`status:${conversationId}`, handler);
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
