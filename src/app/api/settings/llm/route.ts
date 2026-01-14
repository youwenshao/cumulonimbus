/**
 * LLM Settings API Route
 * Manage user LLM provider preferences
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth';
import prisma from '@/lib/db';
import { getLLMConfig } from '@/lib/llm';
import type { LLMProvider } from '@/lib/llm/types';

interface LLMSettingsData {
  provider: LLMProvider;
  ollamaEndpoint: string;
  ollamaModel: string;
  ollamaSmallModel: string;
  fallbackEnabled: boolean;
}

/**
 * GET /api/settings/llm
 * Get current LLM settings
 */
export async function GET() {
  try {
    const session = await getServerSession();

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user preferences from database
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        preferredLLMProvider: true,
        ollamaEndpoint: true,
        ollamaModel: true,
        ollamaSmallModel: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Get default config from environment
    const config = getLLMConfig();

    // Return user settings with fallback to environment defaults
    return NextResponse.json({
      provider: (user.preferredLLMProvider || config.provider) as LLMProvider,
      ollamaEndpoint: user.ollamaEndpoint || config.ollamaApiUrl,
      ollamaModel: user.ollamaModel || config.ollamaModel,
      ollamaSmallModel: user.ollamaSmallModel || config.ollamaSmallModel,
      fallbackEnabled: config.fallbackEnabled,
    });
  } catch (error) {
    console.error('Error fetching LLM settings:', error);
    return NextResponse.json(
      { error: 'Failed to fetch settings' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/settings/llm
 * Update LLM settings
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession();

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body: LLMSettingsData = await request.json();
    const { provider, ollamaEndpoint, ollamaModel, ollamaSmallModel } = body;

    // Validate provider
    if (!['auto', 'ollama', 'openrouter'].includes(provider)) {
      return NextResponse.json(
        { error: 'Invalid provider' },
        { status: 400 }
      );
    }

    // Save settings to user record
    await prisma.user.update({
      where: { id: session.user.id },
      data: {
        preferredLLMProvider: provider,
        ollamaEndpoint,
        ollamaModel,
        ollamaSmallModel,
      },
    });

    console.log('LLM settings saved:', {
      userId: session.user.id,
      provider,
      ollamaEndpoint,
      ollamaModel,
      ollamaSmallModel,
    });

    return NextResponse.json({
      success: true,
      message: 'Settings saved successfully',
    });
  } catch (error) {
    console.error('Error saving LLM settings:', error);
    return NextResponse.json(
      { error: 'Failed to save settings' },
      { status: 500 }
    );
  }
}
