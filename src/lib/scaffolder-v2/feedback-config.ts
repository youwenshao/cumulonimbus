/**
 * Feedback Loop Configuration
 * Centralized configuration for error detection and correction system
 */

export type ErrorStage = 'server_bundling' | 'client_bundling' | 'runtime';
export type RetryStrategy = 'incremental' | 'full_regeneration' | 'targeted_fix';

export const FEEDBACK_CONFIG = {
  /** Maximum number of retry attempts before giving up */
  MAX_RETRIES: 5,

  /** Retry strategy configuration */
  RETRY_STRATEGIES: {
    /** After this many attempts, switch from targeted to broader fixes */
    INCREMENTAL_THRESHOLD: 3,
    /** Number of lines to include before/after error location */
    CONTEXT_WINDOW_LINES: 10,
    /** Minimum code length (chars) required for incremental fixes */
    MIN_CODE_LENGTH_FOR_INCREMENTAL: 50,
    /** If same error repeats this many times, switch to full regeneration */
    SAME_ERROR_THRESHOLD: 2,
  },

  /** Token usage limits */
  TOKEN_LIMITS: {
    /** Maximum tokens for context in fix prompt */
    MAX_CONTEXT_TOKENS: 2000,
    /** Maximum tokens expected in fix response */
    MAX_FIX_TOKENS: 1500,
    /** Expanded context window for later attempts */
    EXPANDED_CONTEXT_LINES: 20,
  },

  /** Timeout configuration */
  TIMEOUTS: {
    /** Bundling operation timeout in milliseconds */
    BUNDLING_TIMEOUT_MS: 30000,
    /** LLM completion timeout in milliseconds */
    LLM_TIMEOUT_MS: 60000,
    /** Runtime error detection window in milliseconds */
    RUNTIME_ERROR_WINDOW_MS: 5000,
  },

  /** Error category weights for prioritization */
  ERROR_PRIORITY: {
    syntax: 1,      // Highest priority - blocks compilation
    semantic: 2,    // Medium priority - may cause runtime issues
    environment: 3, // Lower priority - often configuration issues
    capability: 4,  // Lowest priority - may not be fixable
    unknown: 5,
  } as const,

  /** Feature flags */
  FEATURES: {
    /** Enable incremental fixes (vs always full regeneration) */
    ENABLE_INCREMENTAL_FIXES: true,
    /** Enable runtime error monitoring */
    ENABLE_RUNTIME_MONITORING: true,
    /** Show detailed error information in UI */
    SHOW_ERROR_DETAILS: true,
    /** Log all retry attempts for analytics */
    LOG_RETRY_ANALYTICS: true,
  },
} as const;

/**
 * Get the retry strategy based on attempt number and error history
 */
export function getRetryStrategy(
  attemptNumber: number,
  sameErrorCount: number,
  codeLength: number
): RetryStrategy {
  // If same error keeps repeating, switch to full regeneration
  if (sameErrorCount >= FEEDBACK_CONFIG.RETRY_STRATEGIES.SAME_ERROR_THRESHOLD) {
    return 'full_regeneration';
  }

  // Code too short for incremental fixes
  if (codeLength < FEEDBACK_CONFIG.RETRY_STRATEGIES.MIN_CODE_LENGTH_FOR_INCREMENTAL) {
    return 'full_regeneration';
  }

  // First few attempts: try targeted fixes
  if (attemptNumber <= FEEDBACK_CONFIG.RETRY_STRATEGIES.INCREMENTAL_THRESHOLD) {
    return 'targeted_fix';
  }

  // Later attempts: use incremental with broader context
  if (attemptNumber <= FEEDBACK_CONFIG.MAX_RETRIES - 1) {
    return 'incremental';
  }

  // Final attempt: full regeneration
  return 'full_regeneration';
}

/**
 * Get context window size based on attempt number
 */
export function getContextWindowSize(attemptNumber: number): number {
  if (attemptNumber <= 2) {
    return FEEDBACK_CONFIG.RETRY_STRATEGIES.CONTEXT_WINDOW_LINES;
  }
  return FEEDBACK_CONFIG.TOKEN_LIMITS.EXPANDED_CONTEXT_LINES;
}

/**
 * Check if we should continue retrying
 */
export function shouldRetry(
  attemptNumber: number,
  errorCategory: string
): boolean {
  // Don't retry capability errors (e.g., requesting unsupported features)
  if (errorCategory === 'capability') {
    return attemptNumber < 2; // Only try once more
  }

  return attemptNumber < FEEDBACK_CONFIG.MAX_RETRIES;
}

export type FeedbackConfig = typeof FEEDBACK_CONFIG;
