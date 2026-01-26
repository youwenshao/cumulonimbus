/**
 * LM Studio Client
 * Local LLM client with OpenAI-compatible API for LM Studio
 */

import type {
  LLMClient,
  CompletionOptions,
  HealthCheckResult,
  ChatMessage,
} from './types';

interface LMStudioConfig {
  apiUrl: string;
  model: string;
}

interface LMStudioModel {
  id: string;
  object: string;
  created: number;
  owned_by: string;
}

interface LMStudioModelsResponse {
  object: string;
  data: LMStudioModel[];
}

function getConfig(): LMStudioConfig {
  return {
    apiUrl: process.env.LMSTUDIO_API_URL || 'http://localhost:1234',
    model: process.env.LMSTUDIO_MODEL || 'local-model',
  };
}

/**
 * Check if LM Studio is running and responsive
 */
export async function checkLMStudioHealth(): Promise<HealthCheckResult> {
  const config = getConfig();
  const startTime = Date.now();

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    // Try to get models list to check if LM Studio is available
    const response = await fetch(`${config.apiUrl}/v1/models`, {
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      return {
        provider: 'lmstudio',
        available: false,
        error: `HTTP ${response.status}: ${response.statusText}`,
      };
    }

    const data: LMStudioModelsResponse = await response.json();
    const latencyMs = Date.now() - startTime;

    return {
      provider: 'lmstudio',
      available: true,
      latencyMs,
      models: data.data.map(m => m.id),
    };
  } catch (error) {
    return {
      provider: 'lmstudio',
      available: false,
      error: error instanceof Error ? error.message : 'Connection failed',
    };
  }
}

/**
 * List available models from LM Studio
 */
export async function listLMStudioModels(): Promise<string[]> {
  const config = getConfig();

  try {
    const response = await fetch(`${config.apiUrl}/v1/models`);
    if (!response.ok) return [];

    const data: LMStudioModelsResponse = await response.json();
    return data.data.map(m => m.id);
  } catch {
    return [];
  }
}

/**
 * Create an LM Studio LLM client
 */
export function createLMStudioClient(): LLMClient {
  const config = getConfig();

  return {
    name: 'lmstudio',

    async isAvailable(): Promise<boolean> {
      const health = await checkLMStudioHealth();
      return health.available;
    },

    async complete(options: CompletionOptions): Promise<string> {
      const model = options.model || config.model;

      console.log(`🎭 LM Studio: Making request to ${model}`);

      const response = await fetch(`${config.apiUrl}/v1/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model,
          messages: options.messages,
          temperature: options.temperature ?? 0.7,
          max_tokens: options.maxTokens ?? 8192,
          stream: false,
        }),
      });

      if (!response.ok) {
        throw new Error(`LM Studio request failed: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      const content = data.choices?.[0]?.message?.content || '';

      console.log(`✅ LM Studio: Response received, length: ${content.length}`);

      return content;
    },

    async *streamComplete(options: CompletionOptions): AsyncGenerator<string> {
      const model = options.model || config.model;

      console.log(`🎭 LM Studio: Streaming from ${model}`);

      const response = await fetch(`${config.apiUrl}/v1/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model,
          messages: options.messages,
          temperature: options.temperature ?? 0.7,
          max_tokens: options.maxTokens ?? 8192,
          stream: true,
        }),
      });

      if (!response.ok) {
        throw new Error(`LM Studio stream failed: ${response.status} ${response.statusText}`);
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('No response body');
      }

      const decoder = new TextDecoder();
      let buffer = '';

      try {
        while (true) {
          const { done, value } = await reader.read();

          if (done) break;

          buffer += decoder.decode(value, { stream: true });

          // OpenAI-compatible streaming format
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            if (!line.trim() || line === 'data: [DONE]') continue;

            if (line.startsWith('data: ')) {
              try {
                const data = JSON.parse(line.slice(6));
                const content = data.choices?.[0]?.delta?.content || '';

                if (content) {
                  yield content;
                }
              } catch {
                // Skip malformed JSON lines
              }
            }
          }
        }
      } finally {
        reader.releaseLock();
      }

      console.log(`✅ LM Studio: Stream complete`);
    },

    async completeJSON<T>(options: CompletionOptions & { schema?: string }): Promise<T> {
      const model = options.model || config.model;

      console.log(`🎭 LM Studio: JSON request to ${model}`);

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

      const response = await fetch(`${config.apiUrl}/v1/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model,
          messages,
          temperature: options.temperature ?? 0.3,
          max_tokens: options.maxTokens ?? 8192,
          stream: false,
        }),
      });

      if (!response.ok) {
        throw new Error(`LM Studio JSON request failed: ${response.status}`);
      }

      const data = await response.json();
      const content = data.choices?.[0]?.message?.content || '{}';

      console.log(`✅ LM Studio: JSON response received, length: ${content.length}`);

      // Extract JSON from potential markdown blocks
      const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/) || [null, content];
      const jsonStr = jsonMatch[1]?.trim() || content.trim();

      try {
        return JSON.parse(jsonStr) as T;
      } catch (e) {
        console.error('❌ LM Studio: Failed to parse JSON:', jsonStr.substring(0, 200));
        throw new Error(`Failed to parse LM Studio response as JSON: ${e}`);
      }
    },
  };
}

// Singleton instance
let lmstudioClient: LLMClient | null = null;

export function getLMStudioClient(): LLMClient {
  if (!lmstudioClient) {
    lmstudioClient = createLMStudioClient();
  }
  return lmstudioClient;
}

// Re-export config for use in settings
export function getLMStudioConfig(): LMStudioConfig {
  return getConfig();
}