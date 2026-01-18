/**
 * Runtime Container API
 * 
 * Manages Docker containers for published apps.
 * 
 * Routes:
 * - GET  /api/runtime/[appId] - Get container status
 * - POST /api/runtime/[appId] - Create/start container
 * - DELETE /api/runtime/[appId] - Stop and destroy container
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth';
import prisma from '@/lib/db';
import { getRuntimeManager, getPoolManager } from '@/lib/runtime-manager/instance';
import { bundleAppCode } from '@/lib/runtime/server-bundler';

interface RouteParams {
  params: Promise<{ appId: string }>;
}

/**
 * GET /api/runtime/[appId]
 * Get the runtime status for an app
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession();
    const { appId } = await params;

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify app ownership
    const app = await prisma.app.findFirst({
      where: { id: appId, userId: session.user.id },
      select: { id: true, name: true, status: true },
    });

    if (!app) {
      return NextResponse.json({ error: 'App not found' }, { status: 404 });
    }

    const manager = getRuntimeManager();
    const env = await manager.getEnvironmentByAppId(appId);

    if (!env) {
      return NextResponse.json({
        appId,
        status: 'not_running',
        environment: null,
        message: 'No container running for this app',
      });
    }

    // Get container stats
    let stats = null;
    try {
      stats = await manager.getStats(env.id);
    } catch {
      // Stats might fail if container is starting up
    }

    return NextResponse.json({
      appId,
      status: env.status,
      environment: {
        id: env.id,
        url: env.url,
        createdAt: env.createdAt,
        lastUsed: env.lastUsed,
      },
      stats,
    });
  } catch (error) {
    console.error('[Runtime API] GET error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to get status' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/runtime/[appId]
 * Create and start a Docker container for an app
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession();
    const { appId } = await params;

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get the app with its code
    const app = await prisma.app.findFirst({
      where: { id: appId, userId: session.user.id },
      select: {
        id: true,
        name: true,
        description: true,
        status: true,
        componentFiles: true,
        generatedCode: true,
        spec: true,
      },
    });

    if (!app) {
      return NextResponse.json({ error: 'App not found' }, { status: 404 });
    }

    // Get the code to deploy
    const componentFiles = app.componentFiles as Record<string, string> | null;
    const generatedCode = app.generatedCode as { pageComponent?: string } | null;
    
    let appCode = '';
    if (componentFiles?.['App.tsx']) {
      appCode = componentFiles['App.tsx'];
    } else if (componentFiles?.['bundled']) {
      appCode = componentFiles['bundled'];
    } else if (generatedCode?.pageComponent) {
      appCode = generatedCode.pageComponent;
    }

    if (!appCode) {
      return NextResponse.json(
        { error: 'No code found for this app' },
        { status: 400 }
      );
    }

    // Bundle the code server-side
    const bundleResult = await bundleAppCode({
      code: appCode,
      appId,
      minify: true,
    });

    if (!bundleResult.success) {
      return NextResponse.json(
        {
          error: 'Failed to bundle app code',
          details: bundleResult.errors,
        },
        { status: 400 }
      );
    }

    // Generate project files for the container
    const files = generateProjectFiles(app.name, bundleResult.code, app.spec);

    // Get pool manager and create/acquire environment
    const pool = getPoolManager();
    const manager = getRuntimeManager();

    // Check if already running
    const existingEnv = await manager.getEnvironmentByAppId(appId);
    if (existingEnv && existingEnv.status === 'running') {
      return NextResponse.json({
        success: true,
        message: 'Container already running',
        environment: {
          id: existingEnv.id,
          url: existingEnv.url,
          status: existingEnv.status,
        },
      });
    }

    // Acquire environment from pool
    console.log(`[Runtime API] Acquiring environment for ${appId}...`);
    const env = await pool.acquire(appId);
    console.log(`[Runtime API] Acquired environment ${env.id}`);

    // Deploy code to container
    console.log(`[Runtime API] Deploying code to ${env.id}...`);
    const deployResult = await manager.deployCode(env.id, files);

    if (!deployResult.success) {
      console.error(`[Runtime API] Deployment failed:`, deployResult.error);
      await pool.release(env);
      return NextResponse.json(
        {
          error: 'Failed to deploy code',
          details: deployResult.error,
          logs: deployResult.logs,
        },
        { status: 500 }
      );
    }

    // Start the application
    console.log(`[Runtime API] Starting app in ${env.id}...`);
    await manager.startApp(env.id);

    // Update app status
    await prisma.app.update({
      where: { id: appId },
      data: { status: 'ACTIVE' },
    });

    return NextResponse.json({
      success: true,
      message: 'Container started successfully',
      environment: {
        id: env.id,
        url: env.url,
        status: 'running',
      },
      deployLogs: deployResult.logs,
    });
  } catch (error) {
    console.error('[Runtime API] POST error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to start container' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/runtime/[appId]
 * Stop and destroy the container for an app
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession();
    const { appId } = await params;

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify app ownership
    const app = await prisma.app.findFirst({
      where: { id: appId, userId: session.user.id },
      select: { id: true },
    });

    if (!app) {
      return NextResponse.json({ error: 'App not found' }, { status: 404 });
    }

    const manager = getRuntimeManager();
    const env = await manager.getEnvironmentByAppId(appId);

    if (!env) {
      return NextResponse.json({
        success: true,
        message: 'No container running for this app',
      });
    }

    // Destroy the container
    console.log(`[Runtime API] Destroying container ${env.id} for app ${appId}...`);
    await manager.destroyEnvironment(env.id);

    // Update app status
    await prisma.app.update({
      where: { id: appId },
      data: { status: 'DRAFT' },
    });

    return NextResponse.json({
      success: true,
      message: 'Container stopped and destroyed',
    });
  } catch (error) {
    console.error('[Runtime API] DELETE error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to stop container' },
      { status: 500 }
    );
  }
}

/**
 * Generate project files for the Docker container
 */
function generateProjectFiles(
  appName: string,
  bundledCode: string,
  spec: unknown
): Record<string, string> {
  const safeAppName = appName.replace(/[^a-zA-Z0-9-]/g, '-').toLowerCase();
  
  return {
    'package.json': JSON.stringify({
      name: safeAppName,
      version: '1.0.0',
      private: true,
      scripts: {
        start: 'npx serve -s build -l 3000',
        dev: 'npx vite --host 0.0.0.0 --port 3000',
      },
      dependencies: {
        react: '^18.2.0',
        'react-dom': '^18.2.0',
      },
    }, null, 2),

    'index.html': `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${appName}</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <script crossorigin src="https://cdn.jsdelivr.net/npm/react@18/umd/react.production.min.js"></script>
  <script crossorigin src="https://cdn.jsdelivr.net/npm/react-dom@18/umd/react-dom.production.min.js"></script>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    html, body, #root { height: 100%; }
    body { font-family: system-ui, sans-serif; background: #0a0a0a; color: #fff; }
  </style>
</head>
<body>
  <div id="root"></div>
  <script>
    // Mock useAppData for standalone mode
    window.useAppData = function() {
      const [data, setData] = React.useState([]);
      const [isLoading, setIsLoading] = React.useState(false);
      const [error, setError] = React.useState(null);
      
      const addRecord = async (record) => {
        const newRecord = { id: Date.now().toString(), ...record, createdAt: new Date().toISOString() };
        setData(prev => [...prev, newRecord]);
        return newRecord;
      };
      
      const updateRecord = async (id, updates) => {
        setData(prev => prev.map(r => r.id === id ? { ...r, ...updates } : r));
        return data.find(r => r.id === id);
      };
      
      const deleteRecord = async (id) => {
        setData(prev => prev.filter(r => r.id !== id));
      };
      
      return { data, isLoading, error, addRecord, updateRecord, deleteRecord, refresh: () => {} };
    };
    
    // Mock SandboxAPI
    window.SandboxAPI = {
      fetch: (url, opts) => fetch(url, opts).then(r => r.json()),
      getData: () => [],
      updateData: () => {},
    };
  </script>
  <script>
${bundledCode}
  </script>
</body>
</html>`,

    'vite.config.js': `
import { defineConfig } from 'vite';
export default defineConfig({
  server: {
    host: '0.0.0.0',
    port: 3000,
  },
});
`,
  };
}
