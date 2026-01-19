/**
 * LLM Settings API Route
 * Manage user LLM provider preferences
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth';
import prisma, { withDBErrorHandling, DBErrorType } from '@/lib/db';
import { getLLMConfig } from '@/lib/llm';
import type { LLMProvider } from '@/lib/llm/types';

interface LLMSettingsData {
  provider: LLMProvider;
  ollamaEndpoint: string;
  ollamaModel: string;
  ollamaSmallModel: string;
  lmstudioEndpoint: string;
  lmstudioModel: string;
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

    // Get user preferences from database with error handling
    const { data: user, error: dbError } = await withDBErrorHandling(
      () => prisma.user.findUnique({
        where: { id: session.user.id },
        select: {
          id: true,
          preferredLLMProvider: true,
          ollamaEndpoint: true,
          ollamaModel: true,
          ollamaSmallModel: true,
          lmstudioEndpoint: true,
          lmstudioModel: true,
        },
      }),
      { retryAttempts: 2, retryDelayMs: 500 }
    );

    // Handle database errors
    if (dbError) {
      console.error('Database error fetching LLM settings:', dbError);
      
      // Return appropriate status based on error type
      if (dbError.type === DBErrorType.CONNECTION || dbError.type === DBErrorType.PERMISSION) {
        return NextResponse.json(
          { 
            error: 'Service temporarily unavailable',
            type: 'SERVICE_UNAVAILABLE',
            message: 'We are experiencing database connectivity issues. Please try again in a moment.',
            retryable: true,
          },
          { status: 503 }
        );
      }
      
      if (dbError.type === DBErrorType.TIMEOUT) {
        return NextResponse.json(
          { 
            error: 'Request timeout',
            type: 'TIMEOUT',
            message: 'The database operation took too long. Please try again.',
            retryable: true,
          },
          { status: 504 }
        );
      }
      
      return NextResponse.json(
        { 
          error: 'Failed to fetch settings',
          type: 'DATABASE_ERROR',
          retryable: dbError.retryable,
        },
        { status: 500 }
      );
    }

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
      lmstudioEndpoint: user.lmstudioEndpoint || config.lmstudioApiUrl,
      lmstudioModel: user.lmstudioModel || config.lmstudioModel,
      fallbackEnabled: config.fallbackEnabled,
    });
  } catch (error) {
    console.error('Unexpected error fetching LLM settings:', error);
    return NextResponse.json(
      { 
        error: 'An unexpected error occurred',
        type: 'UNKNOWN_ERROR',
      },
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
    const { 
      provider, 
      ollamaEndpoint, 
      ollamaModel, 
      ollamaSmallModel,
      lmstudioEndpoint,
      lmstudioModel
    } = body;

    if (!['auto', 'ollama', 'openrouter', 'lmstudio', 'deepseek'].includes(provider)) {
      return NextResponse.json(
        { error: 'Invalid provider' },
        { status: 400 }
      );
    }

    // Check user plan for provider restrictions
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { plan: true }
    });

    if (!user) {
        return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Enforce Plan Limits
    // Free plan users are restricted to DeepSeek (or Auto which defaults to local/deepseek)
    // Actually, "Select specific LLM they want" implies they can't change from default.
    // If they select something else, we check plan.
    if (user.plan === 'FREE' && provider !== 'deepseek' && provider !== 'auto') {
        return NextResponse.json(
            { error: 'Upgrade to Plus to select custom LLM providers like Ollama, LM Studio, or OpenRouter.' },
            { status: 403 }
        );
    }

    // Save settings to user record with error handling
    const { error: dbError } = await withDBErrorHandling(
      () => prisma.user.update({
        where: { id: session.user.id },
        data: {
          preferredLLMProvider: provider,
          ollamaEndpoint,
          ollamaModel,
          ollamaSmallModel,
          lmstudioEndpoint,
          lmstudioModel,
        },
      }),
      { retryAttempts: 2, retryDelayMs: 500 }
    );

    // Handle database errors
    if (dbError) {
      console.error('Database error saving LLM settings:', dbError);
      
      // Return appropriate status based on error type
      if (dbError.type === DBErrorType.CONNECTION || dbError.type === DBErrorType.PERMISSION) {
        return NextResponse.json(
          { 
            error: 'Service temporarily unavailable',
            type: 'SERVICE_UNAVAILABLE',
            message: 'We are experiencing database connectivity issues. Please try again in a moment.',
            retryable: true,
          },
          { status: 503 }
        );
      }
      
      if (dbError.type === DBErrorType.TIMEOUT) {
        return NextResponse.json(
          { 
            error: 'Request timeout',
            type: 'TIMEOUT',
            message: 'The database operation took too long. Please try again.',
            retryable: true,
          },
          { status: 504 }
        );
      }
      
      if (dbError.type === DBErrorType.NOT_FOUND) {
        return NextResponse.json(
          { error: 'User not found' },
          { status: 404 }
        );
      }
      
      return NextResponse.json(
        { 
          error: 'Failed to save settings',
          type: 'DATABASE_ERROR',
          retryable: dbError.retryable,
        },
        { status: 500 }
      );
    }

    console.log('LLM settings saved:', {
      userId: session.user.id,
      provider,
      ollamaEndpoint,
      ollamaModel,
      ollamaSmallModel,
      lmstudioEndpoint,
      lmstudioModel,
    });

    return NextResponse.json({
      success: true,
      message: 'Settings saved successfully',
    });
  } catch (error) {
    console.error('Unexpected error saving LLM settings:', error);
    return NextResponse.json(
      { 
        error: 'An unexpected error occurred',
        type: 'UNKNOWN_ERROR',
      },
      { status: 500 }
    );
  }
}
