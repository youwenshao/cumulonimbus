'use client';

import { useState } from 'react';
import { 
  AlertTriangle, 
  ChevronDown, 
  ChevronUp,
  Code2,
  Lightbulb,
  Copy,
  Check,
  ExternalLink
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { RetryAttempt } from '@/hooks/useCodeStream';
import type { ErrorCategory } from '@/lib/scaffolder-v2/error-analyzer';

export interface ErrorDetailPanelProps {
  /** The retry attempt to show details for */
  attempt: RetryAttempt;
  /** The code around the error (if available) */
  codeContext?: string;
  /** Whether the panel is initially expanded */
  defaultExpanded?: boolean;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Get descriptive text for error category
 */
function getCategoryDescription(category: ErrorCategory): string {
  switch (category) {
    case 'syntax':
      return 'A syntax error occurs when the code structure is invalid. This could be a missing bracket, semicolon, or invalid keyword.';
    case 'semantic':
      return 'A semantic error occurs when the code is syntactically correct but logically incorrect, such as using a variable before it is defined.';
    case 'environment':
      return 'An environment error occurs when required dependencies or globals are missing or misconfigured.';
    case 'capability':
      return 'A capability error occurs when the code tries to use features that are not available in the sandbox environment.';
    default:
      return 'An unknown error occurred. This may require manual inspection.';
  }
}

/**
 * Get severity color for category
 */
function getCategorySeverityColor(category: ErrorCategory): string {
  switch (category) {
    case 'syntax':
      return 'text-red-400';
    case 'semantic':
      return 'text-orange-400';
    case 'environment':
      return 'text-blue-400';
    case 'capability':
      return 'text-purple-400';
    default:
      return 'text-gray-400';
  }
}

/**
 * ErrorDetailPanel Component
 * Shows detailed error information with code context and suggestions
 */
export function ErrorDetailPanel({
  attempt,
  codeContext,
  defaultExpanded = false,
  className,
}: ErrorDetailPanelProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  const [copied, setCopied] = useState(false);

  const handleCopyError = async () => {
    const errorText = `
Error Category: ${attempt.errorCategory}
Error Message: ${attempt.errorMessage}
${attempt.errorLine ? `Line: ${attempt.errorLine}` : ''}
Status: ${attempt.status}
${attempt.fix ? `Fix: ${attempt.fix}` : ''}
${codeContext ? `\nCode Context:\n${codeContext}` : ''}
    `.trim();

    await navigator.clipboard.writeText(errorText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className={cn(
      'rounded-xl border border-outline-light bg-surface-elevated/50 overflow-hidden',
      className
    )}>
      {/* Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-4 py-3 flex items-center justify-between hover:bg-surface-elevated/80 transition-colors"
      >
        <div className="flex items-center gap-3">
          <AlertTriangle className={cn('w-5 h-5', getCategorySeverityColor(attempt.errorCategory))} />
          <div className="text-left">
            <p className="text-sm font-medium text-text-primary capitalize">
              {attempt.errorCategory} Error
            </p>
            <p className="text-xs text-text-tertiary">
              {attempt.status === 'success' ? 'Fixed' : attempt.status === 'failed' ? 'Failed to fix' : 'Fixing...'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleCopyError();
            }}
            className="p-1.5 rounded-lg hover:bg-surface-layer transition-colors"
            title="Copy error details"
          >
            {copied ? (
              <Check className="w-4 h-4 text-pastel-green" />
            ) : (
              <Copy className="w-4 h-4 text-text-tertiary" />
            )}
          </button>
          {isExpanded ? (
            <ChevronUp className="w-4 h-4 text-text-tertiary" />
          ) : (
            <ChevronDown className="w-4 h-4 text-text-tertiary" />
          )}
        </div>
      </button>

      {/* Expandable content */}
      {isExpanded && (
        <div className="border-t border-outline-light">
          <div className="p-4 space-y-4">
            {/* Error Message */}
            <div>
              <h4 className="text-xs font-medium text-text-tertiary uppercase tracking-wider mb-2">
                Error Message
              </h4>
              <div className="p-3 rounded-lg bg-surface-layer border border-outline-light">
                <p className="text-sm text-text-primary font-mono break-words">
                  {attempt.errorMessage}
                </p>
              </div>
            </div>

            {/* Error Location */}
            {attempt.errorLine && (
              <div>
                <h4 className="text-xs font-medium text-text-tertiary uppercase tracking-wider mb-2">
                  Location
                </h4>
                <div className="flex items-center gap-2 text-sm text-text-secondary">
                  <Code2 className="w-4 h-4" />
                  <span>Line {attempt.errorLine}</span>
                </div>
              </div>
            )}

            {/* Code Context */}
            {codeContext && (
              <div>
                <h4 className="text-xs font-medium text-text-tertiary uppercase tracking-wider mb-2">
                  Code Context
                </h4>
                <div className="rounded-lg bg-black border border-outline-light overflow-hidden">
                  <pre className="p-3 text-xs font-mono text-text-secondary overflow-x-auto">
                    <code>{codeContext}</code>
                  </pre>
                </div>
              </div>
            )}

            {/* Category Description */}
            <div>
              <h4 className="text-xs font-medium text-text-tertiary uppercase tracking-wider mb-2 flex items-center gap-1">
                <Lightbulb className="w-3 h-3" />
                What This Means
              </h4>
              <p className="text-sm text-text-secondary">
                {getCategoryDescription(attempt.errorCategory)}
              </p>
            </div>

            {/* Fix Applied */}
            {attempt.fix && (
              <div>
                <h4 className="text-xs font-medium text-text-tertiary uppercase tracking-wider mb-2">
                  Fix Applied
                </h4>
                <div className="p-3 rounded-lg bg-pastel-green/10 border border-pastel-green/30">
                  <p className="text-sm text-pastel-green">
                    {attempt.fix}
                  </p>
                </div>
              </div>
            )}

            {/* Strategy Used */}
            {attempt.strategy && (
              <div className="flex items-center gap-2 text-xs text-text-tertiary">
                <span>Strategy:</span>
                <span className="px-2 py-0.5 rounded-full bg-surface-layer border border-outline-light">
                  {attempt.strategy}
                </span>
              </div>
            )}

            {/* Learn More Link (placeholder) */}
            <div className="pt-2 border-t border-outline-light">
              <a
                href="#"
                onClick={(e) => e.preventDefault()}
                className="inline-flex items-center gap-1 text-xs text-accent-yellow hover:underline"
              >
                Learn more about {attempt.errorCategory} errors
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Compact error summary for inline display
 */
export function ErrorSummary({
  attempt,
  className,
}: {
  attempt: RetryAttempt;
  className?: string;
}) {
  return (
    <div className={cn(
      'flex items-center gap-2 px-3 py-2 rounded-lg bg-surface-layer border border-outline-light',
      className
    )}>
      <AlertTriangle className={cn('w-4 h-4', getCategorySeverityColor(attempt.errorCategory))} />
      <span className="text-sm text-text-primary capitalize">{attempt.errorCategory}</span>
      {attempt.errorLine && (
        <span className="text-xs text-text-tertiary">
          Line {attempt.errorLine}
        </span>
      )}
      {attempt.status === 'success' && (
        <span className="ml-auto text-xs text-pastel-green">Fixed</span>
      )}
    </div>
  );
}

export default ErrorDetailPanel;
