import * as esbuild from 'esbuild';
import path from 'path';
import prisma from '@/lib/db';

/**
 * Nebula Runner - Core execution logic for generated apps
 * This module can be used both in worker threads and directly in serverless functions.
 */

export interface NebulaRequest {
  method: string;
  path: string;
  query: Record<string, string>;
  headers: Record<string, string>;
  body: string | null;
}

export interface NebulaResponse {
  status: number;
  body: string;
  headers: Record<string, string>;
  error?: string;
}

export interface AppContext {
  appId: string;
  subdomain: string;
  code: string;
  appName: string;
  appDescription: string;
  initialData: any;
  isV2?: boolean;
  isV3?: boolean;
  componentFiles?: Record<string, string> | null;
  viteComponentFiles?: Record<string, string> | null;
}

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

/**
 * Bundle V3 Vite app with all component files
 * V3 apps use the Vite scaffold with Shadcn components
 */
async function bundleV3App(viteComponentFiles: Record<string, string>): Promise<string> {
  // Create virtual file system for esbuild
  const files: Record<string, string> = {};
  
  for (const [filePath, content] of Object.entries(viteComponentFiles)) {
    // Normalize path - ensure it starts without leading slash
    const normalizedPath = filePath.startsWith('/') ? filePath.slice(1) : filePath;
    files[`/virtual/${normalizedPath}`] = content;
  }
  
  // Check if we have an App.tsx entry point
  const entryFile = files['/virtual/src/App.tsx'] || files['/virtual/App.tsx'];
  if (!entryFile) {
    throw new Error('No App.tsx entry point found in V3 app');
  }
  
  const entryPath = files['/virtual/src/App.tsx'] ? '/virtual/src/App.tsx' : '/virtual/App.tsx';
  
  // Bundle with esbuild
  const result = await esbuild.build({
    stdin: {
      contents: entryFile,
      resolveDir: path.dirname(entryPath),
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
      'react-router-dom',
      '@tanstack/react-query',
      'framer-motion',
      'lucide-react',
      'recharts',
      'date-fns',
      'clsx',
      'tailwind-merge',
      'class-variance-authority',
      'react-hook-form',
      '@hookform/resolvers',
      'zod',
      'nanoid',
      'sonner',
      // Radix UI
      '@radix-ui/react-accordion',
      '@radix-ui/react-alert-dialog',
      '@radix-ui/react-aspect-ratio',
      '@radix-ui/react-avatar',
      '@radix-ui/react-checkbox',
      '@radix-ui/react-collapsible',
      '@radix-ui/react-context-menu',
      '@radix-ui/react-dialog',
      '@radix-ui/react-dropdown-menu',
      '@radix-ui/react-hover-card',
      '@radix-ui/react-label',
      '@radix-ui/react-menubar',
      '@radix-ui/react-navigation-menu',
      '@radix-ui/react-popover',
      '@radix-ui/react-progress',
      '@radix-ui/react-radio-group',
      '@radix-ui/react-scroll-area',
      '@radix-ui/react-select',
      '@radix-ui/react-separator',
      '@radix-ui/react-slider',
      '@radix-ui/react-slot',
      '@radix-ui/react-switch',
      '@radix-ui/react-tabs',
      '@radix-ui/react-toast',
      '@radix-ui/react-toggle',
      '@radix-ui/react-toggle-group',
      '@radix-ui/react-tooltip',
    ],
    define: {
      'process.env.NODE_ENV': '"development"',
      'import.meta.env.DEV': 'true',
      'import.meta.env.PROD': 'false',
      'import.meta.env.MODE': '"development"',
    },
    plugins: [{
      name: 'virtual-fs-v3',
      setup(build) {
        // Handle @ alias imports (e.g., @/components/ui/button)
        build.onResolve({ filter: /^@\// }, args => {
          const importPath = args.path.replace(/^@\//, '');
          
          // Try different paths
          const tryPaths = [
            `/virtual/src/${importPath}`,
            `/virtual/src/${importPath}.tsx`,
            `/virtual/src/${importPath}.ts`,
            `/virtual/src/${importPath}/index.tsx`,
            `/virtual/src/${importPath}/index.ts`,
            `/virtual/${importPath}`,
            `/virtual/${importPath}.tsx`,
            `/virtual/${importPath}.ts`,
          ];
          
          for (const tryPath of tryPaths) {
            if (files[tryPath]) {
              return { path: tryPath, namespace: 'virtual' };
            }
          }
          
          // Return the path anyway for external resolution
          return { path: `/virtual/src/${importPath}`, namespace: 'virtual' };
        });
        
        // Resolve relative imports
        build.onResolve({ filter: /^\./ }, args => {
          const basePath = args.importer.replace('/virtual/', '');
          const baseDir = path.dirname(basePath);
          const resolvedPath = path.join(baseDir, args.path);
          
          // Try with and without .tsx/.ts extension
          const tryPaths = [
            `/virtual/${resolvedPath}`,
            `/virtual/${resolvedPath}.tsx`,
            `/virtual/${resolvedPath}.ts`,
            `/virtual/${resolvedPath}/index.tsx`,
            `/virtual/${resolvedPath}/index.ts`,
          ];
          
          for (const tryPath of tryPaths) {
            if (files[tryPath]) {
              return { path: tryPath, namespace: 'virtual' };
            }
          }
          
          return { path: `/virtual/${resolvedPath}`, namespace: 'virtual' };
        });
        
        // Load files from virtual file system
        build.onLoad({ filter: /.*/, namespace: 'virtual' }, args => {
          const content = files[args.path];
          if (!content) {
            // Return empty module for missing files
            return { 
              contents: '// File not found: ' + args.path + '\nexport default {};', 
              loader: 'tsx' 
            };
          }
          return { contents: content, loader: 'tsx' };
        });
      }
    }]
  });
  
  return result.outputFiles[0].text;
}

/**
 * Execute a request against a Nebula app
 */
export async function executeRequest(
  context: AppContext,
  request: NebulaRequest
): Promise<NebulaResponse> {
  const { appId, subdomain, code, appName, appDescription, initialData } = context;
  const path = request.path || '/';

  try {
    // Check if it's a data API request
    if (path === '/api/nebula/data') {
      return handleDataRequest(appId, request);
    }

    // Fetch latest app data
    const appRecord = await prisma.app.findUnique({
      where: { id: appId },
      select: { data: true, name: true, description: true }
    });

    const currentData = typeof appRecord?.data === 'string' ? JSON.parse(appRecord.data) : (appRecord?.data || initialData || []);
    const currentName = appRecord?.name || appName || subdomain;
    const currentDesc = appRecord?.description || appDescription || '';

    // Bundle or transpile based on app version
    let browserCode: string;
    
    if (context.isV3 && context.viteComponentFiles) {
      // Bundle V3 Vite app (Dyad-style scaffold)
      browserCode = await bundleV3App(context.viteComponentFiles);
    } else if (context.isV2 && context.componentFiles) {
      // Bundle V2 app (modular components)
      browserCode = await bundleV2App(context.componentFiles);
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

    // Generate the HTML response
    const html = generateAppHtml({
      appId,
      currentName,
      currentDesc,
      currentData,
      browserCode,
    });

    return {
      status: 200,
      body: html,
      headers: { 'Content-Type': 'text/html' }
    };
  } catch (err: any) {
    console.error(`[Runner ${appId}] Execution error:`, err);
    return {
      status: 500,
      body: JSON.stringify({ error: err.message }),
      headers: { 'Content-Type': 'application/json' },
      error: err.message
    };
  }
}

/**
 * Handle data API requests (GET/POST /api/nebula/data)
 */
async function handleDataRequest(
  appId: string,
  request: NebulaRequest
): Promise<NebulaResponse> {
  const method = request.method || 'GET';

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
      const payload = typeof request.body === 'string' ? JSON.parse(request.body) : request.body;
      const { action, id, record } = payload || {};

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

    return {
      status: 405,
      body: JSON.stringify({ error: 'Method not allowed' }),
      headers: { 'Content-Type': 'application/json' }
    };
  } catch (err: any) {
    console.error(`[Runner ${appId}] Data API error:`, err);
    return {
      status: 500,
      body: JSON.stringify({ error: err.message }),
      headers: { 'Content-Type': 'application/json' }
    };
  }
}

/**
 * Generate the full HTML page for a Nebula app
 */
function generateAppHtml(params: {
  appId: string;
  currentName: string;
  currentDesc: string;
  currentData: any;
  browserCode: string;
}): string {
  const { appId, currentName, currentDesc, currentData, browserCode } = params;
  const codeBase64 = Buffer.from(browserCode, 'utf8').toString('base64');

  return `
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
        "react-router-dom": "https://esm.sh/react-router-dom@6.26.2?deps=react@18.2.0",
        "@tanstack/react-query": "https://esm.sh/@tanstack/react-query@5.56.2?deps=react@18.2.0",
        "lucide-react": "https://esm.sh/lucide-react@0.468.0?deps=react@18.2.0",
        "framer-motion": "https://esm.sh/framer-motion@11.15.0?deps=react@18.2.0",
        "date-fns": "https://esm.sh/date-fns@3.6.0",
        "clsx": "https://esm.sh/clsx@2.1.1",
        "tailwind-merge": "https://esm.sh/tailwind-merge@2.6.0",
        "class-variance-authority": "https://esm.sh/class-variance-authority@0.7.1",
        "recharts": "https://esm.sh/recharts@2.15.0?deps=react@18.2.0",
        "react-hook-form": "https://esm.sh/react-hook-form@7.54.0?deps=react@18.2.0",
        "@hookform/resolvers": "https://esm.sh/@hookform/resolvers@3.9.0?deps=react-hook-form@7.54.0",
        "zod": "https://esm.sh/zod@3.24.1",
        "nanoid": "https://esm.sh/nanoid@5.0.7",
        "sonner": "https://esm.sh/sonner@1.5.0?deps=react@18.2.0",
        "@radix-ui/react-accordion": "https://esm.sh/@radix-ui/react-accordion@1.2.0?deps=react@18.2.0",
        "@radix-ui/react-alert-dialog": "https://esm.sh/@radix-ui/react-alert-dialog@1.1.1?deps=react@18.2.0",
        "@radix-ui/react-aspect-ratio": "https://esm.sh/@radix-ui/react-aspect-ratio@1.1.0?deps=react@18.2.0",
        "@radix-ui/react-avatar": "https://esm.sh/@radix-ui/react-avatar@1.1.0?deps=react@18.2.0",
        "@radix-ui/react-checkbox": "https://esm.sh/@radix-ui/react-checkbox@1.1.1?deps=react@18.2.0",
        "@radix-ui/react-collapsible": "https://esm.sh/@radix-ui/react-collapsible@1.1.0?deps=react@18.2.0",
        "@radix-ui/react-context-menu": "https://esm.sh/@radix-ui/react-context-menu@2.2.1?deps=react@18.2.0",
        "@radix-ui/react-dialog": "https://esm.sh/@radix-ui/react-dialog@1.1.2?deps=react@18.2.0",
        "@radix-ui/react-dropdown-menu": "https://esm.sh/@radix-ui/react-dropdown-menu@2.1.1?deps=react@18.2.0",
        "@radix-ui/react-hover-card": "https://esm.sh/@radix-ui/react-hover-card@1.1.1?deps=react@18.2.0",
        "@radix-ui/react-label": "https://esm.sh/@radix-ui/react-label@2.1.0?deps=react@18.2.0",
        "@radix-ui/react-menubar": "https://esm.sh/@radix-ui/react-menubar@1.1.1?deps=react@18.2.0",
        "@radix-ui/react-navigation-menu": "https://esm.sh/@radix-ui/react-navigation-menu@1.2.0?deps=react@18.2.0",
        "@radix-ui/react-popover": "https://esm.sh/@radix-ui/react-popover@1.1.1?deps=react@18.2.0",
        "@radix-ui/react-progress": "https://esm.sh/@radix-ui/react-progress@1.1.0?deps=react@18.2.0",
        "@radix-ui/react-radio-group": "https://esm.sh/@radix-ui/react-radio-group@1.2.0?deps=react@18.2.0",
        "@radix-ui/react-scroll-area": "https://esm.sh/@radix-ui/react-scroll-area@1.1.0?deps=react@18.2.0",
        "@radix-ui/react-select": "https://esm.sh/@radix-ui/react-select@2.1.1?deps=react@18.2.0",
        "@radix-ui/react-separator": "https://esm.sh/@radix-ui/react-separator@1.1.0?deps=react@18.2.0",
        "@radix-ui/react-slider": "https://esm.sh/@radix-ui/react-slider@1.2.0?deps=react@18.2.0",
        "@radix-ui/react-slot": "https://esm.sh/@radix-ui/react-slot@1.1.0?deps=react@18.2.0",
        "@radix-ui/react-switch": "https://esm.sh/@radix-ui/react-switch@1.1.0?deps=react@18.2.0",
        "@radix-ui/react-tabs": "https://esm.sh/@radix-ui/react-tabs@1.1.0?deps=react@18.2.0",
        "@radix-ui/react-toast": "https://esm.sh/@radix-ui/react-toast@1.2.1?deps=react@18.2.0",
        "@radix-ui/react-toggle": "https://esm.sh/@radix-ui/react-toggle@1.1.0?deps=react@18.2.0",
        "@radix-ui/react-toggle-group": "https://esm.sh/@radix-ui/react-toggle-group@1.1.0?deps=react@18.2.0",
        "@radix-ui/react-tooltip": "https://esm.sh/@radix-ui/react-tooltip@1.1.4?deps=react@18.2.0",
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
        
        window.React = React;
        window.process = { env: { NODE_ENV: 'development' } };
        
        const APP_PROPS = {
            appId: "${appId}",
            name: "${currentName}",
            description: "${currentDesc}",
            initialData: ${JSON.stringify(currentData)}
        };

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

        async function hydrate() {
            try {
                const codeBase64 = "${codeBase64}";
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
                document.getElementById('root').innerHTML = '<div class="h-screen flex items-center justify-center"><div class="text-center text-red-400"><p>Failed to load app</p><p class="text-sm text-text-tertiary mt-2">' + err.message + '</p></div></div>';
            }
        }
        
        hydrate();
    </script>
</body>
</html>
  `;
}

/**
 * Load app context from the database
 */
export async function loadAppContext(appId: string): Promise<AppContext | null> {
  const app = await prisma.app.findFirst({
    where: {
      OR: [
        { id: appId },
        { subdomain: appId }
      ]
    },
    select: {
      id: true,
      subdomain: true,
      componentFiles: true,
      generatedCode: true,
      name: true,
      description: true,
      data: true,
      scaffoldVersion: true,
      viteComponentFiles: true,
    }
  });

  if (!app || !app.subdomain) {
    return null;
  }

  // Parse componentFiles if it's a string
  const parsedComponentFiles = typeof app.componentFiles === 'string' 
    ? JSON.parse(app.componentFiles) 
    : app.componentFiles;

  // Parse V3 viteComponentFiles
  const parsedViteComponentFiles = typeof app.viteComponentFiles === 'string' 
    ? JSON.parse(app.viteComponentFiles) 
    : app.viteComponentFiles;

  // Detect app version
  const isV3 = app.scaffoldVersion === 'v3' && parsedViteComponentFiles && Object.keys(parsedViteComponentFiles).length > 0;
  const isV2 = !isV3 && !!(parsedComponentFiles && parsedComponentFiles['App.tsx']);
  
  // Get the entry code based on version
  let code: string;
  if (isV3) {
    code = parsedViteComponentFiles['src/App.tsx'] || parsedViteComponentFiles['App.tsx'] || '';
  } else if (isV2) {
    code = parsedComponentFiles['App.tsx'] || '';
  } else {
    // V1 app
    code = (typeof app.generatedCode === 'string' ? JSON.parse(app.generatedCode) : app.generatedCode)?.pageComponent || '';
  }

  return {
    appId: app.id,
    subdomain: app.subdomain,
    code,
    appName: app.name || '',
    appDescription: app.description || '',
    initialData: typeof app.data === 'string' ? JSON.parse(app.data) : (app.data || []),
    isV2,
    isV3,
    componentFiles: isV2 ? parsedComponentFiles : null,
    viteComponentFiles: isV3 ? parsedViteComponentFiles : null,
  };
}
