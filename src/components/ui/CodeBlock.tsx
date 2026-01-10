'use client';

import { cn } from '@/lib/utils';
import { useState } from 'react';
import { Copy, Check } from 'lucide-react';

interface CodeBlockProps {
  code: string;
  language?: string;
  className?: string;
  showCopy?: boolean;
}

export function CodeBlock({
  code,
  language = 'javascript',
  className,
  showCopy = true
}: CodeBlockProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy code:', err);
    }
  };

  return (
    <div className={cn('message-architect rounded-xl overflow-hidden', className)}>
      <div className="flex items-center justify-between px-4 py-2 bg-surface-mid border-b border-outline-light/30">
        <span className="text-xs text-text-tertiary font-mono uppercase tracking-wide">
          {language}
        </span>
        {showCopy && (
          <button
            onClick={handleCopy}
            className="p-1 hover:bg-surface-light rounded transition-colors focus-ring-red"
            aria-label="Copy code"
          >
            {copied ? (
              <Check className="w-4 h-4 text-pastel-green" />
            ) : (
              <Copy className="w-4 h-4 text-text-tertiary hover:text-text-secondary" />
            )}
          </button>
        )}
      </div>
      <pre className="px-4 py-3 overflow-x-auto text-sm font-mono leading-relaxed">
        <code className="text-text-primary">
          {code}
        </code>
      </pre>
    </div>
  );
}

export default CodeBlock;