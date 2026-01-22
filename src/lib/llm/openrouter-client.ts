/**
 * OpenRouter Client
 * Hosted LLM client compatible with OpenAI API
 */

import OpenAI from 'openai';
import type {
  LLMClient,
  CompletionOptions,
  HealthCheckResult,
} from './types';

interface OpenRouterConfig {
  apiKey: string;
  apiUrl: string;
  model: string;
}

function getConfig(): OpenRouterConfig {
  return {
    apiKey: process.env.QWEN_API_KEY || process.env.OPENROUTER_API_KEY || '',
    apiUrl: process.env.QWEN_API_URL || process.env.OPENROUTER_API_URL || 'https://openrouter.ai/api/v1',
    model: process.env.QWEN_MODEL || process.env.OPENROUTER_MODEL || 'qwen/qwen-2.5-coder-32b-instruct',
  };
}

function createOpenAIClient(): OpenAI {
  const config = getConfig();

  return new OpenAI({
    apiKey: config.apiKey,
    baseURL: config.apiUrl,
    defaultHeaders: {
      'HTTP-Referer': process.env.NEXTAUTH_URL || 'http://localhost:1000',
      'X-Title': 'Cumulonimbus',
    },
  });
}

/**
 * Check if OpenRouter is available
 */
export async function checkOpenRouterHealth(): Promise<HealthCheckResult> {
  const config = getConfig();
  const startTime = Date.now();

  if (!config.apiKey) {
    return {
      provider: 'openrouter',
      available: false,
      error: 'No API key configured',
    };
  }

  try {
    const client = createOpenAIClient();
    
    // Make a minimal request to check availability
    const response = await client.chat.completions.create({
      model: config.model,
      messages: [{ role: 'user', content: 'Hi' }],
      max_tokens: 1,
    });

    const latencyMs = Date.now() - startTime;

    return {
      provider: 'openrouter',
      available: true,
      latencyMs,
      models: [config.model],
    };
  } catch (error) {
    return {
      provider: 'openrouter',
      available: false,
      error: error instanceof Error ? error.message : 'Connection failed',
    };
  }
}

/**
 * Create an OpenRouter LLM client
 */
export function createOpenRouterClient(): LLMClient {
  const config = getConfig();
  const openai = createOpenAIClient();

  return {
    name: 'openrouter',

    async isAvailable(): Promise<boolean> {
      // Quick check - just verify API key exists
      return !!config.apiKey;
    },

    async complete(options: CompletionOptions): Promise<string> {
      const model = options.model || config.model;

      console.log(`🌐 OpenRouter: Making request to ${model}`);

      try {
        const response = await openai.chat.completions.create({
          model,
          messages: options.messages,
          temperature: options.temperature ?? 0.7,
          max_tokens: options.maxTokens ?? 2048,
          stream: false,
        });

        const content = response.choices[0]?.message?.content || '';
        console.log(`✅ OpenRouter: Response received, length: ${content.length}`);

        return content;
      } catch (error) {
        console.error('❌ OpenRouter: Request failed:', error);
        throw error;
      }
    },

    async *streamComplete(options: CompletionOptions): AsyncGenerator<string> {
      const model = options.model || config.model;

      console.log(`🌐 OpenRouter: Streaming from ${model}`);

      const stream = await openai.chat.completions.create({
        model,
        messages: options.messages,
        temperature: options.temperature ?? 0.7,
        max_tokens: options.maxTokens ?? 2048,
        stream: true,
      });

      for await (const chunk of stream) {
        const content = chunk.choices[0]?.delta?.content;
        if (content) {
          yield content;
        }
      }

      console.log(`✅ OpenRouter: Stream complete`);
    },

    async completeJSON<T>(options: CompletionOptions & { schema?: string }): Promise<T> {
      const model = options.model || config.model;

      console.log(`🌐 OpenRouter: JSON request to ${model}`);

      // Add JSON instruction to messages
      const messages = [...options.messages];
      const lastMessage = messages[messages.length - 1];

      if (options.schema) {
        messages[messages.length - 1] = {
          ...lastMessage,
          content: `${lastMessage.content}\n\nRespond with valid JSON matching this schema:\n${options.schema}`,
        };
      }

      // Add system instruction for JSON
      if (!messages.some(m => m.role === 'system' && m.content.includes('JSON'))) {
        messages.unshift({
          role: 'system',
          content: 'You must respond with valid JSON only. No markdown, no explanations, just valid JSON.',
        });
      }

      try {
        const response = await openai.chat.completions.create({
          model,
          messages,
          temperature: options.temperature ?? 0.3,
          max_tokens: options.maxTokens ?? 2048,
          stream: false,
        });

        const content = response.choices[0]?.message?.content || '{}';
        console.log(`✅ OpenRouter: JSON response received, length: ${content.length}`);

        // Extract JSON from potential markdown blocks
        const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/) || [null, content];
        const jsonStr = jsonMatch[1]?.trim() || content.trim();

        try {
          return JSON.parse(jsonStr) as T;
        } catch (e) {
          console.error('❌ OpenRouter: Failed to parse JSON:', jsonStr.substring(0, 200));
          throw new Error(`Failed to parse OpenRouter response as JSON: ${e}`);
        }
      } catch (error) {
        console.error('❌ OpenRouter: JSON request failed:', error);
        throw error;
      }
    },
  };
}

// Singleton instance
let openrouterClient: LLMClient | null = null;

export function getOpenRouterClient(): LLMClient {
  if (!openrouterClient) {
    openrouterClient = createOpenRouterClient();
  }
  return openrouterClient;
}

// Re-export config for use in settings
export function getOpenRouterConfig(): OpenRouterConfig {
  return getConfig();
}
