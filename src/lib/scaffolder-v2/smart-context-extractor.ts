/**
 * Smart Context Extractor
 * Extracts minimal but sufficient context for error fixing to minimize token usage
 */

import { FEEDBACK_CONFIG, getContextWindowSize } from './feedback-config';
import type { DetectedError } from './error-detection-service';

/**
 * Smart context for LLM error fixing
 */
export interface SmartContext {
  /** Error location details */
  errorLocation: {
    line: number;
    column?: number;
  };
  /** Lines surrounding the error (±N lines) */
  surroundingCode: string;
  /** Line numbers for the surrounding code (start, end) */
  surroundingRange: {
    startLine: number;
    endLine: number;
  };
  /** Only imports that are referenced in the error region */
  relevantImports: string[];
  /** The function/component containing the error */
  affectedFunction: string | null;
  /** Name of the affected function/component */
  affectedFunctionName: string | null;
  /** Line range of the affected function */
  affectedFunctionRange: {
    startLine: number;
    endLine: number;
  } | null;
  /** Smallest code snippet demonstrating the issue */
  minimalReproduction: string;
  /** Total estimated tokens for this context */
  estimatedTokens: number;
}

/**
 * Function/component boundary info
 */
interface FunctionBoundary {
  name: string;
  startLine: number;
  endLine: number;
  code: string;
}

/**
 * Smart Context Extractor class
 */
export class SmartContextExtractor {
  /**
   * Extract smart context for a detected error
   */
  extract(
    code: string,
    error: DetectedError,
    attemptNumber: number = 1
  ): SmartContext {
    const lines = code.split('\n');
    const errorLine = error.line ?? 1;
    const contextWindow = getContextWindowSize(attemptNumber);

    // Extract surrounding code
    const { surroundingCode, surroundingRange } = this.extractSurroundingCode(
      lines,
      errorLine,
      contextWindow
    );

    // Extract all imports from the file
    const allImports = this.extractImports(code);

    // Find relevant imports (only those used in surrounding code)
    const relevantImports = this.filterRelevantImports(
      allImports,
      surroundingCode
    );

    // Find the affected function/component
    const affectedFunction = this.findAffectedFunction(lines, errorLine);

    // Create minimal reproduction
    const minimalReproduction = this.createMinimalReproduction(
      error,
      surroundingCode,
      affectedFunction
    );

    // Estimate tokens
    const estimatedTokens = this.estimateTokens(
      surroundingCode,
      relevantImports,
      affectedFunction?.code || null
    );

    return {
      errorLocation: {
        line: errorLine,
        column: error.column,
      },
      surroundingCode,
      surroundingRange,
      relevantImports,
      affectedFunction: affectedFunction?.code || null,
      affectedFunctionName: affectedFunction?.name || null,
      affectedFunctionRange: affectedFunction
        ? {
            startLine: affectedFunction.startLine,
            endLine: affectedFunction.endLine,
          }
        : null,
      minimalReproduction,
      estimatedTokens,
    };
  }

  /**
   * Extract code surrounding the error location
   */
  private extractSurroundingCode(
    lines: string[],
    errorLine: number,
    contextWindow: number
  ): { surroundingCode: string; surroundingRange: { startLine: number; endLine: number } } {
    // Convert to 0-indexed
    const lineIndex = Math.max(0, errorLine - 1);
    
    const startLine = Math.max(0, lineIndex - contextWindow);
    const endLine = Math.min(lines.length - 1, lineIndex + contextWindow);

    const surroundingLines = lines.slice(startLine, endLine + 1);

    // Add line numbers for context
    const numberedLines = surroundingLines.map((line, i) => {
      const actualLineNum = startLine + i + 1;
      const marker = actualLineNum === errorLine ? '>>>' : '   ';
      return `${marker} ${actualLineNum.toString().padStart(4)}: ${line}`;
    });

    return {
      surroundingCode: numberedLines.join('\n'),
      surroundingRange: {
        startLine: startLine + 1, // Convert back to 1-indexed
        endLine: endLine + 1,
      },
    };
  }

  /**
   * Extract all import statements from code
   */
  private extractImports(code: string): string[] {
    const imports: string[] = [];
    const importRegex = /^import\s+(?:(?:\{[^}]*\}|\*\s+as\s+\w+|\w+)(?:\s*,\s*(?:\{[^}]*\}|\*\s+as\s+\w+|\w+))*\s+from\s+)?['"][^'"]+['"];?$/gm;

    let match;
    while ((match = importRegex.exec(code)) !== null) {
      imports.push(match[0].trim());
    }

    return imports;
  }

  /**
   * Filter imports to only those referenced in the surrounding code
   */
  private filterRelevantImports(
    allImports: string[],
    surroundingCode: string
  ): string[] {
    return allImports.filter((importStatement) => {
      // Extract imported names
      const importedNames = this.extractImportedNames(importStatement);
      
      // Check if any imported name is used in the surrounding code
      return importedNames.some((name) => {
        // Use word boundary to avoid false positives
        const regex = new RegExp(`\\b${this.escapeRegex(name)}\\b`);
        return regex.test(surroundingCode);
      });
    });
  }

  /**
   * Extract names from an import statement
   */
  private extractImportedNames(importStatement: string): string[] {
    const names: string[] = [];

    // Default import: import Name from '...'
    const defaultMatch = importStatement.match(/^import\s+(\w+)\s+from/);
    if (defaultMatch) {
      names.push(defaultMatch[1]);
    }

    // Named imports: import { a, b as c } from '...'
    const namedMatch = importStatement.match(/\{([^}]+)\}/);
    if (namedMatch) {
      const namedImports = namedMatch[1].split(',').map((n) => {
        const asMatch = n.trim().match(/(\w+)\s+as\s+(\w+)/);
        return asMatch ? asMatch[2] : n.trim();
      });
      names.push(...namedImports);
    }

    // Namespace import: import * as Name from '...'
    const namespaceMatch = importStatement.match(/\*\s+as\s+(\w+)/);
    if (namespaceMatch) {
      names.push(namespaceMatch[1]);
    }

    return names.filter((n) => n.length > 0);
  }

  /**
   * Find the function/component containing the error
   */
  private findAffectedFunction(
    lines: string[],
    errorLine: number
  ): FunctionBoundary | null {
    // Find all function boundaries
    const functions = this.findAllFunctions(lines);

    // Find the function containing the error line
    for (const func of functions) {
      if (errorLine >= func.startLine && errorLine <= func.endLine) {
        return func;
      }
    }

    return null;
  }

  /**
   * Find all function/component boundaries in the code
   */
  private findAllFunctions(lines: string[]): FunctionBoundary[] {
    const functions: FunctionBoundary[] = [];
    const code = lines.join('\n');

    // Pattern for function declarations and arrow functions
    const patterns = [
      // function Name(...) { or function Name(...) =>
      /function\s+(\w+)\s*\([^)]*\)\s*(?::\s*\w+(?:<[^>]+>)?\s*)?\{/g,
      // const Name = (...) => { or const Name = function
      /(?:const|let|var)\s+(\w+)\s*=\s*(?:async\s+)?(?:\([^)]*\)|[^=])\s*=>\s*\{?/g,
      // const Name = function(...) {
      /(?:const|let|var)\s+(\w+)\s*=\s*(?:async\s+)?function\s*\([^)]*\)\s*\{/g,
    ];

    for (const pattern of patterns) {
      let match;
      while ((match = pattern.exec(code)) !== null) {
        const name = match[1];
        const startIndex = match.index;
        const startLine = code.substring(0, startIndex).split('\n').length;

        // Find the matching closing brace
        const endLine = this.findFunctionEnd(lines, startLine);

        if (endLine !== null) {
          const funcLines = lines.slice(startLine - 1, endLine);
          functions.push({
            name,
            startLine,
            endLine,
            code: funcLines.join('\n'),
          });
        }
      }
    }

    // Sort by start line and remove overlapping (keep outer function)
    functions.sort((a, b) => a.startLine - b.startLine);
    
    return functions;
  }

  /**
   * Find the end line of a function (matching closing brace)
   */
  private findFunctionEnd(lines: string[], startLine: number): number | null {
    let braceCount = 0;
    let foundFirstBrace = false;

    for (let i = startLine - 1; i < lines.length; i++) {
      const line = lines[i];
      
      for (const char of line) {
        if (char === '{') {
          braceCount++;
          foundFirstBrace = true;
        } else if (char === '}') {
          braceCount--;
        }

        if (foundFirstBrace && braceCount === 0) {
          return i + 1; // Convert to 1-indexed
        }
      }
    }

    return null;
  }

  /**
   * Create minimal reproduction of the error
   */
  private createMinimalReproduction(
    error: DetectedError,
    surroundingCode: string,
    affectedFunction: FunctionBoundary | null
  ): string {
    // If we have a specific source line, use it
    if (error.sourceLine) {
      return error.sourceLine;
    }

    // If we have an affected function that's not too large, use it
    if (affectedFunction && affectedFunction.code.split('\n').length <= 30) {
      return affectedFunction.code;
    }

    // Otherwise, use the surrounding code (stripped of line numbers)
    return surroundingCode
      .split('\n')
      .map((line) => line.replace(/^(?:>>>|   )\s*\d+:\s*/, ''))
      .join('\n');
  }

  /**
   * Estimate token count for the context
   * Rough estimate: ~4 characters per token
   */
  private estimateTokens(
    surroundingCode: string,
    relevantImports: string[],
    affectedFunction: string | null
  ): number {
    const totalChars =
      surroundingCode.length +
      relevantImports.join('\n').length +
      (affectedFunction?.length || 0);

    return Math.ceil(totalChars / 4);
  }

  /**
   * Escape special regex characters
   */
  private escapeRegex(string: string): string {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  /**
   * Extract context for a targeted fix (smaller scope)
   */
  extractTargetedContext(
    code: string,
    error: DetectedError
  ): SmartContext {
    return this.extract(code, error, 1); // Use smallest context window
  }

  /**
   * Extract context for an incremental fix (medium scope)
   */
  extractIncrementalContext(
    code: string,
    error: DetectedError
  ): SmartContext {
    return this.extract(code, error, 3); // Use medium context window
  }

  /**
   * Extract context for full regeneration (large scope)
   */
  extractFullContext(
    code: string,
    error: DetectedError
  ): SmartContext {
    return this.extract(code, error, 5); // Use largest context window
  }

  /**
   * Create a condensed context string for LLM prompt
   */
  formatForPrompt(context: SmartContext): string {
    const parts: string[] = [];

    // Add relevant imports
    if (context.relevantImports.length > 0) {
      parts.push('RELEVANT IMPORTS:');
      parts.push(context.relevantImports.join('\n'));
      parts.push('');
    }

    // Add error location
    parts.push(`ERROR LOCATION: Line ${context.errorLocation.line}${context.errorLocation.column ? `, Column ${context.errorLocation.column}` : ''}`);
    parts.push('');

    // Add surrounding code
    parts.push('CODE AROUND ERROR:');
    parts.push(context.surroundingCode);
    parts.push('');

    // Add affected function if different from surrounding code
    if (context.affectedFunction && context.affectedFunctionName) {
      parts.push(`AFFECTED FUNCTION: ${context.affectedFunctionName}`);
      parts.push(`Lines ${context.affectedFunctionRange?.startLine}-${context.affectedFunctionRange?.endLine}`);
    }

    return parts.join('\n');
  }
}

// Export singleton instance
export const smartContextExtractor = new SmartContextExtractor();
