/**
 * Sandbox Bridge
 * PostMessage-based communication layer between host and sandboxed apps
 */

export interface SandboxMessage {
  type: 
    | 'init'
    | 'ready'
    | 'error'
    | 'data-update'
    | 'api-request'
    | 'api-response'
    | 'event';
  payload?: {
    // Init payload
    appId?: string;
    data?: unknown;
    // Error payload
    message?: string;
    stack?: string;
    // API request payload
    requestId?: string;
    method?: string;
    endpoint?: string;
    body?: unknown;
    // API response payload
    success?: boolean;
    error?: string;
    // Generic data payload
    [key: string]: unknown;
  };
  timestamp?: number;
  source?: 'host' | 'sandbox';
}

export type MessageHandler = (message: SandboxMessage) => void;

/**
 * Bridge for communicating with sandboxed iframes
 */
export class SandboxBridge {
  private targetWindow: Window;
  private handler: MessageHandler;
  private boundListener: (event: MessageEvent) => void;
  private isDestroyed = false;

  constructor(targetWindow: Window, handler: MessageHandler) {
    this.targetWindow = targetWindow;
    this.handler = handler;
    this.boundListener = this.handleMessage.bind(this);

    // Listen for messages
    window.addEventListener('message', this.boundListener);
  }

  /**
   * Handle incoming messages
   */
  private handleMessage(event: MessageEvent): void {
    if (this.isDestroyed) return;

    // Validate message structure
    const message = event.data as SandboxMessage;
    if (!message || typeof message !== 'object' || !message.type) {
      return;
    }

    // Add metadata
    message.timestamp = message.timestamp || Date.now();
    message.source = 'sandbox';

    // Pass to handler
    try {
      this.handler(message);
    } catch (error) {
      console.error('SandboxBridge: Handler error:', error);
    }
  }

  /**
   * Send a message to the sandbox
   */
  send(message: SandboxMessage): void {
    if (this.isDestroyed) {
      console.warn('SandboxBridge: Attempted to send on destroyed bridge');
      return;
    }

    const enrichedMessage: SandboxMessage = {
      ...message,
      timestamp: Date.now(),
      source: 'host',
    };

    try {
      this.targetWindow.postMessage(enrichedMessage, '*');
    } catch (error) {
      console.error('SandboxBridge: Failed to send message:', error);
    }
  }

  /**
   * Send data to the sandbox
   */
  sendData(data: unknown[]): void {
    this.send({
      type: 'data-update',
      payload: { data },
    });
  }

  /**
   * Send API response to the sandbox
   */
  sendApiResponse(
    requestId: string,
    success: boolean,
    data?: unknown,
    error?: string
  ): void {
    this.send({
      type: 'api-response',
      payload: {
        requestId,
        success,
        data,
        error,
      },
    });
  }

  /**
   * Destroy the bridge and clean up
   */
  destroy(): void {
    this.isDestroyed = true;
    window.removeEventListener('message', this.boundListener);
  }
}

/**
 * Validate and sanitize a message from the sandbox
 */
export function validateSandboxMessage(message: unknown): SandboxMessage | null {
  if (!message || typeof message !== 'object') {
    return null;
  }

  const msg = message as SandboxMessage;

  // Check required fields
  if (!msg.type || typeof msg.type !== 'string') {
    return null;
  }

  // Validate message type
  const validTypes = [
    'init',
    'ready',
    'error',
    'data-update',
    'api-request',
    'api-response',
    'event',
  ];

  if (!validTypes.includes(msg.type)) {
    return null;
  }

  return {
    type: msg.type,
    payload: msg.payload || {},
    timestamp: msg.timestamp || Date.now(),
    source: msg.source,
  };
}

/**
 * Create a HMAC signature for message validation (optional security layer)
 */
export function signMessage(message: SandboxMessage, secret: string): string {
  // Simple signature for demo - use proper HMAC in production
  const payload = JSON.stringify({ type: message.type, timestamp: message.timestamp });
  return btoa(payload + secret).substring(0, 16);
}

/**
 * Verify a message signature
 */
export function verifySignature(
  message: SandboxMessage,
  signature: string,
  secret: string
): boolean {
  const expectedSignature = signMessage(message, secret);
  return signature === expectedSignature;
}
