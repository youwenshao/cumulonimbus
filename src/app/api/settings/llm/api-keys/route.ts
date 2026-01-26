/**
 * API Keys Management Route
 * GET - Fetch user's stored API keys (masked)
 * POST - Save/update an API key (encrypted)
 * DELETE - Remove an API key
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth';
import prisma, { withDBErrorHandling, DBErrorType } from '@/lib/db';
import { 
  encryptApiKey, 
  maskApiKey, 
  isEncryptionAvailable,
  validateApiKeyFormat,
} from '@/lib/crypto';

type ApiKeyProvider = 'deepseek' | 'openrouter';

/**
 * GET /api/settings/llm/api-keys
 * Get user's stored API keys (masked for display)
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
          deepseekApiKey: true,
          openrouterApiKey: true,
        },
      }),
      { retryAttempts: 2, retryDelayMs: 500 }
    );

    if (dbError) {
      console.error('Database error fetching API keys:', dbError);
      return NextResponse.json(
        { error: 'Failed to fetch API keys' },
        { status: 500 }
      );
    }

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Build list of stored keys (masked)
    const keys: Array<{ provider: ApiKeyProvider; maskedKey: string; createdAt: string }> = [];

    if (user.deepseekApiKey) {
      keys.push({
        provider: 'deepseek',
        maskedKey: maskApiKey(user.deepseekApiKey.split(':')[1] || 'sk-****'), // Mask the encrypted data indicator
        createdAt: new Date().toISOString(), // We don't track creation date, use now
      });
    }

    if (user.openrouterApiKey) {
      keys.push({
        provider: 'openrouter',
        maskedKey: maskApiKey(user.openrouterApiKey.split(':')[1] || 'sk-or-****'),
        createdAt: new Date().toISOString(),
      });
    }

    return NextResponse.json({ keys });
  } catch (error) {
    console.error('Unexpected error fetching API keys:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/settings/llm/api-keys
 * Save or update an API key
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession();

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if encryption is available
    if (!isEncryptionAvailable()) {
      return NextResponse.json(
        { error: 'API key storage is not configured. Please contact support.' },
        { status: 503 }
      );
    }

    const body = await request.json();
    const { provider, apiKey } = body as { provider: ApiKeyProvider; apiKey: string };

    // Validate provider
    if (!provider || !['deepseek', 'openrouter'].includes(provider)) {
      return NextResponse.json(
        { error: 'Invalid provider. Must be "deepseek" or "openrouter"' },
        { status: 400 }
      );
    }

    // Validate API key format
    const validation = validateApiKeyFormat(apiKey, provider);
    if (!validation.valid) {
      return NextResponse.json(
        { error: validation.error },
        { status: 400 }
      );
    }

    // Encrypt the API key
    let encryptedKey: string;
    try {
      encryptedKey = encryptApiKey(apiKey.trim());
    } catch (error) {
      console.error('Encryption failed:', error);
      return NextResponse.json(
        { error: 'Failed to encrypt API key' },
        { status: 500 }
      );
    }

    // Build update data based on provider
    const updateData: Record<string, string | null> = {};
    if (provider === 'deepseek') {
      updateData.deepseekApiKey = encryptedKey;
    } else if (provider === 'openrouter') {
      updateData.openrouterApiKey = encryptedKey;
    }

    // Save to database
    const { error: dbError } = await withDBErrorHandling(
      () => prisma.user.update({
        where: { id: session.user.id },
        data: updateData,
      }),
      { retryAttempts: 2, retryDelayMs: 500 }
    );

    if (dbError) {
      console.error('Database error saving API key:', dbError);
      
      if (dbError.type === DBErrorType.NOT_FOUND) {
        return NextResponse.json(
          { error: 'User not found' },
          { status: 404 }
        );
      }
      
      return NextResponse.json(
        { error: 'Failed to save API key' },
        { status: 500 }
      );
    }

    console.log(`API key saved for ${provider}:`, {
      userId: session.user.id,
      provider,
    });

    return NextResponse.json({
      success: true,
      message: 'API key saved successfully',
    });
  } catch (error) {
    console.error('Unexpected error saving API key:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/settings/llm/api-keys
 * Remove an API key
 */
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession();

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { provider } = body as { provider: ApiKeyProvider };

    // Validate provider
    if (!provider || !['deepseek', 'openrouter'].includes(provider)) {
      return NextResponse.json(
        { error: 'Invalid provider. Must be "deepseek" or "openrouter"' },
        { status: 400 }
      );
    }

    // Build update data to clear the key
    const updateData: Record<string, null> = {};
    if (provider === 'deepseek') {
      updateData.deepseekApiKey = null;
    } else if (provider === 'openrouter') {
      updateData.openrouterApiKey = null;
    }

    // Update database
    const { error: dbError } = await withDBErrorHandling(
      () => prisma.user.update({
        where: { id: session.user.id },
        data: updateData,
      }),
      { retryAttempts: 2, retryDelayMs: 500 }
    );

    if (dbError) {
      console.error('Database error deleting API key:', dbError);
      
      if (dbError.type === DBErrorType.NOT_FOUND) {
        return NextResponse.json(
          { error: 'User not found' },
          { status: 404 }
        );
      }
      
      return NextResponse.json(
        { error: 'Failed to delete API key' },
        { status: 500 }
      );
    }

    console.log(`API key deleted for ${provider}:`, {
      userId: session.user.id,
      provider,
    });

    return NextResponse.json({
      success: true,
      message: 'API key deleted successfully',
    });
  } catch (error) {
    console.error('Unexpected error deleting API key:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}
