
import { NextRequest } from 'next/server';
import { getServerSession } from '@/lib/auth';

/**
 * Global state for V2 code stream SSE management
 * Separated from V1 to avoid conflicts
 */
export const v2CodeEmitters = new Map<string, ReadableStreamDefaultController<Uint8Array>>();
export const v2PendingChunks = new Map<string, CodeChunkV2[]>();
export const v2ConnectionTimestamps = new Map<string, number>();

const encoder = new TextEncoder();
const HEARTBEAT_INTERVAL = 15000;

export interface CodeChunkV2 {
  id: string;
  type: 'chunk' | 'complete' | 'error' | 'connected' | 'status';
  component: string; // file path or component name
  code: string;
  progress: number;
  timestamp: string;
  error?: string;
  metadata?: {
    fileName?: string;
    language?: string;
    totalFiles?: number;
    currentFile?: number;
  };
}

/**
 * Cleanup connection state
 */
export function cleanupV2Connection(conversationId: string) {
  v2CodeEmitters.delete(conversationId);
  v2ConnectionTimestamps.delete(conversationId);
  setTimeout(() => {
    if (!v2CodeEmitters.has(conversationId)) {
      v2PendingChunks.delete(conversationId);
    }
  }, 5000);
}

/**
 * Flush buffered chunks
 */
export function flushV2BufferedChunks(conversationId: string) {
  const buffer = v2PendingChunks.get(conversationId);
  const controller = v2CodeEmitters.get(conversationId);
  
  if (!buffer || buffer.length === 0 || !controller) return;
  
  console.log(`📤 V2 Code Stream: Flushing ${buffer.length} buffered chunks`);
  
  for (const chunk of buffer) {
    try {
      const data = `data: ${JSON.stringify(chunk)}\n\n`;
      controller.enqueue(encoder.encode(data));
    } catch (error) {
      console.error(`❌ V2 Code Stream: Failed to flush chunk:`, error);
      break;
    }
  }
  
  v2PendingChunks.delete(conversationId);
}

/**
 * Check if controller is healthy
 */
export function isV2ControllerHealthy(conversationId: string): boolean {
  return v2CodeEmitters.has(conversationId);
}

/**
 * Emit a code chunk to the V2 stream
 */
export function emitV2CodeChunk(
  conversationId: string,
  chunk: Omit<CodeChunkV2, 'id' | 'timestamp'>
): boolean {
  const codeChunk: CodeChunkV2 = {
    id: `v2-code-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    timestamp: new Date().toISOString(),
    ...chunk,
  };

  if (!isV2ControllerHealthy(conversationId)) {
    // Buffer the chunk
    if (!v2PendingChunks.has(conversationId)) {
      v2PendingChunks.set(conversationId, []);
    }
    const buffer = v2PendingChunks.get(conversationId)!;
    if (buffer.length < 100) {
      buffer.push(codeChunk);
    }
    return false;
  }

  const controller = v2CodeEmitters.get(conversationId)!;

  // Flush any buffered chunks first
  flushV2BufferedChunks(conversationId);

  try {
    const data = `data: ${JSON.stringify(codeChunk)}\n\n`;
    controller.enqueue(encoder.encode(data));
    return true;
  } catch (error) {
    console.error(`❌ V2 Code Stream: Failed to emit chunk:`, error);
    cleanupV2Connection(conversationId);
    return false;
  }
}

/**
 * Wait for V2 code stream connection
 */
export async function waitForV2CodeStreamConnection(
  conversationId: string,
  timeoutMs = 5000
): Promise<boolean> {
  const startTime = Date.now();
  
  while (Date.now() - startTime < timeoutMs) {
    if (isV2ControllerHealthy(conversationId)) {
      console.log(`📡 V2 Code Stream: Connection ready for ${conversationId}`);
      return true;
    }
    await new Promise(resolve => setTimeout(resolve, 50));
  }
  
  console.log(`⚠️ V2 Code Stream: Timeout waiting for connection: ${conversationId}`);
  return false;
}

/**
 * SSE endpoint for streaming generated code during V2 app generation
 * GET /api/scaffolder-v2/code-stream/[conversationId]
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { conversationId: string } }
) {
  try {
    const session = await getServerSession();

    if (!session?.user?.id) {
      console.log('📡 V2 Code Stream: Unauthorized request');
      return new Response('Unauthorized', { status: 401 });
    }

    const conversationId = params.conversationId;
    console.log(`📡 V2 Code Stream: Connection request for ${conversationId}`);

    const stream = new ReadableStream({
      start(controller) {
        // Store controller
        v2CodeEmitters.set(conversationId, controller);
        v2ConnectionTimestamps.set(conversationId, Date.now());
        console.log(`📡 V2 Code Stream: Controller registered for ${conversationId}`);
        
        // Send initial connection acknowledgment
        const connectedMsg: CodeChunkV2 = {
          id: `connected-${Date.now()}`,
          type: 'connected',
          component: 'system',
          code: '',
          progress: 0,
          timestamp: new Date().toISOString(),
          metadata: {
            totalFiles: 0,
            currentFile: 0,
          },
        };
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(connectedMsg)}\n\n`));
        
        // Flush any buffered chunks
        flushV2BufferedChunks(conversationId);
        
        // Keep connection alive with heartbeat
        const heartbeat = setInterval(() => {
          try {
            if (!v2CodeEmitters.has(conversationId)) {
              clearInterval(heartbeat);
              return;
            }
            controller.enqueue(encoder.encode(`: heartbeat ${Date.now()}\n\n`));
          } catch {
            clearInterval(heartbeat);
            cleanupV2Connection(conversationId);
          }
        }, HEARTBEAT_INTERVAL);

        // Cleanup on client disconnect
        request.signal.addEventListener('abort', () => {
          console.log(`📡 V2 Code Stream: Client disconnected ${conversationId}`);
          clearInterval(heartbeat);
          cleanupV2Connection(conversationId);
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
        'X-Accel-Buffering': 'no',
      },
    });
  } catch (error) {
    console.error('📡 V2 Code Stream: Endpoint error:', error);
    return new Response('Internal Server Error', { status: 500 });
  }
}
