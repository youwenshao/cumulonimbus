/**
 * LLM Health Check API Route
 * Check availability of LLM providers
 */

import { NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth';
import { checkAllHealth } from '@/lib/llm';

export const dynamic = 'force-dynamic';

/**
 * GET /api/settings/llm/health
 * Check health of all LLM providers
 */
export async function GET() {
  try {
    const session = await getServerSession();

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const results = await checkAllHealth();

    return NextResponse.json({
      success: true,
      results,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error checking LLM health:', error);
    
    // Health check failures are not critical - return empty results
    // This allows the UI to still function even if health checks fail
    return NextResponse.json(
      { 
        success: false,
        error: 'Health check failed',
        message: 'Unable to check provider health at this time',
        results: [],
        timestamp: new Date().toISOString(),
      },
      { status: 200 } // Return 200 so the UI doesn't break
    );
  }
}
