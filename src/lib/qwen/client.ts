import OpenAI from 'openai';

export type QwenProvider = 'openrouter' | 'puter';

interface QwenConfig {
  apiKey: string;
  baseUrl: string;
  model: string;
  provider: QwenProvider;
}

function getConfig(): QwenConfig {
  const provider = (process.env.QWEN_PROVIDER || 'openrouter') as QwenProvider;
  const apiKey = process.env.QWEN_API_KEY || '';
  const baseUrl = process.env.QWEN_API_URL || 'https://openrouter.ai/api/v1';
  const model = process.env.QWEN_MODEL || 'qwen/qwen3-coder:free';

  return { apiKey, baseUrl, model, provider };
}

// Create OpenAI-compatible client for Qwen via OpenRouter
function createClient(): OpenAI {
  const config = getConfig();

  return new OpenAI({
    apiKey: config.apiKey,
    baseURL: config.baseUrl,
    defaultHeaders: config.provider === 'openrouter' ? {
      'HTTP-Referer': process.env.NEXTAUTH_URL || 'http://localhost:3000',
      'X-Title': 'Cumulonimbus',
    } : undefined,
  });
}

export const qwenClient = createClient();
export const qwenModel = getConfig().model;

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

// Non-streaming completion
export async function complete(options: Omit<ChatCompletionOptions, 'stream'>): Promise<string> {
  const config = getConfig();

  try {
    console.log('🚀 Making AI request to', config.model);
    const response = await qwenClient.chat.completions.create({
      model: config.model,
      messages: options.messages,
      temperature: options.temperature ?? 0.7,
      max_tokens: options.maxTokens ?? 2048,
      stream: false,
    });

    const result = response.choices[0]?.message?.content || '';
    console.log('✅ AI response received, length:', result.length);
    return result;
  } catch (error) {
    console.error('❌ AI API call failed:', error.message);
    console.error('❌ Error details:', error);
    return '';
  }
}

// Streaming completion that returns an async generator
export async function* streamComplete(options: Omit<ChatCompletionOptions, 'stream'>): AsyncGenerator<string> {
  const config = getConfig();
  
  const stream = await qwenClient.chat.completions.create({
    model: config.model,
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
}

// JSON mode completion with structured output
export async function completeJSON<T>(options: Omit<ChatCompletionOptions, 'stream'> & { schema?: string }): Promise<T> {
  const config = getConfig();

  try {
    console.log('🚀 Making JSON AI request to', config.model);

    // Add JSON instruction to the last message or system prompt
    const messages = [...options.messages];
    const lastMessage = messages[messages.length - 1];

    if (options.schema) {
      messages[messages.length - 1] = {
        ...lastMessage,
        content: `${lastMessage.content}\n\nRespond with valid JSON matching this schema:\n${options.schema}`,
      };
    }

    // Add system instruction for JSON output if not already present
    if (!messages.some(m => m.role === 'system' && m.content.includes('JSON'))) {
      messages.unshift({
        role: 'system',
        content: 'You must respond with valid JSON only. No markdown, no explanations, just valid JSON.',
      });
    }

    const response = await qwenClient.chat.completions.create({
      model: config.model,
      messages,
      temperature: options.temperature ?? 0.3,
      max_tokens: options.maxTokens ?? 2048,
      stream: false,
    });

    const content = response.choices[0]?.message?.content || '{}';
    console.log('✅ AI JSON response received, content length:', content.length);

    // Extract JSON from potential markdown code blocks
    const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/) || [null, content];
    const jsonStr = jsonMatch[1]?.trim() || content.trim();

    try {
      const result = JSON.parse(jsonStr) as T;
      console.log('✅ JSON parsed successfully');
      return result;
    } catch (e) {
      console.error('❌ Failed to parse JSON response:', jsonStr);
      throw new Error(`Failed to parse AI response as JSON: ${e}`);
    }
  } catch (error) {
    console.error('❌ AI JSON API call failed:', error.message);
    console.error('❌ Error details:', error);
    throw error;
  }
}
