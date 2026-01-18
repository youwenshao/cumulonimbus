'use client';

import { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import { Loader2, AlertCircle, Maximize2, Minimize2, RefreshCw, Code2, Play, Bug } from 'lucide-react';
import { Button } from '@/components/ui';
import { SandboxBridge, type SandboxMessage } from './SandboxBridge';
import type { BundleName } from '@/lib/runtime/dependency-bundle';

export interface PreviewRuntimeProps {
  /** Unique identifier for the app */
  appId: string;
  /** Server-bundled code ready for execution */
  bundledCode: string;
  /** List of dependency bundles required by the app */
  requiredBundles?: BundleName[];
  /** Initial data for the app */
  initialData?: Record<string, unknown>[];
  /** Callback when data changes in the sandbox */
  onDataChange?: (data: Record<string, unknown>[]) => void;
  /** Callback when an error occurs */
  onError?: (error: string) => void;
  /** Additional CSS classes */
  className?: string;
  /** Show debug panel */
  showDebug?: boolean;
}

interface RuntimeError {
  message: string;
  stack?: string;
  line?: number;
  column?: number;
}

/**
 * PreviewRuntime - Secure iframe sandbox for running AI-generated applications
 * 
 * Features:
 * - Server-side bundled code (no client-side transpilation)
 * - Dynamic dependency loading
 * - PostMessage-based communication
 * - Error handling with source context
 * - Security sandboxing
 */
export function PreviewRuntime({
  appId,
  bundledCode,
  requiredBundles = ['utils'],
  initialData = [],
  onDataChange,
  onError,
  className = '',
  showDebug = false,
}: PreviewRuntimeProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const bridgeRef = useRef<SandboxBridge | null>(null);
  
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<RuntimeError | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);
  const [showLogs, setShowLogs] = useState(showDebug);
  
  // Generate HTML document for the iframe
  const iframeSrcDoc = useMemo(() => {
    return generatePreviewHTML(appId, bundledCode, initialData, requiredBundles);
  }, [appId, bundledCode, initialData, requiredBundles]);

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
    } catch (err) {
      bridgeRef.current.send({
        type: 'api-response',
        payload: { 
          requestId, 
          success: false, 
          error: err instanceof Error ? err.message : 'Request failed' 
        },
      });
    }
  }, [appId]);

  // Handle messages from the sandbox
  const handleSandboxMessage = useCallback((message: SandboxMessage) => {
    switch (message.type) {
      case 'ready':
        setIsLoading(false);
        setError(null);
        addLog('✓ App ready');
        break;
      
      case 'error':
        const errorMsg = message.payload?.message || 'Unknown error';
        const runtimeError: RuntimeError = {
          message: errorMsg,
          stack: message.payload?.stack as string | undefined,
        };
        setError(runtimeError);
        setIsLoading(false);
        onError?.(errorMsg);
        addLog(`✗ Error: ${errorMsg}`);
        break;
      
      case 'data-update':
        if (message.payload?.data) {
          onDataChange?.(message.payload.data as Record<string, unknown>[]);
          addLog(`↻ Data updated (${(message.payload.data as unknown[]).length} records)`);
        }
        break;
      
      case 'api-request':
        handleApiRequest(message.payload);
        addLog(`→ API ${message.payload?.method} ${message.payload?.endpoint}`);
        break;

      case 'event':
        addLog(`⚡ Event: ${JSON.stringify(message.payload)}`);
        break;
      
      default:
        addLog(`? Unknown: ${message.type}`);
    }
  }, [onDataChange, onError, handleApiRequest]);

  // Add log entry
  const addLog = useCallback((message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs(prev => [...prev.slice(-49), `[${timestamp}] ${message}`]);
  }, []);

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
        
        addLog('⟳ Iframe loaded, initializing...');
      }
    };

    iframe.addEventListener('load', handleLoad);

    return () => {
      iframe.removeEventListener('load', handleLoad);
      bridgeRef.current?.destroy();
    };
  }, [appId, initialData, handleSandboxMessage, addLog]);

  // Reload the sandbox
  const handleReload = useCallback(() => {
    setIsLoading(true);
    setError(null);
    setLogs([]);
    addLog('⟳ Reloading...');
    if (iframeRef.current) {
      iframeRef.current.srcdoc = iframeSrcDoc;
    }
  }, [iframeSrcDoc, addLog]);

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
          <span className="text-xs text-gray-400 ml-2 flex items-center gap-1">
            <Play className="w-3 h-3" />
            Preview: {appId.substring(0, 8)}...
          </span>
          {requiredBundles.length > 0 && (
            <span className="text-xs text-gray-500">
              ({requiredBundles.length} {requiredBundles.length === 1 ? 'bundle' : 'bundles'})
            </span>
          )}
        </div>
        
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowLogs(!showLogs)}
            title="Toggle debug logs"
            className={showLogs ? 'text-yellow-500' : ''}
          >
            <Bug className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleReload}
            disabled={isLoading}
            title="Reload preview"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
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

      {/* Main content area */}
      <div className="flex" style={{ height: isFullscreen ? 'calc(100% - 44px)' : '600px' }}>
        {/* Iframe container */}
        <div className={`relative flex-1 ${showLogs ? 'border-r border-gray-700' : ''}`}>
          {/* Loading overlay */}
          {isLoading && (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-900/80 z-10">
              <div className="flex flex-col items-center gap-3">
                <Loader2 className="w-8 h-8 animate-spin text-red-500" />
                <span className="text-sm text-gray-400">Loading preview...</span>
              </div>
            </div>
          )}

          {/* Error overlay */}
          {error && (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-900/90 z-10">
              <div className="flex flex-col items-center gap-3 p-6 max-w-lg text-center">
                <AlertCircle className="w-10 h-10 text-red-500" />
                <h3 className="text-lg font-semibold text-red-400">Runtime Error</h3>
                <p className="text-sm text-gray-300 font-mono bg-gray-800 p-3 rounded-lg w-full text-left overflow-auto max-h-40">
                  {error.message}
                </p>
                {error.stack && (
                  <details className="w-full text-left">
                    <summary className="text-xs text-gray-500 cursor-pointer">Stack trace</summary>
                    <pre className="text-xs text-gray-400 bg-gray-800 p-2 rounded mt-2 overflow-auto max-h-32">
                      {error.stack}
                    </pre>
                  </details>
                )}
                <Button variant="secondary" size="sm" onClick={handleReload}>
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Reload Preview
                </Button>
              </div>
            </div>
          )}

          {/* The iframe */}
          <iframe
            ref={iframeRef}
            srcDoc={iframeSrcDoc}
            className="w-full h-full bg-black"
            sandbox="allow-scripts allow-same-origin"
            title={`Preview: ${appId}`}
          />
        </div>

        {/* Debug logs panel */}
        {showLogs && (
          <div className="w-80 bg-gray-950 overflow-hidden flex flex-col">
            <div className="px-3 py-2 border-b border-gray-800 flex items-center justify-between">
              <span className="text-xs font-semibold text-gray-400">Debug Logs</span>
              <button 
                onClick={() => setLogs([])}
                className="text-xs text-gray-500 hover:text-gray-300"
              >
                Clear
              </button>
            </div>
            <div className="flex-1 overflow-auto p-2 font-mono text-xs">
              {logs.length === 0 ? (
                <p className="text-gray-600">No logs yet...</p>
              ) : (
                logs.map((log, i) => (
                  <div 
                    key={i} 
                    className={`py-0.5 ${
                      log.includes('Error') ? 'text-red-400' :
                      log.includes('✓') ? 'text-green-400' :
                      log.includes('→') ? 'text-blue-400' :
                      'text-gray-400'
                    }`}
                  >
                    {log}
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Generate the HTML document for the preview iframe
 */
function generatePreviewHTML(
  appId: string,
  bundledCode: string,
  initialData: Record<string, unknown>[],
  requiredBundles: BundleName[]
): string {
  // Generate bundle loading scripts
  const bundleScripts = requiredBundles
    .map(bundle => `<script src="/runtime-deps/${bundle}.js" defer></script>`)
    .join('\n  ');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Preview: ${appId}</title>
  <meta http-equiv="Content-Security-Policy" content="
    default-src 'self';
    script-src 'unsafe-inline' 'unsafe-eval' https://unpkg.com https://cdn.tailwindcss.com https://cdn.jsdelivr.net;
    style-src 'unsafe-inline' https://unpkg.com https://cdn.tailwindcss.com https://cdn.jsdelivr.net;
    img-src 'self' data: https:;
    font-src 'self' https:;
    connect-src 'self' https:;
  ">

  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    html, body, #root { height: 100%; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: #0a0a0a;
      color: #ffffff;
    }
    .preview-error {
      padding: 2rem;
      color: #fca5a5;
      text-align: center;
    }
    .preview-error h2 { margin-bottom: 0.5rem; }
    .preview-error pre { 
      background: #1f2937; 
      padding: 1rem; 
      border-radius: 0.5rem; 
      text-align: left;
      overflow: auto;
      max-height: 200px;
      font-size: 12px;
    }
    .preview-loading {
      display: flex;
      align-items: center;
      justify-content: center;
      height: 100%;
      font-size: 18px;
      color: #6b7280;
    }
    @keyframes spin {
      to { transform: rotate(360deg); }
    }
    .spinner {
      width: 24px;
      height: 24px;
      border: 2px solid #374151;
      border-top-color: #ef4444;
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
      margin-right: 12px;
    }
  </style>
</head>
<body>
  <div id="root">
    <div class="preview-loading">
      <div class="spinner"></div>
      Loading application...
    </div>
  </div>

  <!-- React from CDN -->
  <script crossorigin src="https://cdn.jsdelivr.net/npm/react@18/umd/react.production.min.js"></script>
  <script crossorigin src="https://cdn.jsdelivr.net/npm/react-dom@18/umd/react-dom.production.min.js"></script>
  
  <!-- Tailwind CSS -->
  <script src="https://cdn.tailwindcss.com"></script>
  <script>
    tailwind.config = {
      theme: {
        extend: {
          colors: {
            'text-primary': '#ffffff',
            'text-secondary': '#9ca3af',
            'text-tertiary': '#6b7280',
            'surface-dark': '#0a0a0a',
            'surface-base': '#111111',
            'surface-light': '#1f2937',
            'outline-light': '#374151',
            'outline-mid': '#4b5563',
            'accent-yellow': '#fca000',
          }
        }
      }
    };
  </script>
  
  <!-- Pre-bundled dependencies (loaded based on requirements) -->
  ${bundleScripts}

  <!-- Sandbox Bridge -->
  <script>
    (function() {
      'use strict';
      
      // Sandbox API for communication with host
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

        _notifyError(message, stack) {
          window.parent.postMessage({ 
            type: 'error', 
            payload: { message, stack } 
          }, '*');
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
      window.SandboxAPI = SandboxAPI;

      // useAppData hook for React components
      window.useAppData = function() {
        const [data, setData] = React.useState(SandboxAPI.getData() || []);
        const [isLoading, setIsLoading] = React.useState(false);
        const [error, setError] = React.useState(null);

        const refresh = React.useCallback(async () => {
          try {
            setIsLoading(true);
            setError(null);
            const result = await SandboxAPI.fetch('');
            const newData = result.data || result.records || [];
            setData(newData);
            SandboxAPI.updateData(newData);
          } catch (e) {
            setError(e);
          } finally {
            setIsLoading(false);
          }
        }, []);

        const addRecord = React.useCallback(async (record) => {
          try {
            setIsLoading(true);
            const result = await SandboxAPI.fetch('', {
              method: 'POST',
              body: record
            });
            const newData = [...data, result.record];
            setData(newData);
            SandboxAPI.updateData(newData);
            return result.record;
          } catch (e) {
            setError(e);
            throw e;
          } finally {
            setIsLoading(false);
          }
        }, [data]);

        const updateRecord = React.useCallback(async (id, updates) => {
          try {
            setIsLoading(true);
            const result = await SandboxAPI.fetch('', {
              method: 'PATCH',
              body: { id, ...updates }
            });
            const newData = data.map(r => r.id === id ? result.record : r);
            setData(newData);
            SandboxAPI.updateData(newData);
            return result.record;
          } catch (e) {
            setError(e);
            throw e;
          } finally {
            setIsLoading(false);
          }
        }, [data]);

        const deleteRecord = React.useCallback(async (id) => {
          try {
            setIsLoading(true);
            await SandboxAPI.fetch('?id=' + id, { method: 'DELETE' });
            const newData = data.filter(r => r.id !== id);
            setData(newData);
            SandboxAPI.updateData(newData);
          } catch (e) {
            setError(e);
            throw e;
          } finally {
            setIsLoading(false);
          }
        }, [data]);

        return { 
          data, 
          isLoading, 
          error, 
          refresh, 
          addRecord, 
          updateRecord,
          deleteRecord 
        };
      };
    })();
  </script>

  <!-- User App Code (already transpiled) -->
  <script>
    (function() {
      'use strict';
      
      // Wait for all dependencies to load
      function waitForDependencies() {
        return new Promise((resolve) => {
          function check() {
            if (window.React && window.ReactDOM) {
              resolve();
            } else {
              setTimeout(check, 50);
            }
          }
          check();
        });
      }

      // Execute app code
      async function executeApp() {
        try {
          await waitForDependencies();
          
          // Execute the bundled code
          ${bundledCode.replace(/<\/script>/g, '<\\/script>')}
          
        } catch (e) {
          console.error('App execution error:', e);
          window.SandboxAPI._notifyError(e.message, e.stack);
          document.getElementById('root').innerHTML = \`
            <div class="preview-error">
              <h2>Application Error</h2>
              <pre>\${e.message}</pre>
            </div>
          \`;
        }
      }

      // Run when DOM is ready
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', executeApp);
      } else {
        executeApp();
      }
    })();
  </script>
</body>
</html>`;
}

export default PreviewRuntime;
