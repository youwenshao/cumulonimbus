import * as esbuild from 'esbuild';
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

    // Generate the HTML response
    const html = generateAppHtml({
      appId,
      currentName,
      currentDesc,
      currentData,
      browserCode: browserResult.code,
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
      return {
        status: 200,
        body: JSON.stringify(app?.data || []),
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
      let currentData = (app?.data as any[]) || [];

      if (action === 'add') {
        currentData = [record, ...currentData];
      } else if (action === 'update') {
        currentData = currentData.map(r => r.id === id ? { ...r, ...record } : r);
      } else if (action === 'delete') {
        currentData = currentData.filter(r => r.id !== id);
      }

      await prisma.app.update({
        where: { id: appId },
        data: { data: currentData }
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
      data: true
    }
  });

  if (!app || !app.subdomain) {
    return null;
  }

  const code = (app.componentFiles as any)?.['App.tsx'] || (app.generatedCode as any)?.pageComponent || '';

  return {
    appId: app.id,
    subdomain: app.subdomain,
    code,
    appName: app.name || '',
    appDescription: app.description || '',
    initialData: app.data || []
  };
}
