/**
 * Error Detection Service
 * Centralized service for detecting and normalizing errors across all generation stages
 */

import { ErrorAnalyzer, type AnalyzedError, type ErrorCategory } from './error-analyzer';
import { FEEDBACK_CONFIG, type ErrorStage } from './feedback-config';
import type { BundleError, ServerBundleResult } from '@/lib/runtime/server-bundler';

/**
 * Normalized error format used across the system
 */
export interface DetectedError {
  /** Unique identifier for this error instance */
  id: string;
  /** Stage where the error occurred */
  stage: ErrorStage;
  /** Original error message */
  message: string;
  /** Analyzed error with category and suggestions */
  analysis: AnalyzedError;
  /** Source code line number if available */
  line?: number;
  /** Source code column number if available */
  column?: number;
  /** The problematic source code line if available */
  sourceLine?: string;
  /** Stack trace if available */
  stack?: string;
  /** Timestamp when error was detected */
  timestamp: Date;
  /** Raw error object for debugging */
  raw?: unknown;
}

/**
 * Error detection result
 */
export interface ErrorDetectionResult {
  /** Whether any errors were detected */
  hasErrors: boolean;
  /** List of detected errors */
  errors: DetectedError[];
  /** Summary message for UI display */
  summary: string;
  /** Primary error (highest priority) */
  primaryError?: DetectedError;
}

/**
 * Runtime error data from sandbox
 */
export interface RuntimeErrorData {
  message: string;
  source?: string;
  line?: number;
  column?: number;
  stack?: string;
}

/**
 * Error Detection Service
 */
export class ErrorDetectionService {
  private errorIdCounter = 0;

  /**
   * Generate unique error ID
   */
  private generateErrorId(): string {
    return `err_${Date.now()}_${++this.errorIdCounter}`;
  }

  /**
   * Detect errors from server bundling result
   */
  detectServerBundlingErrors(result: ServerBundleResult): ErrorDetectionResult {
    // Check for leftover require() calls which break browser execution
    // This catches cases where esbuild succeeds but leaves require() calls intact
    if (result.success && result.code.includes('require(')) {
      // Create a simulated error for leftover require()
      const requireError: DetectedError = {
        id: this.generateErrorId(),
        stage: 'server_bundling',
        message: 'Browser environment does not support require(). Use import statements instead.',
        analysis: {
          originalMessage: 'Browser environment does not support require(). Use import statements instead.',
          category: 'environment',
          rootCause: 'CommonJS require() used in browser environment',
          suggestion: 'Replace require() with ES module import statements',
        },
        timestamp: new Date(),
      };

      return {
        hasErrors: true,
        errors: [requireError],
        summary: 'Bundling failed: require() calls found in output',
        primaryError: requireError,
      };
    }

    if (result.success && result.errors.length === 0) {
      return {
        hasErrors: false,
        errors: [],
        summary: 'Server bundling successful',
      };
    }

    const errors: DetectedError[] = result.errors.map((error: BundleError) => {
      const errorMessage = this.formatBundleError(error);
      const analysis = ErrorAnalyzer.analyze(errorMessage);

      return {
        id: this.generateErrorId(),
        stage: 'server_bundling' as ErrorStage,
        message: error.message,
        analysis,
        line: error.line,
        column: error.column,
        sourceLine: error.source,
        timestamp: new Date(),
        raw: error,
      };
    });

    // Sort by priority (syntax errors first)
    errors.sort((a, b) => {
      const priorityA = FEEDBACK_CONFIG.ERROR_PRIORITY[a.analysis.category] || 5;
      const priorityB = FEEDBACK_CONFIG.ERROR_PRIORITY[b.analysis.category] || 5;
      return priorityA - priorityB;
    });

    const primaryError = errors[0];
    const summary = this.generateSummary(errors, 'server_bundling');

    return {
      hasErrors: true,
      errors,
      summary,
      primaryError,
    };
  }

  /**
   * Detect errors from client bundling
   */
  detectClientBundlingErrors(errors: string[]): ErrorDetectionResult {
    if (errors.length === 0) {
      return {
        hasErrors: false,
        errors: [],
        summary: 'Client bundling successful',
      };
    }

    const detectedErrors: DetectedError[] = errors.map((errorMsg) => {
      const analysis = ErrorAnalyzer.analyze(errorMsg);
      const locationMatch = errorMsg.match(/line\s*(\d+)(?:\s*,?\s*col(?:umn)?\s*(\d+))?/i);

      return {
        id: this.generateErrorId(),
        stage: 'client_bundling' as ErrorStage,
        message: errorMsg,
        analysis,
        line: locationMatch ? parseInt(locationMatch[1], 10) : undefined,
        column: locationMatch?.[2] ? parseInt(locationMatch[2], 10) : undefined,
        timestamp: new Date(),
      };
    });

    // Sort by priority
    detectedErrors.sort((a, b) => {
      const priorityA = FEEDBACK_CONFIG.ERROR_PRIORITY[a.analysis.category] || 5;
      const priorityB = FEEDBACK_CONFIG.ERROR_PRIORITY[b.analysis.category] || 5;
      return priorityA - priorityB;
    });

    const primaryError = detectedErrors[0];
    const summary = this.generateSummary(detectedErrors, 'client_bundling');

    return {
      hasErrors: true,
      errors: detectedErrors,
      summary,
      primaryError,
    };
  }

  /**
   * Detect errors from runtime execution
   */
  detectRuntimeErrors(errorData: RuntimeErrorData): ErrorDetectionResult {
    const errorMessage = this.formatRuntimeError(errorData);
    const analysis = ErrorAnalyzer.analyze(errorMessage);

    const error: DetectedError = {
      id: this.generateErrorId(),
      stage: 'runtime',
      message: errorData.message,
      analysis,
      line: errorData.line,
      column: errorData.column,
      stack: errorData.stack,
      timestamp: new Date(),
      raw: errorData,
    };

    return {
      hasErrors: true,
      errors: [error],
      summary: `Runtime error: ${analysis.rootCause}`,
      primaryError: error,
    };
  }

  /**
   * Detect errors from a generic Error object
   */
  detectGenericError(error: Error, stage: ErrorStage): ErrorDetectionResult {
    const analysis = ErrorAnalyzer.analyze(error.message);
    const locationMatch = error.stack?.match(/:(\d+):(\d+)/);

    const detectedError: DetectedError = {
      id: this.generateErrorId(),
      stage,
      message: error.message,
      analysis,
      line: locationMatch ? parseInt(locationMatch[1], 10) : undefined,
      column: locationMatch?.[2] ? parseInt(locationMatch[2], 10) : undefined,
      stack: error.stack,
      timestamp: new Date(),
      raw: error,
    };

    return {
      hasErrors: true,
      errors: [detectedError],
      summary: `${stage} error: ${analysis.rootCause}`,
      primaryError: detectedError,
    };
  }

  /**
   * Format bundle error for analysis
   */
  private formatBundleError(error: BundleError): string {
    let formatted = error.message;
    if (error.line !== undefined) {
      formatted += ` at line ${error.line}`;
      if (error.column !== undefined) {
        formatted += `:${error.column}`;
      }
    }
    if (error.source) {
      formatted += `\nSource: ${error.source}`;
    }
    return formatted;
  }

  /**
   * Format runtime error for analysis
   */
  private formatRuntimeError(error: RuntimeErrorData): string {
    let formatted = error.message;
    if (error.line !== undefined) {
      formatted += ` at line ${error.line}`;
      if (error.column !== undefined) {
        formatted += `:${error.column}`;
      }
    }
    if (error.stack) {
      formatted += `\nStack: ${error.stack}`;
    }
    return formatted;
  }

  /**
   * Generate summary message for errors
   */
  private generateSummary(errors: DetectedError[], stage: ErrorStage): string {
    if (errors.length === 0) {
      return `${stage} successful`;
    }

    const categories = new Set(errors.map((e) => e.analysis.category));
    const categoryList = Array.from(categories).join(', ');

    if (errors.length === 1) {
      return `${stage}: ${errors[0].analysis.rootCause}`;
    }

    return `${stage}: ${errors.length} errors (${categoryList})`;
  }

  /**
   * Check if an error is likely fixable by LLM
   */
  isFixableByLLM(error: DetectedError): boolean {
    // Syntax and semantic errors are usually fixable
    if (error.analysis.category === 'syntax' || error.analysis.category === 'semantic') {
      return true;
    }

    // Environment errors might be fixable (wrong imports, etc.)
    if (error.analysis.category === 'environment') {
      // Check if it's an import issue
      if (error.message.toLowerCase().includes('import') ||
          error.message.toLowerCase().includes('module')) {
        return true;
      }
    }

    // Capability errors are usually not fixable
    if (error.analysis.category === 'capability') {
      return false;
    }

    // Unknown errors - try anyway
    return true;
  }

  /**
   * Get priority score for error (lower = higher priority)
   */
  getErrorPriority(error: DetectedError): number {
    return FEEDBACK_CONFIG.ERROR_PRIORITY[error.analysis.category] || 5;
  }
}

// Export singleton instance
export const errorDetectionService = new ErrorDetectionService();
