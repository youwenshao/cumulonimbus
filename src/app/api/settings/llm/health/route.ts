/**
 * LLM Health Check API Route
 * Check availability of LLM providers
 */

import { NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth';
import { checkAllHealth } from '@/lib/llm';

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
    return NextResponse.json(
      { 
        error: 'Health check failed',
        results: [],
      },
      { status: 500 }
    );
  }
}
