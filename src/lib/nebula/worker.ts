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

const { appId, subdomain, code, componentFiles, appName, appDescription, initialData } = workerData;
const prisma = new PrismaClient();

/**
 * Bundle V2 app with all component files into a single module
 */
async function bundleV2App(componentFiles: Record<string, string>): Promise<string> {
  // Create virtual file system for esbuild
  const files: Record<string, string> = {};
  
  for (const [filePath, content] of Object.entries(componentFiles)) {
    files[`/virtual/${filePath}`] = content;
  }
  
  // Bundle with esbuild
  const result = await esbuild.build({
    stdin: {
      contents: files['/virtual/App.tsx'],
      resolveDir: '/virtual',
      sourcefile: 'App.tsx',
      loader: 'tsx'
    },
    bundle: true,
    format: 'esm',
    target: 'es2020',
    write: false,
    external: [
      'react',
      'react-dom',
      'react-dom/client',
      'framer-motion',
      'lucide-react',
      'recharts',
      'date-fns',
      'clsx',
      'tailwind-merge',
      'react-hook-form',
      'zod',
      'nanoid'
    ],
    define: {
      'process.env.NODE_ENV': '"development"'
    },
    plugins: [{
      name: 'virtual-fs',
      setup(build) {
        // Resolve relative imports
        build.onResolve({ filter: /^\./ }, args => {
          const resolvedPath = path.join(path.dirname(args.importer), args.path);
          const normalizedPath = resolvedPath.replace('/virtual/', '');
          
          // Try with and without .tsx/.ts extension
          for (const ext of ['', '.tsx', '.ts']) {
            const tryPath = normalizedPath + ext;
            if (files[`/virtual/${tryPath}`]) {
              return { path: `/virtual/${tryPath}`, namespace: 'virtual' };
            }
          }
          
          return { path: resolvedPath, namespace: 'virtual' };
        });
        
        // Load files from virtual file system
        build.onLoad({ filter: /.*/, namespace: 'virtual' }, args => {
          const content = files[args.path];
          if (!content) {
            return { errors: [{ text: `File not found: ${args.path}` }] };
          }
          return { contents: content, loader: 'tsx' };
        });
      }
    }]
  });
  
  return result.outputFiles[0].text;
}

async function start() {
  if (!parentPort) return;

  try {
    console.log(`[Worker ${appId}] Starting (ESM)...`);
    
    // Send a "starting" status before we do heavy work
    parentPort.postMessage({ type: 'status', appId, payload: { status: 'starting' } } as WorkerMessage);
    
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
          return result;
        } catch (err: any) {
          throw err;
        }
      }

      // Handle relative imports from componentFiles
      if (moduleName.startsWith('./') || moduleName.startsWith('../')) {
        const triedPaths: string[] = [];
        
        // Normalize the path by removing relative prefixes
        let normalizedPath = moduleName;
        // Remove leading ../ and ./
        while (normalizedPath.startsWith('../') || normalizedPath.startsWith('./')) {
          if (normalizedPath.startsWith('../')) {
            normalizedPath = normalizedPath.substring(3);
          } else if (normalizedPath.startsWith('./')) {
            normalizedPath = normalizedPath.substring(2);
          }
        }
        
        // Build comprehensive list of paths to try
        const basePaths = [
          normalizedPath,
          normalizedPath.replace(/^hooks\//, ''),  // hooks/useAppData -> useAppData
          normalizedPath.replace(/^components\//, ''),  // components/Form -> Form
          normalizedPath.replace(/^lib\//, ''),  // lib/api -> api
        ];
        
        const pathVariations: string[] = [];
        
        for (const basePath of basePaths) {
          // Try with different extensions
          const extensions = ['', '.tsx', '.ts', '.jsx', '.js', '/index.ts', '/index.tsx'];
          for (const ext of extensions) {
            const pathWithExt = basePath + ext;
            // Try with different directory prefixes
            pathVariations.push(
              pathWithExt,
              `lib/${pathWithExt}`,
              `components/${pathWithExt}`,
              `hooks/${pathWithExt}`,
            );
          }
        }

        // Remove duplicates
        const uniquePaths = [...new Set(pathVariations)];

        for (const key of uniquePaths) {
          triedPaths.push(key);
          if (componentFiles && componentFiles[key]) {
            console.log(`[Worker ${appId}] Resolving relative import: ${moduleName} -> ${key}`);
            
            // Transpile the dependency on the fly
            try {
              const fileContent = componentFiles[key];
              const depResult = esbuild.transformSync(fileContent, {
                loader: key.endsWith('ts') || key.endsWith('tsx') ? 'tsx' : 'jsx',
                format: 'cjs',
                target: 'node18',
              });
              
              const depMod = { exports: {} as any };
              const depExecFn = new Function('React', 'require', 'module', 'exports', depResult.code);
              depExecFn(React, nebulaRequire, depMod, depMod.exports);
              
              return depMod.exports;
            } catch (err: any) {
              console.error(`[Worker ${appId}] Failed to transpile dependency ${key}:`, err.message);
              throw err;
            }
          }
        }
        
        // Log all attempted paths for debugging
        console.error(`[Worker ${appId}] Module not found: ${moduleName}`);
        console.error(`[Worker ${appId}] Tried ${triedPaths.length} path variations:`);
        console.error(`[Worker ${appId}] Available componentFiles keys:`, Object.keys(componentFiles || {}));
        console.error(`[Worker ${appId}] Sample tried paths:`, triedPaths.slice(0, 10));
      }

      try {
        const result = require(moduleName);
        return result;
      } catch (err: any) {
        throw err;
      }
    };

    // Default handler for UI-only apps
    const defaultHandler = async (req: any) => {
      // Check if it's an API request
      const path = req.path || req.url || '/';
      const url = new URL(path, `http://${subdomain}.nebula.internal`);
      
      if (url.pathname === '/api/nebula/data') {
        const method = req.method || 'GET';
        
        try {
          if (method === 'GET') {
            const app = await prisma.app.findUnique({
              where: { id: appId },
              select: { data: true }
            });
            const data = typeof app?.data === 'string' ? JSON.parse(app.data) : (app?.data || []);
            return {
              status: 200,
              body: JSON.stringify(data),
              headers: { 'Content-Type': 'application/json' }
            };
          }
          
          if (method === 'POST') {
            const payload = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
            const { action, id, record } = payload;
            
            const app = await prisma.app.findUnique({
              where: { id: appId },
              select: { data: true }
            });
            let currentData = (typeof app?.data === 'string' ? JSON.parse(app.data) : (app?.data || [])) as any[];
            
            if (action === 'add') {
              currentData = [record, ...currentData];
            } else if (action === 'update') {
              currentData = currentData.map(r => r.id === id ? { ...r, ...record } : r);
            } else if (action === 'delete') {
              currentData = currentData.filter(r => r.id !== id);
            }
            
            await prisma.app.update({
              where: { id: appId },
              data: { data: JSON.stringify(currentData) }
            });
            
            return {
              status: 200,
              body: JSON.stringify({ success: true, data: currentData }),
              headers: { 'Content-Type': 'application/json' }
            };
          }
        } catch (err: any) {
          console.error(`[Worker ${appId}] Data API error:`, err);
          return {
            status: 500,
            body: JSON.stringify({ error: err.message }),
            headers: { 'Content-Type': 'application/json' }
          };
        }
      }

    const appRecord = await prisma.app.findUnique({
      where: { id: appId },
      select: { data: true, name: true, description: true }
    });

    const currentData = typeof appRecord?.data === 'string' ? JSON.parse(appRecord.data) : (appRecord?.data || initialData || []);
    const currentName = appRecord?.name || appName || subdomain;
    const currentDesc = appRecord?.description || appDescription || '';

      // Bundle or transpile based on app version
      let browserCode: string;
      const isV2 = !!(componentFiles && componentFiles['App.tsx']);
      
      if (isV2) {
        // Bundle V2 app (modular components)
        console.log(`[Worker ${appId}] Bundling V2 app with ${Object.keys(componentFiles).length} files`);
        browserCode = await bundleV2App(componentFiles);
      } else {
        // Transpile V1 app (single file)
        const browserResult = await esbuild.transform(code, {
          loader: 'tsx',
          format: 'esm',
          target: 'es2020',
          define: {
            'process.env.NODE_ENV': '"development"'
          }
        });
        browserCode = browserResult.code;
      }

      // Perform SSR
      let ssrHtml = '';
      try {
        const ssrResult = await esbuild.transform(code, {
          loader: 'tsx',
          format: 'cjs',
          target: 'node18',
        });
        
        const mod = { exports: {} as any };
        const execFn = new Function('React', 'require', 'module', 'exports', 'useAppData', ssrResult.code);
        
        // SSR implementation of useAppData
        const useAppData = () => {
          return {
            data: currentData,
            isLoading: false,
            addRecord: async () => {},
            updateRecord: async () => {},
            deleteRecord: async () => {},
          };
        };

        execFn(React, nebulaRequire, mod, mod.exports, useAppData);
        
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

    const browserImports: Record<string, string> = {
      "react": "https://esm.sh/react@18.2.0",
      "react-dom": "https://esm.sh/react-dom@18.2.0",
      "react-dom/client": "https://esm.sh/react-dom@18.2.0/client",
      "lucide-react": "https://esm.sh/lucide-react@0.468.0?deps=react@18.2.0",
      "framer-motion": "https://esm.sh/framer-motion@11.15.0?deps=react@18.2.0",
      "date-fns": "https://esm.sh/date-fns@3.6.0",
      "clsx": "https://esm.sh/clsx@2.1.1",
      "tailwind-merge": "https://esm.sh/tailwind-merge@2.6.0",
      "recharts": "https://esm.sh/recharts@2.15.0?deps=react@18.2.0",
      "react-hook-form": "https://esm.sh/react-hook-form@7.54.0?deps=react@18.2.0",
      "zod": "https://esm.sh/zod@3.24.1",
      "nanoid": "https://esm.sh/nanoid@5.0.7",
      "@/lib/utils": "data:text/javascript,export function cn(...args){return args.filter(Boolean).join(' ')}"
    };

    // Add component files to import map as data URIs (V1 apps only)
    // V2 apps use bundling instead
    if (componentFiles && !isV2) {
      for (const [filename, fileCode] of Object.entries(componentFiles)) {
        // Skip the main App.tsx as it's handled by hydration
        if (filename === 'App.tsx') continue;
        
        // Transpile to ESM for browser
        try {
          const browserDepResult = esbuild.transformSync(fileCode as string, {
            loader: filename.endsWith('ts') || filename.endsWith('tsx') ? 'tsx' : 'jsx',
            format: 'esm',
            target: 'es2020',
          });
          
          const base64Code = Buffer.from(browserDepResult.code, 'utf8').toString('base64');
          const dataUri = `data:text/javascript;base64,${base64Code}`;
          
          // Add variations for resolution (./lib/hooks, lib/hooks, etc.)
          const baseName = filename.replace(/\.(tsx|ts|jsx|js)$/, '');
          browserImports[`./${baseName}`] = dataUri;
          browserImports[baseName] = dataUri;
          browserImports[`./${filename}`] = dataUri;
          browserImports[filename] = dataUri;
        } catch (e) {
          console.warn(`[Worker ${appId}] Failed to transpile ${filename} for browser:`, e);
        }
      }
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
      "imports": ${JSON.stringify(browserImports, null, 2)}
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
        
        const APP_PROPS = {
            appId: "${appId}",
            name: "${currentName}",
            description: "${currentDesc}",
            initialData: ${JSON.stringify(currentData)}
        };

        // useAppData hook implementation
        window.useAppData = () => {
            const [data, setData] = React.useState(APP_PROPS.initialData || []);
            const [isLoading, setIsLoading] = React.useState(false);
            
            React.useEffect(() => {
                if (APP_PROPS.initialData && APP_PROPS.initialData.length > 0) {
                  return;
                }
                const loadData = async () => {
                    setIsLoading(true);
                    try {
                        const res = await fetch('/api/nebula/data');
                        const json = await res.json();
                        setData(json);
                    } catch (err) {
                        console.error('Failed to load data:', err);
                    } finally {
                        setIsLoading(false);
                    }
                };
                loadData();
            }, []);

            const addRecord = async (record) => {
                const newRecord = { ...record, id: Math.random().toString(36).substr(2, 9), createdAt: new Date().toISOString() };
                setData(prev => [newRecord, ...prev]);
                try {
                    const res = await fetch('/api/nebula/data', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ action: 'add', record: newRecord })
                    });
                    const json = await res.json();
                    if (json.data) setData(json.data);
                    return newRecord;
                } catch (err) {
                    console.error('Failed to add record:', err);
                }
            };
            
            const updateRecord = async (id, updates) => {
                setData(prev => prev.map(r => r.id === id ? { ...r, ...updates } : r));
                try {
                    const res = await fetch('/api/nebula/data', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ action: 'update', id, record: updates })
                    });
                    const json = await res.json();
                    if (json.data) setData(json.data);
                } catch (err) {
                    console.error('Failed to update record:', err);
                }
            };
            
            const deleteRecord = async (id) => {
                setData(prev => prev.filter(r => r.id !== id));
                try {
                    const res = await fetch('/api/nebula/data', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ action: 'delete', id })
                    });
                    const json = await res.json();
                    if (json.data) setData(json.data);
                } catch (err) {
                    console.error('Failed to delete record:', err);
                }
            };
            
            return { data, isLoading, addRecord, updateRecord, deleteRecord };
        };

        // App Component Injection
        async function hydrate() {
            try {
                const codeBase64 = "${Buffer.from(browserCode, 'utf8').toString('base64')}";
                const code = decodeURIComponent(atob(codeBase64).split('').map(function(c) {
                    return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
                }).join(''));
                
                const blob = new Blob([code], { type: 'text/javascript' });
                const url = URL.createObjectURL(blob);
                
                const appModule = await import(url);
                const AppToRender = appModule.default || appModule.App || Object.values(appModule).find(v => typeof v === 'function');
                
                if (!AppToRender) throw new Error('Could not find App component in module exports');

                const rootElement = document.getElementById('root');
                if (!rootElement) return;
                
                const R = window.React || React;
                let element;
                
                const isAlreadyElement = AppToRender && typeof AppToRender === 'object' && AppToRender.$$typeof !== undefined;
                
                if (isAlreadyElement) {
                    element = AppToRender;
                } else if (typeof AppToRender === 'function') {
                    element = R.createElement(AppToRender, APP_PROPS);
                } else {
                    element = R.createElement('div', null, String(AppToRender));
                }
                
                rootElement.innerHTML = ''; 
                const root = ReactDOM.createRoot(rootElement);
                root.render(element);
            } catch (err) {
                console.error('Nebula Injection Error:', err);
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

// Start immediately, no artificial delay
start();
