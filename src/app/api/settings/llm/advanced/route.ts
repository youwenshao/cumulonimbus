/**
 * Advanced LLM Settings API Route
 * GET - Fetch advanced settings (manual model selections)
 * POST - Update advanced settings
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth';
import prisma, { withDBErrorHandling, DBErrorType } from '@/lib/db';

interface AdvancedSettingsData {
  manualModelSelection: boolean;
  manualOllamaModel: string;
  manualLMStudioModel: string;
  ollamaEndpoint: string;
  lmstudioEndpoint: string;
}

/**
 * GET /api/settings/llm/advanced
 * Get current advanced LLM settings
 */
export async function GET() {
  try {
    const session = await getServerSession();

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: user, error: dbError } = await withDBErrorHandling(
      () => prisma.user.findUnique({
        where: { id: session.user.id },
        select: {
          manualModelSelection: true,
          manualOllamaModel: true,
          manualLMStudioModel: true,
          ollamaEndpoint: true,
          lmstudioEndpoint: true,
        },
      }),
      { retryAttempts: 2, retryDelayMs: 500 }
    );

    if (dbError) {
      console.error('Database error fetching advanced settings:', dbError);
      
      if (dbError.type === DBErrorType.CONNECTION || dbError.type === DBErrorType.PERMISSION) {
        return NextResponse.json(
          { 
            error: 'Service temporarily unavailable',
            type: 'SERVICE_UNAVAILABLE',
            message: 'We are experiencing database connectivity issues. Please try again.',
            retryable: true,
          },
          { status: 503 }
        );
      }
      
      return NextResponse.json(
        { error: 'Failed to fetch settings' },
        { status: 500 }
      );
    }

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json({
      manualModelSelection: user.manualModelSelection ?? false,
      manualOllamaModel: user.manualOllamaModel ?? '',
      manualLMStudioModel: user.manualLMStudioModel ?? '',
      ollamaEndpoint: user.ollamaEndpoint ?? 'http://localhost:11434',
      lmstudioEndpoint: user.lmstudioEndpoint ?? 'http://localhost:1234',
    });
  } catch (error) {
    console.error('Unexpected error fetching advanced settings:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/settings/llm/advanced
 * Update advanced LLM settings
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession();

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body: AdvancedSettingsData = await request.json();
    const { 
      manualModelSelection,
      manualOllamaModel,
      manualLMStudioModel,
      ollamaEndpoint,
      lmstudioEndpoint,
    } = body;

    // Validate endpoint URLs if provided
    if (ollamaEndpoint) {
      try {
        new URL(ollamaEndpoint);
      } catch {
        return NextResponse.json(
          { error: 'Invalid Ollama endpoint URL' },
          { status: 400 }
        );
      }
    }

    if (lmstudioEndpoint) {
      try {
        new URL(lmstudioEndpoint);
      } catch {
        return NextResponse.json(
          { error: 'Invalid LM Studio endpoint URL' },
          { status: 400 }
        );
      }
    }

    // Save settings to user record
    const { error: dbError } = await withDBErrorHandling(
      () => prisma.user.update({
        where: { id: session.user.id },
        data: {
          manualModelSelection: manualModelSelection ?? false,
          manualOllamaModel: manualOllamaModel || null,
          manualLMStudioModel: manualLMStudioModel || null,
          ollamaEndpoint: ollamaEndpoint || 'http://localhost:11434',
          lmstudioEndpoint: lmstudioEndpoint || 'http://localhost:1234',
        },
      }),
      { retryAttempts: 2, retryDelayMs: 500 }
    );

    if (dbError) {
      console.error('Database error saving advanced settings:', dbError);
      
      if (dbError.type === DBErrorType.CONNECTION || dbError.type === DBErrorType.PERMISSION) {
        return NextResponse.json(
          { 
            error: 'Service temporarily unavailable',
            type: 'SERVICE_UNAVAILABLE',
            message: 'We are experiencing database connectivity issues. Please try again.',
            retryable: true,
          },
          { status: 503 }
        );
      }
      
      if (dbError.type === DBErrorType.NOT_FOUND) {
        return NextResponse.json(
          { error: 'User not found' },
          { status: 404 }
        );
      }
      
      return NextResponse.json(
        { error: 'Failed to save settings' },
        { status: 500 }
      );
    }

    console.log('Advanced LLM settings saved:', {
      userId: session.user.id,
      manualModelSelection,
      manualOllamaModel,
      manualLMStudioModel,
    });

    return NextResponse.json({
      success: true,
      message: 'Settings saved successfully',
    });
  } catch (error) {
    console.error('Unexpected error saving advanced settings:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}
