/**
 * Unit tests for the error handling system
 */

import {
  ScaffolderError,
  AIServiceError,
  AIParseError,
  ValidationError,
  NotFoundError,
  DatabaseError,
  RateLimitError,
  CompilationError,
  UnknownError,
  wrapError,
  withRetry,
  safeJSONParse,
} from '../scaffolder-errors';

describe('ScaffolderError', () => {
  it('should create error with all properties', () => {
    const error = new ScaffolderError(
      'Test error',
      'parse',
      'error',
      'Technical details',
      { suggestion: 'Try again' },
      'TEST_ERROR'
    );

    expect(error.message).toBe('Test error');
    expect(error.phase).toBe('parse');
    expect(error.severity).toBe('error');
    expect(error.technicalDetails).toBe('Technical details');
    expect(error.recovery?.suggestion).toBe('Try again');
    expect(error.errorCode).toBe('TEST_ERROR');
    expect(error.timestamp).toBeInstanceOf(Date);
  });

  it('should serialize to JSON', () => {
    const error = new ScaffolderError('Test', 'build', 'warning');
    const json = error.toJSON();

    expect(json.name).toBe('ScaffolderError');
    expect(json.message).toBe('Test');
    expect(json.phase).toBe('build');
    expect(json.severity).toBe('warning');
  });
});

describe('AIServiceError', () => {
  it('should create error from original error', () => {
    const original = new Error('API timeout');
    const error = new AIServiceError(original, 2);

    expect(error.name).toBe('AIServiceError');
    expect(error.message).toContain('failed after 2 attempts');
    expect(error.originalError).toBe(original);
    expect(error.retryCount).toBe(2);
    expect(error.recovery?.suggestion).toContain('fallback');
  });

  it('should create error without original error', () => {
    const error = new AIServiceError();

    expect(error.message).toContain('temporarily unavailable');
    expect(error.errorCode).toBe('AI_SERVICE_ERROR');
  });
});

describe('AIParseError', () => {
  it('should capture raw response', () => {
    const error = new AIParseError('invalid json', 'Parse failed');

    expect(error.name).toBe('AIParseError');
    expect(error.rawResponse).toBe('invalid json');
    expect(error.technicalDetails).toBe('Parse failed');
  });

  it('should truncate long responses', () => {
    const longResponse = 'x'.repeat(1000);
    const error = new AIParseError(longResponse);

    expect(error.rawResponse?.length).toBeLessThanOrEqual(500);
  });
});

describe('ValidationError', () => {
  it('should capture all validation errors', () => {
    const errors = ['Error 1', 'Error 2'];
    const warnings = ['Warning 1'];
    const error = new ValidationError(errors, warnings, 'build');

    expect(error.name).toBe('ValidationError');
    expect(error.validationErrors).toEqual(errors);
    expect(error.validationWarnings).toEqual(warnings);
    expect(error.message).toContain('2 validation issues');
  });

  it('should use single error as message', () => {
    const error = new ValidationError(['Single error']);

    expect(error.message).toBe('Single error');
  });
});

describe('NotFoundError', () => {
  it('should include resource info', () => {
    const error = new NotFoundError('Conversation', 'conv-123');

    expect(error.name).toBe('NotFoundError');
    expect(error.resourceType).toBe('Conversation');
    expect(error.resourceId).toBe('conv-123');
    expect(error.message).toBe('Conversation not found');
  });
});

describe('DatabaseError', () => {
  it('should capture operation info', () => {
    const original = new Error('Connection timeout');
    const error = new DatabaseError('save app', original);

    expect(error.name).toBe('DatabaseError');
    expect(error.operation).toBe('save app');
    expect(error.originalError).toBe(original);
  });
});

describe('RateLimitError', () => {
  it('should include retry info', () => {
    const error = new RateLimitError(5000);

    expect(error.name).toBe('RateLimitError');
    expect(error.retryAfterMs).toBe(5000);
    expect(error.recovery?.suggestion).toContain('5 seconds');
  });
});

describe('CompilationError', () => {
  it('should include spec fragment', () => {
    const fragment = { name: 'Test', fields: [] };
    const error = new CompilationError('Invalid spec', fragment);

    expect(error.name).toBe('CompilationError');
    expect(error.specFragment).toEqual(fragment);
  });
});

describe('UnknownError', () => {
  it('should wrap Error instance', () => {
    const original = new Error('Something bad');
    const error = new UnknownError(original, 'build');

    expect(error.name).toBe('UnknownError');
    expect(error.originalError).toBe(original);
    expect(error.phase).toBe('build');
    expect(error.technicalDetails).toBe('Something bad');
  });

  it('should handle non-Error values', () => {
    const error = new UnknownError('string error');

    expect(error.technicalDetails).toBe('An unexpected error occurred');
  });
});

describe('wrapError', () => {
  it('should pass through ScaffolderError unchanged', () => {
    const original = new ValidationError(['Test']);
    const wrapped = wrapError(original);

    expect(wrapped).toBe(original);
  });

  it('should detect rate limit errors', () => {
    const original = new Error('Rate limit exceeded (429)');
    const wrapped = wrapError(original);

    expect(wrapped).toBeInstanceOf(RateLimitError);
  });

  it('should detect not found errors', () => {
    const original = new Error('Resource not found (404)');
    const wrapped = wrapError(original);

    expect(wrapped).toBeInstanceOf(NotFoundError);
  });

  it('should detect network errors', () => {
    const original = new Error('Network request failed');
    const wrapped = wrapError(original);

    expect(wrapped).toBeInstanceOf(AIServiceError);
  });

  it('should detect parse errors', () => {
    const original = new Error('JSON parse error');
    const wrapped = wrapError(original);

    expect(wrapped).toBeInstanceOf(AIParseError);
  });

  it('should wrap unknown errors', () => {
    const original = new Error('Something weird');
    const wrapped = wrapError(original);

    expect(wrapped).toBeInstanceOf(UnknownError);
  });
});

describe('withRetry', () => {
  it('should succeed on first try', async () => {
    const fn = jest.fn().mockResolvedValue('success');

    const result = await withRetry(fn, { maxRetries: 3 });

    expect(result).toBe('success');
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('should retry on failure', async () => {
    const fn = jest.fn()
      .mockRejectedValueOnce(new Error('Fail 1'))
      .mockRejectedValueOnce(new Error('Fail 2'))
      .mockResolvedValue('success');

    const result = await withRetry(fn, { maxRetries: 3, baseDelayMs: 10 });

    expect(result).toBe('success');
    expect(fn).toHaveBeenCalledTimes(3);
  });

  it('should throw after max retries', async () => {
    const fn = jest.fn().mockRejectedValue(new Error('Always fails'));

    await expect(withRetry(fn, { maxRetries: 2, baseDelayMs: 10 }))
      .rejects.toBeInstanceOf(ScaffolderError);

    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('should not retry ValidationError', async () => {
    const fn = jest.fn().mockRejectedValue(new ValidationError(['Bad']));

    await expect(withRetry(fn, { maxRetries: 3, baseDelayMs: 10 }))
      .rejects.toBeInstanceOf(ValidationError);

    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('should call onRetry callback', async () => {
    const fn = jest.fn()
      .mockRejectedValueOnce(new Error('Fail'))
      .mockResolvedValue('success');
    const onRetry = jest.fn();

    await withRetry(fn, { maxRetries: 2, baseDelayMs: 10, onRetry });

    expect(onRetry).toHaveBeenCalledTimes(1);
    expect(onRetry).toHaveBeenCalledWith(expect.any(ScaffolderError), 1);
  });
});

describe('safeJSONParse', () => {
  it('should parse valid JSON', () => {
    const result = safeJSONParse('{"key": "value"}', { key: 'default' });

    expect(result.value).toEqual({ key: 'value' });
    expect(result.error).toBeUndefined();
  });

  it('should return fallback for invalid JSON', () => {
    const result = safeJSONParse('not json', { fallback: true });

    expect(result.value).toEqual({ fallback: true });
    expect(result.error).toBeInstanceOf(AIParseError);
  });

  it('should extract JSON from markdown code blocks', () => {
    const markdown = '```json\n{"key": "value"}\n```';
    const result = safeJSONParse(markdown, {});

    expect(result.value).toEqual({ key: 'value' });
  });

  it('should fix trailing commas', () => {
    const badJson = '{"key": "value",}';
    const result = safeJSONParse(badJson, {});

    expect(result.value).toEqual({ key: 'value' });
  });
});
