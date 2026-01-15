'use client';

import { useState, useEffect, useRef } from 'react';
import { Code, Terminal, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

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

type ConnectionStatus = 'connecting' | 'connected' | 'error' | 'complete';
type ActiveTab = 'page' | 'types';

export function CodeViewer({ conversationId, onComplete, onError, className }: CodeViewerProps) {
  const [code, setCode] = useState<Record<string, string>>({ page: '', types: '' });
  const [status, setStatus] = useState<ConnectionStatus>('connecting');
  const [progress, setProgress] = useState(0);
  const [activeTab, setActiveTab] = useState<ActiveTab>('page');
  const [error, setError] = useState<string | null>(null);
  const codeContainerRef = useRef<HTMLPreElement>(null);
  const eventSourceRef = useRef<EventSource | null>(null);

  useEffect(() => {
    if (!conversationId) return;

    console.log(`📡 CodeViewer: Connecting to code stream ${conversationId}`);
    const eventSource = new EventSource(`/api/scaffolder/code-stream/${conversationId}`);
    eventSourceRef.current = eventSource;

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);

        if (data.type === 'connected') {
          console.log('📡 CodeViewer: Connected to code stream');
          setStatus('connected');
          return;
        }

        if (data.type === 'complete') {
          console.log('📡 CodeViewer: Code generation complete');
          setStatus('complete');
          setProgress(100);
          
          // Build final GeneratedCode object
          const generatedCode: GeneratedCode = {
            pageComponent: data.code || code.page,
            types: code.types || undefined,
          };
          
          onComplete?.(generatedCode);
          eventSource.close();
          return;
        }

        if (data.type === 'error') {
          console.error('📡 CodeViewer: Error received:', data.error);
          setStatus('error');
          setError(data.error);
          onError?.(data.error);
          eventSource.close();
          return;
        }

        // Handle code chunks
        if (data.component && data.code) {
          setCode(prev => ({
            ...prev,
            [data.component]: prev[data.component] + data.code,
          }));
          setProgress(data.progress || 0);

          // Auto-scroll to bottom
          if (codeContainerRef.current) {
            codeContainerRef.current.scrollTop = codeContainerRef.current.scrollHeight;
          }
        }
      } catch (err) {
        console.error('📡 CodeViewer: Failed to parse message:', err);
      }
    };

    eventSource.onerror = (err) => {
      console.error('📡 CodeViewer: Connection error:', err);
      // Only set error if we haven't completed
      if (status !== 'complete') {
        setStatus('error');
        setError('Connection lost. Code generation may still be in progress.');
      }
    };

    return () => {
      eventSource.close();
      eventSourceRef.current = null;
    };
  }, [conversationId, onComplete, onError]);

  // Simple syntax highlighting for TypeScript/TSX
  const highlightCode = (codeString: string): string => {
    if (!codeString) return '';
    
    // Escape HTML
    let highlighted = codeString
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
    
    // Keywords
    highlighted = highlighted.replace(
      /\b(import|export|default|from|const|let|var|function|async|await|return|if|else|try|catch|throw|new|type|interface|extends|implements|class|public|private|protected|static|readonly|as|typeof|instanceof|void|null|undefined|true|false)\b/g,
      '<span class="text-purple-400">$1</span>'
    );
    
    // Types
    highlighted = highlighted.replace(
      /\b(string|number|boolean|any|unknown|never|object|Array|Promise|Record|Partial|Required|Omit|Pick)\b/g,
      '<span class="text-yellow-400">$1</span>'
    );
    
    // React hooks and components
    highlighted = highlighted.replace(
      /\b(useState|useEffect|useCallback|useMemo|useRef|useContext|React)\b/g,
      '<span class="text-cyan-400">$1</span>'
    );
    
    // Strings (simple approximation)
    highlighted = highlighted.replace(
      /(["'`])(?:(?!\1)[^\\]|\\.)*?\1/g,
      '<span class="text-green-400">$&</span>'
    );
    
    // Comments
    highlighted = highlighted.replace(
      /(\/\/.*$)/gm,
      '<span class="text-gray-500">$1</span>'
    );
    
    // Numbers
    highlighted = highlighted.replace(
      /\b(\d+(?:\.\d+)?)\b/g,
      '<span class="text-orange-400">$1</span>'
    );
    
    return highlighted;
  };

  const tabs = [
    { id: 'page' as ActiveTab, label: 'Page Component', hasContent: !!code.page },
    { id: 'types' as ActiveTab, label: 'Types', hasContent: !!code.types },
  ];

  return (
    <div className={cn('bg-surface-base border border-outline-mid rounded-xl overflow-hidden', className)}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-outline-mid bg-surface-elevated">
        <div className="flex items-center gap-2">
          <Code className="w-5 h-5 text-accent-yellow" />
          <span className="font-medium text-text-primary">Generated Code</span>
        </div>
        <div className="flex items-center gap-2">
          {status === 'connecting' && (
            <span className="flex items-center gap-1 text-sm text-text-secondary">
              <Loader2 className="w-4 h-4 animate-spin" />
              Connecting...
            </span>
          )}
          {status === 'connected' && (
            <span className="flex items-center gap-1 text-sm text-yellow-400">
              <Terminal className="w-4 h-4" />
              Generating... {progress}%
            </span>
          )}
          {status === 'complete' && (
            <span className="flex items-center gap-1 text-sm text-green-400">
              <CheckCircle className="w-4 h-4" />
              Complete
            </span>
          )}
          {status === 'error' && (
            <span className="flex items-center gap-1 text-sm text-red-400">
              <AlertCircle className="w-4 h-4" />
              Error
            </span>
          )}
        </div>
      </div>

      {/* Progress Bar */}
      {status !== 'complete' && status !== 'error' && (
        <div className="h-1 bg-surface-light">
          <div 
            className="h-full bg-accent-yellow transition-all duration-300 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>
      )}

      {/* Tabs */}
      <div className="flex border-b border-outline-mid bg-surface-light/50">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              'px-4 py-2 text-sm font-medium transition-colors border-b-2',
              activeTab === tab.id
                ? 'text-accent-yellow border-accent-yellow'
                : 'text-text-secondary border-transparent hover:text-text-primary'
            )}
          >
            {tab.label}
            {tab.hasContent && activeTab !== tab.id && (
              <span className="ml-2 w-2 h-2 bg-green-400 rounded-full inline-block" />
            )}
          </button>
        ))}
      </div>

      {/* Code Display */}
      <pre
        ref={codeContainerRef}
        className="p-4 h-96 overflow-auto font-mono text-sm bg-black/50"
      >
        {error ? (
          <div className="text-red-400">
            <p className="font-semibold mb-2">Error during code generation:</p>
            <p>{error}</p>
          </div>
        ) : code[activeTab] ? (
          <code
            dangerouslySetInnerHTML={{ __html: highlightCode(code[activeTab]) }}
            className="whitespace-pre text-gray-300"
          />
        ) : (
          <div className="text-text-secondary flex items-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin" />
            Waiting for code generation...
          </div>
        )}
      </pre>

      {/* Footer */}
      <div className="px-4 py-2 border-t border-outline-mid bg-surface-elevated/50 text-xs text-text-secondary">
        {code.page.length > 0 && (
          <span>{code.page.length.toLocaleString()} characters generated</span>
        )}
      </div>
    </div>
  );
}

export default CodeViewer;
