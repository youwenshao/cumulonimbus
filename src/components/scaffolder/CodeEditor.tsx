'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { 
  Code, 
  Terminal, 
  CheckCircle, 
  AlertCircle, 
  Loader2, 
  RefreshCw, 
  Pencil, 
  Copy, 
  Check,
  ChevronDown,
  ChevronRight,
  X,
  Download,
  Maximize2,
  Minimize2,
  Eye,
  EyeOff,
  FileCode,
  Folder,
  Save,
  RotateCcw,
  Search,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/Button';

// File structure for generated code
interface CodeFile {
  name: string;
  path: string;
  code: string;
  language: string;
}

interface CodeEditorProps {
  /** Conversation ID for streaming connection */
  conversationId: string;
  /** Use V2 API endpoint */
  useV2?: boolean;
  /** Initial files to display (for non-streaming mode) */
  initialFiles?: CodeFile[];
  /** Callback when code generation completes */
  onComplete?: (files: CodeFile[]) => void;
  /** Callback when code is edited */
  onCodeChange?: (path: string, code: string) => void;
  /** Callback when error occurs */
  onError?: (error: string) => void;
  /** Whether to show split view with preview */
  showPreview?: boolean;
  /** Custom class name */
  className?: string;
  /** Height constraint */
  height?: string;
  /** Whether to allow editing */
  editable?: boolean;
}

type ConnectionStatus = 'connecting' | 'connected' | 'error' | 'complete' | 'reconnecting';
type StreamingMode = 'instant' | 'word' | 'character';

const MAX_RECONNECT_ATTEMPTS = 3;
const RECONNECT_DELAY_MS = 2000;

// Streaming speed constants
const STREAMING_SPEEDS: Record<StreamingMode, number> = {
  instant: 0,
  word: 12,
  character: 4,
};

// Syntax highlighting with theme-aware colors
function highlightCode(codeString: string, isComplete: boolean): string {
  if (!codeString) return '';
  
  // Escape HTML
  let highlighted = codeString
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
  
  // Apply highlighting (more thorough when complete for performance)
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
    
    // React hooks
    highlighted = highlighted.replace(
      /\b(useState|useEffect|useCallback|useMemo|useRef|useContext|useReducer|useLayoutEffect)\b/g,
      '<span class="text-cyan-400">$1</span>'
    );

    // Component names (PascalCase)
    highlighted = highlighted.replace(
      /\b([A-Z][a-zA-Z0-9]*)\b(?=\s*[(\<{])/g,
      '<span class="text-emerald-400">$1</span>'
    );
    
    // Strings
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
    
    // Decorators
    highlighted = highlighted.replace(
      /(@\w+)/g,
      '<span class="text-accent-yellow">$1</span>'
    );
  } else {
    // Minimal highlighting during streaming
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
  return Array.from({ length: code.split('\n').length }, (_, i) => i + 1);
}

// File tree node component with polished styling
function FileTreeNode({ 
  file, 
  isSelected, 
  onClick 
}: { 
  file: CodeFile; 
  isSelected: boolean; 
  onClick: () => void;
}) {
  const getFileIcon = (name: string) => {
    if (name.endsWith('.tsx')) {
      return <FileCode className="w-4 h-4 text-pastel-blue" />;
    }
    if (name.endsWith('.ts')) {
      return <FileCode className="w-4 h-4 text-blue-400" />;
    }
    return <FileCode className="w-4 h-4 text-text-tertiary" />;
  };

  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full flex items-center gap-2 px-3 py-2 text-left text-sm transition-all duration-200 rounded-lg group',
        isSelected
          ? 'bg-accent-yellow/15 text-accent-yellow border border-accent-yellow/20 shadow-sm'
          : 'text-text-secondary hover:text-text-primary hover:bg-surface-elevated/70 border border-transparent'
      )}
    >
      <span className={cn(
        'transition-transform duration-200',
        isSelected ? 'scale-110' : 'group-hover:scale-105'
      )}>
        {getFileIcon(file.name)}
      </span>
      <span className="truncate font-mono text-xs">{file.name}</span>
    </button>
  );
}

export function CodeEditor({
  conversationId,
  useV2 = true,
  initialFiles = [],
  onComplete,
  onCodeChange,
  onError,
  showPreview = false,
  className,
  height = 'h-[500px]',
  editable = true,
}: CodeEditorProps) {
  // Connection state
  const [status, setStatus] = useState<ConnectionStatus>('connecting');
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [reconnectAttempt, setReconnectAttempt] = useState(0);

  // Files state
  const [files, setFiles] = useState<CodeFile[]>(initialFiles);
  const [selectedFilePath, setSelectedFilePath] = useState<string | null>(
    initialFiles.length > 0 ? initialFiles[0].path : null
  );
  
  // Editing state
  const [isEditing, setIsEditing] = useState(false);
  const [editedCode, setEditedCode] = useState('');
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  
  // UI state
  const [streamingMode, setStreamingMode] = useState<StreamingMode>('word');
  const [copied, setCopied] = useState(false);
  const [showFileTree, setShowFileTree] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<number[]>([]);
  const [currentSearchIndex, setCurrentSearchIndex] = useState(0);
  
  // Streaming buffer state
  const [displayedCode, setDisplayedCode] = useState<Record<string, string>>({});
  const bufferRef = useRef<Record<string, string>>({});
  const isStreamingRef = useRef(false);
  const animationFrameRef = useRef<number | null>(null);
  const lastUpdateRef = useRef<number>(0);
  
  // Refs
  const codeContainerRef = useRef<HTMLDivElement>(null);
  const lineNumbersRef = useRef<HTMLDivElement>(null);
  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const editorRef = useRef<HTMLTextAreaElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Get current selected file
  const selectedFile = useMemo(() => {
    return files.find(f => f.path === selectedFilePath) || null;
  }, [files, selectedFilePath]);

  // Get current code (displayed or edited)
  const currentCode = useMemo(() => {
    if (isEditing && selectedFilePath) {
      return editedCode;
    }
    return selectedFilePath ? (displayedCode[selectedFilePath] || '') : '';
  }, [isEditing, editedCode, displayedCode, selectedFilePath]);

  // Line numbers for current file
  const lineNumbers = useMemo(() => getLineNumbers(currentCode), [currentCode]);

  // Highlighted code
  const highlightedCode = useMemo(
    () => highlightCode(currentCode, status === 'complete'),
    [currentCode, status]
  );

  // Push code to streaming buffer
  const pushToBuffer = useCallback((path: string, code: string) => {
    bufferRef.current[path] = (bufferRef.current[path] || '') + code;
    
    if (streamingMode === 'instant') {
      setDisplayedCode(prev => ({
        ...prev,
        [path]: bufferRef.current[path],
      }));
    } else if (!isStreamingRef.current) {
      isStreamingRef.current = true;
      startStreaming();
    }
  }, [streamingMode]);

  // Start streaming animation
  const startStreaming = useCallback(() => {
    const speed = STREAMING_SPEEDS[streamingMode];
    
    const animate = (timestamp: number) => {
      if (timestamp - lastUpdateRef.current >= speed) {
        lastUpdateRef.current = timestamp;
        
        let hasMore = false;
        const newDisplayed: Record<string, string> = { ...displayedCode };
        
        for (const path of Object.keys(bufferRef.current)) {
          const buffered = bufferRef.current[path];
          const displayed = newDisplayed[path] || '';
          
          if (displayed.length < buffered.length) {
            hasMore = true;
            
            if (streamingMode === 'word') {
              const remaining = buffered.slice(displayed.length);
              const wordMatch = remaining.match(/^\S*\s*/);
              const nextChunk = wordMatch ? wordMatch[0] : remaining.charAt(0);
              newDisplayed[path] = displayed + nextChunk;
            } else {
              newDisplayed[path] = displayed + buffered.charAt(displayed.length);
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
  }, [streamingMode, displayedCode]);

  // Flush all buffered content
  const flush = useCallback(() => {
    setDisplayedCode({ ...bufferRef.current });
    isStreamingRef.current = false;
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
  }, []);

  // Reset buffer
  const reset = useCallback(() => {
    bufferRef.current = {};
    setDisplayedCode({});
    setFiles([]);
    isStreamingRef.current = false;
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
  }, []);

  // Cleanup event source
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

  // Handle reconnection
  const handleReconnect = useCallback(() => {
    if (reconnectAttempt >= MAX_RECONNECT_ATTEMPTS) {
      setStatus('error');
      setError('Connection lost. Code generation may still be in progress.');
      return;
    }

    const delay = RECONNECT_DELAY_MS * Math.pow(2, reconnectAttempt);
    setStatus('reconnecting');
    setReconnectAttempt(prev => prev + 1);
    cleanupEventSource();
    
    reconnectTimeoutRef.current = setTimeout(() => {
      connectToStream();
    }, delay);
  }, [reconnectAttempt, cleanupEventSource]);

  // Connect to stream
  const connectToStream = useCallback(() => {
    if (!conversationId) return;

    cleanupEventSource();

    const endpoint = useV2
      ? `/api/scaffolder-v2/code-stream/${conversationId}`
      : `/api/scaffolder/code-stream/${conversationId}`;

    console.log(`📡 CodeEditor: Connecting to ${endpoint}`);
    setStatus(reconnectAttempt > 0 ? 'reconnecting' : 'connecting');
    setError(null);

    const eventSource = new EventSource(endpoint);
    eventSourceRef.current = eventSource;

    const connectionTimeout = setTimeout(() => {
      if (status === 'connecting' || status === 'reconnecting') {
        handleReconnect();
      }
    }, 10000);

    eventSource.onmessage = (event) => {
      clearTimeout(connectionTimeout);
      try {
        const data = JSON.parse(event.data);

        if (data.type === 'connected') {
          console.log('📡 CodeEditor: Connected');
          setStatus('connected');
          setReconnectAttempt(0);
          return;
        }

        if (data.type === 'complete') {
          console.log('📡 CodeEditor: Complete');
          setStatus('complete');
          setProgress(100);
          flush();
          
          // Build final files array
          const finalFiles: CodeFile[] = Object.entries(bufferRef.current).map(([path, code]) => ({
            name: path.split('/').pop() || path,
            path,
            code,
            language: path.endsWith('.ts') || path.endsWith('.tsx') ? 'typescript' : 'javascript',
          }));
          
          setFiles(finalFiles);
          if (finalFiles.length > 0 && !selectedFilePath) {
            setSelectedFilePath(finalFiles[0].path);
          }
          
          onComplete?.(finalFiles);
          eventSource.close();
          return;
        }

        if (data.type === 'error') {
          setStatus('error');
          setError(data.error);
          onError?.(data.error);
          eventSource.close();
          return;
        }

        if (data.type === 'status') {
          setProgress(data.progress || 0);
          return;
        }

        // Handle code chunks
        if (data.component && data.code) {
          const path = data.metadata?.fileName || data.component;
          pushToBuffer(path, data.code);
          setProgress(data.progress || 0);
          
          // Update files list
          setFiles(prev => {
            const existing = prev.find(f => f.path === path);
            if (!existing) {
              const newFile: CodeFile = {
                name: path.split('/').pop() || path,
                path,
                code: '',
                language: 'typescript',
              };
              return [...prev, newFile];
            }
            return prev;
          });
          
          // Auto-select first file
          if (!selectedFilePath) {
            setSelectedFilePath(path);
          }
        }
      } catch (err) {
        console.error('📡 CodeEditor: Parse error:', err);
      }
    };

    eventSource.onerror = () => {
      clearTimeout(connectionTimeout);
      if (status !== 'complete') {
        handleReconnect();
      }
    };

    return () => clearTimeout(connectionTimeout);
  }, [conversationId, useV2, cleanupEventSource, handleReconnect, pushToBuffer, flush, onComplete, onError, selectedFilePath, status, reconnectAttempt]);

  // Manual retry
  const handleManualRetry = useCallback(() => {
    setReconnectAttempt(0);
    setError(null);
    reset();
    connectToStream();
  }, [connectToStream, reset]);

  // Connect on mount
  useEffect(() => {
    if (initialFiles.length > 0) {
      // Non-streaming mode: use provided files
      setStatus('complete');
      setProgress(100);
      const codeMap: Record<string, string> = {};
      initialFiles.forEach(f => {
        codeMap[f.path] = f.code;
      });
      bufferRef.current = codeMap;
      setDisplayedCode(codeMap);
      setFiles(initialFiles);
      if (initialFiles.length > 0) {
        setSelectedFilePath(initialFiles[0].path);
      }
    } else {
      // Streaming mode: connect to SSE
      connectToStream();
    }
    return cleanupEventSource;
  }, [conversationId, initialFiles.length]);

  // Cleanup animation on unmount
  useEffect(() => {
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);

  // Auto-scroll during streaming
  useEffect(() => {
    if (codeContainerRef.current && status === 'connected') {
      codeContainerRef.current.scrollTo({
        top: codeContainerRef.current.scrollHeight,
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

  // Search functionality
  useEffect(() => {
    if (!searchQuery || !currentCode) {
      setSearchResults([]);
      return;
    }
    
    const lines = currentCode.split('\n');
    const matches: number[] = [];
    const queryLower = searchQuery.toLowerCase();
    
    lines.forEach((line, index) => {
      if (line.toLowerCase().includes(queryLower)) {
        matches.push(index + 1);
      }
    });
    
    setSearchResults(matches);
    setCurrentSearchIndex(0);
  }, [searchQuery, currentCode]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Only handle if editor is focused or in edit mode
      const isEditorFocused = containerRef.current?.contains(document.activeElement);
      if (!isEditorFocused) return;

      const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
      const modifier = isMac ? e.metaKey : e.ctrlKey;

      // Cmd/Ctrl + S: Save changes
      if (modifier && e.key === 's') {
        e.preventDefault();
        if (isEditing && hasUnsavedChanges) {
          handleSaveEdit();
        }
      }

      // Cmd/Ctrl + C: Copy code (when not in textarea)
      if (modifier && e.key === 'c' && !isEditing && currentCode) {
        // Let default copy work in textarea
        if (!(e.target instanceof HTMLTextAreaElement)) {
          handleCopy();
        }
      }

      // Cmd/Ctrl + E: Toggle edit mode
      if (modifier && e.key === 'e') {
        e.preventDefault();
        if (editable && status === 'complete' && currentCode) {
          if (isEditing) {
            handleCancelEdit();
          } else {
            handleStartEdit();
          }
        }
      }

      // Cmd/Ctrl + D: Download files
      if (modifier && e.key === 'd') {
        e.preventDefault();
        if (files.length > 0) {
          handleDownload();
        }
      }

      // Cmd/Ctrl + F: Search
      if (modifier && e.key === 'f') {
        e.preventDefault();
        setShowSearch(prev => !prev);
        if (!showSearch) {
          // Focus search input after state update
          setTimeout(() => {
            const searchInput = document.getElementById('code-search-input');
            searchInput?.focus();
          }, 0);
        }
      }

      // Escape: Close search, cancel edit, or exit fullscreen
      if (e.key === 'Escape') {
        if (showSearch) {
          setShowSearch(false);
          setSearchQuery('');
        } else if (isEditing) {
          handleCancelEdit();
        } else if (isFullscreen) {
          setIsFullscreen(false);
        }
      }

      // F11: Toggle fullscreen
      if (e.key === 'F11') {
        e.preventDefault();
        setIsFullscreen(!isFullscreen);
      }

      // Cmd/Ctrl + B: Toggle file tree
      if (modifier && e.key === 'b') {
        e.preventDefault();
        setShowFileTree(!showFileTree);
      }

      // Enter in search: Go to next result
      if (e.key === 'Enter' && showSearch && searchResults.length > 0) {
        e.preventDefault();
        setCurrentSearchIndex(prev => (prev + 1) % searchResults.length);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isEditing, hasUnsavedChanges, currentCode, editable, status, files, isFullscreen, showFileTree, showSearch, searchResults]);

  // Copy to clipboard
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(currentCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  // Start editing
  const handleStartEdit = () => {
    if (!editable || !selectedFile) return;
    setEditedCode(displayedCode[selectedFilePath!] || '');
    setIsEditing(true);
    setTimeout(() => editorRef.current?.focus(), 0);
  };

  // Save edits
  const handleSaveEdit = () => {
    if (!selectedFilePath) return;
    
    // Update buffer and displayed code
    bufferRef.current[selectedFilePath] = editedCode;
    setDisplayedCode(prev => ({
      ...prev,
      [selectedFilePath]: editedCode,
    }));
    
    // Update files
    setFiles(prev => prev.map(f => 
      f.path === selectedFilePath ? { ...f, code: editedCode } : f
    ));
    
    onCodeChange?.(selectedFilePath, editedCode);
    setIsEditing(false);
    setHasUnsavedChanges(false);
  };

  // Cancel editing
  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditedCode('');
    setHasUnsavedChanges(false);
  };

  // Revert changes
  const handleRevert = () => {
    if (!selectedFilePath) return;
    const original = displayedCode[selectedFilePath] || '';
    setEditedCode(original);
    setHasUnsavedChanges(false);
  };

  // Download all files (combined into single file with separators)
  const handleDownload = useCallback(() => {
    const entries = Object.entries(bufferRef.current);
    if (entries.length === 0) return;

    // Create a nicely formatted combined file
    const header = `/**
 * Generated App Code
 * Created: ${new Date().toISOString()}
 * Files: ${entries.length}
 */

`;

    const allCode = header + entries
      .map(([path, code]) => {
        const extension = path.split('.').pop() || 'ts';
        const separator = '='.repeat(60);
        return `// ${separator}\n// File: ${path}\n// ${separator}\n\n${code}`;
      })
      .join('\n\n');
    
    const blob = new Blob([allCode], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `generated-code-${Date.now()}.tsx`;
    a.click();
    URL.revokeObjectURL(url);
  }, []);

  // Download single file
  const handleDownloadCurrentFile = useCallback(() => {
    if (!selectedFilePath || !currentCode) return;
    
    const blob = new Blob([currentCode], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = selectedFilePath.split('/').pop() || 'code.tsx';
    a.click();
    URL.revokeObjectURL(url);
  }, [selectedFilePath, currentCode]);

  return (
    <div 
      ref={containerRef}
      tabIndex={0}
      className={cn(
        'bg-surface-base border border-outline-mid rounded-xl overflow-hidden shadow-xl flex flex-col transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-accent-yellow/30',
        isFullscreen && 'fixed inset-4 z-50 shadow-2xl',
        className
      )}
    >
      {/* Header - Glass morphism style */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-outline-mid/80 bg-surface-layer/90 backdrop-blur-md">
        <div className="flex items-center gap-3">
          {/* Window controls with hover effects */}
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-full bg-red-500/80 hover:bg-red-500 transition-colors cursor-default" />
            <div className="w-3 h-3 rounded-full bg-yellow-500/80 hover:bg-yellow-500 transition-colors cursor-default" />
            <div className="w-3 h-3 rounded-full bg-green-500/80 hover:bg-green-500 transition-colors cursor-default" />
          </div>
          <div className="h-4 w-px bg-outline-light/50" />
          <Code className="w-4 h-4 text-accent-yellow" />
          <span className="font-medium text-sm text-text-primary font-serif">Generated Code</span>
          
          {/* File count badge with animation */}
          {files.length > 0 && (
            <span className="px-2 py-0.5 text-xs bg-accent-yellow/10 text-accent-yellow rounded-full border border-accent-yellow/20 animate-fade-in">
              {files.length} files
            </span>
          )}
        </div>
        
        <div className="flex items-center gap-2">
          {/* Status indicator with enhanced styling */}
          {status === 'connecting' && (
            <span className="flex items-center gap-1.5 text-xs text-text-secondary bg-surface-elevated/50 px-2.5 py-1 rounded-full border border-outline-light/50 animate-fade-in">
              <Loader2 className="w-3 h-3 animate-spin" />
              Connecting...
            </span>
          )}
          {status === 'reconnecting' && (
            <span className="flex items-center gap-1.5 text-xs text-pastel-yellow bg-pastel-yellow/10 px-2.5 py-1 rounded-full border border-pastel-yellow/20 animate-pulse">
              <RefreshCw className="w-3 h-3 animate-spin" />
              Reconnecting...
            </span>
          )}
          {status === 'connected' && (
            <span className="flex items-center gap-1.5 text-xs text-accent-yellow bg-accent-yellow/10 px-2.5 py-1 rounded-full border border-accent-yellow/20">
              <Terminal className="w-3 h-3 animate-pulse" />
              Generating {Math.round(progress)}%
            </span>
          )}
          {status === 'complete' && (
            <span className="flex items-center gap-1.5 text-xs text-pastel-green bg-pastel-green/10 px-2.5 py-1 rounded-full border border-pastel-green/20 animate-fade-in">
              <CheckCircle className="w-3 h-3" />
              Complete
            </span>
          )}
          {status === 'error' && (
            <button 
              onClick={handleManualRetry}
              className="flex items-center gap-1.5 text-xs text-red-400 bg-red-500/10 px-2.5 py-1 rounded-full border border-red-500/20 hover:bg-red-500/20 transition-colors"
            >
              <AlertCircle className="w-3 h-3" />
              Error - Retry
            </button>
          )}

          <div className="h-4 w-px bg-outline-light/50" />

          {/* Action buttons with improved hover states and keyboard hints */}
          <div className="flex items-center gap-1">
            <button
              onClick={() => setShowFileTree(!showFileTree)}
              className={cn(
                'p-1.5 rounded-lg transition-all duration-200',
                showFileTree 
                  ? 'text-accent-yellow bg-accent-yellow/15 shadow-sm' 
                  : 'text-text-secondary hover:text-text-primary hover:bg-surface-elevated'
              )}
              title="Toggle file tree (⌘B)"
            >
              <Folder className="w-4 h-4" />
            </button>

            <button
              onClick={() => setShowSearch(!showSearch)}
              className={cn(
                'p-1.5 rounded-lg transition-all duration-200',
                showSearch 
                  ? 'text-accent-yellow bg-accent-yellow/15 shadow-sm' 
                  : 'text-text-secondary hover:text-text-primary hover:bg-surface-elevated'
              )}
              title="Search (⌘F)"
            >
              <Search className="w-4 h-4" />
            </button>

            <button
              onClick={handleCopy}
              disabled={!currentCode}
              className="p-1.5 text-text-secondary hover:text-text-primary hover:bg-surface-elevated rounded-lg transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed"
              title="Copy code (⌘C)"
            >
              {copied ? <Check className="w-4 h-4 text-pastel-green" /> : <Copy className="w-4 h-4" />}
            </button>

            {editable && !isEditing && (
              <button
                onClick={handleStartEdit}
                disabled={!currentCode || status !== 'complete'}
                className="p-1.5 text-text-secondary hover:text-text-primary hover:bg-surface-elevated rounded-lg transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed"
                title="Edit code (⌘E)"
              >
                <Pencil className="w-4 h-4" />
              </button>
            )}

            <button
              onClick={handleDownload}
              disabled={files.length === 0}
              className="p-1.5 text-text-secondary hover:text-text-primary hover:bg-surface-elevated rounded-lg transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed"
              title="Download all files (⌘D)"
            >
              <Download className="w-4 h-4" />
            </button>

            <button
              onClick={() => setIsFullscreen(!isFullscreen)}
              className="p-1.5 text-text-secondary hover:text-text-primary hover:bg-surface-elevated rounded-lg transition-all duration-200"
              title={isFullscreen ? 'Exit fullscreen (Esc)' : 'Fullscreen (F11)'}
            >
              {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </div>

      {/* Progress Bar - Atmospheric gradient */}
      {status !== 'complete' && status !== 'error' && (
        <div className="h-1 bg-surface-layer/50 relative overflow-hidden">
          <div 
            className={cn(
              'h-full transition-all duration-500 ease-out relative',
              status === 'reconnecting' 
                ? 'bg-gradient-to-r from-pastel-yellow via-orange-400 to-pastel-yellow animate-pulse' 
                : 'bg-gradient-to-r from-accent-yellow via-pastel-yellow to-accent-yellow'
            )}
            style={{ width: status === 'reconnecting' ? '100%' : `${progress}%` }}
          >
            {/* Shimmer effect */}
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-[shimmer_2s_infinite]" />
          </div>
        </div>
      )}

      {/* Search Bar */}
      {showSearch && (
        <div className="flex items-center gap-2 px-4 py-2 border-b border-outline-mid/50 bg-surface-layer/50 animate-slide-down">
          <input
            id="code-search-input"
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search in code..."
            className="flex-1 bg-surface-elevated border border-outline-light/50 rounded-md px-3 py-1.5 text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-1 focus:ring-accent-yellow/50 focus:border-accent-yellow/50"
          />
          {searchResults.length > 0 && (
            <span className="text-xs text-text-secondary">
              {currentSearchIndex + 1} of {searchResults.length}
            </span>
          )}
          {searchQuery && searchResults.length === 0 && (
            <span className="text-xs text-text-tertiary">No results</span>
          )}
          <button
            onClick={() => setCurrentSearchIndex(prev => (prev - 1 + searchResults.length) % searchResults.length)}
            disabled={searchResults.length === 0}
            className="p-1 text-text-secondary hover:text-text-primary disabled:opacity-40"
          >
            <ChevronDown className="w-4 h-4 rotate-180" />
          </button>
          <button
            onClick={() => setCurrentSearchIndex(prev => (prev + 1) % searchResults.length)}
            disabled={searchResults.length === 0}
            className="p-1 text-text-secondary hover:text-text-primary disabled:opacity-40"
          >
            <ChevronDown className="w-4 h-4" />
          </button>
          <button
            onClick={() => {
              setShowSearch(false);
              setSearchQuery('');
            }}
            className="p-1 text-text-secondary hover:text-text-primary"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Main content */}
      <div className={cn('flex flex-1 overflow-hidden', height)}>
        {/* File tree sidebar - Atmospheric styling */}
        {showFileTree && files.length > 0 && (
          <div className="w-52 border-r border-outline-mid/50 bg-surface-layer/40 backdrop-blur-sm overflow-y-auto flex-shrink-0 transition-all duration-300">
            <div className="p-3 border-b border-outline-light/30">
              <div className="flex items-center gap-2 text-text-tertiary">
                <Folder className="w-4 h-4" />
                <span className="text-xs font-medium uppercase tracking-wider">Files</span>
              </div>
            </div>
            <div className="p-2 space-y-1">
              {files.map(file => (
                <FileTreeNode
                  key={file.path}
                  file={file}
                  isSelected={file.path === selectedFilePath}
                  onClick={() => {
                    if (isEditing && hasUnsavedChanges) {
                      if (confirm('Discard unsaved changes?')) {
                        setIsEditing(false);
                        setHasUnsavedChanges(false);
                        setSelectedFilePath(file.path);
                      }
                    } else {
                      setIsEditing(false);
                      setSelectedFilePath(file.path);
                    }
                  }}
                />
              ))}
            </div>
          </div>
        )}

        {/* Code area */}
        <div className="flex-1 flex overflow-hidden bg-surface-base">
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
                  className="flex items-center gap-2 px-4 py-2 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 rounded-lg text-sm"
                >
                  <RefreshCw className="w-4 h-4" />
                  Try Again
                </button>
              </div>
            ) : isEditing ? (
              <textarea
                ref={editorRef}
                value={editedCode}
                onChange={(e) => {
                  setEditedCode(e.target.value);
                  setHasUnsavedChanges(true);
                }}
                className="w-full h-full p-4 font-mono text-sm leading-5 text-text-primary bg-transparent resize-none focus:outline-none"
                spellCheck={false}
              />
            ) : currentCode ? (
              <pre className="p-4 font-mono text-sm leading-5">
                <code
                  dangerouslySetInnerHTML={{ __html: highlightedCode }}
                  className="text-text-primary"
                />
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
      </div>

      {/* Footer - Polished with glass effect */}
      <div className="flex items-center justify-between px-4 py-2.5 border-t border-outline-mid/50 bg-surface-layer/50 backdrop-blur-sm text-xs">
        <div className="flex items-center gap-4 text-text-tertiary">
          {currentCode && (
            <>
              <span className="flex items-center gap-1">
                <Code className="w-3 h-3" />
                {currentCode.split('\n').length} lines
              </span>
              <span>{(currentCode.length / 1024).toFixed(1)} KB</span>
            </>
          )}
          {selectedFile && (
            <span className="text-text-secondary font-mono">{selectedFile.path}</span>
          )}
        </div>
        
        <div className="flex items-center gap-3">
          {isEditing ? (
            <>
              {hasUnsavedChanges && (
                <span className="text-accent-yellow flex items-center gap-1">
                  <div className="w-1.5 h-1.5 bg-accent-yellow rounded-full animate-pulse" />
                  Unsaved changes
                </span>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={handleRevert}
                disabled={!hasUnsavedChanges}
                className="h-7 px-2.5 text-xs gap-1"
              >
                <RotateCcw className="w-3 h-3" />
                Revert
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleCancelEdit}
                className="h-7 px-2.5 text-xs"
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleSaveEdit}
                className="h-7 px-2.5 text-xs gap-1"
              >
                <Save className="w-3 h-3" />
                Save
              </Button>
            </>
          ) : (
            <>
              <span className="text-text-tertiary">Streaming:</span>
              <select
                value={streamingMode}
                onChange={(e) => setStreamingMode(e.target.value as StreamingMode)}
                className="bg-surface-elevated border border-outline-light/50 rounded-md px-2.5 py-1 text-xs text-text-secondary focus:outline-none focus:ring-1 focus:ring-accent-yellow/50 focus:border-accent-yellow/50 transition-all"
              >
                <option value="instant">Instant</option>
                <option value="word">Word</option>
                <option value="character">Character</option>
              </select>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default CodeEditor;
