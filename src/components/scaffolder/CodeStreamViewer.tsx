'use client';

import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { 
  FileCode2, 
  Copy, 
  Check, 
  Play, 
  Loader2,
  ChevronRight,
  Code,
  Pencil,
  Settings,
  X,
} from 'lucide-react';
import { Button, Card, Modal } from '@/components/ui';
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
  /** Callback when code is edited */
  onCodeChange?: (filename: string, code: string) => void;
  /** Custom class name */
  className?: string;
}

type StreamingMode = 'instant' | 'word' | 'character';

// Streaming speed constants (ms per unit)
const STREAMING_SPEEDS: Record<StreamingMode, number> = {
  instant: 0,
  word: 15,
  character: 5,
};

// Custom hook for smooth streaming buffer
function useStreamBuffer(inputCode: string, mode: StreamingMode, isStreaming: boolean) {
  const [displayedCode, setDisplayedCode] = useState(inputCode);
  const targetCodeRef = useRef(inputCode);
  const animationFrameRef = useRef<number | null>(null);
  const lastUpdateRef = useRef<number>(0);

  useEffect(() => {
    targetCodeRef.current = inputCode;
    
    if (mode === 'instant' || !isStreaming) {
      setDisplayedCode(inputCode);
      return;
    }
    
    const speed = STREAMING_SPEEDS[mode];
    
    const animate = (timestamp: number) => {
      if (timestamp - lastUpdateRef.current >= speed) {
        lastUpdateRef.current = timestamp;
        
        setDisplayedCode(prev => {
          const target = targetCodeRef.current;
          if (prev.length >= target.length) {
            return target;
          }
          
          if (mode === 'word') {
            const remaining = target.slice(prev.length);
            const wordMatch = remaining.match(/^\S*\s*/);
            const nextChunk = wordMatch ? wordMatch[0] : remaining.charAt(0);
            return prev + nextChunk;
          } else {
            return prev + target.charAt(prev.length);
          }
        });
      }
      
      if (displayedCode.length < targetCodeRef.current.length) {
        animationFrameRef.current = requestAnimationFrame(animate);
      }
    };
    
    animationFrameRef.current = requestAnimationFrame(animate);
    
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [inputCode, mode, isStreaming, displayedCode.length]);

  return displayedCode;
}

// Syntax highlighting with dynamic mode
function highlightCode(code: string, isComplete: boolean): string {
  if (!code) return '';

  // Escape HTML
  let html = code
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  if (isComplete) {
    // Full highlighting when complete
    // Keywords
    html = html.replace(
      /\b(const|let|var|function|return|if|else|for|while|switch|case|break|continue|new|try|catch|throw|async|await|import|export|from|default|class|extends|static|get|set|of|in|type|interface|readonly|public|private|protected|implements|void|null|undefined|true|false|yield)\b/g,
      '<span class="text-purple-400">$1</span>'
    );

    // Types
    html = html.replace(
      /\b(string|number|boolean|any|unknown|never|object|Array|Promise|Record|Partial|Required|Omit|Pick|React|ReactNode|FC|JSX)\b/g,
      '<span class="text-yellow-300">$1</span>'
    );

    // React/JSX specific
    html = html.replace(
      /\b(useState|useEffect|useCallback|useMemo|useRef|useContext|useReducer|useLayoutEffect)\b/g,
      '<span class="text-cyan-400">$1</span>'
    );

    // Component names (PascalCase)
    html = html.replace(
      /\b([A-Z][a-zA-Z0-9]*)\b(?=\s*[(\<{])/g,
      '<span class="text-emerald-400">$1</span>'
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
      '<span class="text-text-tertiary italic">$1</span>'
    );
    html = html.replace(
      /(\/\*[\s\S]*?\*\/)/g,
      '<span class="text-text-tertiary italic">$1</span>'
    );

    // JSX tags
    html = html.replace(
      /(&lt;\/?)([A-Z][a-zA-Z0-9]*)/g,
      '$1<span class="text-emerald-400">$2</span>'
    );
    html = html.replace(
      /(&lt;\/?)([a-z][a-zA-Z0-9]*)/g,
      '$1<span class="text-pastel-blue">$2</span>'
    );

    // Attributes
    html = html.replace(
      /\s([a-zA-Z-]+)=/g,
      ' <span class="text-accent-yellow">$1</span>='
    );
  } else {
    // Minimal highlighting during streaming
    html = html.replace(
      /\b(import|export|const|let|function|return|async|await)\b/g,
      '<span class="text-purple-400">$1</span>'
    );
  }

  return html;
}

// Generate line numbers
function getLineNumbers(code: string): number[] {
  if (!code) return [1];
  const lines = code.split('\n');
  return Array.from({ length: lines.length }, (_, i) => i + 1);
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
  onCodeChange,
  className = '',
}: CodeStreamViewerProps) {
  const [activeFile, setActiveFile] = useState<string>('App.tsx');
  const [copied, setCopied] = useState(false);
  const [streamingMode, setStreamingMode] = useState<StreamingMode>('word');
  const [showSettings, setShowSettings] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingCode, setEditingCode] = useState('');
  
  const codeContainerRef = useRef<HTMLDivElement>(null);
  const lineNumbersRef = useRef<HTMLDivElement>(null);

  // Get file list
  const fileList = useMemo(() => {
    const list = Object.keys(files);
    if (list.length === 0 && code) {
      return ['App.tsx'];
    }
    return list;
  }, [files, code]);

  // Get current code to display
  const rawCode = useMemo(() => {
    if (files[activeFile]) {
      return files[activeFile];
    }
    if (activeFile === 'App.tsx') {
      return code;
    }
    return '';
  }, [activeFile, files, code]);

  // Use streaming buffer
  const displayCode = useStreamBuffer(rawCode, streamingMode, isStreaming);
  
  // Line numbers
  const lineNumbers = useMemo(() => getLineNumbers(displayCode), [displayCode]);

  // Highlighted code
  const highlightedCode = useMemo(() => {
    return highlightCode(displayCode, !isStreaming);
  }, [displayCode, isStreaming]);

  // Auto-scroll to bottom while streaming
  useEffect(() => {
    if (isStreaming && codeContainerRef.current) {
      codeContainerRef.current.scrollTo({
        top: codeContainerRef.current.scrollHeight,
        behavior: 'smooth',
      });
    }
  }, [displayCode, isStreaming]);

  // Sync line numbers scroll
  useEffect(() => {
    const codeContainer = codeContainerRef.current;
    const lineNumbersContainer = lineNumbersRef.current;
    
    if (!codeContainer || !lineNumbersContainer) return;
    
    const handleScroll = () => {
      lineNumbersContainer.scrollTop = codeContainer.scrollTop;
    };
    
    codeContainer.addEventListener('scroll', handleScroll);
    return () => codeContainer.removeEventListener('scroll', handleScroll);
  }, []);

  // Copy code to clipboard
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(rawCode);
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

  // Open edit modal
  const handleOpenEdit = () => {
    setEditingCode(rawCode);
    setIsEditModalOpen(true);
  };

  // Save edited code
  const handleSaveEdit = () => {
    setIsEditModalOpen(false);
    if (onCodeChange) {
      onCodeChange(activeFile, editingCode);
    }
  };

  return (
    <>
      <div className={cn(
        'bg-surface-base border border-outline-mid rounded-xl overflow-hidden shadow-2xl flex flex-col',
        className
      )}>
        {/* Header - Glassmorphism style */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-outline-mid/80 bg-surface-layer/80 backdrop-blur-sm">
          <div className="flex items-center gap-3">
            {/* Window controls */}
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-full bg-red-500/80 hover:bg-red-500 transition-colors" />
              <div className="w-3 h-3 rounded-full bg-yellow-500/80 hover:bg-yellow-500 transition-colors" />
              <div className="w-3 h-3 rounded-full bg-green-500/80 hover:bg-green-500 transition-colors" />
            </div>
            <div className="h-4 w-px bg-outline-light" />
            <Code className="w-4 h-4 text-text-secondary" />
            <span className="font-medium text-sm text-text-primary">Generated Code</span>
          </div>

          <div className="flex items-center gap-2">
            {/* Progress indicator */}
            {isStreaming && (
              <div className="flex items-center gap-2 text-xs text-accent-yellow bg-accent-yellow/10 px-2 py-1 rounded-md">
                <Loader2 className="w-3 h-3 animate-spin" />
                <span>{message || `${Math.round(progress)}%`}</span>
              </div>
            )}

            {!isStreaming && displayCode && (
              <span className="flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded-md">
                <Check className="w-3 h-3" />
                Complete
              </span>
            )}

            <div className="h-4 w-px bg-outline-light" />

            {/* Copy button */}
            <button
              onClick={handleCopy}
              disabled={!displayCode}
              className="p-1.5 text-text-secondary hover:text-text-primary hover:bg-surface-elevated rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              title="Copy code"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
            </button>

            {/* Edit button */}
            <button
              onClick={handleOpenEdit}
              disabled={!displayCode || isStreaming}
              className="p-1.5 text-text-secondary hover:text-text-primary hover:bg-surface-elevated rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              title="Edit code"
            >
              <Pencil className="w-4 h-4" />
            </button>

            {/* Settings dropdown */}
            <div className="relative">
              <button
                onClick={() => setShowSettings(!showSettings)}
                className="p-1.5 text-text-secondary hover:text-text-primary hover:bg-surface-elevated rounded transition-colors"
                title="Streaming settings"
              >
                <Settings className="w-4 h-4" />
              </button>
              
              {showSettings && (
                <>
                  <div 
                    className="fixed inset-0 z-40" 
                    onClick={() => setShowSettings(false)} 
                  />
                  <div className="absolute right-0 top-full mt-2 w-48 bg-surface-layer border border-outline-light rounded-lg shadow-xl z-50 overflow-hidden">
                    <div className="px-3 py-2 border-b border-outline-mid">
                      <span className="text-xs font-medium text-text-secondary uppercase tracking-wide">Streaming Speed</span>
                    </div>
                    {(['instant', 'word', 'character'] as StreamingMode[]).map((mode) => (
                      <button
                        key={mode}
                        onClick={() => {
                          setStreamingMode(mode);
                          setShowSettings(false);
                        }}
                        className={cn(
                          'w-full px-3 py-2 text-left text-sm transition-colors flex items-center justify-between',
                          streamingMode === mode 
                            ? 'bg-accent-yellow/20 text-accent-yellow' 
                            : 'text-text-primary hover:bg-surface-elevated'
                        )}
                      >
                        <span className="capitalize">{mode}</span>
                        {streamingMode === mode && <Check className="w-3 h-3" />}
                      </button>
                    ))}
                    <div className="px-3 py-2 border-t border-outline-mid">
                      <p className="text-xs text-text-tertiary">
                        {streamingMode === 'instant' && 'Show code as it arrives'}
                        {streamingMode === 'word' && 'Smooth word-by-word reveal'}
                        {streamingMode === 'character' && 'Typewriter character effect'}
                      </p>
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Preview button */}
            {appId && onPreview && (
              <Button
                variant="primary"
                size="sm"
                onClick={handlePreview}
                className="gap-1 ml-2"
              >
                <Play className="w-4 h-4" />
                Preview
              </Button>
            )}
          </div>
        </div>

        {/* Progress bar */}
        {isStreaming && (
          <div className="h-0.5 bg-surface-layer">
            <div 
              className="h-full bg-gradient-to-r from-accent-yellow via-pastel-yellow to-accent-yellow bg-[length:200%_100%] animate-gradient transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        )}

        {/* File tabs */}
        {fileList.length > 0 && (
          <div className="flex items-center gap-1 px-2 py-1 bg-surface-layer/50 border-b border-outline-mid/50 overflow-x-auto">
            {fileList.map(filename => (
              <button
                key={filename}
                onClick={() => setActiveFile(filename)}
                className={cn(
                  'flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded-md transition-all',
                  activeFile === filename
                    ? 'bg-surface-elevated text-text-primary shadow-sm'
                    : 'text-text-tertiary hover:text-text-secondary hover:bg-surface-elevated/50'
                )}
              >
                <FileCode2 className="w-3 h-3" />
                {filename}
              </button>
            ))}
          </div>
        )}

        {/* Code content with line numbers */}
        <div className="flex flex-1 overflow-hidden" style={{ maxHeight: '500px' }}>
          {/* Line Numbers */}
          <div 
            ref={lineNumbersRef}
            className="flex-shrink-0 w-12 bg-surface-layer/30 border-r border-outline-mid/50 overflow-hidden select-none"
          >
            <div className="py-4 pr-3 text-right font-mono text-xs text-text-tertiary">
              {lineNumbers.map((num) => (
                <div key={num} className="h-5 leading-5">
                  {num}
                </div>
              ))}
            </div>
          </div>

          {/* Code Content */}
          <div 
            ref={codeContainerRef}
            className="flex-1 overflow-auto scrollbar-thin scrollbar-thumb-outline-mid scrollbar-track-transparent"
          >
            {error ? (
              <div className="p-6 text-center">
                <div className="text-red-500 mb-2">Error</div>
                <div className="text-text-secondary">{error}</div>
              </div>
            ) : displayCode ? (
              <pre className="p-4 font-mono text-sm leading-5">
                <code dangerouslySetInnerHTML={{ __html: highlightedCode }} className="text-text-primary" />
                {isStreaming && (
                  <span className="inline-block w-2 h-4 bg-accent-yellow animate-pulse ml-0.5 align-middle" />
                )}
              </pre>
            ) : (
              <div className="flex items-center justify-center h-full min-h-[200px] text-text-tertiary">
                <div className="text-center">
                  <Code className="w-12 h-12 mx-auto mb-3 opacity-30" />
                  <p>Code will appear here as it&apos;s generated</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer with stats */}
        <div className="flex items-center justify-between px-4 py-2 bg-surface-layer/30 border-t border-outline-mid/50 text-xs text-text-tertiary">
          <div className="flex items-center gap-4">
            {displayCode && (
              <>
                <span>{displayCode.split('\n').length} lines</span>
                <span>{(displayCode.length / 1024).toFixed(1)} KB</span>
              </>
            )}
          </div>
          <div className="flex items-center gap-2">
            {appId && (
              <div className="flex items-center gap-1">
                <ChevronRight className="w-3 h-3" />
                <span>App ID: {appId.substring(0, 8)}...</span>
              </div>
            )}
            <span className="text-text-tertiary">|</span>
            <span className="capitalize text-text-secondary">{streamingMode}</span>
          </div>
        </div>
      </div>

      {/* Edit Modal */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title="Edit Code"
        description="Make manual changes to the generated code"
        className="max-w-4xl"
        footer={
          <>
            <Button variant="ghost" onClick={() => setIsEditModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveEdit}>
              Save Changes
            </Button>
          </>
        }
      >
        <div className="relative">
          <textarea
            value={editingCode}
            onChange={(e) => setEditingCode(e.target.value)}
            className="w-full h-96 bg-surface-base border border-outline-mid rounded-lg p-4 font-mono text-sm text-text-primary resize-none focus:outline-none focus:ring-2 focus:ring-accent-yellow/50 focus:border-accent-yellow/50"
            spellCheck={false}
          />
          <div className="absolute top-2 right-2 text-xs text-text-tertiary">
            {editingCode.split('\n').length} lines
          </div>
        </div>
      </Modal>
    </>
  );
}
