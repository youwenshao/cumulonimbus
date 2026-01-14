/**
 * LLM Types
 * Shared type definitions for LLM providers
 */

export type LLMProvider = 'ollama' | 'openrouter' | 'lmstudio' | 'auto';

export interface LLMConfig {
  provider: LLMProvider;
  // Ollama settings
  ollamaEnabled: boolean;
  ollamaApiUrl: string;
  ollamaModel: string;
  ollamaSmallModel: string;
  // OpenRouter settings
  openrouterApiKey: string;
  openrouterApiUrl: string;
  openrouterModel: string;
  // LM Studio settings
  lmstudioEnabled: boolean;
  lmstudioApiUrl: string;
  lmstudioModel: string;
  // Router settings
  fallbackEnabled: boolean;
}

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface CompletionOptions {
  messages: ChatMessage[];
  temperature?: number;
  maxTokens?: number;
  model?: string; // Override default model
  provider?: LLMProvider; // Override default provider
  userSettings?: UserLLMSettings; // User-specific LLM settings
}

export interface UserLLMSettings {
  provider?: LLMProvider;
  ollamaEndpoint?: string;
  ollamaModel?: string;
  ollamaSmallModel?: string;
  lmstudioEndpoint?: string;
  lmstudioModel?: string;
}

export interface StreamChunk {
  content: string;
  done: boolean;
  model?: string;
  provider?: LLMProvider;
}

export interface LLMClient {
  /** Provider name */
  name: LLMProvider;
  
  /** Check if the provider is available */
  isAvailable(): Promise<boolean>;
  
  /** Non-streaming completion */
  complete(options: CompletionOptions): Promise<string>;
  
  /** Streaming completion */
  streamComplete(options: CompletionOptions): AsyncGenerator<string>;
  
  /** JSON mode completion */
  completeJSON<T>(options: CompletionOptions & { schema?: string }): Promise<T>;
}

export interface HealthCheckResult {
  provider: LLMProvider;
  available: boolean;
  latencyMs?: number;
  error?: string;
  models?: string[];
}

export interface LLMRouterState {
  primaryProvider: LLMProvider;
  ollamaAvailable: boolean;
  openrouterAvailable: boolean;
  lmstudioAvailable: boolean;
  lastHealthCheck: Date | null;
}

// Model size hints for smart model selection
export type ModelSize = 'small' | 'large';

export interface ModelSelectionHints {
  taskComplexity?: 'simple' | 'complex';
  expectedTokens?: number;
  requiresStreaming?: boolean;
}
