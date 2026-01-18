/**
 * Jest Setup File
 * Global test configuration and mocks
 */

// Mock console methods to reduce noise in test output
global.console = {
  ...console,
  // Keep error and warn for debugging
  error: jest.fn(),
  warn: jest.fn(),
  // Suppress log, debug, info in tests
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
};

// Add Node.js polyfills for Jest environment
if (typeof TextEncoder === 'undefined') {
  global.TextEncoder = require('util').TextEncoder;
}
if (typeof TextDecoder === 'undefined') {
  global.TextDecoder = require('util').TextDecoder;
}

// Mock fetch globally
global.fetch = jest.fn() as jest.Mock;

// Mock window.SandboxAPI if needed
if (typeof window !== 'undefined') {
  (window as any).SandboxAPI = {
    fetch: jest.fn(),
    getData: jest.fn(() => []),
    updateData: jest.fn(),
  };
}

// Extend Jest matchers if needed
expect.extend({
  toBeValidCode(received: string) {
    const hasFunction = received.includes('function') || received.includes('=>');
    const hasReturn = received.includes('return');
    
    const pass = hasFunction && hasReturn && received.length > 0;
    
    return {
      pass,
      message: () =>
        pass
          ? `expected ${received} not to be valid code`
          : `expected ${received} to be valid code (should have function and return)`,
    };
  },
});

// Add custom Jest global types
declare global {
  namespace jest {
    interface Matchers<R> {
      toBeValidCode(): R;
    }
  }
}

export {};
