
import { NextRequest, NextResponse } from 'next/server';
import { getPoolManager, getRuntimeManager } from '@/lib/runtime-manager/instance';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { appId, files } = body;

    if (!appId || !files) {
      return NextResponse.json({ error: 'Missing appId or files' }, { status: 400 });
    }

    const pool = getPoolManager();
    const manager = getRuntimeManager();

    // 1. Acquire environment
    console.log(`[Runtime] Acquiring environment for ${appId}...`);
    const env = await pool.acquire(appId);
    console.log(`[Runtime] Acquired environment ${env.id}`);

    // 2. Deploy code
    console.log(`[Runtime] Deploying code to ${env.id}...`);
    const result = await manager.deployCode(env.id, files);

    if (!result.success) {
      console.error(`[Runtime] Deployment failed for ${appId}:`, result.error);
      // Release environment on failure (destroy it)
      await pool.release(env);
      return NextResponse.json({ 
        success: false, 
        error: result.error, 
        logs: result.logs 
      }, { status: 500 });
    }

    // 3. Start Application
    console.log(`[Runtime] Starting application in ${env.id}...`);
    await manager.startApp(env.id);

    // Wait a brief moment for startup?
    // In a real scenario, we might poll the health endpoint or wait for port to be open.
    // For now, we return success and let the frontend poll the status/proxy.

    return NextResponse.json({
      success: true,
      environmentId: env.id,
      url: env.url, // Return the direct URL (or proxy URL)
      logs: result.logs
    });

  } catch (error: any) {
    console.error('[Runtime] Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
