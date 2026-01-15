'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';

export type StatusPhase = 'parse' | 'probe' | 'picture' | 'plan' | 'build' | 'complete';
export type StatusSeverity = 'info' | 'success' | 'warning' | 'error';

export interface StatusMessage {
  id: string;
  phase: StatusPhase;
  message: string;
  technicalDetails?: string;
  severity: StatusSeverity;
  timestamp: string;
  progress?: number;
}

interface StatusPanelProps {
  messages: StatusMessage[];
  currentPhase?: StatusPhase;
  showTechnicalDetails?: boolean;
  onToggleTechnical?: (show: boolean) => void;
}

const PHASE_INFO: Record<StatusPhase, { label: string; icon: string; color: string }> = {
  parse: { label: 'Analyzing', icon: '🔍', color: 'text-blue-400' },
  probe: { label: 'Questions', icon: '💡', color: 'text-yellow-400' },
  picture: { label: 'Preview', icon: '👁️', color: 'text-purple-400' },
  plan: { label: 'Planning', icon: '📋', color: 'text-orange-400' },
  build: { label: 'Building', icon: '🔨', color: 'text-green-400' },
  complete: { label: 'Complete', icon: '✅', color: 'text-green-500' },
};

export function StatusPanel({
  messages,
  currentPhase,
  showTechnicalDetails = false,
  onToggleTechnical,
}: StatusPanelProps) {
  const [expanded, setExpanded] = useState(true);
  const latestMessage = messages[messages.length - 1];
  const progress = latestMessage?.progress || 0;

  if (messages.length === 0) return null;

  return (
    <div className="bg-surface-elevated border border-outline-light rounded-xl overflow-hidden">
      {/* Header */}
      <div 
        className="flex items-center justify-between p-4 cursor-pointer hover:bg-surface-base/50 transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-3">
          <div className="animate-spin text-xl">⚙️</div>
          <div>
            <div className="font-semibold text-text-primary">
              {currentPhase ? PHASE_INFO[currentPhase].label : 'Processing'}
            </div>
            <div className="text-sm text-text-secondary">
              {latestMessage?.message || 'Initializing...'}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {progress > 0 && (
            <div className="text-sm text-text-secondary">{Math.round(progress)}%</div>
          )}
          <button 
            className="text-text-secondary hover:text-text-primary transition-colors"
            aria-label={expanded ? 'Collapse' : 'Expand'}
          >
            {expanded ? '▼' : '▶'}
          </button>
        </div>
      </div>

      {/* Progress Bar */}
      {progress > 0 && (
        <div className="h-1 bg-surface-layer">
          <div 
            className="h-full bg-accent-yellow transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      )}

      {/* Expanded Content */}
      {expanded && (
        <div className="border-t border-outline-light">
          {/* Phase Indicators */}
          <div className="flex items-center justify-around p-4 border-b border-outline-light">
            {(['parse', 'probe', 'picture', 'plan', 'build', 'complete'] as StatusPhase[]).map((phase) => {
              const info = PHASE_INFO[phase];
              const isActive = phase === currentPhase;
              const isComplete = messages.some(m => m.phase === phase && m.severity === 'success');
              const hasError = messages.some(m => m.phase === phase && m.severity === 'error');
              
              return (
                <div
                  key={phase}
                  className={cn(
                    'flex flex-col items-center gap-1 transition-all',
                    isActive && 'scale-110'
                  )}
                >
                  <div
                    className={cn(
                      'w-10 h-10 rounded-full flex items-center justify-center text-xl transition-all',
                      isActive && 'ring-2 ring-accent-yellow ring-offset-2 ring-offset-black',
                      isComplete && 'bg-green-500/20',
                      hasError && 'bg-red-500/20',
                      !isActive && !isComplete && !hasError && 'bg-surface-dark opacity-50'
                    )}
                  >
                    {hasError ? '❌' : isComplete ? '✓' : info.icon}
                  </div>
                  <div
                    className={cn(
                      'text-xs font-medium',
                      isActive ? info.color : 'text-text-secondary'
                    )}
                  >
                    {info.label}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Status Messages */}
          <div className="p-4 space-y-2 max-h-64 overflow-y-auto">
            {messages.slice(-5).map((msg) => (
              <StatusMessageItem 
                key={msg.id} 
                message={msg} 
                showTechnical={showTechnicalDetails}
              />
            ))}
          </div>

          {/* Technical Details Toggle */}
          {onToggleTechnical && messages.some(m => m.technicalDetails) && (
            <div className="border-t border-outline-light p-3">
              <button
                onClick={() => onToggleTechnical(!showTechnicalDetails)}
                className="text-sm text-text-secondary hover:text-text-primary transition-colors flex items-center gap-2"
              >
                <span className="text-xs">🔧</span>
                {showTechnicalDetails ? 'Hide' : 'Show'} Technical Details
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function StatusMessageItem({ 
  message, 
  showTechnical 
}: { 
  message: StatusMessage; 
  showTechnical: boolean;
}) {
  const severityColors: Record<StatusSeverity, string> = {
    info: 'text-blue-400',
    success: 'text-green-400',
    warning: 'text-yellow-400',
    error: 'text-red-400',
  };

  const severityIcons: Record<StatusSeverity, string> = {
    info: 'ℹ️',
    success: '✅',
    warning: '⚠️',
    error: '❌',
  };

  return (
    <div className="text-sm">
      <div className="flex items-start gap-2">
        <span className="text-base">{severityIcons[message.severity]}</span>
        <div className="flex-1">
          <div className={cn('font-medium', severityColors[message.severity])}>
            {message.message}
          </div>
          {showTechnical && message.technicalDetails && (
            <div className="text-xs text-text-secondary mt-1 font-mono bg-surface-dark p-2 rounded">
              {message.technicalDetails}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Compact inline status indicator for when panel is not shown
export function StatusIndicator({ 
  phase, 
  message 
}: { 
  phase: StatusPhase; 
  message: string;
}) {
  const info = PHASE_INFO[phase];
  
  return (
    <div className="flex items-center gap-2 px-3 py-2 bg-surface-elevated border border-outline-light rounded-lg">
      <div className="animate-pulse text-lg">{info.icon}</div>
      <div className="text-sm">
        <span className={cn('font-medium', info.color)}>{info.label}:</span>{' '}
        <span className="text-text-secondary">{message}</span>
      </div>
    </div>
  );
}
