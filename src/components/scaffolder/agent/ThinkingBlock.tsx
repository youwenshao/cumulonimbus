'use client';

import React, { useState, useEffect } from 'react';
import { ChevronDown, ChevronRight, Brain } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ThinkingBlockProps {
  content: string;
  isComplete?: boolean;
}

export function ThinkingBlock({ content, isComplete = false }: ThinkingBlockProps) {
  const [isExpanded, setIsExpanded] = useState(!isComplete);

  // Auto-collapse when complete
  useEffect(() => {
    if (isComplete) {
      const timer = setTimeout(() => setIsExpanded(false), 800);
      return () => clearTimeout(timer);
    }
  }, [isComplete]);

  return (
    <div className="mb-4 animate-fade-in">
      <button 
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center gap-2 text-sm text-text-tertiary hover:text-text-secondary transition-colors w-full text-left"
      >
        {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
        <span className="flex items-center gap-2 font-medium">
          <Brain className="w-3 h-3" />
          Thinking Process
        </span>
        {!isComplete && <span className="animate-pulse ml-auto text-xs bg-surface-elevated px-2 py-0.5 rounded">Processing...</span>}
      </button>
      
      {isExpanded && (
        <div className="mt-2 ml-2 pl-4 border-l-2 border-outline-light text-sm text-text-secondary leading-relaxed italic">
          {content}
          {!isComplete && <span className="inline-block w-1.5 h-3 ml-1 bg-text-tertiary animate-pulse" />}
        </div>
      )}
    </div>
  );
}
