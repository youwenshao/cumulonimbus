
import { NextRequest, NextResponse } from 'next/server';
import { getRuntimeManager } from '@/lib/runtime-manager/instance';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: { containerId: string } }
) {
  try {
    const { containerId } = params;
    
    if (!containerId) {
      return NextResponse.json({ error: 'Container ID required' }, { status: 400 });
    }

    const manager = getRuntimeManager();
    const stats = await manager.getStats(containerId);

    return NextResponse.json({ stats });
  } catch (error: any) {
    console.error(`Failed to get stats for ${params.containerId}:`, error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
