
import { ScaffolderError } from '@/lib/error-handling/scaffolder-errors';

export type ErrorCategory = 
  | 'syntax' 
  | 'semantic' 
  | 'environment' 
  | 'capability' 
  | 'unknown';

export interface AnalyzedError {
  originalMessage: string;
  category: ErrorCategory;
  rootCause: string;
  suggestion: string;
  line?: number;
  column?: number;
}

export class ErrorAnalyzer {
  /**
   * Analyze an error message or log to determine its category and root cause
   */
  static analyze(errorLog: string): AnalyzedError {
    const cleanLog = errorLog.trim();
    
    // Check for syntax errors
    if (this.isSyntaxError(cleanLog)) {
      return {
        originalMessage: cleanLog,
        category: 'syntax',
        rootCause: 'Code structure violation or invalid syntax',
        suggestion: 'Check for missing brackets, semicolons, or invalid keywords.',
        ...this.extractLocation(cleanLog)
      };
    }

    // Check for common React/Runtime errors
    if (this.isSemanticError(cleanLog)) {
      return {
        originalMessage: cleanLog,
        category: 'semantic',
        rootCause: 'Logic error or invalid state usage',
        suggestion: 'Verify hook dependencies, state initialization, and prop types.',
        ...this.extractLocation(cleanLog)
      };
    }

    // Check for environment issues (missing globals, imports)
    if (this.isEnvironmentError(cleanLog)) {
      return {
        originalMessage: cleanLog,
        category: 'environment',
        rootCause: 'Missing dependency or environment mismatch',
        suggestion: 'Ensure all used libraries are imported and available in the sandbox.',
        ...this.extractLocation(cleanLog)
      };
    }

    return {
      originalMessage: cleanLog,
      category: 'unknown',
      rootCause: 'Unclassified error',
      suggestion: 'Review the error log manually.'
    };
  }

  private static isSyntaxError(log: string): boolean {
    const patterns = [
      /SyntaxError/i,
      /Unexpected token/i,
      /Unexpected ["'<>{}[\]()]/i, // esbuild: "Unexpected '>'" or "Unexpected '{'"
      /Expected .+ but found/i, // esbuild: "Expected identifier but found '/'"
      /Parsing error/i,
      /Unterminated string/i,
      /Unterminated regular expression/i, // esbuild regex error
      /Expression expected/i,
      /Invalid or unexpected token/i,
      /Unexpected end of input/i,
      /Unexpected end of file/i, // esbuild: "Unexpected end of file"
      /Missing closing/i,
      /Unclosed/i,
      /Unexpected closing/i, // Tag mismatch
      /does not match opening/i, // Tag mismatch
      /JSX/i, // Generic JSX errors
    ];
    return patterns.some(p => p.test(log));
  }

  private static isSemanticError(log: string): boolean {
    const patterns = [
      /ReferenceError/i,
      /TypeError/i,
      /undefined is not a/i,
      /cannot read property/i,
      /React/i,
      /Invalid hook call/i,
      /Rendered more hooks/i
    ];
    return patterns.some(p => p.test(log));
  }

  private static isEnvironmentError(log: string): boolean {
    const patterns = [
      /Module not found/i,
      /Import error/i,
      /is not defined/i, // Could be semantic or environment (missing global)
    ];
    return patterns.some(p => p.test(log));
  }

  private static extractLocation(log: string): { line?: number; column?: number } {
    // Attempt to extract line:column
    // Example: (10:5) or line 10
    const match = log.match(/:(\d+):(\d+)/) || log.match(/line (\d+)/i);
    if (match) {
      if (match.length === 3) {
        return { line: parseInt(match[1]), column: parseInt(match[2]) };
      } else {
        return { line: parseInt(match[1]) };
      }
    }
    return {};
  }
}
