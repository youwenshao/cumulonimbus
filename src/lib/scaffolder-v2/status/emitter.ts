
import { EventEmitter } from 'events';

// Global event emitter for v2 status updates
const v2StatusEmitter = new EventEmitter();
v2StatusEmitter.setMaxListeners(100);

export interface V2StatusEvent {
  phase: string;
  message: string;
  progress: number;
  severity: 'info' | 'warning' | 'error' | 'success';
  data?: Record<string, unknown>;
}

/**
 * Emit a status event for a conversation
 */
export function emitV2Status(
  conversationId: string,
  event: V2StatusEvent
): void {
  v2StatusEmitter.emit(`status:${conversationId}`, event);
}

export { v2StatusEmitter };
