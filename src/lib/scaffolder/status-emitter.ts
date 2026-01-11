/**
 * Status Emitter for Server-Sent Events
 * Manages streaming status updates during app generation
 */

export type StatusSeverity = 'info' | 'success' | 'warning' | 'error';
export type StatusPhase = 'parse' | 'probe' | 'picture' | 'build' | 'complete';

export interface StatusMessage {
  id: string;
  phase: StatusPhase;
  message: string;
  technicalDetails?: string;
  severity: StatusSeverity;
  timestamp: string;
  progress?: number; // 0-100
}

export class StatusEmitter {
  private controller: ReadableStreamDefaultController<Uint8Array> | null = null;
  private encoder = new TextEncoder();
  private messageId = 0;
  private isClosed = false;

  constructor(controller: ReadableStreamDefaultController<Uint8Array>) {
    this.controller = controller;
  }

  /**
   * Emit a status message to the SSE stream
   */
  emit(
    phase: StatusPhase,
    message: string,
    options?: {
      technicalDetails?: string;
      severity?: StatusSeverity;
      progress?: number;
    }
  ) {
    if (this.isClosed || !this.controller) return;

    const statusMessage: StatusMessage = {
      id: `status-${++this.messageId}`,
      phase,
      message,
      technicalDetails: options?.technicalDetails,
      severity: options?.severity || 'info',
      timestamp: new Date().toISOString(),
      progress: options?.progress,
    };

    try {
      const data = `data: ${JSON.stringify(statusMessage)}\n\n`;
      this.controller.enqueue(this.encoder.encode(data));
    } catch (error) {
      console.error('Failed to emit status:', error);
    }
  }

  /**
   * Convenience methods for different severity levels
   */
  info(phase: StatusPhase, message: string, technicalDetails?: string, progress?: number) {
    this.emit(phase, message, { severity: 'info', technicalDetails, progress });
  }

  success(phase: StatusPhase, message: string, technicalDetails?: string, progress?: number) {
    this.emit(phase, message, { severity: 'success', technicalDetails, progress });
  }

  warning(phase: StatusPhase, message: string, technicalDetails?: string, progress?: number) {
    this.emit(phase, message, { severity: 'warning', technicalDetails, progress });
  }

  error(phase: StatusPhase, message: string, technicalDetails?: string, progress?: number) {
    this.emit(phase, message, { severity: 'error', technicalDetails, progress });
  }

  /**
   * Close the stream
   */
  close() {
    if (this.isClosed || !this.controller) return;
    
    try {
      this.controller.close();
      this.isClosed = true;
      this.controller = null;
    } catch (error) {
      console.error('Failed to close stream:', error);
    }
  }
}

/**
 * Create a new SSE stream with a StatusEmitter
 */
export function createStatusStream(): { stream: ReadableStream; emitter: StatusEmitter } {
  let emitterInstance: StatusEmitter | null = null;

  const stream = new ReadableStream({
    start(controller) {
      emitterInstance = new StatusEmitter(controller);
      
      // Send initial connection message
      const encoder = new TextEncoder();
      controller.enqueue(encoder.encode(': connected\n\n'));
    },
    cancel() {
      emitterInstance?.close();
    },
  });

  if (!emitterInstance) {
    throw new Error('Failed to create StatusEmitter');
  }

  return { stream, emitter: emitterInstance };
}
