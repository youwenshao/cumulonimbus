'use client';

import { useState } from 'react';
import { 
  RefreshCw, 
  CheckCircle, 
  XCircle, 
  AlertTriangle, 
  ChevronDown, 
  ChevronUp,
  Code2,
  Loader2
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { RetryAttempt } from '@/hooks/useCodeStream';
import type { ErrorCategory } from '@/lib/scaffolder-v2/error-analyzer';

export interface RetryProgressIndicatorProps {
  /** List of retry attempts */
  attempts: RetryAttempt[];
  /** Current retry attempt number */
  currentAttempt: number;
  /** Maximum number of attempts */
  maxAttempts: number;
  /** Whether a retry is currently in progress */
  isRetrying: boolean;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Get badge styles for error category
 */
function getCategoryBadgeStyles(category: ErrorCategory): string {
  switch (category) {
    case 'syntax':
      return 'bg-red-500/10 text-red-400 border-red-500/30';
    case 'semantic':
      return 'bg-orange-500/10 text-orange-400 border-orange-500/30';
    case 'environment':
      return 'bg-blue-500/10 text-blue-400 border-blue-500/30';
    case 'capability':
      return 'bg-purple-500/10 text-purple-400 border-purple-500/30';
    default:
      return 'bg-gray-500/10 text-gray-400 border-gray-500/30';
  }
}

/**
 * Get status icon for attempt
 */
function StatusIcon({ status }: { status: RetryAttempt['status'] }) {
  switch (status) {
    case 'in_progress':
      return <Loader2 className="w-4 h-4 animate-spin text-accent-yellow" />;
    case 'success':
      return <CheckCircle className="w-4 h-4 text-pastel-green" />;
    case 'failed':
      return <XCircle className="w-4 h-4 text-red-400" />;
    default:
      return null;
  }
}

/**
 * RetryProgressIndicator Component
 * Displays retry attempts with expandable details
 */
export function RetryProgressIndicator({
  attempts,
  currentAttempt,
  maxAttempts,
  isRetrying,
  className,
}: RetryProgressIndicatorProps) {
  const [isExpanded, setIsExpanded] = useState(true);

  if (attempts.length === 0 && !isRetrying) {
    return null;
  }

  const successCount = attempts.filter(a => a.status === 'success').length;
  const failedCount = attempts.filter(a => a.status === 'failed').length;
  const inProgressCount = attempts.filter(a => a.status === 'in_progress').length;

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
          <div className={cn(
            'p-1.5 rounded-lg',
            isRetrying ? 'bg-accent-yellow/10' : successCount > 0 ? 'bg-pastel-green/10' : 'bg-surface-layer'
          )}>
            {isRetrying ? (
              <RefreshCw className="w-4 h-4 text-accent-yellow animate-spin" />
            ) : successCount > 0 ? (
              <CheckCircle className="w-4 h-4 text-pastel-green" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-pastel-yellow" />
            )}
          </div>
          <div className="text-left">
            <p className="text-sm font-medium text-text-primary">
              {isRetrying 
                ? `Fixing errors (attempt ${currentAttempt}/${maxAttempts})` 
                : `Error correction complete`}
            </p>
            <p className="text-xs text-text-tertiary">
              {successCount} fixed, {failedCount} failed, {inProgressCount} in progress
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {/* Progress dots */}
          <div className="flex items-center gap-1">
            {Array.from({ length: maxAttempts }).map((_, i) => {
              const attempt = attempts.find(a => a.attempt === i + 1);
              let bgColor = 'bg-surface-layer';
              
              if (attempt) {
                if (attempt.status === 'success') bgColor = 'bg-pastel-green';
                else if (attempt.status === 'failed') bgColor = 'bg-red-400';
                else if (attempt.status === 'in_progress') bgColor = 'bg-accent-yellow animate-pulse';
              } else if (i + 1 === currentAttempt && isRetrying) {
                bgColor = 'bg-accent-yellow animate-pulse';
              }
              
              return (
                <div
                  key={i}
                  className={cn('w-2 h-2 rounded-full transition-colors', bgColor)}
                />
              );
            })}
          </div>
          {isExpanded ? (
            <ChevronUp className="w-4 h-4 text-text-tertiary" />
          ) : (
            <ChevronDown className="w-4 h-4 text-text-tertiary" />
          )}
        </div>
      </button>

      {/* Expandable content */}
      {isExpanded && attempts.length > 0 && (
        <div className="border-t border-outline-light">
          <div className="p-3 space-y-2">
            {attempts.map((attempt) => (
              <div
                key={attempt.id}
                className={cn(
                  'p-3 rounded-lg border transition-colors',
                  attempt.status === 'in_progress'
                    ? 'bg-accent-yellow/5 border-accent-yellow/30'
                    : attempt.status === 'success'
                    ? 'bg-pastel-green/5 border-pastel-green/30'
                    : 'bg-red-500/5 border-red-500/30'
                )}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-2 min-w-0 flex-1">
                    <StatusIcon status={attempt.status} />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-medium text-text-primary">
                          Attempt {attempt.attempt}
                        </span>
                        <span className={cn(
                          'text-xs px-2 py-0.5 rounded-full border',
                          getCategoryBadgeStyles(attempt.errorCategory)
                        )}>
                          {attempt.errorCategory}
                        </span>
                        {attempt.strategy && (
                          <span className="text-xs px-2 py-0.5 rounded-full bg-surface-layer text-text-tertiary border border-outline-light">
                            {attempt.strategy}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-text-secondary mt-1 line-clamp-2">
                        {attempt.errorMessage}
                      </p>
                      {attempt.errorLine && (
                        <p className="text-xs text-text-tertiary mt-1 flex items-center gap-1">
                          <Code2 className="w-3 h-3" />
                          Line {attempt.errorLine}
                        </p>
                      )}
                      {attempt.fix && (
                        <p className="text-xs text-pastel-green mt-1">
                          {attempt.fix}
                        </p>
                      )}
                    </div>
                  </div>
                  <span className="text-xs text-text-tertiary whitespace-nowrap">
                    {formatTime(attempt.timestamp)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Format timestamp for display
 */
function formatTime(date: Date): string {
  return date.toLocaleTimeString(undefined, {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

export default RetryProgressIndicator;
