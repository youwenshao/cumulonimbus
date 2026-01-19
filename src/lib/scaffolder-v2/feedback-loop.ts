
import { AnalyzedError, ErrorAnalyzer } from './error-analyzer';
import { smartContextExtractor, type SmartContext } from './smart-context-extractor';
import { incrementalFixGenerator, type FixResult, type FixHistoryEntry } from './incremental-fix-generator';
import { type DetectedError, errorDetectionService } from './error-detection-service';
import { FEEDBACK_CONFIG, getRetryStrategy, shouldRetry, type ErrorStage, type RetryStrategy } from './feedback-config';

export interface FeedbackIteration {
  iteration: number;
  code: string;
  errorLog: string;
  analysis: AnalyzedError;
  timestamp: Date;
  /** Stage where error occurred */
  stage?: ErrorStage;
  /** Strategy used for this fix attempt */
  strategy?: RetryStrategy;
  /** Smart context extracted for this iteration */
  context?: SmartContext;
  /** Token usage estimate */
  estimatedTokens?: number;
  /** Fix result if a fix was attempted */
  fixResult?: FixResult;
}

export interface FeedbackSession {
  id: string;
  originalPrompt: string;
  iterations: FeedbackIteration[];
  maxIterations: number;
  status: 'active' | 'resolved' | 'failed';
  /** Total tokens used across all iterations */
  totalTokensUsed: number;
  /** Current code being worked on */
  currentCode?: string;
  /** Design/schema information */
  designInfo?: unknown;
}

export interface TokenUsageStats {
  totalTokens: number;
  avgTokensPerIteration: number;
  iterationCount: number;
}

export class FeedbackLoop {
  private session: FeedbackSession;

  constructor(id: string, originalPrompt: string, maxIterations: number = FEEDBACK_CONFIG.MAX_RETRIES) {
    this.session = {
      id,
      originalPrompt,
      iterations: [],
      maxIterations,
      status: 'active',
      totalTokensUsed: 0,
    };
  }

  static fromSession(session: FeedbackSession): FeedbackLoop {
    const loop = new FeedbackLoop(session.id, session.originalPrompt, session.maxIterations);
    loop.session = JSON.parse(JSON.stringify(session)); // Deep copy to be safe
    // Ensure totalTokensUsed exists for legacy sessions
    if (loop.session.totalTokensUsed === undefined) {
      loop.session.totalTokensUsed = 0;
    }
    return loop;
  }

  /**
   * Add a new feedback iteration (original method preserved for backward compatibility)
   */
  addFeedback(code: string, errorLog: string): FeedbackIteration {
    const analysis = ErrorAnalyzer.analyze(errorLog);
    const iteration: FeedbackIteration = {
      iteration: this.session.iterations.length + 1,
      code,
      errorLog,
      analysis,
      timestamp: new Date()
    };
    
    this.session.iterations.push(iteration);
    
    // Check if we reached max iterations
    if (this.session.iterations.length >= this.session.maxIterations) {
      this.session.status = 'failed';
    }

    return iteration;
  }

  /**
   * Add feedback with detected error (enhanced version)
   */
  addDetectedError(
    code: string,
    detectedError: DetectedError,
    stage: ErrorStage
  ): FeedbackIteration {
    // Extract smart context
    const context = smartContextExtractor.extract(
      code,
      detectedError,
      this.session.iterations.length + 1
    );

    // Determine strategy
    const sameErrorCount = this.countSameErrors(detectedError);
    const strategy = getRetryStrategy(
      this.session.iterations.length + 1,
      sameErrorCount,
      code.length
    );

    const iteration: FeedbackIteration = {
      iteration: this.session.iterations.length + 1,
      code,
      errorLog: detectedError.message,
      analysis: detectedError.analysis,
      timestamp: new Date(),
      stage,
      strategy,
      context,
      estimatedTokens: context.estimatedTokens,
    };

    this.session.iterations.push(iteration);
    this.session.currentCode = code;
    this.session.totalTokensUsed += context.estimatedTokens;

    // Check if we reached max iterations
    if (this.session.iterations.length >= this.session.maxIterations) {
      this.session.status = 'failed';
    }

    return iteration;
  }

  /**
   * Attempt to generate a fix for the last error
   */
  async attemptFix(): Promise<FixResult | null> {
    const lastIteration = this.getLastIteration();
    if (!lastIteration || !this.session.currentCode) {
      return null;
    }

    // Create a DetectedError from the iteration
    const detectedError: DetectedError = {
      id: `iter_${lastIteration.iteration}`,
      stage: lastIteration.stage || 'server_bundling',
      message: lastIteration.errorLog,
      analysis: lastIteration.analysis,
      line: lastIteration.analysis.line,
      column: lastIteration.analysis.column,
      timestamp: lastIteration.timestamp,
    };

    // Generate the fix
    const fixResult = await incrementalFixGenerator.generateFix(
      this.session.currentCode,
      detectedError,
      lastIteration.iteration,
      this.session.originalPrompt
    );

    // Update the iteration with fix result
    lastIteration.fixResult = fixResult;

    // Track token usage
    this.session.totalTokensUsed += fixResult.estimatedTokens;

    // Update current code if fix was successful
    if (fixResult.success) {
      this.session.currentCode = fixResult.fixedCode;
    }

    return fixResult;
  }

  /**
   * Generate incremental fix prompt with smart context
   */
  generateIncrementalFixPrompt(
    smartContext: SmartContext,
    analysis: AnalyzedError
  ): string {
    const parts: string[] = [];

    parts.push('CRITICAL: Fix this error in the generated React code.');
    parts.push('');
    parts.push(`ERROR TYPE: ${analysis.category}`);
    parts.push(`ERROR MESSAGE: ${analysis.originalMessage}`);
    parts.push(`ROOT CAUSE: ${analysis.rootCause}`);
    parts.push(`SUGGESTION: ${analysis.suggestion}`);
    parts.push('');
    parts.push(smartContextExtractor.formatForPrompt(smartContext));
    parts.push('');
    parts.push('REQUIREMENTS:');
    parts.push('1. Fix ONLY the error - preserve all other functionality');
    parts.push('2. Use proper TypeScript types');
    parts.push('3. Use proper React event types');
    parts.push('4. Return ONLY the fixed code section');
    parts.push('');
    parts.push(`Return the fixed code for lines ${smartContext.surroundingRange.startLine}-${smartContext.surroundingRange.endLine}`);

    return parts.join('\n');
  }

  /**
   * Generate a prompt for the LLM to fix the code (original method preserved)
   */
  generateCorrectionPrompt(): string {
    const lastIteration = this.getLastIteration();
    if (!lastIteration) return '';

    // If we have smart context, use the incremental prompt
    if (lastIteration.context) {
      return this.generateIncrementalFixPrompt(
        lastIteration.context,
        lastIteration.analysis
      );
    }

    // Fall back to original full prompt
    return `
CRITICAL: The previous code generation failed with compilation/runtime errors.
Please analyze the error and regenerate the code with strict TypeScript fixes.

ORIGINAL REQUEST:
${this.session.originalPrompt}

GENERATED CODE (WITH ERRORS):
\`\`\`typescript
${lastIteration.code}
\`\`\`

ERROR LOG:
${lastIteration.errorLog}

ERROR ANALYSIS:
Category: ${lastIteration.analysis.category}
Cause: ${lastIteration.analysis.rootCause}
Suggestion: ${lastIteration.analysis.suggestion}

CORRECTION REQUIREMENTS:
1. Fix the specific error described above.
2. Ensure strict TypeScript compliance:
   - No implicit 'any' types
   - All function parameters must have explicit types
   - All event handlers must use proper React event types (e.g., React.ChangeEvent<HTMLInputElement>)
   - All useState hooks must have explicit type arguments (e.g., useState<string>(''))
3. Ensure the code still meets the original requirements.
4. Return ONLY the corrected code.
`.trim();
  }

  /**
   * Check if should attempt incremental vs full regeneration
   */
  shouldUseIncrementalFix(): boolean {
    const attemptNumber = this.session.iterations.length;
    const lastIteration = this.getLastIteration();
    
    if (!lastIteration) return true;

    // Use incremental for first few attempts
    if (attemptNumber <= FEEDBACK_CONFIG.RETRY_STRATEGIES.INCREMENTAL_THRESHOLD) {
      return true;
    }

    // Check if same error keeps repeating
    const sameErrorCount = this.countSameErrors({
      id: 'check',
      stage: lastIteration.stage || 'server_bundling',
      message: lastIteration.errorLog,
      analysis: lastIteration.analysis,
      timestamp: new Date(),
    });

    // If same error repeated too many times, switch to full regeneration
    if (sameErrorCount >= FEEDBACK_CONFIG.RETRY_STRATEGIES.SAME_ERROR_THRESHOLD) {
      return false;
    }

    return true;
  }

  /**
   * Track token usage per iteration
   */
  getTokenUsageStats(): TokenUsageStats {
    const iterationCount = this.session.iterations.length;
    
    return {
      totalTokens: this.session.totalTokensUsed,
      avgTokensPerIteration: iterationCount > 0 
        ? Math.round(this.session.totalTokensUsed / iterationCount)
        : 0,
      iterationCount,
    };
  }

  /**
   * Check if we should continue retrying
   */
  shouldRetry(): boolean {
    const lastIteration = this.getLastIteration();
    if (!lastIteration) return true;

    return shouldRetry(
      this.session.iterations.length,
      lastIteration.analysis.category
    );
  }

  /**
   * Get the current attempt number
   */
  getCurrentAttempt(): number {
    return this.session.iterations.length;
  }

  /**
   * Get remaining attempts
   */
  getRemainingAttempts(): number {
    return Math.max(0, this.session.maxIterations - this.session.iterations.length);
  }

  /**
   * Count how many times similar errors have occurred
   */
  private countSameErrors(error: DetectedError): number {
    const normalizedMessage = error.message.toLowerCase().trim();
    
    return this.session.iterations.filter((iter) => {
      const iterMessage = iter.errorLog.toLowerCase().trim();
      return (
        iterMessage === normalizedMessage ||
        (iter.analysis.category === error.analysis.category &&
          this.areSimilarErrors(iterMessage, normalizedMessage))
      );
    }).length;
  }

  /**
   * Check if two error messages are similar
   */
  private areSimilarErrors(msg1: string, msg2: string): boolean {
    const words1 = new Set(msg1.split(/\s+/).filter((w) => w.length > 3));
    const words2 = new Set(msg2.split(/\s+/).filter((w) => w.length > 3));
    
    const intersection = [...words1].filter((w) => words2.has(w));
    const union = new Set([...words1, ...words2]);
    
    return union.size > 0 && intersection.length / union.size > 0.5;
  }

  getLastIteration(): FeedbackIteration | undefined {
    return this.session.iterations[this.session.iterations.length - 1];
  }

  getSession(): FeedbackSession {
    return this.session;
  }

  /**
   * Get the current code being worked on
   */
  getCurrentCode(): string | undefined {
    return this.session.currentCode;
  }

  /**
   * Set the current code
   */
  setCurrentCode(code: string): void {
    this.session.currentCode = code;
  }

  /**
   * Set design info
   */
  setDesignInfo(design: unknown): void {
    this.session.designInfo = design;
  }

  markResolved(): void {
    this.session.status = 'resolved';
  }

  markFailed(): void {
    this.session.status = 'failed';
  }

  /**
   * Check if the session is still active
   */
  isActive(): boolean {
    return this.session.status === 'active';
  }

  /**
   * Get a summary of the feedback session for display
   */
  getSummary(): {
    status: string;
    attempts: number;
    maxAttempts: number;
    tokensUsed: number;
    lastError?: string;
    lastStrategy?: string;
  } {
    const lastIteration = this.getLastIteration();
    
    return {
      status: this.session.status,
      attempts: this.session.iterations.length,
      maxAttempts: this.session.maxIterations,
      tokensUsed: this.session.totalTokensUsed,
      lastError: lastIteration?.analysis.rootCause,
      lastStrategy: lastIteration?.strategy,
    };
  }
}
