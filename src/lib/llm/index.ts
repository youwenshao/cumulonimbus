/**
 * LLM Module
 * Unified LLM access with Ollama and OpenRouter support
 */

// Types
export type {
  LLMProvider,
  LLMConfig,
  LLMClient,
  LLMRouterState,
  ChatMessage,
  CompletionOptions,
  StreamChunk,
  HealthCheckResult,
  ModelSize,
  ModelSelectionHints,
} from './types';

// Ollama client
export {
  getOllamaClient,
  checkOllamaHealth,
  listOllamaModels,
  getOllamaConfig,
} from './ollama-client';

// OpenRouter client
export {
  getOpenRouterClient,
  checkOpenRouterHealth,
  getOpenRouterConfig,
} from './openrouter-client';

// Router
export {
  getLLMConfig,
  getRouterState,
  getRoutedClient,
  selectProvider,
  selectModel,
  checkAllHealth,
  refreshHealth,
  setPreferredProvider,
  // Convenience functions
  complete,
  streamComplete,
  completeJSON,
} from './router';
