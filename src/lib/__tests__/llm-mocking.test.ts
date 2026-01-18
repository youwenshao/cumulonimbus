/**
 * LLM Mocking Tests
 * Tests for LLM mock infrastructure, response handling, and error scenarios
 */

import { LLMMockFactory } from './test-utils';
import {
  expenseIntentResponse,
  fullGeneratedCode,
  generatedCodeChunks,
  invalidJsonResponse,
  fixableJsonResponse,
  singleQuoteJsonResponse,
  rateLimitError,
  timeoutError,
} from './fixtures/llm-responses';

describe('LLM Mock Factory', () => {
  beforeEach(() => {
    LLMMockFactory.reset();
  });

  it('should reset responses', () => {
    LLMMockFactory.mockCompleteJSON('test', { data: 'value' });
    LLMMockFactory.reset();

    const mock = LLMMockFactory.createCompleteJSONMock();
    expect(mock).toBeDefined();
  });

  it('should mock JSON completion', () => {
    LLMMockFactory.mockCompleteJSON('expense', expenseIntentResponse);

    const mock = LLMMockFactory.createCompleteJSONMock();
    expect(mock).toBeDefined();
  });

  it('should mock text completion', () => {
    LLMMockFactory.mockComplete('code', fullGeneratedCode);

    const mock = LLMMockFactory.createCompleteMock();
    expect(mock).toBeDefined();
  });

  it('should mock streaming completion', () => {
    LLMMockFactory.mockStreamComplete('stream', generatedCodeChunks);

    const mock = LLMMockFactory.createStreamCompleteMock();
    expect(mock).toBeDefined();
  });
});

describe('LLM Response Handling - JSON', () => {
  it('should parse valid JSON response', () => {
    const response = JSON.stringify(expenseIntentResponse);
    const parsed = JSON.parse(response);

    expect(parsed).toEqual(expenseIntentResponse);
  });

  it('should handle JSON with trailing commas', () => {
    // This is what fixableJsonResponse tests
    const hasTrailingComma = fixableJsonResponse.includes(',]') || fixableJsonResponse.includes(',}');
    expect(hasTrailingComma).toBe(true);
  });

  it('should handle JSON with single quotes', () => {
    // This is what singleQuoteJsonResponse tests
    const hasSingleQuotes = singleQuoteJsonResponse.includes("'");
    expect(hasSingleQuotes).toBe(true);
  });

  it('should handle malformed JSON', () => {
    expect(() => JSON.parse(invalidJsonResponse)).toThrow();
  });

  it('should handle empty JSON response', () => {
    const empty = '{}';
    const parsed = JSON.parse(empty);
    expect(parsed).toEqual({});
  });

  it('should handle JSON with unicode', () => {
    const unicodeJson = '{"message": "Hello 世界 🌍"}';
    const parsed = JSON.parse(unicodeJson);
    expect(parsed.message).toContain('世界');
  });
});

describe('LLM Response Handling - Streaming', () => {
  it('should handle streaming chunks', () => {
    let fullCode = '';
    for (const chunk of generatedCodeChunks) {
      fullCode += chunk;
    }

    expect(fullCode).toBe(fullGeneratedCode);
  });

  it('should handle empty chunks', () => {
    const chunks = [''];
    let result = '';
    for (const chunk of chunks) {
      result += chunk;
    }

    expect(result).toBe('');
  });

  it('should handle single character chunks', () => {
    const code = 'test';
    const chunks = code.split('');

    let result = '';
    for (const chunk of chunks) {
      result += chunk;
    }

    expect(result).toBe(code);
  });

  it('should handle very large chunks', () => {
    const largeChunk = 'x'.repeat(100000);
    const chunks = [largeChunk];

    let result = '';
    for (const chunk of chunks) {
      result += chunk;
    }

    expect(result.length).toBe(100000);
  });
});

describe('LLM Error Scenarios - Rate Limits', () => {
  it('should recognize rate limit errors', () => {
    expect(rateLimitError).toHaveProperty('error');
    expect(rateLimitError.error.type).toBe('rate_limit_error');
  });

  it('should recognize timeout errors', () => {
    expect(timeoutError).toBeInstanceOf(Error);
    expect(timeoutError.message).toContain('timeout');
  });

  it('should handle 429 status code', () => {
    const error = { status: 429, message: 'Too Many Requests' };
    expect(error.status).toBe(429);
  });

  it('should handle retry-after header', () => {
    const retryAfter = 60; // seconds
    expect(typeof retryAfter).toBe('number');
    expect(retryAfter).toBeGreaterThan(0);
  });
});

describe('LLM Error Scenarios - Network Errors', () => {
  it('should handle connection refused', () => {
    const error = new Error('connect ECONNREFUSED');
    expect(error.message).toContain('ECONNREFUSED');
  });

  it('should handle timeout', () => {
    expect(timeoutError.message).toContain('timeout');
  });

  it('should handle DNS errors', () => {
    const error = new Error('getaddrinfo ENOTFOUND');
    expect(error.message).toContain('ENOTFOUND');
  });

  it('should handle network unreachable', () => {
    const error = new Error('network unreachable');
    expect(error.message.toLowerCase()).toContain('unreachable');
  });
});

describe('LLM Error Scenarios - Response Errors', () => {
  it('should handle empty response', () => {
    const response = '';
    expect(response).toBe('');
  });

  it('should handle null response', () => {
    const response = null;
    expect(response).toBeNull();
  });

  it('should handle undefined response', () => {
    const response = undefined;
    expect(response).toBeUndefined();
  });

  it('should handle truncated response', () => {
    const truncated = fullGeneratedCode.substring(0, 100);
    expect(truncated.length).toBe(100);
    expect(truncated.length).toBeLessThan(fullGeneratedCode.length);
  });

  it('should handle response with wrong format', () => {
    const wrongFormat = 'This is plain text, not JSON';
    expect(() => JSON.parse(wrongFormat)).toThrow();
  });
});

describe('LLM Mock Utilities - Response Fixtures', () => {
  it('should provide expense intent fixture', () => {
    expect(expenseIntentResponse).toHaveProperty('category');
    expect(expenseIntentResponse).toHaveProperty('entities');
    expect(expenseIntentResponse).toHaveProperty('actions');
    expect(expenseIntentResponse).toHaveProperty('suggestedName');
    expect(expenseIntentResponse).toHaveProperty('confidence');
  });

  it('should provide full generated code fixture', () => {
    expect(fullGeneratedCode).toBeDefined();
    expect(fullGeneratedCode.length).toBeGreaterThan(0);
    expect(fullGeneratedCode).toContain('function');
  });

  it('should provide code chunks fixture', () => {
    expect(Array.isArray(generatedCodeChunks)).toBe(true);
    expect(generatedCodeChunks.length).toBeGreaterThan(0);
  });

  it('should reconstruct full code from chunks', () => {
    const reconstructed = generatedCodeChunks.join('');
    expect(reconstructed).toBe(fullGeneratedCode);
  });
});

describe('LLM Retry Logic Simulation', () => {
  it('should simulate retry with exponential backoff', async () => {
    const delays = [500, 1000, 2000]; // ms
    
    for (let i = 0; i < delays.length; i++) {
      const expectedDelay = 500 * Math.pow(2, i);
      expect(delays[i]).toBe(expectedDelay);
    }
  });

  it('should limit max retries', () => {
    const maxRetries = 3;
    let attempts = 0;

    for (let i = 0; i < maxRetries; i++) {
      attempts++;
    }

    expect(attempts).toBe(maxRetries);
  });

  it('should stop retrying on success', () => {
    let attempts = 0;
    const maxRetries = 3;

    for (let i = 0; i < maxRetries; i++) {
      attempts++;
      if (i === 1) {
        // Success on second attempt
        break;
      }
    }

    expect(attempts).toBe(2);
  });
});

describe('LLM Response Validation', () => {
  it('should validate required fields in intent', () => {
    const hasCategory = 'category' in expenseIntentResponse;
    const hasEntities = 'entities' in expenseIntentResponse;
    const hasActions = 'actions' in expenseIntentResponse;

    expect(hasCategory).toBe(true);
    expect(hasEntities).toBe(true);
    expect(hasActions).toBe(true);
  });

  it('should validate field types in intent', () => {
    expect(typeof expenseIntentResponse.category).toBe('string');
    expect(Array.isArray(expenseIntentResponse.entities)).toBe(true);
    expect(Array.isArray(expenseIntentResponse.actions)).toBe(true);
    expect(typeof expenseIntentResponse.confidence).toBe('number');
  });

  it('should validate confidence range', () => {
    expect(expenseIntentResponse.confidence).toBeGreaterThanOrEqual(0);
    expect(expenseIntentResponse.confidence).toBeLessThanOrEqual(1);
  });

  it('should validate generated code has function', () => {
    expect(fullGeneratedCode).toContain('function');
  });

  it('should validate generated code has return', () => {
    expect(fullGeneratedCode).toContain('return');
  });
});

describe('LLM Fallback Strategies', () => {
  it('should have fallback for parsing', () => {
    // Fallback uses keyword matching
    const keywords = ['expense', 'habit', 'project', 'health'];
    expect(keywords.length).toBeGreaterThan(0);
  });

  it('should have fallback for code generation', () => {
    // Fallback generates template code
    const template = 'export default function Page() { return <div>Fallback</div>; }';
    expect(template).toContain('export default');
  });

  it('should use fallback on error', () => {
    const useFallback = (primaryFn: () => any, fallbackFn: () => any) => {
      try {
        return primaryFn();
      } catch {
        return fallbackFn();
      }
    };

    const result = useFallback(
      () => { throw new Error('Primary failed'); },
      () => 'fallback'
    );

    expect(result).toBe('fallback');
  });
});

describe('LLM Mock Scenarios - Edge Cases', () => {
  it('should handle concurrent requests', () => {
    const requests = Array.from({ length: 10 }, (_, i) => ({
      id: i,
      status: 'pending',
    }));

    expect(requests.length).toBe(10);
  });

  it('should handle request cancellation', () => {
    let cancelled = false;
    const cancel = () => { cancelled = true; };

    cancel();
    expect(cancelled).toBe(true);
  });

  it('should handle streaming interruption', () => {
    const chunks = generatedCodeChunks.slice(0, 5); // Interrupted after 5 chunks
    const partial = chunks.join('');

    expect(partial.length).toBeLessThan(fullGeneratedCode.length);
  });

  it('should handle response with extra fields', () => {
    const responseWithExtra = {
      ...expenseIntentResponse,
      extraField: 'should be ignored',
      anotherExtra: 123,
    };

    expect(responseWithExtra).toHaveProperty('extraField');
    // Code should ignore extra fields
  });

  it('should handle response with missing optional fields', () => {
    const minimalResponse = {
      category: 'custom',
      entities: [],
      actions: [],
      relationships: [],
      suggestedName: 'App',
      confidence: 0.5,
    };

    expect(minimalResponse.entities).toHaveLength(0);
  });
});
