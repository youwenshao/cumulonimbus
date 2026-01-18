import OpenAI from 'openai';
import type {
  LLMClient,
  CompletionOptions,
  HealthCheckResult,
} from './types';

interface DeepseekConfig {
  apiKey: string;
  apiUrl: string;
  model: string;
}

function getConfig(): DeepseekConfig {
  return {
    apiKey: process.env.DEEPSEEK_API_KEY || '',
    apiUrl: process.env.DEEPSEEK_API_URL || 'https://api.deepseek.com/v1',
    model: process.env.DEEPSEEK_MODEL || 'deepseek-chat',
  };
}

function createOpenAIClient(): OpenAI {
  const config = getConfig();

  return new OpenAI({
    apiKey: config.apiKey,
    baseURL: config.apiUrl,
  });
}

export async function checkDeepseekHealth(): Promise<HealthCheckResult> {
  const config = getConfig();
  const startTime = Date.now();

  if (!config.apiKey) {
    return {
      provider: 'deepseek',
      available: false,
      error: 'No API key configured',
    };
  }

  try {
    const client = createOpenAIClient();

    const response = await client.chat.completions.create({
      model: config.model,
      messages: [{ role: 'user', content: 'Hi' }],
      max_tokens: 1,
    });

    const hasChoices = Array.isArray((response as any).choices) && (response as any).choices.length > 0;

    const latencyMs = Date.now() - startTime;

    return {
      provider: 'deepseek',
      available: hasChoices,
      latencyMs,
      models: [config.model],
    };
  } catch (error) {
    return {
      provider: 'deepseek',
      available: false,
      error: error instanceof Error ? error.message : 'Connection failed',
    };
  }
}

export function createDeepseekClient(): LLMClient {
  const config = getConfig();
  const openai = createOpenAIClient();

  return {
    name: 'deepseek',

    async isAvailable(): Promise<boolean> {
      return !!config.apiKey;
    },

    async complete(options: CompletionOptions): Promise<string> {
      const model = options.model || config.model;

      console.log(`🧠 DeepSeek: Making request to ${model}`);

      try {
        const response = await openai.chat.completions.create({
          model,
          messages: options.messages,
          temperature: options.temperature ?? 0.7,
          max_tokens: options.maxTokens ?? 2048,
          stream: false,
        });

        const content = response.choices[0]?.message?.content || '';
        console.log(`✅ DeepSeek: Response received, length: ${content.length}`);

        return content;
      } catch (error) {
        console.error('❌ DeepSeek: Request failed:', error);
        throw error;
      }
    },

    async *streamComplete(options: CompletionOptions): AsyncGenerator<string> {
      const model = options.model || config.model;

      console.log(`🧠 DeepSeek: Streaming from ${model}`);

      try {
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

        console.log(`✅ DeepSeek: Stream complete`);
      } catch (error) {
        console.error('❌ DeepSeek: Stream failed:', error);
        throw error;
      }
    },

    async completeJSON<T>(options: CompletionOptions & { schema?: string }): Promise<T> {
      const model = options.model || config.model;

      console.log(`🧠 DeepSeek: JSON request to ${model}`);

      const messages = [...options.messages];
      const lastMessage = messages[messages.length - 1];

      if (options.schema) {
        messages[messages.length - 1] = {
          ...lastMessage,
          content: `${lastMessage.content}\n\nRespond with valid JSON matching this schema:\n${options.schema}`,
        };
      }

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
        console.log(`✅ DeepSeek: JSON response received, length: ${content.length}`);

        const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/) || [null, content];
        const jsonStr = jsonMatch[1]?.trim() || content.trim();

        try {
          return JSON.parse(jsonStr) as T;
        } catch (e) {
          console.error('❌ DeepSeek: Failed to parse JSON:', jsonStr.substring(0, 200));
          throw new Error(`Failed to parse DeepSeek response as JSON: ${e}`);
        }
      } catch (error) {
        console.error('❌ DeepSeek: JSON request failed:', error);
        throw error;
      }
    },
  };
}

let deepseekClient: LLMClient | null = null;

export function getDeepseekClient(): LLMClient {
  if (!deepseekClient) {
    deepseekClient = createDeepseekClient();
  }
  return deepseekClient;
}

export function getDeepseekConfig(): DeepseekConfig {
  return getConfig();
}

