/**
 * Qwen Client (Legacy Compatibility Layer)
 * 
 * This module now uses the unified LLM router for provider selection.
 * It maintains backward compatibility with existing code.
 */

import {
  getRoutedClient,
  getLLMConfig,
  type ChatMessage as LLMChatMessage,
  type CompletionOptions,
} from '@/lib/llm';

export type QwenProvider = 'openrouter' | 'ollama' | 'auto';

// Re-export ChatMessage type for backward compatibility
export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface ChatCompletionOptions {
  messages: ChatMessage[];
  temperature?: number;
  maxTokens?: number;
  stream?: boolean;
}

// Get model name for backward compatibility
export const qwenModel = getLLMConfig().openrouterModel;

// Create a dummy client for backward compatibility (not actually used)
export const qwenClient = {
  chat: {
    completions: {
      create: async () => {
        throw new Error('Direct qwenClient usage is deprecated. Use complete() or streamComplete() instead.');
      },
    },
  },
};

/**
 * Non-streaming completion using the LLM router
 */
export async function complete(options: Omit<ChatCompletionOptions, 'stream'>): Promise<string> {
  const client = getRoutedClient();

  try {
    console.log('🚀 Making AI request via LLM router');

    const result = await client.complete({
      messages: options.messages as LLMChatMessage[],
      temperature: options.temperature,
      maxTokens: options.maxTokens,
    });

    console.log('✅ AI response received, length:', result.length);
    return result;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('❌ AI API call failed:', errorMessage);
    console.error('❌ Error details:', error);
    return '';
  }
}

/**
 * Streaming completion using the LLM router
 */
export async function* streamComplete(options: Omit<ChatCompletionOptions, 'stream'>): AsyncGenerator<string> {
  const client = getRoutedClient();

  console.log('🚀 Starting AI stream via LLM router');

  yield* client.streamComplete({
    messages: options.messages as LLMChatMessage[],
    temperature: options.temperature,
    maxTokens: options.maxTokens,
  });
}

/**
 * JSON mode completion using the LLM router
 */
export async function completeJSON<T>(options: Omit<ChatCompletionOptions, 'stream'> & { schema?: string }): Promise<T> {
  const client = getRoutedClient();

  try {
    console.log('🚀 Making JSON AI request via LLM router');

    const result = await client.completeJSON<T>({
      messages: options.messages as LLMChatMessage[],
      temperature: options.temperature,
      maxTokens: options.maxTokens,
      schema: options.schema,
    });

    console.log('✅ JSON parsed successfully');
    return result;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('❌ AI JSON API call failed:', errorMessage);
    console.error('❌ Error details:', error);
    throw error;
  }
}
