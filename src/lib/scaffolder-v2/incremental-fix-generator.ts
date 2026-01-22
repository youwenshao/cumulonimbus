/**
 * Incremental Fix Generator
 * Generates targeted code fixes to minimize token usage and improve fix accuracy
 */

import { complete } from '@/lib/llm';
import { smartContextExtractor, type SmartContext } from './smart-context-extractor';
import { type DetectedError } from './error-detection-service';
import { FEEDBACK_CONFIG, getRetryStrategy, type RetryStrategy } from './feedback-config';
import type { AnalyzedError } from './error-analyzer';

/**
 * Fix generation result
 */
export interface FixResult {
  /** Whether fix generation was successful */
  success: boolean;
  /** The fixed code */
  fixedCode: string;
  /** What was changed (for UI display) */
  changeDescription: string;
  /** Strategy used for this fix */
  strategy: RetryStrategy;
  /** Token usage estimate */
  estimatedTokens: number;
  /** Error message if fix failed */
  error?: string;
}

/**
 * Fix history entry for tracking repeated errors
 */
export interface FixHistoryEntry {
  errorMessage: string;
  errorCategory: string;
  attempt: number;
  timestamp: Date;
}

/**
 * Incremental Fix Generator class
 */
export class IncrementalFixGenerator {
  private fixHistory: FixHistoryEntry[] = [];

  /**
   * Generate a fix for the detected error
   */
  async generateFix(
    originalCode: string,
    error: DetectedError,
    attemptNumber: number,
    originalPrompt?: string
  ): Promise<FixResult> {
    // Track this error for history
    this.addToHistory(error, attemptNumber);

    // Determine strategy based on attempt number and history
    const sameErrorCount = this.countSameError(error);
    const strategy = getRetryStrategy(
      attemptNumber,
      sameErrorCount,
      originalCode.length
    );

    console.log(`[IncrementalFixGenerator] Attempt ${attemptNumber}, strategy: ${strategy}, same error count: ${sameErrorCount}`);

    try {
      switch (strategy) {
        case 'targeted_fix':
          return await this.generateTargetedFix(originalCode, error);
        
        case 'incremental':
          return await this.generateIncrementalFix(originalCode, error);
        
        case 'full_regeneration':
          return await this.generateFullRegeneration(originalCode, error, originalPrompt);
        
        default:
          return await this.generateTargetedFix(originalCode, error);
      }
    } catch (err) {
      console.error('[IncrementalFixGenerator] Fix generation failed:', err);
      return {
        success: false,
        fixedCode: originalCode,
        changeDescription: 'Fix generation failed',
        strategy,
        estimatedTokens: 0,
        error: err instanceof Error ? err.message : 'Unknown error',
      };
    }
  }

  /**
   * Generate a targeted fix (smallest scope)
   */
  private async generateTargetedFix(
    originalCode: string,
    error: DetectedError
  ): Promise<FixResult> {
    const context = smartContextExtractor.extractTargetedContext(originalCode, error);
    
    const prompt = this.buildTargetedFixPrompt(error.analysis, context);
    
    const fixedSection = await complete({
      messages: [
        { role: 'system', content: TARGETED_FIX_SYSTEM_PROMPT },
        { role: 'user', content: prompt },
      ],
      temperature: 0.2,
      maxTokens: FEEDBACK_CONFIG.TOKEN_LIMITS.MAX_FIX_TOKENS,
    });

    // Apply the fix to the original code
    const fixedCode = this.applyTargetedFix(
      originalCode,
      fixedSection,
      context
    );

    return {
      success: true,
      fixedCode,
      changeDescription: `Fixed ${error.analysis.category} error at line ${error.line || 'unknown'}`,
      strategy: 'targeted_fix',
      estimatedTokens: context.estimatedTokens + Math.ceil(fixedSection.length / 4),
    };
  }

  /**
   * Generate an incremental fix (medium scope)
   */
  private async generateIncrementalFix(
    originalCode: string,
    error: DetectedError
  ): Promise<FixResult> {
    const context = smartContextExtractor.extractIncrementalContext(originalCode, error);
    
    const prompt = this.buildIncrementalFixPrompt(error.analysis, context);
    
    const fixedSection = await complete({
      messages: [
        { role: 'system', content: INCREMENTAL_FIX_SYSTEM_PROMPT },
        { role: 'user', content: prompt },
      ],
      temperature: 0.3,
      maxTokens: FEEDBACK_CONFIG.TOKEN_LIMITS.MAX_FIX_TOKENS * 2,
    });

    // Apply the fix
    const fixedCode = this.applyIncrementalFix(
      originalCode,
      fixedSection,
      context
    );

    return {
      success: true,
      fixedCode,
      changeDescription: `Rewrote section around line ${error.line || 'unknown'} to fix ${error.analysis.category} error`,
      strategy: 'incremental',
      estimatedTokens: context.estimatedTokens + Math.ceil(fixedSection.length / 4),
    };
  }

  /**
   * Generate a full regeneration (largest scope)
   */
  private async generateFullRegeneration(
    originalCode: string,
    error: DetectedError,
    originalPrompt?: string
  ): Promise<FixResult> {
    const context = smartContextExtractor.extractFullContext(originalCode, error);
    
    const prompt = this.buildFullRegenerationPrompt(
      error.analysis,
      originalCode,
      originalPrompt
    );
    
    const fixedCode = await complete({
      messages: [
        { role: 'system', content: FULL_REGENERATION_SYSTEM_PROMPT },
        { role: 'user', content: prompt },
      ],
      temperature: 0.3,
      maxTokens: 8192,
    });

    // Clean the regenerated code
    const cleanedCode = this.cleanGeneratedCode(fixedCode);

    return {
      success: true,
      fixedCode: cleanedCode,
      changeDescription: `Regenerated entire component to fix ${error.analysis.category} error`,
      strategy: 'full_regeneration',
      estimatedTokens: Math.ceil(originalCode.length / 4) + Math.ceil(cleanedCode.length / 4),
    };
  }

  /**
   * Build prompt for targeted fix
   */
  private buildTargetedFixPrompt(analysis: AnalyzedError, context: SmartContext): string {
    return `Fix this ${analysis.category} error in the code:

ERROR MESSAGE: ${analysis.originalMessage}
ROOT CAUSE: ${analysis.rootCause}
SUGGESTION: ${analysis.suggestion}

${smartContextExtractor.formatForPrompt(context)}

Return ONLY the fixed code section (lines ${context.surroundingRange.startLine}-${context.surroundingRange.endLine}).
Do NOT include line numbers or markers in your response.
Do NOT include explanation - just the fixed code.`;
  }

  /**
   * Build prompt for incremental fix
   */
  private buildIncrementalFixPrompt(analysis: AnalyzedError, context: SmartContext): string {
    const functionInfo = context.affectedFunctionName
      ? `The error is in function/component: ${context.affectedFunctionName}`
      : '';

    return `Fix this ${analysis.category} error by rewriting the affected section:

ERROR MESSAGE: ${analysis.originalMessage}
ROOT CAUSE: ${analysis.rootCause}
SUGGESTION: ${analysis.suggestion}

${functionInfo}

${smartContextExtractor.formatForPrompt(context)}

${context.affectedFunction ? `
CURRENT FUNCTION CODE:
\`\`\`
${context.affectedFunction}
\`\`\`` : ''}

Return the COMPLETE fixed function/section.
Preserve:
- The function signature and name
- The overall structure
- Variable names where possible

Do NOT include explanation - just the fixed code.`;
  }

  /**
   * Build prompt for full regeneration
   */
  private buildFullRegenerationPrompt(
    analysis: AnalyzedError,
    originalCode: string,
    originalPrompt?: string
  ): string {
    return `The following code has an error that couldn't be fixed incrementally.
Please regenerate the ENTIRE component with the error fixed.

${originalPrompt ? `ORIGINAL USER REQUEST: ${originalPrompt}` : ''}

ERROR MESSAGE: ${analysis.originalMessage}
ROOT CAUSE: ${analysis.rootCause}
SUGGESTION: ${analysis.suggestion}

CURRENT CODE (WITH ERROR):
\`\`\`
${originalCode}
\`\`\`

Generate a COMPLETE, working React component that:
1. Fixes the ${analysis.category} error
2. Maintains the same functionality as the original
3. Uses proper React patterns and TypeScript types
4. Works with the useAppData() hook for data persistence

Return ONLY the fixed code, no explanation.`;
  }

  /**
   * Apply targeted fix to original code
   */
  private applyTargetedFix(
    originalCode: string,
    fixedSection: string,
    context: SmartContext
  ): string {
    const lines = originalCode.split('\n');
    const fixedLines = this.cleanGeneratedCode(fixedSection).split('\n');

    // Replace the lines in the affected range
    const startIndex = context.surroundingRange.startLine - 1;
    const endIndex = context.surroundingRange.endLine;

    const result = [
      ...lines.slice(0, startIndex),
      ...fixedLines,
      ...lines.slice(endIndex),
    ];

    return result.join('\n');
  }

  /**
   * Apply incremental fix to original code
   */
  private applyIncrementalFix(
    originalCode: string,
    fixedSection: string,
    context: SmartContext
  ): string {
    // If we have an affected function, replace the entire function
    if (context.affectedFunctionRange) {
      const lines = originalCode.split('\n');
      const fixedLines = this.cleanGeneratedCode(fixedSection).split('\n');

      const startIndex = context.affectedFunctionRange.startLine - 1;
      const endIndex = context.affectedFunctionRange.endLine;

      const result = [
        ...lines.slice(0, startIndex),
        ...fixedLines,
        ...lines.slice(endIndex),
      ];

      return result.join('\n');
    }

    // Otherwise, use the targeted fix approach
    return this.applyTargetedFix(originalCode, fixedSection, context);
  }

  /**
   * Clean generated code (remove markdown, explanations, etc.)
   */
  private cleanGeneratedCode(code: string): string {
    return code
      // Remove markdown code blocks
      .replace(/```(?:typescript|tsx|javascript|jsx)?\n?/g, '')
      .replace(/```$/g, '')
      // Remove line number prefixes (if any slipped through)
      .replace(/^(?:>>>|   )\s*\d+:\s*/gm, '')
      // Trim whitespace
      .trim();
  }

  /**
   * Add error to history
   */
  private addToHistory(error: DetectedError, attempt: number): void {
    this.fixHistory.push({
      errorMessage: error.message,
      errorCategory: error.analysis.category,
      attempt,
      timestamp: new Date(),
    });

    // Keep only last 20 entries
    if (this.fixHistory.length > 20) {
      this.fixHistory = this.fixHistory.slice(-20);
    }
  }

  /**
   * Count how many times the same error has occurred
   */
  private countSameError(error: DetectedError): number {
    const normalizedMessage = error.message.toLowerCase().trim();
    
    return this.fixHistory.filter((entry) => {
      const entryMessage = entry.errorMessage.toLowerCase().trim();
      // Check if messages are similar (exact match or similar category at same position)
      return (
        entryMessage === normalizedMessage ||
        (entry.errorCategory === error.analysis.category &&
          this.areSimilarErrors(entryMessage, normalizedMessage))
      );
    }).length;
  }

  /**
   * Check if two error messages are similar
   */
  private areSimilarErrors(msg1: string, msg2: string): boolean {
    // Simple similarity check - share significant words
    const words1 = new Set(msg1.split(/\s+/).filter((w) => w.length > 3));
    const words2 = new Set(msg2.split(/\s+/).filter((w) => w.length > 3));
    
    const intersection = [...words1].filter((w) => words2.has(w));
    const union = new Set([...words1, ...words2]);
    
    // Jaccard similarity > 0.5
    return intersection.length / union.size > 0.5;
  }

  /**
   * Clear fix history
   */
  clearHistory(): void {
    this.fixHistory = [];
  }

  /**
   * Get fix history
   */
  getHistory(): FixHistoryEntry[] {
    return [...this.fixHistory];
  }
}

/**
 * System prompts for different fix strategies
 */
const TARGETED_FIX_SYSTEM_PROMPT = `You are an expert code fixer. Your task is to fix a specific error in React/TypeScript code.

RULES:
1. Fix ONLY the error mentioned - don't change anything else
2. Return ONLY the fixed code section, no explanations
3. Preserve the exact formatting and indentation
4. Do NOT add new imports or dependencies
5. Keep variable names and structure intact
6. Ensure valid TypeScript/JSX syntax
7. NEVER use malformed Fragment syntax like </<> - use proper <> and </> pairs
8. All JSX tags must be properly closed with matching tags
9. Ensure self-closing tags like <input /> are valid`;

const INCREMENTAL_FIX_SYSTEM_PROMPT = `You are an expert code fixer. Your task is to rewrite a section of React/TypeScript code to fix an error.

RULES:
1. Fix the error while preserving functionality
2. Return the COMPLETE fixed function/section
3. Maintain the function signature and name
4. Use proper TypeScript types for parameters
5. Use proper React event types (e.g., React.ChangeEvent<HTMLInputElement>)
6. Do NOT change the function's public interface
7. Do NOT add explanation - just code
8. NEVER use malformed Fragment syntax like </<> - use proper <> and </> pairs
9. Ensure all JSX tags are properly closed with matching tags
10. Verify that all tags are properly nested and closed (e.g. <div></div>, <input />)`;

const FULL_REGENERATION_SYSTEM_PROMPT = `You are an expert React developer. Your task is to regenerate a complete React component that has an unfixable error.

RULES:
1. Generate a COMPLETE, working React component
2. Fix the mentioned error
3. Maintain the same functionality as the original
4. Use useAppData() hook for data persistence (NEVER use localStorage/sessionStorage)
5. Use React.useState for UI state only
6. Use Tailwind CSS with dark theme (bg-black, bg-gray-900, text-text-primary)
7. Use red-500/red-600 as accent color
8. Include proper TypeScript types
9. Handle loading, error, and empty states
10. Return ONLY the code, no explanation
11. NEVER use malformed Fragment syntax like </<> or </> alone - use proper <> and </> pairs
12. Ensure ALL JSX tags are properly closed with matching opening and closing tags
13. When using React Fragments, write them as <> children </> with proper nesting
14. Ensure self-closing tags like <input />, <img />, <br /> are properly formatted`;

// Export singleton instance
export const incrementalFixGenerator = new IncrementalFixGenerator();
