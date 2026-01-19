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
        "react": "https://esm.sh/react@18",
        "react-dom": "https://esm.sh/react-dom@18",
        "react-dom/client": "https://esm.sh/react-dom@18/client",
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
                        surface: { base: '#000000', elevated: '#111111', layer: '#1a1a1a' },
                        text: { primary: '#ffffff', secondary: '#a1a1aa', tertiary: '#71717a' },
                        accent: { yellow: '#facc15' }
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
        #root { min-h-screen; }
    </style>
</head>
<body class="bg-black text-white">
    <div id="root">
        <div class="h-screen flex items-center justify-center">
            <div class="text-center">
                <div class="w-12 h-12 border-2 border-accent-yellow border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                <p class="text-text-secondary animate-pulse">Launching ${currentName}...</p>
            </div>
        </div>
    </div>

    <script type="module">
        import React from 'react';
        import ReactDOM from 'react-dom/client';
        
        // Mock Globals
        window.React = React;
        window.process = { env: { NODE_ENV: 'development' } };
        
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
                setData(prev => [...prev, newRecord]);
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
        try {
            console.log('Nebula: Starting app injection');
            // We use a blob to load the transpiled ESM code as a module
            const code = \`${browserResult.code.replace(/`/g, '\\`').replace(/\$/g, '\\$')}\`;
            const blob = new Blob([code], { type: 'text/javascript' });
            const url = URL.createObjectURL(blob);
            
            const module = await import(url);
            console.log('Nebula: Module imported', Object.keys(module));
            const AppToRender = module.default || module.App || Object.values(module).find(v => typeof v === 'function');
            
            if (!AppToRender) throw new Error('Could not find App component in module exports');

            const root = ReactDOM.createRoot(document.getElementById('root'));
            root.render(React.createElement(AppToRender, APP_PROPS));
            console.log('Nebula: App render triggered');
            
            fetch('http://127.0.0.1:7243/ingest/abdc0eda-3bc5-4723-acde-13a524455249',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'browser-shell',message:'App rendered successfully',data:{appId:APP_PROPS.appId},timestamp:Date.now(),sessionId:'debug-session',runId:'subdomain-fix',hypothesisId:'H4'})}).catch(()=>{});
        } catch (err) {
            console.error('Nebula Render Error:', err);
            fetch('http://127.0.0.1:7243/ingest/abdc0eda-3bc5-4723-acde-13a524455249',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'browser-shell',message:'Render error',data:{appId:APP_PROPS.appId,error:err.message,stack:err.stack},timestamp:Date.now(),sessionId:'debug-session',runId:'subdomain-fix',hypothesisId:'H4'})}).catch(()=>{});

            document.getElementById('root').innerHTML = `
                <div class="p-10 text-red-500 max-w-3xl mx-auto">
                    <h1 class="text-3xl font-bold mb-6">Runtime Error</h1>
                    <div class="bg-gray-900 p-6 rounded-xl border border-red-500/30">
                        <pre class="text-sm font-mono whitespace-pre-wrap">${err.stack || err.message}</pre>
                    </div>
                </div>
            `;
        }
    </script>
</body>
</html>
        `,
        headers: { 'Content-Type': 'text/html' }
      };
    };

    requestHandler = defaultHandler;

    const nebulaRequire = (moduleName: string) => {
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
        const fullPath = path.resolve(process.cwd(), relativePath);
        return require(fullPath);
      }
      return require(moduleName);
    };

    if (nodeResult) {
      try {
        const execFn = new Function('context', 'require', 'module', 'exports', nodeResult.code);
        const mod = { exports: {} };
        execFn(context, nebulaRequire, mod, mod.exports);
      } catch (err: any) {
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
