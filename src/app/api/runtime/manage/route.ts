
import { NextRequest, NextResponse } from 'next/server';
import { getRuntimeManager } from '@/lib/runtime-manager/instance';

/**
 * Admin API for runtime management
 * Supports: list, stop, inspect, update-resources
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, containerId, resources } = body;
    const manager = getRuntimeManager();

    if (action === 'stop' && containerId) {
      await manager.destroyEnvironment(containerId);
      return NextResponse.json({ success: true });
    }

    if (action === 'stats' && containerId) {
      const stats = await manager.getStats(containerId);
      return NextResponse.json({ stats });
    }

    if (action === 'update' && containerId && resources) {
      await manager.updateResources(containerId, resources);
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
