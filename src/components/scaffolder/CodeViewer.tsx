'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { 
  Code, 
  Terminal, 
  CheckCircle, 
  AlertCircle, 
  Loader2, 
  RefreshCw, 
  Settings, 
  Pencil, 
  Copy, 
  Check,
  ChevronDown,
  X
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';

interface CodeChunk {
  id: string;
  component: 'page' | 'form' | 'table' | 'chart' | 'types';
  code: string;
  progress: number;
  timestamp: string;
}

interface GeneratedCode {
  pageComponent: string;
  formComponent?: string;
  tableComponent?: string;
  chartComponent?: string;
  types?: string;
}

interface CodeViewerProps {
  conversationId: string;
  onComplete?: (code: GeneratedCode) => void;
  onError?: (error: string) => void;
  className?: string;
}

type ConnectionStatus = 'connecting' | 'connected' | 'error' | 'complete' | 'reconnecting';
type ActiveTab = 'page' | 'types';
type StreamingMode = 'instant' | 'word' | 'character';

const MAX_RECONNECT_ATTEMPTS = 3;
const RECONNECT_DELAY_MS = 2000;

// Streaming speed constants (ms per unit)
const STREAMING_SPEEDS: Record<StreamingMode, number> = {
  instant: 0,
  word: 15,
  character: 5,
};

// Custom hook for smooth streaming buffer
function useStreamBuffer(mode: StreamingMode) {
  const [displayedCode, setDisplayedCode] = useState<Record<string, string>>({ page: '', types: '' });
  const bufferRef = useRef<Record<string, string>>({ page: '', types: '' });
  const isStreamingRef = useRef(false);
  const animationFrameRef = useRef<number | null>(null);
  const lastUpdateRef = useRef<number>(0);

  const pushToBuffer = useCallback((component: string, code: string) => {
    bufferRef.current[component] = (bufferRef.current[component] || '') + code;
    
    if (mode === 'instant') {
      // Instant mode - update immediately
      setDisplayedCode(prev => ({
        ...prev,
        [component]: bufferRef.current[component],
      }));
    } else if (!isStreamingRef.current) {
      // Start streaming animation
      isStreamingRef.current = true;
      startStreaming();
    }
  }, [mode]);

  const startStreaming = useCallback(() => {
    const speed = STREAMING_SPEEDS[mode];
    
    const animate = (timestamp: number) => {
      if (timestamp - lastUpdateRef.current >= speed) {
        lastUpdateRef.current = timestamp;
        
        let hasMore = false;
        const newDisplayed = { ...displayedCode };
        
        for (const component of Object.keys(bufferRef.current)) {
          const buffered = bufferRef.current[component];
          const displayed = newDisplayed[component] || '';
          
          if (displayed.length < buffered.length) {
            hasMore = true;
            
            if (mode === 'word') {
              // Find next word boundary
              const remaining = buffered.slice(displayed.length);
              const wordMatch = remaining.match(/^\S*\s*/);
              const nextChunk = wordMatch ? wordMatch[0] : remaining.charAt(0);
              newDisplayed[component] = displayed + nextChunk;
            } else {
              // Character by character
              newDisplayed[component] = displayed + buffered.charAt(displayed.length);
            }
          }
        }
        
        setDisplayedCode(newDisplayed);
        
        if (hasMore) {
          animationFrameRef.current = requestAnimationFrame(animate);
        } else {
          isStreamingRef.current = false;
        }
      } else if (isStreamingRef.current) {
        animationFrameRef.current = requestAnimationFrame(animate);
      }
    };
    
    animationFrameRef.current = requestAnimationFrame(animate);
  }, [mode, displayedCode]);

  const flush = useCallback(() => {
    // Immediately display all buffered content
    setDisplayedCode({ ...bufferRef.current });
    isStreamingRef.current = false;
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
  }, []);

  const reset = useCallback(() => {
    bufferRef.current = { page: '', types: '' };
    setDisplayedCode({ page: '', types: '' });
    isStreamingRef.current = false;
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
  }, []);

  const setCode = useCallback((component: string, code: string) => {
    bufferRef.current[component] = code;
    setDisplayedCode(prev => ({ ...prev, [component]: code }));
  }, []);

  useEffect(() => {
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);

  return {
    displayedCode,
    pushToBuffer,
    flush,
    reset,
    setCode,
    isBuffering: isStreamingRef.current,
    bufferedCode: bufferRef.current,
  };
}

// Syntax highlighting with dynamic language detection
function highlightCode(codeString: string, isComplete: boolean): string {
  if (!codeString) return '';
  
  // Escape HTML
  let highlighted = codeString
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
  
  // Only apply full highlighting when complete for performance
  if (isComplete) {
    // Keywords
    highlighted = highlighted.replace(
      /\b(import|export|default|from|const|let|var|function|async|await|return|if|else|try|catch|throw|new|type|interface|extends|implements|class|public|private|protected|static|readonly|as|typeof|instanceof|void|null|undefined|true|false|for|while|do|switch|case|break|continue|yield|in|of)\b/g,
      '<span class="text-purple-400">$1</span>'
    );
    
    // Types
    highlighted = highlighted.replace(
      /\b(string|number|boolean|any|unknown|never|object|Array|Promise|Record|Partial|Required|Omit|Pick|React|ReactNode|FC|JSX)\b/g,
      '<span class="text-yellow-300">$1</span>'
    );
    
    // React hooks and common functions
    highlighted = highlighted.replace(
      /\b(useState|useEffect|useCallback|useMemo|useRef|useContext|useReducer|useLayoutEffect|useImperativeHandle|useDebugValue|useDeferredValue|useTransition|useId|useSyncExternalStore)\b/g,
      '<span class="text-cyan-400">$1</span>'
    );

    // Component names (PascalCase)
    highlighted = highlighted.replace(
      /\b([A-Z][a-zA-Z0-9]*)\b(?=\s*[(\<{])/g,
      '<span class="text-emerald-400">$1</span>'
    );
    
    // Strings (simple approximation)
    highlighted = highlighted.replace(
      /(["'`])(?:(?!\1)[^\\]|\\.)*?\1/g,
      '<span class="text-green-400">$&</span>'
    );
    
    // Comments
    highlighted = highlighted.replace(
      /(\/\/.*$)/gm,
      '<span class="text-text-tertiary italic">$1</span>'
    );
    highlighted = highlighted.replace(
      /(\/\*[\s\S]*?\*\/)/g,
      '<span class="text-text-tertiary italic">$1</span>'
    );
    
    // Numbers
    highlighted = highlighted.replace(
      /\b(\d+(?:\.\d+)?)\b/g,
      '<span class="text-orange-400">$1</span>'
    );

    // JSX tags
    highlighted = highlighted.replace(
      /(&lt;\/?)([a-z][a-zA-Z0-9]*)/g,
      '$1<span class="text-pastel-blue">$2</span>'
    );
    
    // Decorators / attributes
    highlighted = highlighted.replace(
      /(@\w+)/g,
      '<span class="text-accent-yellow">$1</span>'
    );
  } else {
    // Minimal highlighting during streaming for performance
    highlighted = highlighted.replace(
      /\b(import|export|const|let|function|return|async|await)\b/g,
      '<span class="text-purple-400">$1</span>'
    );
  }
  
  return highlighted;
}

// Generate line numbers
function getLineNumbers(code: string): number[] {
  if (!code) return [1];
  const lines = code.split('\n');
  return Array.from({ length: lines.length }, (_, i) => i + 1);
}

export function CodeViewer({ conversationId, onComplete, onError, className }: CodeViewerProps) {
  const [status, setStatus] = useState<ConnectionStatus>('connecting');
  const [progress, setProgress] = useState(0);
  const [activeTab, setActiveTab] = useState<ActiveTab>('page');
  const [error, setError] = useState<string | null>(null);
  const [reconnectAttempt, setReconnectAttempt] = useState(0);
  const [streamingMode, setStreamingMode] = useState<StreamingMode>('word');
  const [showSettings, setShowSettings] = useState(false);
  const [copied, setCopied] = useState(false);
  
  // Manual edit state
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingCode, setEditingCode] = useState('');
  
  const codeContainerRef = useRef<HTMLDivElement>(null);
  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lineNumbersRef = useRef<HTMLDivElement>(null);

  // Use the stream buffer hook
  const { displayedCode, pushToBuffer, flush, reset, setCode, bufferedCode } = useStreamBuffer(streamingMode);

  // Refs to access latest state/props inside useEffect without re-triggering
  const onCompleteRef = useRef(onComplete);
  useEffect(() => { onCompleteRef.current = onComplete; }, [onComplete]);

  const onErrorRef = useRef(onError);
  useEffect(() => { onErrorRef.current = onError; }, [onError]);

  const statusRef = useRef(status);
  useEffect(() => { statusRef.current = status; }, [status]);

  const reconnectAttemptRef = useRef(reconnectAttempt);
  useEffect(() => { reconnectAttemptRef.current = reconnectAttempt; }, [reconnectAttempt]);

  // Line numbers for current tab
  const lineNumbers = useMemo(() => getLineNumbers(displayedCode[activeTab]), [displayedCode, activeTab]);

  // Cleanup function for event source
  const cleanupEventSource = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
  }, []);

  // Handle reconnection with exponential backoff
  const handleReconnect = useCallback(() => {
    const currentAttempt = reconnectAttemptRef.current;
    
    if (currentAttempt >= MAX_RECONNECT_ATTEMPTS) {
      console.log('📡 CodeViewer: Max reconnect attempts reached');
      setStatus('error');
      setError('Connection lost. Code generation may still be in progress. Try refreshing.');
      return;
    }

    const delay = RECONNECT_DELAY_MS * Math.pow(2, currentAttempt);
    console.log(`📡 CodeViewer: Scheduling reconnect in ${delay}ms (attempt ${currentAttempt + 1}/${MAX_RECONNECT_ATTEMPTS})`);
    
    setStatus('reconnecting');
    setReconnectAttempt(prev => prev + 1);

    cleanupEventSource();
    
    reconnectTimeoutRef.current = setTimeout(() => {
      connectToStream();
    }, delay);
  }, [cleanupEventSource]);

  // Connect to the code stream
  const connectToStream = useCallback(() => {
    if (!conversationId) return;

    cleanupEventSource();

    console.log(`📡 CodeViewer: Connecting to code stream ${conversationId} (attempt ${reconnectAttemptRef.current + 1})`);
    setStatus(reconnectAttemptRef.current > 0 ? 'reconnecting' : 'connecting');
    setError(null);

    const eventSource = new EventSource(`/api/scaffolder/code-stream/${conversationId}`);
    eventSourceRef.current = eventSource;

    // Set a connection timeout
    const connectionTimeout = setTimeout(() => {
      if (statusRef.current === 'connecting' || statusRef.current === 'reconnecting') {
        console.log('📡 CodeViewer: Connection timeout, attempting reconnect...');
        handleReconnect();
      }
    }, 10000);

    eventSource.onmessage = (event) => {
      clearTimeout(connectionTimeout);
      try {
        const data = JSON.parse(event.data);

        if (data.type === 'connected') {
          console.log('📡 CodeViewer: Connected to code stream');
          setStatus('connected');
          setReconnectAttempt(0);
          return;
        }

        if (data.type === 'complete') {
          console.log('📡 CodeViewer: Code generation complete');
          setStatus('complete');
          setProgress(100);
          
          // Flush any remaining buffered content
          flush();
          
          // Build final GeneratedCode object
          const generatedCode: GeneratedCode = {
            pageComponent: data.code || bufferedCode.page,
            types: bufferedCode.types || undefined,
          };
          
          onCompleteRef.current?.(generatedCode);
          eventSource.close();
          return;
        }

        if (data.type === 'error') {
          console.error('📡 CodeViewer: Error received:', data.error);
          setStatus('error');
          setError(data.error);
          onErrorRef.current?.(data.error);
          eventSource.close();
          return;
        }

        // Handle code chunks
        if (data.component && data.code) {
          pushToBuffer(data.component, data.code);
          setProgress(data.progress || 0);
        }
      } catch (err) {
        console.error('📡 CodeViewer: Failed to parse message:', err);
      }
    };

    eventSource.onerror = (err) => {
      clearTimeout(connectionTimeout);
      console.error('📡 CodeViewer: Connection error:', err);
      
      if (statusRef.current !== 'complete') {
        handleReconnect();
      }
    };

    return () => {
      clearTimeout(connectionTimeout);
    };
  }, [conversationId, cleanupEventSource, handleReconnect, pushToBuffer, flush, bufferedCode]);

  // Manual retry handler
  const handleManualRetry = useCallback(() => {
    setReconnectAttempt(0);
    setError(null);
    reset();
    connectToStream();
  }, [connectToStream, reset]);

  useEffect(() => {
    connectToStream();
    return cleanupEventSource;
  }, [conversationId, connectToStream, cleanupEventSource]);

  // Auto-scroll to bottom with smooth animation
  useEffect(() => {
    if (codeContainerRef.current && status === 'connected') {
      const container = codeContainerRef.current;
      container.scrollTo({
        top: container.scrollHeight,
        behavior: 'smooth',
      });
    }
  }, [displayedCode, status]);

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
      await navigator.clipboard.writeText(displayedCode[activeTab]);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy code:', err);
    }
  };

  // Open edit modal
  const handleOpenEdit = () => {
    setEditingCode(displayedCode[activeTab]);
    setIsEditModalOpen(true);
  };

  // Save edited code
  const handleSaveEdit = () => {
    setCode(activeTab, editingCode);
    setIsEditModalOpen(false);
    
    // If complete, also update the onComplete callback with new code
    if (status === 'complete') {
      const generatedCode: GeneratedCode = {
        pageComponent: activeTab === 'page' ? editingCode : displayedCode.page,
        types: activeTab === 'types' ? editingCode : displayedCode.types || undefined,
      };
      onCompleteRef.current?.(generatedCode);
    }
  };

  const tabs = [
    { id: 'page' as ActiveTab, label: 'Page.tsx', hasContent: !!displayedCode.page },
    { id: 'types' as ActiveTab, label: 'types.ts', hasContent: !!displayedCode.types },
  ];

  const currentCode = displayedCode[activeTab] || '';
  const isComplete = status === 'complete';
  const highlightedCode = useMemo(() => highlightCode(currentCode, isComplete), [currentCode, isComplete]);

  return (
    <>
      <div className={cn(
        'bg-surface-base border border-outline-mid rounded-xl overflow-hidden shadow-2xl',
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
            {/* Status indicator */}
            {status === 'connecting' && (
              <span className="flex items-center gap-1.5 text-xs text-text-secondary bg-surface-elevated/50 px-2 py-1 rounded-md">
                <Loader2 className="w-3 h-3 animate-spin" />
                Connecting...
              </span>
            )}
            {status === 'reconnecting' && (
              <span className="flex items-center gap-1.5 text-xs text-yellow-400 bg-yellow-500/10 px-2 py-1 rounded-md">
                <RefreshCw className="w-3 h-3 animate-spin" />
                Reconnecting ({reconnectAttempt}/{MAX_RECONNECT_ATTEMPTS})
              </span>
            )}
            {status === 'connected' && (
              <span className="flex items-center gap-1.5 text-xs text-accent-yellow bg-accent-yellow/10 px-2 py-1 rounded-md">
                <Terminal className="w-3 h-3" />
                Generating {Math.round(progress)}%
              </span>
            )}
            {status === 'complete' && (
              <span className="flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded-md">
                <CheckCircle className="w-3 h-3" />
                Complete
              </span>
            )}
            {status === 'error' && (
              <button 
                onClick={handleManualRetry}
                className="flex items-center gap-1.5 text-xs text-red-400 bg-red-500/10 px-2 py-1 rounded-md hover:bg-red-500/20 transition-colors"
              >
                <AlertCircle className="w-3 h-3" />
                Error - Retry
              </button>
            )}

            <div className="h-4 w-px bg-outline-light" />

            {/* Action buttons */}
            <button
              onClick={handleCopy}
              disabled={!currentCode}
              className="p-1.5 text-text-secondary hover:text-text-primary hover:bg-surface-elevated rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              title="Copy code"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
            </button>

            <button
              onClick={handleOpenEdit}
              disabled={!currentCode}
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
          </div>
        </div>

        {/* Progress Bar */}
        {status !== 'complete' && status !== 'error' && (
          <div className="h-0.5 bg-surface-layer">
            <div 
              className={cn(
                "h-full transition-all duration-500 ease-out",
                status === 'reconnecting' 
                  ? "bg-gradient-to-r from-yellow-500 to-orange-500 animate-pulse" 
                  : "bg-gradient-to-r from-accent-yellow via-pastel-yellow to-accent-yellow bg-[length:200%_100%] animate-[gradient_2s_linear_infinite]"
              )}
              style={{ width: status === 'reconnecting' ? '100%' : `${progress}%` }}
            />
          </div>
        )}

        {/* File Tabs */}
        <div className="flex items-center gap-1 px-2 py-1 bg-surface-layer/50 border-b border-outline-mid/50">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                'flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded-md transition-all',
                activeTab === tab.id
                  ? 'bg-surface-elevated text-text-primary shadow-sm'
                  : 'text-text-tertiary hover:text-text-secondary hover:bg-surface-elevated/50'
              )}
            >
              <Code className="w-3 h-3" />
              {tab.label}
              {tab.hasContent && activeTab !== tab.id && (
                <span className="w-1.5 h-1.5 bg-pastel-green rounded-full" />
              )}
            </button>
          ))}
        </div>

        {/* Code Display with Line Numbers */}
        <div className="flex h-96 overflow-hidden bg-surface-base">
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
              <div className="flex flex-col items-center justify-center h-full text-red-400 p-8">
                <AlertCircle className="w-10 h-10 mb-4 opacity-60" />
                <p className="font-medium mb-2">Code Generation Error</p>
                <p className="text-sm text-center max-w-md text-text-tertiary mb-4">{error}</p>
                <button
                  onClick={handleManualRetry}
                  className="flex items-center gap-2 px-4 py-2 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 rounded-lg text-sm transition-colors"
                >
                  <RefreshCw className="w-4 h-4" />
                  Try Again
                </button>
              </div>
            ) : currentCode ? (
              <pre className="p-4 font-mono text-sm leading-5">
                <code
                  dangerouslySetInnerHTML={{ __html: highlightedCode }}
                  className="text-text-primary"
                />
                {/* Blinking cursor during streaming */}
                {status === 'connected' && (
                  <span className="inline-block w-2 h-4 bg-accent-yellow animate-pulse ml-0.5 align-middle" />
                )}
              </pre>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-text-tertiary p-8">
                <Loader2 className="w-8 h-8 animate-spin mb-4 opacity-40" />
                <p className="text-sm">Waiting for code generation...</p>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-4 py-2 border-t border-outline-mid/50 bg-surface-layer/30 text-xs text-text-tertiary">
          <div className="flex items-center gap-4">
            {currentCode && (
              <>
                <span>{currentCode.split('\n').length} lines</span>
                <span>{(currentCode.length / 1024).toFixed(1)} KB</span>
              </>
            )}
          </div>
          <div className="flex items-center gap-2">
            <span className="text-text-tertiary">Mode:</span>
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

export default CodeViewer;
