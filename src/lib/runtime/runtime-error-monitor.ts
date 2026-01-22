/**
 * Runtime Error Monitor
 * Monitors sandbox runtime errors and feeds them back to the feedback loop
 */

import { errorDetectionService, type RuntimeErrorData, type DetectedError } from '@/lib/scaffolder-v2/error-detection-service';
import { FEEDBACK_CONFIG } from '@/lib/scaffolder-v2/feedback-config';

/**
 * Runtime error event from sandbox
 */
export interface SandboxErrorEvent {
  type: 'runtime_error' | 'unhandled_rejection' | 'console_error';
  data: RuntimeErrorData;
  timestamp: number;
  appId?: string;
}

/**
 * Callback for handling detected runtime errors
 */
export type RuntimeErrorCallback = (error: DetectedError) => void;

/**
 * Runtime Error Monitor class
 * Listens for postMessage events from sandbox iframes
 */
export class RuntimeErrorMonitor {
  private listeners: Map<string, RuntimeErrorCallback> = new Map();
  private errorBuffer: SandboxErrorEvent[] = [];
  private maxBufferSize = 50;
  private messageHandler: ((event: MessageEvent) => void) | null = null;
  private isListening = false;

  /**
   * Start monitoring for runtime errors
   */
  startMonitoring(): void {
    if (this.isListening) return;

    this.messageHandler = (event: MessageEvent) => {
      this.handleMessage(event);
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('message', this.messageHandler);
      this.isListening = true;
      console.log('[RuntimeErrorMonitor] Started monitoring sandbox errors');
    }
  }

  /**
   * Stop monitoring for runtime errors
   */
  stopMonitoring(): void {
    if (!this.isListening || !this.messageHandler) return;

    if (typeof window !== 'undefined') {
      window.removeEventListener('message', this.messageHandler);
    }
    
    this.isListening = false;
    this.messageHandler = null;
    console.log('[RuntimeErrorMonitor] Stopped monitoring sandbox errors');
  }

  /**
   * Register a callback for runtime errors
   * @param appId - The app ID to listen for (or '*' for all apps)
   * @param callback - The callback to invoke when an error occurs
   * @returns A function to unregister the callback
   */
  onError(appId: string, callback: RuntimeErrorCallback): () => void {
    this.listeners.set(appId, callback);
    
    return () => {
      this.listeners.delete(appId);
    };
  }

  /**
   * Handle incoming postMessage events
   */
  private handleMessage(event: MessageEvent): void {
    // Validate the message
    if (!event.data || typeof event.data !== 'object') return;
    
    const { type, data, appId } = event.data;

    // Check if this is a sandbox error event
    if (type !== 'runtime_error' && type !== 'unhandled_rejection' && type !== 'console_error') {
      return;
    }

    // Validate error data
    if (!data || typeof data.message !== 'string') {
      return;
    }

    const errorEvent: SandboxErrorEvent = {
      type,
      data: {
        message: data.message,
        source: data.source,
        line: data.line,
        column: data.column,
        stack: data.stack,
      },
      timestamp: Date.now(),
      appId,
    };

    // Add to buffer
    this.bufferError(errorEvent);

    // Detect and analyze the error
    const detectionResult = errorDetectionService.detectRuntimeErrors(errorEvent.data);

    if (detectionResult.hasErrors && detectionResult.primaryError) {
      const detectedError = detectionResult.primaryError;
      
      console.log('[RuntimeErrorMonitor] Runtime error detected:', {
        type,
        category: detectedError.analysis.category,
        message: detectedError.message.substring(0, 100),
        line: detectedError.line,
        appId,
      });

      // Notify listeners
      this.notifyListeners(appId, detectedError);
    }
  }

  /**
   * Add error to buffer
   */
  private bufferError(error: SandboxErrorEvent): void {
    this.errorBuffer.push(error);
    
    // Trim buffer if needed
    if (this.errorBuffer.length > this.maxBufferSize) {
      this.errorBuffer = this.errorBuffer.slice(-this.maxBufferSize);
    }
  }

  /**
   * Notify listeners of detected error
   */
  private notifyListeners(appId: string | undefined, error: DetectedError): void {
    // Notify specific app listener
    if (appId && this.listeners.has(appId)) {
      this.listeners.get(appId)?.(error);
    }

    // Notify wildcard listener
    if (this.listeners.has('*')) {
      this.listeners.get('*')?.(error);
    }
  }

  /**
   * Get buffered errors for an app
   */
  getBufferedErrors(appId?: string): SandboxErrorEvent[] {
    if (appId) {
      return this.errorBuffer.filter(e => e.appId === appId);
    }
    return [...this.errorBuffer];
  }

  /**
   * Clear buffered errors
   */
  clearBuffer(appId?: string): void {
    if (appId) {
      this.errorBuffer = this.errorBuffer.filter(e => e.appId !== appId);
    } else {
      this.errorBuffer = [];
    }
  }

  /**
   * Check if there are recent errors within a time window
   */
  hasRecentErrors(
    appId?: string, 
    windowMs: number = FEEDBACK_CONFIG.TIMEOUTS.RUNTIME_ERROR_WINDOW_MS
  ): boolean {
    const now = Date.now();
    const errors = appId 
      ? this.errorBuffer.filter(e => e.appId === appId)
      : this.errorBuffer;

    return errors.some(e => now - e.timestamp < windowMs);
  }

  /**
   * Get recent errors within a time window
   */
  getRecentErrors(
    appId?: string,
    windowMs: number = FEEDBACK_CONFIG.TIMEOUTS.RUNTIME_ERROR_WINDOW_MS
  ): SandboxErrorEvent[] {
    const now = Date.now();
    const errors = appId 
      ? this.errorBuffer.filter(e => e.appId === appId)
      : this.errorBuffer;

    return errors.filter(e => now - e.timestamp < windowMs);
  }
}

// Export singleton instance
export const runtimeErrorMonitor = new RuntimeErrorMonitor();

/**
 * Sandbox error reporter script to inject into iframe
 * This script reports errors back to the parent window
 */
export const SANDBOX_ERROR_REPORTER_SCRIPT = `
// Runtime Error Reporter for Sandbox
(function() {
  const appId = window.SANDBOX_APP_ID || null;
  
  // Report error to parent
  function reportError(type, message, source, line, column, stack) {
    try {
      window.parent.postMessage({
        type: type,
        data: {
          message: message,
          source: source,
          line: line,
          column: column,
          stack: stack
        },
        appId: appId
      }, '*');
    } catch (e) {
      // Ignore postMessage errors
    }
  }
  
  // Capture global errors
  window.onerror = function(message, source, lineno, colno, error) {
    reportError(
      'runtime_error',
      message,
      source,
      lineno,
      colno,
      error ? error.stack : null
    );
    // Don't prevent default error handling
    return false;
  };
  
  // Capture unhandled promise rejections
  window.onunhandledrejection = function(event) {
    const reason = event.reason;
    reportError(
      'unhandled_rejection',
      reason instanceof Error ? reason.message : String(reason),
      null,
      null,
      null,
      reason instanceof Error ? reason.stack : null
    );
  };
  
  // Capture console.error calls
  const originalConsoleError = console.error;
  console.error = function(...args) {
    // Call original
    originalConsoleError.apply(console, args);
    
    // Report to parent
    const message = args.map(arg => {
      if (arg instanceof Error) {
        return arg.message;
      }
      return String(arg);
    }).join(' ');
    
    reportError(
      'console_error',
      message,
      null,
      null,
      null,
      args.find(arg => arg instanceof Error)?.stack || null
    );
  };
  
  // Notify parent that error reporter is ready
  window.parent.postMessage({
    type: 'error_reporter_ready',
    appId: appId
  }, '*');
})();
`;

/**
 * Hook for using runtime error monitor in React components
 */
export function useRuntimeErrorMonitor(appId: string) {
  // This would be implemented as a React hook
  // For now, we just export the types
}

export default runtimeErrorMonitor;
