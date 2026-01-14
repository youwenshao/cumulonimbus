'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { 
  FileCode2, 
  Copy, 
  Check, 
  Play, 
  Loader2,
  ChevronRight,
  Code2,
} from 'lucide-react';
import { Button, Card } from '@/components/ui';
import { cn } from '@/lib/utils';

export interface CodeStreamViewerProps {
  /** Code being streamed */
  code: string;
  /** All generated files */
  files?: Record<string, string>;
  /** Current progress (0-100) */
  progress?: number;
  /** Status message */
  message?: string;
  /** Whether code is still streaming */
  isStreaming?: boolean;
  /** App ID when complete */
  appId?: string;
  /** Error message if any */
  error?: string;
  /** Callback when preview is requested */
  onPreview?: (appId: string) => void;
  /** Custom class name */
  className?: string;
}

// Simple syntax highlighting for JSX/React code
function highlightCode(code: string): string {
  if (!code) return '';

  // Escape HTML
  let html = code
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  // Keywords
  html = html.replace(
    /\b(const|let|var|function|return|if|else|for|while|switch|case|break|continue|new|try|catch|throw|async|await|import|export|from|default|class|extends|static|get|set|of|in)\b/g,
    '<span class="text-purple-400">$1</span>'
  );

  // React/JSX specific
  html = html.replace(
    /\b(React|useState|useEffect|useCallback|useMemo|useRef|useContext)\b/g,
    '<span class="text-cyan-400">$1</span>'
  );

  // Strings
  html = html.replace(
    /(["'`])(?:(?!\1)[^\\]|\\.)*\1/g,
    '<span class="text-green-400">$&</span>'
  );

  // Numbers
  html = html.replace(
    /\b(\d+(?:\.\d+)?)\b/g,
    '<span class="text-orange-400">$1</span>'
  );

  // Comments
  html = html.replace(
    /(\/\/.*$)/gm,
    '<span class="text-gray-500">$1</span>'
  );
  html = html.replace(
    /(\/\*[\s\S]*?\*\/)/g,
    '<span class="text-gray-500">$1</span>'
  );

  // JSX tags
  html = html.replace(
    /(&lt;\/?)([A-Z][a-zA-Z0-9]*)/g,
    '$1<span class="text-red-400">$2</span>'
  );
  html = html.replace(
    /(&lt;\/?)([a-z][a-zA-Z0-9]*)/g,
    '$1<span class="text-blue-400">$2</span>'
  );

  // Attributes
  html = html.replace(
    /\s([a-zA-Z-]+)=/g,
    ' <span class="text-yellow-400">$1</span>='
  );

  // className special case
  html = html.replace(
    /className=/g,
    '<span class="text-cyan-300">className</span>='
  );

  return html;
}

export function CodeStreamViewer({
  code,
  files = {},
  progress = 0,
  message = '',
  isStreaming = false,
  appId,
  error,
  onPreview,
  className = '',
}: CodeStreamViewerProps) {
  const [activeFile, setActiveFile] = useState<string>('App.tsx');
  const [copied, setCopied] = useState(false);
  const codeContainerRef = useRef<HTMLPreElement>(null);

  // Auto-scroll to bottom while streaming
  useEffect(() => {
    if (isStreaming && codeContainerRef.current) {
      codeContainerRef.current.scrollTop = codeContainerRef.current.scrollHeight;
    }
  }, [code, isStreaming]);

  // Get file list
  const fileList = useMemo(() => {
    const list = Object.keys(files);
    if (list.length === 0 && code) {
      return ['App.tsx'];
    }
    return list;
  }, [files, code]);

  // Get current code to display
  const displayCode = useMemo(() => {
    if (files[activeFile]) {
      return files[activeFile];
    }
    if (activeFile === 'App.tsx') {
      return code;
    }
    return '';
  }, [activeFile, files, code]);

  // Highlighted code
  const highlightedCode = useMemo(() => {
    return highlightCode(displayCode);
  }, [displayCode]);

  // Copy code to clipboard
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(displayCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (e) {
      console.error('Failed to copy:', e);
    }
  };

  // Preview app
  const handlePreview = () => {
    if (appId && onPreview) {
      onPreview(appId);
    }
  };

  return (
    <Card 
      variant="outlined" 
      padding="none" 
      className={cn('flex flex-col overflow-hidden', className)}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-gray-900/50 border-b border-gray-800">
        <div className="flex items-center gap-2">
          <Code2 className="w-5 h-5 text-red-500" />
          <span className="font-medium">Generated Code</span>
        </div>

        <div className="flex items-center gap-2">
          {/* Progress indicator */}
          {isStreaming && (
            <div className="flex items-center gap-2 text-sm text-gray-400">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>{message || `${progress}%`}</span>
            </div>
          )}

          {/* Copy button */}
          <Button
            variant="ghost"
            size="sm"
            onClick={handleCopy}
            disabled={!displayCode}
          >
            {copied ? (
              <Check className="w-4 h-4 text-green-500" />
            ) : (
              <Copy className="w-4 h-4" />
            )}
          </Button>

          {/* Preview button */}
          {appId && onPreview && (
            <Button
              variant="primary"
              size="sm"
              onClick={handlePreview}
              className="gap-1"
            >
              <Play className="w-4 h-4" />
              Preview
            </Button>
          )}
        </div>
      </div>

      {/* Progress bar */}
      {isStreaming && (
        <div className="h-1 bg-gray-800">
          <div 
            className="h-full bg-gradient-to-r from-red-500 to-orange-500 transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      )}

      {/* File tabs */}
      {fileList.length > 0 && (
        <div className="flex items-center gap-1 px-2 py-2 bg-gray-900/30 border-b border-gray-800 overflow-x-auto">
          {fileList.map(filename => (
            <button
              key={filename}
              onClick={() => setActiveFile(filename)}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded text-sm transition-colors',
                activeFile === filename
                  ? 'bg-gray-800 text-white'
                  : 'text-gray-400 hover:text-white hover:bg-gray-800/50'
              )}
            >
              <FileCode2 className="w-4 h-4" />
              {filename}
            </button>
          ))}
        </div>
      )}

      {/* Code content */}
      <div className="flex-1 overflow-hidden">
        {error ? (
          <div className="p-6 text-center">
            <div className="text-red-500 mb-2">Error</div>
            <div className="text-gray-400">{error}</div>
          </div>
        ) : displayCode ? (
          <pre
            ref={codeContainerRef}
            className="h-full overflow-auto p-4 text-sm font-mono leading-relaxed"
            style={{ maxHeight: '500px' }}
          >
            <code dangerouslySetInnerHTML={{ __html: highlightedCode }} />
            {isStreaming && (
              <span className="inline-block w-2 h-4 bg-red-500 animate-pulse ml-0.5" />
            )}
          </pre>
        ) : (
          <div className="flex items-center justify-center h-full min-h-[200px] text-gray-500">
            <div className="text-center">
              <Code2 className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>Code will appear here as it&apos;s generated</p>
            </div>
          </div>
        )}
      </div>

      {/* Footer with stats */}
      {displayCode && !isStreaming && (
        <div className="flex items-center justify-between px-4 py-2 bg-gray-900/30 border-t border-gray-800 text-xs text-gray-500">
          <div className="flex items-center gap-4">
            <span>{displayCode.split('\n').length} lines</span>
            <span>{(displayCode.length / 1024).toFixed(1)} KB</span>
          </div>
          {appId && (
            <div className="flex items-center gap-1">
              <ChevronRight className="w-3 h-3" />
              <span>App ID: {appId.substring(0, 8)}...</span>
            </div>
          )}
        </div>
      )}
    </Card>
  );
}
