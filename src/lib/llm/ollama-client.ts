/**
 * Ollama Client
 * Local LLM client with streaming support and health checks
 */

import type {
  LLMClient,
  CompletionOptions,
  HealthCheckResult,
  ChatMessage,
} from './types';

interface OllamaConfig {
  apiUrl: string;
  model: string;
  smallModel: string;
}

interface OllamaGenerateRequest {
  model: string;
  prompt?: string;
  messages?: { role: string; content: string }[];
  stream?: boolean;
  options?: {
    temperature?: number;
    num_predict?: number;
  };
  format?: 'json';
}

interface OllamaGenerateResponse {
  model: string;
  created_at: string;
  response?: string;
  message?: { role: string; content: string };
  done: boolean;
  total_duration?: number;
  load_duration?: number;
  prompt_eval_count?: number;
  eval_count?: number;
}

interface OllamaTagsResponse {
  models: Array<{
    name: string;
    modified_at: string;
    size: number;
  }>;
}

function getConfig(): OllamaConfig {
  return {
    apiUrl: process.env.OLLAMA_API_URL || 'http://localhost:11434',
    model: process.env.OLLAMA_MODEL || 'qwen3-coder:30b',
    smallModel: process.env.OLLAMA_SMALL_MODEL || 'qwen3:4b',
  };
}

/**
 * Check if Ollama is running and responsive
 */
export async function checkOllamaHealth(): Promise<HealthCheckResult> {
  const config = getConfig();
  const startTime = Date.now();

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    const response = await fetch(`${config.apiUrl}/api/tags`, {
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      return {
        provider: 'ollama',
        available: false,
        error: `HTTP ${response.status}: ${response.statusText}`,
      };
    }

    const data: OllamaTagsResponse = await response.json();
    const latencyMs = Date.now() - startTime;

    return {
      provider: 'ollama',
      available: true,
      latencyMs,
      models: data.models.map(m => m.name),
    };
  } catch (error) {
    return {
      provider: 'ollama',
      available: false,
      error: error instanceof Error ? error.message : 'Connection failed',
    };
  }
}

/**
 * List available models from Ollama
 */
export async function listOllamaModels(): Promise<string[]> {
  const config = getConfig();

  try {
    const response = await fetch(`${config.apiUrl}/api/tags`);
    if (!response.ok) return [];

    const data: OllamaTagsResponse = await response.json();
    return data.models.map(m => m.name);
  } catch {
    return [];
  }
}

/**
 * Create an Ollama LLM client
 */
export function createOllamaClient(): LLMClient {
  const config = getConfig();

  return {
    name: 'ollama',

    async isAvailable(): Promise<boolean> {
      const health = await checkOllamaHealth();
      return health.available;
    },

    async complete(options: CompletionOptions): Promise<string> {
      const model = options.model || config.model;

      console.log(`🦙 Ollama: Making request to ${model}`);

      const response = await fetch(`${config.apiUrl}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model,
          messages: options.messages,
          stream: false,
          options: {
            temperature: options.temperature ?? 0.7,
            num_predict: options.maxTokens ?? 8192,
          },
        } as OllamaGenerateRequest),
      });

      if (!response.ok) {
        throw new Error(`Ollama request failed: ${response.status} ${response.statusText}`);
      }

      const data: OllamaGenerateResponse = await response.json();
      const content = data.message?.content || data.response || '';

      console.log(`✅ Ollama: Response received, length: ${content.length}`);

      return content;
    },

    async *streamComplete(options: CompletionOptions): AsyncGenerator<string> {
      const model = options.model || config.model;

      console.log(`🦙 Ollama: Streaming from ${model}`);

      const response = await fetch(`${config.apiUrl}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model,
          messages: options.messages,
          stream: true,
          options: {
            temperature: options.temperature ?? 0.7,
            num_predict: options.maxTokens ?? 8192,
          },
        } as OllamaGenerateRequest),
      });

      if (!response.ok) {
        throw new Error(`Ollama stream failed: ${response.status} ${response.statusText}`);
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

          // Ollama streams newline-delimited JSON
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            if (!line.trim()) continue;

            try {
              const data: OllamaGenerateResponse = JSON.parse(line);
              const content = data.message?.content || data.response || '';

              if (content) {
                yield content;
              }

              if (data.done) {
                console.log(`✅ Ollama: Stream complete`);
                return;
              }
            } catch {
              // Skip malformed JSON lines
            }
          }
        }

        // Process any remaining buffer
        if (buffer.trim()) {
          try {
            const data: OllamaGenerateResponse = JSON.parse(buffer);
            const content = data.message?.content || data.response || '';
            if (content) {
              yield content;
            }
          } catch {
            // Ignore
          }
        }
      } finally {
        reader.releaseLock();
      }
    },

    async completeJSON<T>(options: CompletionOptions & { schema?: string }): Promise<T> {
      const model = options.model || config.model;

      console.log(`🦙 Ollama: JSON request to ${model}`);

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

      const response = await fetch(`${config.apiUrl}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model,
          messages,
          stream: false,
          format: 'json',
          options: {
            temperature: options.temperature ?? 0.3,
            num_predict: options.maxTokens ?? 8192,
          },
        } as OllamaGenerateRequest),
      });

      if (!response.ok) {
        throw new Error(`Ollama JSON request failed: ${response.status}`);
      }

      const data: OllamaGenerateResponse = await response.json();
      const content = data.message?.content || data.response || '{}';

      console.log(`✅ Ollama: JSON response received, length: ${content.length}`);

      // Extract JSON from potential markdown blocks
      const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/) || [null, content];
      const jsonStr = jsonMatch[1]?.trim() || content.trim();

      try {
        return JSON.parse(jsonStr) as T;
      } catch (e) {
        console.error('❌ Ollama: Failed to parse JSON:', jsonStr.substring(0, 200));
        throw new Error(`Failed to parse Ollama response as JSON: ${e}`);
      }
    },
  };
}

// Singleton instance
let ollamaClient: LLMClient | null = null;

export function getOllamaClient(): LLMClient {
  if (!ollamaClient) {
    ollamaClient = createOllamaClient();
  }
  return ollamaClient;
}

// Re-export config for use in settings
export function getOllamaConfig(): OllamaConfig {
  return getConfig();
}
