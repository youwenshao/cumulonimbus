import { NextRequest } from 'next/server';
import { getServerSession } from '@/lib/auth';

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

// Type definitions for status messages
export interface StatusMessagePayload {
  id: string;
  phase: string;
  message: string;
  technicalDetails?: string;
  severity: 'info' | 'success' | 'warning' | 'error';
  timestamp: string;
  progress?: number;
}

// Global state for SSE management
const globalStatusEmitters = new Map<string, ReadableStreamDefaultController<Uint8Array>>();
const pendingMessages = new Map<string, StatusMessagePayload[]>();
const connectionTimestamps = new Map<string, number>();
const encoder = new TextEncoder();

// Constants
const HEARTBEAT_INTERVAL = 15000;
const MESSAGE_BUFFER_MAX_SIZE = 100;
const MESSAGE_BUFFER_MAX_AGE_MS = 60000; // 1 minute

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

/**
 * Cleanup connection state
 */
function cleanupConnection(conversationId: string) {
  globalStatusEmitters.delete(conversationId);
  connectionTimestamps.delete(conversationId);
  // Keep pending messages for a bit in case of reconnect
  setTimeout(() => {
    if (!globalStatusEmitters.has(conversationId)) {
      pendingMessages.delete(conversationId);
    }
  }, 5000);
}

/**
 * Flush all buffered messages for a conversation
 */
function flushBufferedMessages(conversationId: string) {
  const buffer = pendingMessages.get(conversationId);
  const controller = globalStatusEmitters.get(conversationId);
  
  if (!buffer || buffer.length === 0 || !controller) {
    return;
  }
  
  console.log(`📤 Flushing ${buffer.length} buffered messages for ${conversationId}`);
  
  for (const msg of buffer) {
    try {
      const data = `data: ${JSON.stringify(msg)}\n\n`;
      controller.enqueue(encoder.encode(data));
    } catch (error) {
      console.error(`❌ Failed to flush message for ${conversationId}:`, error);
      break;
    }
  }
  
  // Clear the buffer after flushing
  pendingMessages.delete(conversationId);
}

/**
 * Buffer a message for later delivery
 */
function bufferMessage(conversationId: string, message: StatusMessagePayload) {
  if (!pendingMessages.has(conversationId)) {
    pendingMessages.set(conversationId, []);
  }
  
  const buffer = pendingMessages.get(conversationId)!;
  
  // Enforce max buffer size (FIFO)
  if (buffer.length >= MESSAGE_BUFFER_MAX_SIZE) {
    buffer.shift();
  }
  
  buffer.push(message);
  console.log(`📦 Buffered message for ${conversationId} (buffer size: ${buffer.length})`);
}

/**
 * Check if a controller is still healthy
 */
function isControllerHealthy(conversationId: string): boolean {
  const controller = globalStatusEmitters.get(conversationId);
  const timestamp = connectionTimestamps.get(conversationId);
  
  if (!controller) return false;
  
  // Check if connection is too old without activity
  if (timestamp && Date.now() - timestamp > MESSAGE_BUFFER_MAX_AGE_MS * 2) {
    console.log(`⚠️ Connection for ${conversationId} appears stale, cleaning up`);
    cleanupConnection(conversationId);
    return false;
  }
  
  return true;
}

/**
 * Helper function to emit status to a conversation's SSE stream
 * With buffering support for reliability
 */
export function emitStatus(
  conversationId: string,
  phase: string,
  message: string,
  options?: {
    technicalDetails?: string;
    severity?: 'info' | 'success' | 'warning' | 'error';
    progress?: number;
  }
): boolean {
  const statusMessage: StatusMessagePayload = {
    id: `status-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    phase,
    message,
    technicalDetails: options?.technicalDetails,
    severity: options?.severity || 'info',
    timestamp: new Date().toISOString(),
    progress: options?.progress,
  };

  // Check if we have a healthy controller
  if (!isControllerHealthy(conversationId)) {
    // Buffer the message for later delivery
    bufferMessage(conversationId, statusMessage);
    
    // Schedule a retry to flush when connection arrives
    scheduleBufferFlush(conversationId);
    return false;
  }

  const controller = globalStatusEmitters.get(conversationId)!;

  // First flush any buffered messages
  flushBufferedMessages(conversationId);

  // Then send the current message
  try {
    const data = `data: ${JSON.stringify(statusMessage)}\n\n`;
    controller.enqueue(encoder.encode(data));
    console.log(`📤 emitStatus [${conversationId}]: ${phase} - ${message} (${options?.progress || 0}%)`);
    
    // Update connection timestamp
    connectionTimestamps.set(conversationId, Date.now());
    return true;
  } catch (error) {
    console.error(`❌ emitStatus failed [${conversationId}]:`, error);
    cleanupConnection(conversationId);
    
    // Buffer the message for retry
    bufferMessage(conversationId, statusMessage);
    return false;
  }
}

/**
 * Schedule buffer flush with exponential backoff
 */
const pendingFlushTimeouts = new Map<string, NodeJS.Timeout>();

function scheduleBufferFlush(conversationId: string, attempt = 0) {
  // Clear any existing timeout
  const existing = pendingFlushTimeouts.get(conversationId);
  if (existing) {
    clearTimeout(existing);
  }
  
  // Max 5 attempts
  if (attempt >= 5) {
    console.log(`⚠️ Max flush attempts reached for ${conversationId}, giving up`);
    return;
  }
  
  // Exponential backoff: 100ms, 200ms, 400ms, 800ms, 1600ms
  const delay = 100 * Math.pow(2, attempt);
  
  const timeout = setTimeout(() => {
    pendingFlushTimeouts.delete(conversationId);
    
    if (isControllerHealthy(conversationId)) {
      flushBufferedMessages(conversationId);
    } else if (pendingMessages.has(conversationId) && pendingMessages.get(conversationId)!.length > 0) {
      // Still have messages, try again
      scheduleBufferFlush(conversationId, attempt + 1);
    }
  }, delay);
  
  pendingFlushTimeouts.set(conversationId, timeout);
}

/**
 * Wait for SSE connection to be ready
 * Returns true if connection established within timeout, false otherwise
 */
export async function waitForConnection(conversationId: string, timeoutMs = 3000): Promise<boolean> {
  const startTime = Date.now();
  
  while (Date.now() - startTime < timeoutMs) {
    if (isControllerHealthy(conversationId)) {
      return true;
    }
    await new Promise(resolve => setTimeout(resolve, 50));
  }
  
  console.log(`⚠️ Timeout waiting for SSE connection: ${conversationId}`);
  return false;
}

/**
 * Get current SSE connection statistics (for debugging)
 */
export function getConnectionStats() {
  return {
    activeConnections: globalStatusEmitters.size,
    bufferedConversations: pendingMessages.size,
    totalBufferedMessages: Array.from(pendingMessages.values()).reduce((sum, buf) => sum + buf.length, 0),
    connectionIds: Array.from(globalStatusEmitters.keys()),
  };
}

// Export for use in other modules
export { globalStatusEmitters };
