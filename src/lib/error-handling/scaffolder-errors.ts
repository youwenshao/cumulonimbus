/**
 * Custom error types for the Conversational Scaffolder
 * Provides structured error handling with recovery suggestions
 */

export type StatusPhase = 'parse' | 'probe' | 'picture' | 'build' | 'complete';
export type ErrorSeverity = 'warning' | 'error';

export interface RecoveryAction {
  suggestion: string;
  action?: () => Promise<void>;
  fallbackValue?: unknown;
}

/**
 * Base error class for all scaffolder errors
 */
export class ScaffolderError extends Error {
  public readonly phase: StatusPhase;
  public readonly severity: ErrorSeverity;
  public readonly technicalDetails?: string;
  public readonly recovery?: RecoveryAction;
  public readonly timestamp: Date;
  public readonly errorCode: string;

  constructor(
    message: string,
    phase: StatusPhase,
    severity: ErrorSeverity,
    technicalDetails?: string,
    recovery?: RecoveryAction,
    errorCode?: string
  ) {
    super(message);
    this.name = 'ScaffolderError';
    this.phase = phase;
    this.severity = severity;
    this.technicalDetails = technicalDetails;
    this.recovery = recovery;
    this.timestamp = new Date();
    this.errorCode = errorCode || 'SCAFFOLDER_ERROR';
  }

  toJSON() {
    return {
      name: this.name,
      message: this.message,
      phase: this.phase,
      severity: this.severity,
      technicalDetails: this.technicalDetails,
      recovery: this.recovery ? { suggestion: this.recovery.suggestion } : undefined,
      timestamp: this.timestamp.toISOString(),
      errorCode: this.errorCode,
    };
  }
}

/**
 * Error thrown when AI service is unavailable or fails
 */
export class AIServiceError extends ScaffolderError {
  public readonly originalError?: Error;
  public readonly retryCount: number;

  constructor(originalError?: Error, retryCount = 0) {
    const message = retryCount > 0 
      ? `AI service failed after ${retryCount} attempts` 
      : 'AI service temporarily unavailable';
    
    super(
      message,
      'parse',
      'warning',
      originalError?.message ? `API Error: ${originalError.message}` : undefined,
      {
        suggestion: 'Using smart fallback analysis. Your app will still be created with intelligent defaults.',
      },
      'AI_SERVICE_ERROR'
    );
    this.name = 'AIServiceError';
    this.originalError = originalError;
    this.retryCount = retryCount;
  }
}

/**
 * Error thrown when AI response cannot be parsed
 */
export class AIParseError extends ScaffolderError {
  public readonly rawResponse?: string;

  constructor(rawResponse?: string, details?: string) {
    super(
      'Could not understand AI response',
      'parse',
      'warning',
      details || 'AI returned unparseable JSON',
      {
        suggestion: 'Retrying with simplified analysis...',
      },
      'AI_PARSE_ERROR'
    );
    this.name = 'AIParseError';
    this.rawResponse = rawResponse?.substring(0, 500); // Truncate for logging
  }
}

/**
 * Error thrown when validation fails
 */
export class ValidationError extends ScaffolderError {
  public readonly validationErrors: string[];
  public readonly validationWarnings: string[];

  constructor(
    errors: string[],
    warnings: string[] = [],
    phase: StatusPhase = 'build'
  ) {
    const message = errors.length === 1 
      ? errors[0] 
      : `${errors.length} validation issues found`;
    
    super(
      message,
      phase,
      'error',
      errors.join('; '),
      {
        suggestion: 'Please review and fix the issues before continuing.',
      },
      'VALIDATION_ERROR'
    );
    this.name = 'ValidationError';
    this.validationErrors = errors;
    this.validationWarnings = warnings;
  }
}

/**
 * Error thrown when a required resource is not found
 */
export class NotFoundError extends ScaffolderError {
  public readonly resourceType: string;
  public readonly resourceId: string;

  constructor(resourceType: string, resourceId: string) {
    super(
      `${resourceType} not found`,
      'build',
      'error',
      `${resourceType} with ID "${resourceId}" does not exist`,
      {
        suggestion: 'The resource may have been deleted or moved. Please try again.',
      },
      'NOT_FOUND_ERROR'
    );
    this.name = 'NotFoundError';
    this.resourceType = resourceType;
    this.resourceId = resourceId;
  }
}

/**
 * Error thrown when database operations fail
 */
export class DatabaseError extends ScaffolderError {
  public readonly operation: string;
  public readonly originalError?: Error;

  constructor(operation: string, originalError?: Error) {
    super(
      `Database operation failed: ${operation}`,
      'build',
      'error',
      originalError?.message,
      {
        suggestion: 'Please try again. If the problem persists, contact support.',
      },
      'DATABASE_ERROR'
    );
    this.name = 'DatabaseError';
    this.operation = operation;
    this.originalError = originalError;
  }
}

/**
 * Error thrown when rate limits are exceeded
 */
export class RateLimitError extends ScaffolderError {
  public readonly retryAfterMs?: number;

  constructor(retryAfterMs?: number) {
    super(
      'Too many requests. Please slow down.',
      'parse',
      'warning',
      retryAfterMs ? `Retry after ${retryAfterMs}ms` : undefined,
      {
        suggestion: retryAfterMs 
          ? `Please wait ${Math.ceil(retryAfterMs / 1000)} seconds before trying again.`
          : 'Please wait a moment before trying again.',
      },
      'RATE_LIMIT_ERROR'
    );
    this.name = 'RateLimitError';
    this.retryAfterMs = retryAfterMs;
  }
}

/**
 * Error thrown when spec compilation fails
 */
export class CompilationError extends ScaffolderError {
  public readonly specFragment?: unknown;

  constructor(message: string, specFragment?: unknown) {
    super(
      message,
      'build',
      'error',
      specFragment ? JSON.stringify(specFragment).substring(0, 200) : undefined,
      {
        suggestion: 'There was an issue building your app. Some answers may need adjustment.',
      },
      'COMPILATION_ERROR'
    );
    this.name = 'CompilationError';
    this.specFragment = specFragment;
  }
}

/**
 * Error wrapper for handling unknown errors
 */
export class UnknownError extends ScaffolderError {
  public readonly originalError: unknown;

  constructor(originalError: unknown, phase: StatusPhase = 'parse') {
    const errorMessage = originalError instanceof Error 
      ? originalError.message 
      : 'An unexpected error occurred';
    
    super(
      'Something unexpected went wrong',
      phase,
      'error',
      errorMessage,
      {
        suggestion: 'Please try again. If the problem persists, try refreshing the page.',
      },
      'UNKNOWN_ERROR'
    );
    this.name = 'UnknownError';
    this.originalError = originalError;
  }
}

/**
 * Utility to wrap any error as a ScaffolderError
 */
export function wrapError(error: unknown, phase: StatusPhase = 'parse'): ScaffolderError {
  if (error instanceof ScaffolderError) {
    return error;
  }
  
  if (error instanceof Error) {
    // Check for known error patterns
    const message = error.message.toLowerCase();
    
    if (message.includes('rate limit') || message.includes('429')) {
      return new RateLimitError();
    }
    
    if (message.includes('not found') || message.includes('404')) {
      return new NotFoundError('Resource', 'unknown');
    }
    
    if (message.includes('network') || message.includes('fetch') || message.includes('timeout')) {
      return new AIServiceError(error);
    }
    
    if (message.includes('json') || message.includes('parse')) {
      return new AIParseError(undefined, error.message);
    }
  }
  
  return new UnknownError(error, phase);
}

/**
 * Execute with retry logic and error handling
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  options: {
    maxRetries?: number;
    baseDelayMs?: number;
    phase?: StatusPhase;
    onRetry?: (error: ScaffolderError, attempt: number) => void;
  } = {}
): Promise<T> {
  const { maxRetries = 3, baseDelayMs = 500, phase = 'parse', onRetry } = options;
  let lastError: ScaffolderError | null = null;
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = wrapError(error, phase);
      
      // Don't retry on certain error types
      if (lastError instanceof ValidationError || 
          lastError instanceof NotFoundError) {
        throw lastError;
      }
      
      // Call onRetry callback if provided
      if (onRetry) {
        onRetry(lastError, attempt + 1);
      }
      
      // Wait before retrying (exponential backoff)
      if (attempt < maxRetries - 1) {
        const delay = baseDelayMs * Math.pow(2, attempt);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  
  // Throw the last error after all retries failed
  throw lastError || new UnknownError(new Error('Unknown error after retries'), phase);
}

/**
 * Safe JSON parse with error handling
 */
export function safeJSONParse<T>(
  text: string,
  fallback: T,
  context?: string
): { value: T; error?: AIParseError } {
  try {
    // Try to extract JSON from text (handles markdown code blocks)
    const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    const jsonText = jsonMatch ? jsonMatch[1] : text;
    
    // Try standard parse
    return { value: JSON.parse(jsonText) as T };
  } catch {
    // Try to fix common JSON issues
    try {
      // Remove trailing commas
      const fixed = text
        .replace(/,\s*}/g, '}')
        .replace(/,\s*]/g, ']')
        .replace(/'/g, '"'); // Replace single quotes
      return { value: JSON.parse(fixed) as T };
    } catch {
      return {
        value: fallback,
        error: new AIParseError(text, context),
      };
    }
  }
}
