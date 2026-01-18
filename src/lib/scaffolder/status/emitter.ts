
/**
 * Status Emitter
 * Manages SSE streams for status updates
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
export const globalStatusEmitters = new Map<string, ReadableStreamDefaultController<Uint8Array>>();
export const pendingMessages = new Map<string, StatusMessagePayload[]>();
export const connectionTimestamps = new Map<string, number>();
export const encoder = new TextEncoder();
const pendingFlushTimeouts = new Map<string, NodeJS.Timeout>();

// Constants
export const HEARTBEAT_INTERVAL = 15000;
export const MESSAGE_BUFFER_MAX_SIZE = 100;
export const MESSAGE_BUFFER_MAX_AGE_MS = 60000; // 1 minute

/**
 * Cleanup connection state
 */
export function cleanupConnection(conversationId: string) {
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
export function flushBufferedMessages(conversationId: string) {
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
export function bufferMessage(conversationId: string, message: StatusMessagePayload) {
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
export function isControllerHealthy(conversationId: string): boolean {
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
 * Schedule buffer flush with exponential backoff
 */
export function scheduleBufferFlush(conversationId: string, attempt = 0) {
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
