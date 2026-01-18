/**
 * Jest Setup File
 * Provides polyfills and global setup for tests
 */

// Polyfill fetch for OpenAI SDK
import 'openai/shims/node';

// Mock global fetch for all tests if not already defined
if (typeof global.fetch === 'undefined') {
  global.fetch = jest.fn();
}

// Reset mocks between tests
beforeEach(() => {
  jest.clearAllMocks();
});

// Provide console error/warn for debugging tests
const originalConsoleError = console.error;
const originalConsoleWarn = console.warn;

// Suppress specific expected warnings in tests
console.error = (...args: unknown[]) => {
  // Suppress OpenAI shims warning
  if (typeof args[0] === 'string' && args[0].includes('openai/shims')) {
    return;
  }
  originalConsoleError.apply(console, args);
};

console.warn = (...args: unknown[]) => {
  // Suppress expected warnings
  if (typeof args[0] === 'string' && args[0].includes('openai/shims')) {
    return;
  }
  originalConsoleWarn.apply(console, args);
};

// Only set up window-related mocks if window is defined (jsdom environment)
if (typeof window !== 'undefined') {
  // Create a real localStorage-like mock with storage
  const localStorageMock = (() => {
    let store: Record<string, string> = {};
    return {
      getItem: (key: string): string | null => {
        return store[key] || null;
      },
      setItem: (key: string, value: string): void => {
        store[key] = value;
      },
      removeItem: (key: string): void => {
        delete store[key];
      },
      clear: (): void => {
        store = {};
      },
    };
  })();

  Object.defineProperty(window, 'localStorage', {
    value: localStorageMock,
    writable: true,
  });

  // Mock matchMedia
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: jest.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: jest.fn(),
      removeListener: jest.fn(),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      dispatchEvent: jest.fn(),
    })),
  });
}
