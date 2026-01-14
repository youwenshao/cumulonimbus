'use client';

import { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import { Loader2, AlertCircle, Maximize2, Minimize2, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui';
import { SandboxBridge, type SandboxMessage } from './SandboxBridge';

export interface IframeSandboxProps {
  appId: string;
  bundledCode: string;
  initialData?: Record<string, unknown>[];
  onDataChange?: (data: Record<string, unknown>[]) => void;
  onError?: (error: string) => void;
  className?: string;
}

/**
 * Secure iframe container for running AI-generated applications
 * 
 * Security features:
 * - sandbox attribute with restricted permissions
 * - PostMessage-based communication only
 * - CSP headers for XSS protection
 * - Origin validation
 */
export function IframeSandbox({
  appId,
  bundledCode,
  initialData = [],
  onDataChange,
  onError,
  className = '',
}: IframeSandboxProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const bridgeRef = useRef<SandboxBridge | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Generate HTML document for the iframe
  const iframeSrcDoc = useMemo(() => {
    return generateSandboxHTML(appId, bundledCode, initialData);
  }, [appId, bundledCode, initialData]);

  // Handle messages from the sandbox
  const handleSandboxMessage = useCallback((message: SandboxMessage) => {
    switch (message.type) {
      case 'ready':
        setIsLoading(false);
        console.log(`🏖️ Sandbox ${appId}: Ready`);
        break;
      
      case 'error':
        const errorMsg = message.payload?.message || 'Unknown error';
        setError(errorMsg);
        onError?.(errorMsg);
        console.error(`🏖️ Sandbox ${appId}: Error -`, errorMsg);
        break;
      
      case 'data-update':
        if (message.payload?.data) {
          onDataChange?.(message.payload.data as Record<string, unknown>[]);
        }
        break;
      
      case 'api-request':
        // Handle API requests from sandbox
        handleApiRequest(message.payload);
        break;
      
      default:
        console.log(`🏖️ Sandbox ${appId}: Unknown message type -`, message.type);
    }
  }, [appId, onDataChange, onError]);

  // Handle API requests from the sandbox
  const handleApiRequest = useCallback(async (payload: SandboxMessage['payload']) => {
    if (!payload || !bridgeRef.current) return;

    const { requestId, method, endpoint, body } = payload as {
      requestId: string;
      method: string;
      endpoint: string;
      body?: unknown;
    };

    try {
      const response = await fetch(`/api/apps/${appId}/data${endpoint}`, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: body ? JSON.stringify(body) : undefined,
      });

      const data = await response.json();

      bridgeRef.current.send({
        type: 'api-response',
        payload: { requestId, success: response.ok, data },
      });
    } catch (error) {
      bridgeRef.current.send({
        type: 'api-response',
        payload: { 
          requestId, 
          success: false, 
          error: error instanceof Error ? error.message : 'Request failed' 
        },
      });
    }
  }, [appId]);

  // Initialize bridge when iframe loads
  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe) return;

    const handleLoad = () => {
      if (iframe.contentWindow) {
        bridgeRef.current = new SandboxBridge(iframe.contentWindow, handleSandboxMessage);
        
        // Send initial data to sandbox
        bridgeRef.current.send({
          type: 'init',
          payload: { appId, data: initialData },
        });
      }
    };

    iframe.addEventListener('load', handleLoad);

    return () => {
      iframe.removeEventListener('load', handleLoad);
      bridgeRef.current?.destroy();
    };
  }, [appId, initialData, handleSandboxMessage]);

  // Reload the sandbox
  const handleReload = useCallback(() => {
    setIsLoading(true);
    setError(null);
    if (iframeRef.current) {
      iframeRef.current.srcdoc = iframeSrcDoc;
    }
  }, [iframeSrcDoc]);

  // Toggle fullscreen
  const toggleFullscreen = useCallback(() => {
    setIsFullscreen(prev => !prev);
  }, []);

  return (
    <div 
      className={`
        relative bg-gray-900 rounded-lg overflow-hidden border border-gray-800
        ${isFullscreen ? 'fixed inset-4 z-50' : ''}
        ${className}
      `}
    >
      {/* Toolbar */}
      <div className="flex items-center justify-between px-4 py-2 bg-gray-800/50 border-b border-gray-700">
        <div className="flex items-center gap-2">
          <div className="flex gap-1.5">
            <div className="w-3 h-3 rounded-full bg-red-500" />
            <div className="w-3 h-3 rounded-full bg-yellow-500" />
            <div className="w-3 h-3 rounded-full bg-green-500" />
          </div>
          <span className="text-xs text-gray-400 ml-2">
            Sandbox: {appId.substring(0, 8)}...
          </span>
        </div>
        
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleReload}
            title="Reload sandbox"
          >
            <RefreshCw className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={toggleFullscreen}
            title={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
          >
            {isFullscreen ? (
              <Minimize2 className="w-4 h-4" />
            ) : (
              <Maximize2 className="w-4 h-4" />
            )}
          </Button>
        </div>
      </div>

      {/* Loading overlay */}
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-900/80 z-10">
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="w-8 h-8 animate-spin text-red-500" />
            <span className="text-sm text-gray-400">Loading sandbox...</span>
          </div>
        </div>
      )}

      {/* Error overlay */}
      {error && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-900/80 z-10">
          <div className="flex flex-col items-center gap-3 p-6 max-w-md text-center">
            <AlertCircle className="w-8 h-8 text-red-500" />
            <span className="text-sm text-red-400">{error}</span>
            <Button variant="secondary" size="sm" onClick={handleReload}>
              Try Again
            </Button>
          </div>
        </div>
      )}

      {/* Iframe container */}
      <iframe
        ref={iframeRef}
        srcDoc={iframeSrcDoc}
        className="w-full bg-black"
        style={{ height: isFullscreen ? 'calc(100% - 44px)' : '600px' }}
        sandbox="allow-scripts"
        title={`App: ${appId}`}
      />
    </div>
  );
}

/**
 * Generate the HTML document for the sandboxed iframe
 */
function generateSandboxHTML(
  appId: string,
  bundledCode: string,
  initialData: Record<string, unknown>[]
): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Sandbox: ${appId}</title>
  <meta http-equiv="Content-Security-Policy" content="
    default-src 'self';
    script-src 'unsafe-inline' 'unsafe-eval' https://unpkg.com;
    style-src 'unsafe-inline' https://unpkg.com https://cdn.tailwindcss.com;
    img-src 'self' data: https:;
    font-src 'self' https:;
  ">
  
  <!-- React -->
  <script crossorigin src="https://unpkg.com/react@18/umd/react.production.min.js"></script>
  <script crossorigin src="https://unpkg.com/react-dom@18/umd/react-dom.production.min.js"></script>
  
  <!-- Babel for JSX transformation -->
  <script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
  
  <!-- Tailwind CSS -->
  <script src="https://cdn.tailwindcss.com"></script>
  <script>
    tailwind.config = {
      darkMode: 'class',
      theme: {
        extend: {
          colors: {
            primary: '#ef4444',
          }
        }
      }
    }
  </script>
  
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    html, body, #root { height: 100%; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: #000;
      color: #fff;
    }
    .sandbox-error {
      padding: 2rem;
      color: #ef4444;
      text-align: center;
    }
  </style>
</head>
<body class="dark">
  <div id="root"></div>
  
  <script>
    // Sandbox Bridge Client
    const SandboxAPI = {
      _pendingRequests: new Map(),
      _data: ${JSON.stringify(initialData)},
      _appId: '${appId}',
      
      init() {
        window.addEventListener('message', (event) => {
          try {
            const message = event.data;
            if (message.type === 'init') {
              this._data = message.payload?.data || [];
              this._notifyReady();
            } else if (message.type === 'api-response') {
              const { requestId, success, data, error } = message.payload || {};
              const pending = this._pendingRequests.get(requestId);
              if (pending) {
                this._pendingRequests.delete(requestId);
                if (success) {
                  pending.resolve(data);
                } else {
                  pending.reject(new Error(error || 'Request failed'));
                }
              }
            }
          } catch (e) {
            console.error('Sandbox message error:', e);
          }
        });
      },
      
      _notifyReady() {
        window.parent.postMessage({ type: 'ready' }, '*');
      },
      
      _notifyError(message) {
        window.parent.postMessage({ type: 'error', payload: { message } }, '*');
      },
      
      _generateId() {
        return 'req_' + Math.random().toString(36).substring(2, 9);
      },
      
      async fetch(endpoint, options = {}) {
        const requestId = this._generateId();
        
        return new Promise((resolve, reject) => {
          this._pendingRequests.set(requestId, { resolve, reject });
          
          window.parent.postMessage({
            type: 'api-request',
            payload: {
              requestId,
              method: options.method || 'GET',
              endpoint,
              body: options.body,
            }
          }, '*');
          
          // Timeout after 30 seconds
          setTimeout(() => {
            if (this._pendingRequests.has(requestId)) {
              this._pendingRequests.delete(requestId);
              reject(new Error('Request timeout'));
            }
          }, 30000);
        });
      },
      
      getData() {
        return this._data;
      },
      
      updateData(data) {
        this._data = data;
        window.parent.postMessage({
          type: 'data-update',
          payload: { data }
        }, '*');
      }
    };
    
    SandboxAPI.init();
    
    // Make API available globally
    window.SandboxAPI = SandboxAPI;
  </script>
  
  <script type="text/babel" data-type="module">
    const { useState, useEffect, useCallback, useMemo } = React;
    
    // App Data Hook
    function useAppData() {
      const [data, setData] = useState(window.SandboxAPI.getData());
      const [isLoading, setIsLoading] = useState(false);
      const [error, setError] = useState(null);
      
      const refresh = useCallback(async () => {
        try {
          setIsLoading(true);
          const result = await window.SandboxAPI.fetch('');
          const newData = result.data || [];
          setData(newData);
          window.SandboxAPI.updateData(newData);
        } catch (e) {
          setError(e.message);
        } finally {
          setIsLoading(false);
        }
      }, []);
      
      const addRecord = useCallback(async (record) => {
        try {
          setIsLoading(true);
          const result = await window.SandboxAPI.fetch('', {
            method: 'POST',
            body: record
          });
          const newData = [...data, result.record];
          setData(newData);
          window.SandboxAPI.updateData(newData);
          return result.record;
        } catch (e) {
          setError(e.message);
          throw e;
        } finally {
          setIsLoading(false);
        }
      }, [data]);
      
      const deleteRecord = useCallback(async (id) => {
        try {
          setIsLoading(true);
          await window.SandboxAPI.fetch('?id=' + id, { method: 'DELETE' });
          const newData = data.filter(r => r.id !== id);
          setData(newData);
          window.SandboxAPI.updateData(newData);
        } catch (e) {
          setError(e.message);
          throw e;
        } finally {
          setIsLoading(false);
        }
      }, [data]);
      
      return { data, isLoading, error, refresh, addRecord, deleteRecord };
    }
    
    // Make hook available globally
    window.useAppData = useAppData;
    
    // Error Boundary
    class ErrorBoundary extends React.Component {
      constructor(props) {
        super(props);
        this.state = { hasError: false, error: null };
      }
      
      static getDerivedStateFromError(error) {
        return { hasError: true, error };
      }
      
      componentDidCatch(error, info) {
        console.error('Sandbox error:', error, info);
        window.SandboxAPI._notifyError(error.message);
      }
      
      render() {
        if (this.state.hasError) {
          return (
            <div className="sandbox-error">
              <h2>Something went wrong</h2>
              <p>{this.state.error?.message || 'Unknown error'}</p>
            </div>
          );
        }
        return this.props.children;
      }
    }
    
    // User's Generated App Code
    try {
      ${bundledCode}
    } catch (e) {
      console.error('Failed to execute app code:', e);
      window.SandboxAPI._notifyError('Failed to load app: ' + e.message);
    }
    
    // Render the app
    try {
      const root = ReactDOM.createRoot(document.getElementById('root'));
      root.render(
        <ErrorBoundary>
          {typeof App !== 'undefined' ? <App /> : (
            <div className="p-8 text-center text-gray-500">
              No App component defined
            </div>
          )}
        </ErrorBoundary>
      );
      
      // Notify parent that we're ready
      window.SandboxAPI._notifyReady();
    } catch (e) {
      console.error('Failed to render app:', e);
      window.SandboxAPI._notifyError('Failed to render app: ' + e.message);
    }
  </script>
</body>
</html>`;
}
