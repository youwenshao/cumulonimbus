/**
 * API Key Test Route
 * POST - Test an API key by making a simple request to the provider
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth';
import { validateApiKeyFormat } from '@/lib/crypto';

type ApiKeyProvider = 'deepseek' | 'openrouter';

/**
 * POST /api/settings/llm/api-keys/test
 * Test an API key by making a lightweight request to the provider
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession();

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { provider, apiKey } = body as { provider: ApiKeyProvider; apiKey: string };

    // Validate provider
    if (!provider || !['deepseek', 'openrouter'].includes(provider)) {
      return NextResponse.json(
        { error: 'Invalid provider. Must be "deepseek" or "openrouter"', valid: false },
        { status: 400 }
      );
    }

    // Validate API key format first
    const formatValidation = validateApiKeyFormat(apiKey, provider);
    if (!formatValidation.valid) {
      return NextResponse.json(
        { error: formatValidation.error, valid: false },
        { status: 400 }
      );
    }

    // Test the API key by making a simple request
    let testResult: { valid: boolean; error?: string };

    if (provider === 'deepseek') {
      testResult = await testDeepSeekKey(apiKey.trim());
    } else {
      testResult = await testOpenRouterKey(apiKey.trim());
    }

    if (testResult.valid) {
      return NextResponse.json({ valid: true, message: 'API key is valid' });
    } else {
      return NextResponse.json(
        { valid: false, error: testResult.error || 'API key validation failed' },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error('Unexpected error testing API key:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred while testing the API key', valid: false },
      { status: 500 }
    );
  }
}

/**
 * Test a DeepSeek API key by making a simple models list request
 */
async function testDeepSeekKey(apiKey: string): Promise<{ valid: boolean; error?: string }> {
  try {
    const response = await fetch('https://api.deepseek.com/models', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
    });

    if (response.ok) {
      return { valid: true };
    }

    // Handle specific error codes
    if (response.status === 401) {
      return { valid: false, error: 'Invalid API key. Please check your DeepSeek API key.' };
    }

    if (response.status === 403) {
      return { valid: false, error: 'API key does not have permission. Please check your DeepSeek account.' };
    }

    if (response.status === 429) {
      // Rate limited but key is valid
      return { valid: true };
    }

    const errorData = await response.json().catch(() => ({}));
    return { 
      valid: false, 
      error: errorData.error?.message || `DeepSeek API error: ${response.status}` 
    };
  } catch (error) {
    console.error('DeepSeek API test failed:', error);
    return { 
      valid: false, 
      error: 'Unable to connect to DeepSeek API. Please try again.' 
    };
  }
}

/**
 * Test an OpenRouter API key by making a simple models list request
 */
async function testOpenRouterKey(apiKey: string): Promise<{ valid: boolean; error?: string }> {
  try {
    const response = await fetch('https://openrouter.ai/api/v1/models', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
    });

    if (response.ok) {
      return { valid: true };
    }

    // Handle specific error codes
    if (response.status === 401) {
      return { valid: false, error: 'Invalid API key. Please check your OpenRouter API key.' };
    }

    if (response.status === 403) {
      return { valid: false, error: 'API key does not have permission. Please check your OpenRouter account.' };
    }

    if (response.status === 429) {
      // Rate limited but key is valid
      return { valid: true };
    }

    const errorData = await response.json().catch(() => ({}));
    return { 
      valid: false, 
      error: errorData.error?.message || `OpenRouter API error: ${response.status}` 
    };
  } catch (error) {
    console.error('OpenRouter API test failed:', error);
    return { 
      valid: false, 
      error: 'Unable to connect to OpenRouter API. Please try again.' 
    };
  }
}
