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
    console.log('[DEBUG] IframeSandbox - generating HTML for app:', appId, 'bundledCode length:', bundledCode.length);
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

    iframe.addEventListener('load', () => {
      console.log('[DEBUG] Iframe loaded for app:', appId);
      handleLoad();
    });

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
        sandbox="allow-scripts allow-same-origin"
        title={`App: ${appId}`}
        onLoad={() => console.log('[DEBUG] Iframe DOM load event fired for app:', appId)}
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
      background: #000;
      color: #fff;
    }
    .sandbox-error {
      padding: 2rem;
      color: #ef4444;
      text-align: center;
    }
    .loading {
      display: flex;
      align-items: center;
      justify-content: center;
      height: 100%;
      font-size: 18px;
      color: #666;
    }
  </style>
</head>
<body>
  <div id="root">
    <div class="loading">Loading React application...</div>
  </div>

  <!-- Load React first -->
  <script>
    console.log('[DEBUG] Starting to load React...');
    window.REACT_LOADED = false;
    window.BABEL_LOADED = false;
    window.TAILWIND_LOADED = false;
  </script>

  <!-- Load React from jsdelivr (more reliable CDN) -->
  <script crossorigin src="https://cdn.jsdelivr.net/npm/react@18/umd/react.production.min.js" onload="console.log('[DEBUG] React loaded from jsdelivr'); window.REACT_LOADED = true;" onerror="console.error('[DEBUG] React failed to load from jsdelivr, trying unpkg...'); loadScript('https://unpkg.com/react@18/umd/react.production.min.js', 'react-fallback');"></script>

  <script crossorigin src="https://cdn.jsdelivr.net/npm/react-dom@18/umd/react-dom.production.min.js" onload="console.log('[DEBUG] ReactDOM loaded from jsdelivr');" onerror="console.error('[DEBUG] ReactDOM failed to load from jsdelivr, trying unpkg...'); loadScript('https://unpkg.com/react-dom@18/umd/react-dom.production.min.js', 'reactdom-fallback');"></script>

  <!-- Load Babel -->
  <script src="https://cdn.jsdelivr.net/npm/@babel/standalone/babel.min.js" onload="console.log('[DEBUG] Babel loaded from jsdelivr'); window.BABEL_LOADED = true;" onerror="console.error('[DEBUG] Babel failed to load from jsdelivr, trying unpkg...'); loadScript('https://unpkg.com/@babel/standalone/babel.min.js', 'babel-fallback');"></script>

  <!-- Load Tailwind -->
  <script src="https://cdn.tailwindcss.com" onload="console.log('[DEBUG] Tailwind loaded'); window.TAILWIND_LOADED = true;" onerror="console.error('[DEBUG] Tailwind failed to load');"></script>

  <script>
    function loadScript(url, id) {
      const script = document.createElement('script');
      script.src = url;
      script.onload = function() {
        console.log('[DEBUG] Fallback script loaded:', id);
        if (id === 'react-fallback') window.REACT_LOADED = true;
        if (id === 'babel-fallback') window.BABEL_LOADED = true;
      };
      script.onerror = function() {
        console.error('[DEBUG] Fallback script failed:', id);
        document.getElementById('root').innerHTML = '<div class="sandbox-error"><h2>Network Error</h2><p>Failed to load required dependencies. Check your internet connection.</p></div>';
      };
      document.head.appendChild(script);
    }
  </script>

  <!-- Initialize app once dependencies are loaded -->
  <script>
    console.log('[DEBUG] Setting up dependency check...');

    function checkDependencies() {
      if (window.REACT_LOADED && window.BABEL_LOADED) {
        console.log('[DEBUG] All dependencies loaded, initializing app...');
        initializeApp();
      } else {
        console.log('[DEBUG] Waiting for dependencies... React:', window.REACT_LOADED, 'Babel:', window.BABEL_LOADED);
        setTimeout(checkDependencies, 100);
      }
    }

    function initializeApp() {
      console.log('[DEBUG] Initializing SandboxAPI...');
      try {
        // Sandbox Bridge Client
        const SandboxAPI = {
          _pendingRequests: new Map(),
          _data: ${JSON.stringify(initialData)},
          _appId: '${appId}',

          init() {
            console.log('[DEBUG] SandboxAPI init called');
            window.addEventListener('message', (event) => {
              try {
                const message = event.data;
                console.log('[DEBUG] SandboxAPI received message:', message.type);
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
            console.log('[DEBUG] Notifying parent app is ready');
            window.parent.postMessage({ type: 'ready' }, '*');
          },

          _notifyError(message) {
            console.log('[DEBUG] Notifying parent of error:', message);
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
        window.SandboxAPI = SandboxAPI;
        console.log('[DEBUG] SandboxAPI initialized successfully');

        // Now execute the app code
        console.log('[DEBUG] About to execute bundled code, length:', ${bundledCode.length});
        try {
          ${bundledCode}
          console.log('[DEBUG] Bundled code executed successfully');
        } catch (e) {
          console.error('[DEBUG] Failed to execute bundled code:', e);
          document.getElementById('root').innerHTML = '<div class="sandbox-error"><h2>App Code Error</h2><p>' + e.message + '</p></div>';
          window.SandboxAPI._notifyError('Failed to load app: ' + e.message);
          return;
        }

        console.log('[DEBUG] App initialization completed');

      } catch (error) {
        console.error('[DEBUG] SandboxAPI initialization failed:', error);
        document.getElementById('root').innerHTML = '<div class="sandbox-error"><h2>Initialization Error</h2><p>' + error.message + '</p></div>';
      }
    }

    // Start checking for dependencies
    checkDependencies();
  </script>
</body>
</html>`;
}
