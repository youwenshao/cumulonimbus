
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

export { v2PreviewEmitter };
