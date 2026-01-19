
/**
 * Code Stream Emitter
 * Manages SSE streams for code generation
 */

// Type definitions for code chunks
export interface CodeChunk {
  id: string;
  type: 'chunk' | 'complete' | 'error' | 'connected';
  component: 'page' | 'form' | 'table' | 'chart' | 'types' | 'error' | 'complete';
  code: string;
  progress: number;
  timestamp: string;
  error?: string;
}

// Global state for SSE management
export const globalCodeEmitters = new Map<string, ReadableStreamDefaultController<Uint8Array>>();
export const pendingCodeChunks = new Map<string, CodeChunk[]>();
export const connectionTimestamps = new Map<string, number>();
export const encoder = new TextEncoder();

// Constants
export const HEARTBEAT_INTERVAL = 15000;
export const BUFFER_MAX_SIZE = 100;

/**
 * Cleanup connection state
 */
export function cleanupConnection(conversationId: string) {
  globalCodeEmitters.delete(conversationId);
  connectionTimestamps.delete(conversationId);
  // Keep pending chunks briefly for reconnection
  setTimeout(() => {
    if (!globalCodeEmitters.has(conversationId)) {
      pendingCodeChunks.delete(conversationId);
    }
  }, 5000);
}

/**
 * Flush all buffered code chunks for a conversation
 */
export function flushBufferedChunks(conversationId: string) {
  const buffer = pendingCodeChunks.get(conversationId);
  const controller = globalCodeEmitters.get(conversationId);
  
  if (!buffer || buffer.length === 0 || !controller) {
    return;
  }
  
  console.log(`📤 Code Stream: Flushing ${buffer.length} buffered chunks for ${conversationId}`);
  
  for (const chunk of buffer) {
    try {
      const data = `data: ${JSON.stringify(chunk)}\n\n`;
      const encodedData = encoder.encode(data);
      console.log(`📤 Code Stream: Flushing buffered chunk type: ${chunk.type}, length: ${encodedData.length}`);
      controller.enqueue(encodedData);
    } catch (error) {
      console.error(`❌ Failed to flush code chunk:`, error);
      break;
    }
  }
  
  pendingCodeChunks.delete(conversationId);
}

/**
 * Buffer a code chunk for later delivery
 */
export function bufferChunk(conversationId: string, chunk: CodeChunk) {
  if (!pendingCodeChunks.has(conversationId)) {
    pendingCodeChunks.set(conversationId, []);
  }
  
  const buffer = pendingCodeChunks.get(conversationId)!;
  
  // Enforce max buffer size (FIFO)
  if (buffer.length >= BUFFER_MAX_SIZE) {
    buffer.shift();
  }
  
  buffer.push(chunk);
}

/**
 * Check if a controller is healthy
 */
export function isControllerHealthy(conversationId: string): boolean {
  const controller = globalCodeEmitters.get(conversationId);
  return !!controller;
}

/**
 * Emit a code chunk to a conversation's SSE stream
 */
export function emitCodeChunk(
  conversationId: string,
  chunk: Omit<CodeChunk, 'id' | 'timestamp' | 'type'>
): boolean {
  const codeChunk: CodeChunk = {
    id: `code-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    type: chunk.component === 'complete' ? 'complete' : (chunk.component === 'error' ? 'error' : 'chunk'),
    ...chunk,
    timestamp: new Date().toISOString(),
  } as CodeChunk;

  // Check if we have a healthy controller
  if (!isControllerHealthy(conversationId)) {
    // Buffer the chunk for later delivery
    bufferChunk(conversationId, codeChunk);
    return false;
  }

  const controller = globalCodeEmitters.get(conversationId)!;

  // First flush any buffered chunks
  flushBufferedChunks(conversationId);

  // Then send the current chunk
  try {
    const data = `data: ${JSON.stringify(codeChunk)}\n\n`;
    const encodedData = encoder.encode(data);
    console.log(`📤 Code Stream: Emitting chunk for ${conversationId}, type: ${codeChunk.type}, length: ${encodedData.length}`);
    controller.enqueue(encodedData);
    return true;
  } catch (error) {
    console.error(`❌ Failed to emit code chunk:`, error);
    // On error, assume connection is dead and buffer
    cleanupConnection(conversationId);
    bufferChunk(conversationId, codeChunk);
    return false;
  }
}

/**
 * Emit an error event
 */
export function emitCodeError(
  conversationId: string,
  error: string
): boolean {
  return emitCodeChunk(conversationId, {
    component: 'error',
    code: '',
    error,
    progress: 0
  });
}

/**
 * Emit completion event
 */
export function emitCodeComplete(
  conversationId: string
): boolean {
  return emitCodeChunk(conversationId, {
    component: 'complete',
    code: '',
    progress: 100
  });
}
