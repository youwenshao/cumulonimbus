import { parentPort, workerData } from 'worker_threads';
import * as esbuild from 'esbuild';
import { PrismaClient } from '@prisma/client';
import { createRequire } from 'module';
import path from 'path';

// Fix for require in ESM worker
const require = createRequire(import.meta.url);

// Inline types
interface WorkerMessage {
  type: 'ready' | 'response' | 'error' | 'status' | 'db_query';
  appId: string;
  payload?: any;
  correlationId?: string;
}

interface SupervisorMessage {
  type: 'start' | 'request' | 'stop' | 'db_result';
  appId: string;
  payload?: any;
  correlationId?: string;
}

const { appId, subdomain, code, appName, appDescription, initialData } = workerData;
const prisma = new PrismaClient();

async function start() {
  if (!parentPort) return;

  try {
    console.log(`[Worker ${appId}] Starting (ESM)...`);
    
    // 1. Transpile for Node environment (CJS) - for server-side logic if any
    let nodeResult;
    try {
      nodeResult = await esbuild.transform(code, {
        loader: 'tsx',
        format: 'cjs',
        target: 'node18',
      });
    } catch (err: any) {
      console.warn(`[Worker ${appId}] Node transpilation failed (might be browser-only code):`, err.message);
    }

    // 2. Prepare context
    const context = {
      appId,
      subdomain,
      db: {
        query: (sql: string, params: any[]) => {
          return new Promise((resolve) => {
            const correlationId = Math.random().toString(36).substring(7);
            const onResult = (msg: SupervisorMessage) => {
              if (msg.type === 'db_result' && msg.correlationId === correlationId) {
                parentPort?.off('message', onResult);
                resolve(msg.payload);
              }
            };
            parentPort?.on('message', onResult);
            parentPort?.postMessage({
              type: 'db_query',
              appId,
              correlationId,
              payload: { sql, params }
            } as WorkerMessage);
          });
        }
      },
      console: {
        log: (...args: any[]) => console.log(`[App ${appId}]`, ...args),
        error: (...args: any[]) => console.error(`[App ${appId}]`, ...args),
      }
    };

    // 3. Execution (Server-side)
    let requestHandler: (req: any) => Promise<any>;

    // SSR utilities
    const React = require('react');
    const ReactDOMServer = require('react-dom/server');

    // Default handler for UI-only apps
    const defaultHandler = async (req: any) => {
      // Fetch latest data if needed
      const appRecord = await prisma.app.findUnique({
        where: { id: appId },
        select: { data: true, name: true, description: true }
      });

      const currentData = appRecord?.data || initialData || [];
      const currentName = appRecord?.name || appName || subdomain;
      const currentDesc = appRecord?.description || appDescription || '';

      // Transpile for browser (ESM)
      const browserResult = await esbuild.transform(code, {
        loader: 'tsx',
        format: 'esm',
        target: 'es2020',
        define: {
          'process.env.NODE_ENV': '"development"'
        }
      });

      // Perform SSR
      let ssrHtml = '';
      try {
        const ssrResult = await esbuild.transform(code, {
          loader: 'tsx',
          format: 'cjs',
          target: 'node18',
        });
        
        const mod = { exports: {} as any };
        const execFn = new Function('React', 'require', 'module', 'exports', ssrResult.code);
        execFn(React, require, mod, mod.exports);
        
        const AppToRender = mod.exports.default || mod.exports.App || Object.values(mod.exports).find(v => typeof v === 'function');
        
        if (AppToRender) {
          const APP_PROPS = {
            appId,
            name: currentName,
            description: currentDesc,
            initialData: currentData
          };
          ssrHtml = ReactDOMServer.renderToString(React.createElement(AppToRender, APP_PROPS));
        }
      } catch (err: any) {
        console.warn(`[Worker ${appId}] SSR failed:`, err.message);
      }

      return {
        status: 200,
        body: `
<!DOCTYPE html>
<html lang="en" class="dark">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${currentName} | Nebula</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
    <script type="importmap">
    {
      "imports": {
        "react": "https://esm.sh/react@18.2.0",
        "react-dom": "https://esm.sh/react-dom@18.2.0",
        "react-dom/client": "https://esm.sh/react-dom@18.2.0/client",
        "lucide-react": "https://esm.sh/lucide-react@0.468.0",
        "framer-motion": "https://esm.sh/framer-motion@11.15.0",
        "date-fns": "https://esm.sh/date-fns@3.6.0",
        "clsx": "https://esm.sh/clsx@2.1.1",
        "tailwind-merge": "https://esm.sh/tailwind-merge@2.6.0",
        "recharts": "https://esm.sh/recharts@2.15.0",
        "react-hook-form": "https://esm.sh/react-hook-form@7.54.0",
        "zod": "https://esm.sh/zod@3.24.1",
        "nanoid": "https://esm.sh/nanoid@5.0.7",
        "@/lib/utils": "data:text/javascript,export function cn(...args){return args.filter(Boolean).join(' ')}"
      }
    }
    </script>
    <script>
        tailwind.config = {
            darkMode: 'class',
            theme: {
                extend: {
                    fontFamily: { sans: ['Inter', 'sans-serif'] },
                    colors: {
                        surface: { 
                          base: '#000000', 
                          elevated: '#111111', 
                          layer: '#1a1a1a' 
                        },
                        text: { 
                          primary: '#ffffff', 
                          secondary: '#a1a1aa', 
                          tertiary: '#71717a' 
                        },
                        accent: { 
                          yellow: '#facc15' 
                        },
                        // Sync with main site tokens
                        'surface-base': '#000000',
                        'surface-layer': '#111111',
                        'surface-elevated': '#1a1a1a',
                        'text-primary': '#ffffff',
                        'text-secondary': '#a1a1aa',
                        'text-tertiary': '#71717a',
                        'accent-yellow': '#facc15',
                        'outline-light': '#2d2d2d',
                        'outline-mid': '#3f3f46'
                    }
                }
            }
        }
    </script>
    <style>
        body { font-family: 'Inter', sans-serif; background-color: #000; color: white; margin: 0; padding: 0; overflow-x: hidden; }
        ::-webkit-scrollbar { width: 8px; }
        ::-webkit-scrollbar-track { background: #000; }
        ::-webkit-scrollbar-thumb { background: #333; border-radius: 4px; }
        #root { min-height: 100vh; }
    </style>
</head>
<body class="bg-black text-white">
    <div id="root">${ssrHtml || `
        <div class="h-screen flex items-center justify-center">
            <div class="text-center">
                <div class="w-12 h-12 border-2 border-accent-yellow border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                <p class="text-text-secondary animate-pulse">Launching ${currentName}...</p>
            </div>
        </div>
    `}</div>

    <script type="module">
        import React from 'react';
        import ReactDOM from 'react-dom/client';
        
        // Mock Globals
        window.React = React;
        window.process = { env: { NODE_ENV: 'development' } };
        
        // Global Error Handling
        window.onerror = (message, source, lineno, colno, error) => {
          console.error('Nebula Runtime Error:', { message, source, lineno, colno, error });
          return false;
        };
        window.onunhandledrejection = (event) => {
          console.error('Nebula Unhandled Rejection:', event.reason);
        };
        
        const APP_PROPS = {
            appId: "${appId}",
            name: "${currentName}",
            description: "${currentDesc}",
            initialData: ${JSON.stringify(currentData)}
        };

        // useAppData hook implementation
        window.useAppData = () => {
            const [data, setData] = React.useState(APP_PROPS.initialData);
            const [isLoading, setIsLoading] = React.useState(false);
            
            const addRecord = async (record) => {
                const newRecord = { ...record, id: Math.random().toString(36).substr(2, 9), createdAt: new Date().toISOString() };
                setData(prev => [newRecord, ...prev]);
                return newRecord;
            };
            
            const updateRecord = async (id, updates) => {
                setData(prev => prev.map(r => r.id === id ? { ...r, ...updates } : r));
            };
            
            const deleteRecord = async (id) => {
                setData(prev => prev.filter(r => r.id !== id));
            };
            
            return { data, isLoading, addRecord, updateRecord, deleteRecord };
        };

        // App Component Injection
        async function hydrate() {
            try {
                console.log('Nebula: Starting app injection');
                const code = \`${browserResult.code.replace(/`/g, '\\`').replace(/\$/g, '\\$')}\`;
                const blob = new Blob([code], { type: 'text/javascript' });
                const url = URL.createObjectURL(blob);
                
                const module = await import(url);
                const AppToRender = module.default || module.App || Object.values(module).find(v => typeof v === 'function');
                
                if (!AppToRender) throw new Error('Could not find App component in module exports');

                const root = ReactDOM.hydrateRoot(document.getElementById('root'), React.createElement(AppToRender, APP_PROPS));
                console.log('Nebula: App hydration triggered');
            } catch (err) {
                console.error('Nebula Hydration Error:', err);
                // Fallback to render if hydration fails or if no SSR was present
                try {
                  const root = ReactDOM.createRoot(document.getElementById('root'));
                  root.render(React.createElement(AppToRender, APP_PROPS));
                } catch (e) {}
            }
        }
        
        hydrate();
    </script>
</body>
</html>
        `,
        headers: { 'Content-Type': 'text/html' }
      };
    };

    requestHandler = defaultHandler;

    const nebulaRequire = (moduleName: string) => {
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/acc56320-b9cc-4e4e-9d28-472a8b4e9a94',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'worker.ts:nebulaRequire',message:'nebulaRequire called',data:{moduleName},timestamp:Date.now(),sessionId:'debug-session',runId:'run5',hypothesisId:'H7'})}).catch(()=>{});
      // #endregion
      if (moduleName === 'nebula') {
        return {
          registerHandler: (handler: any) => { 
            console.log(`[Worker ${appId}] App registered custom handler`);
            requestHandler = handler; 
          },
          db: context.db,
        };
      }
      if (moduleName.startsWith('@/')) {
        const relativePath = moduleName.replace('@/', 'src/');
        let fullPath = path.resolve(process.cwd(), relativePath);
        
        try {
          const fs = require('fs');
          const tsPath = fullPath + '.ts';
          const jsPath = fullPath + '.js';
          const indexPath = path.join(fullPath, 'index.ts');
          if (fs.existsSync(tsPath)) fullPath = tsPath;
          else if (fs.existsSync(jsPath)) fullPath = jsPath;
          else if (fs.existsSync(indexPath)) fullPath = indexPath;
        } catch (e) {}

        try {
          const result = require(fullPath);
          // #region agent log
          fetch('http://127.0.0.1:7242/ingest/acc56320-b9cc-4e4e-9d28-472a8b4e9a94',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'worker.ts:nebulaRequire',message:'require(@/) succeeded',data:{moduleName,fullPath},timestamp:Date.now(),sessionId:'debug-session',runId:'run5',hypothesisId:'H7'})}).catch(()=>{});
          // #endregion
          return result;
        } catch (err: any) {
          // #region agent log
          fetch('http://127.0.0.1:7242/ingest/acc56320-b9cc-4e4e-9d28-472a8b4e9a94',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'worker.ts:nebulaRequire',message:'require(@/) failed',data:{moduleName,fullPath,error:err.message},timestamp:Date.now(),sessionId:'debug-session',runId:'run5',hypothesisId:'H7'})}).catch(()=>{});
          // #endregion
          throw err;
        }
      }
      try {
        const result = require(moduleName);
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/acc56320-b9cc-4e4e-9d28-472a8b4e9a94',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'worker.ts:nebulaRequire',message:'require(module) succeeded',data:{moduleName},timestamp:Date.now(),sessionId:'debug-session',runId:'run5',hypothesisId:'H7'})}).catch(()=>{});
        // #endregion
        return result;
      } catch (err: any) {
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/acc56320-b9cc-4e4e-9d28-472a8b4e9a94',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'worker.ts:nebulaRequire',message:'require(module) failed',data:{moduleName,error:err.message},timestamp:Date.now(),sessionId:'debug-session',runId:'run5',hypothesisId:'H7'})}).catch(()=>{});
        // #endregion
        throw err;
      }
    };

    if (nodeResult) {
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/acc56320-b9cc-4e4e-9d28-472a8b4e9a94',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'worker.ts:start',message:'Executing nodeResult',data:{codeSnippet:nodeResult.code.substring(0, 500)},timestamp:Date.now(),sessionId:'debug-session',runId:'run5',hypothesisId:'H7'})}).catch(()=>{});
      // #endregion
      try {
        const execFn = new Function('context', 'require', 'module', 'exports', nodeResult.code);
        const mod = { exports: {} };
        execFn(context, nebulaRequire, mod, mod.exports);
      } catch (err: any) {
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/acc56320-b9cc-4e4e-9d28-472a8b4e9a94',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'worker.ts:start',message:'execFn failed',data:{error:err.message,stack:err.stack},timestamp:Date.now(),sessionId:'debug-session',runId:'run5',hypothesisId:'H7'})}).catch(()=>{});
        // #endregion
        console.warn(`[Worker ${appId}] Server-side execution skipped:`, err.message);
      }
    }

    parentPort.postMessage({ type: 'ready', appId } as WorkerMessage);

    parentPort.on('message', async (msg: SupervisorMessage) => {
      if (msg.type === 'request') {
        try {
          const response = await requestHandler(msg.payload);
          parentPort?.postMessage({
            type: 'response',
            appId,
            correlationId: msg.correlationId,
            payload: response
          } as WorkerMessage);
        } catch (err: any) {
          parentPort?.postMessage({
            type: 'error',
            appId,
            correlationId: msg.correlationId,
            payload: { error: err.message }
          } as WorkerMessage);
        }
      } else if (msg.type === 'stop') {
        process.exit(0);
      }
    });

  } catch (err: any) {
    console.error(`[Worker ${appId}] Fatal startup error:`, err);
    parentPort?.postMessage({
      type: 'error',
      appId,
      payload: { error: err.message }
    } as WorkerMessage);
    process.exit(1);
  }
}

setTimeout(start, 50);
