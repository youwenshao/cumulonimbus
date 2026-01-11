/**
 * V2 Preview SSE Endpoint
 * Stream generated components for live preview
 */

import { NextRequest } from 'next/server';
import { EventEmitter } from 'events';

// Global event emitter for preview updates
const v2PreviewEmitter = new EventEmitter();
v2PreviewEmitter.setMaxListeners(100);

export interface V2PreviewEvent {
  type: 'component' | 'layout' | 'types' | 'complete' | 'error';
  name?: string;
  code?: string;
  progress: number;
  error?: string;
}

/**
 * Emit a preview event for a conversation
 */
export function emitV2Preview(
  conversationId: string,
  event: V2PreviewEvent
): void {
  v2PreviewEmitter.emit(`preview:${conversationId}`, event);
}

/**
 * Emit component code for preview
 */
export function emitV2Component(
  conversationId: string,
  componentName: string,
  code: string,
  progress: number
): void {
  emitV2Preview(conversationId, {
    type: 'component',
    name: componentName,
    code,
    progress,
  });
}

/**
 * Emit layout update for preview
 */
export function emitV2Layout(
  conversationId: string,
  layout: Record<string, unknown>,
  progress: number
): void {
  emitV2Preview(conversationId, {
    type: 'layout',
    code: JSON.stringify(layout),
    progress,
  });
}

/**
 * Emit completion event
 */
export function emitV2Complete(
  conversationId: string
): void {
  emitV2Preview(conversationId, {
    type: 'complete',
    progress: 100,
  });
}

/**
 * Emit error event
 */
export function emitV2Error(
  conversationId: string,
  error: string
): void {
  emitV2Preview(conversationId, {
    type: 'error',
    error,
    progress: 0,
  });
}

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
