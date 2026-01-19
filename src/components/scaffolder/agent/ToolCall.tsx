'use client';

import React from 'react';
import { Wrench, Search, Globe, FileCode } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ToolCallProps {
  tool: string;
  input?: string;
  status: 'running' | 'completed' | 'failed';
  result?: string;
}

export function ToolCall({ tool, input, status, result }: ToolCallProps) {
  const getIcon = () => {
    if (tool.includes('search') || tool.includes('web')) return <Globe className="w-3.5 h-3.5" />;
    if (tool.includes('code') || tool.includes('file')) return <FileCode className="w-3.5 h-3.5" />;
    return <Wrench className="w-3.5 h-3.5" />;
  };

  const getLabel = () => {
    if (tool === 'web_search') return 'Searching Web';
    if (tool === 'architect_agent') return 'Architect Agent';
    return tool;
  };

  return (
    <div className="my-3 font-mono text-xs animate-slide-up">
      <div className={cn(
        "flex items-center gap-2 px-3 py-2 rounded-lg border transition-all duration-300",
        status === 'running' 
          ? "bg-surface-elevated border-accent-yellow/30 text-accent-yellow" 
          : "bg-surface-light border-outline-light text-text-secondary"
      )}>
        <div className={cn("flex items-center justify-center w-5 h-5 rounded bg-surface-base border border-current opacity-80")}>
          {getIcon()}
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <span className="font-bold opacity-90">{getLabel()}</span>
            {status === 'running' && <span className="animate-spin text-[10px]">◐</span>}
          </div>
          {input && (
            <div className="truncate opacity-70 mt-0.5 max-w-[300px]">
              {input}
            </div>
          )}
        </div>
      </div>

      {/* Result Preview (optional) */}
      {status === 'completed' && result && (
        <div className="ml-4 pl-4 border-l border-outline-light mt-1 py-1 text-text-tertiary truncate max-w-md">
          → {result}
        </div>
      )}
    </div>
  );
}
