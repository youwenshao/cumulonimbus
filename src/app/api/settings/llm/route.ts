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
  // lmstudioEndpoint: string;  // TODO: Enable after DB migration
  // lmstudioModel: string;     // TODO: Enable after DB migration
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
        // lmstudioEndpoint: true,  // TODO: Enable after DB migration
        // lmstudioModel: true,     // TODO: Enable after DB migration
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
      // lmstudioEndpoint: user.lmstudioEndpoint || config.lmstudioApiUrl,  // TODO: Enable after DB migration
      // lmstudioModel: user.lmstudioModel || config.lmstudioModel,          // TODO: Enable after DB migration
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
    const { provider, ollamaEndpoint, ollamaModel, ollamaSmallModel } = body; // lmstudioEndpoint, lmstudioModel TODO: Enable after DB migration

    if (!['auto', 'ollama', 'openrouter', 'lmstudio', 'deepseek'].includes(provider)) {
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
        // lmstudioEndpoint,  // TODO: Enable after DB migration
        // lmstudioModel,     // TODO: Enable after DB migration
      },
    });

    console.log('LLM settings saved:', {
      userId: session.user.id,
      provider,
      ollamaEndpoint,
      ollamaModel,
      ollamaSmallModel,
      // lmstudioEndpoint,  // TODO: Enable after DB migration
      // lmstudioModel,     // TODO: Enable after DB migration
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
