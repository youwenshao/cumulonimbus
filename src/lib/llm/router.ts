/**
 * LLM Router
 * Smart routing between Ollama (local) and OpenRouter (hosted) with automatic fallback
 */

import type {
  LLMProvider,
  LLMClient,
  LLMConfig,
  LLMRouterState,
  CompletionOptions,
  HealthCheckResult,
  ModelSize,
  ModelSelectionHints,
} from './types';
import { getOllamaClient, checkOllamaHealth, getOllamaConfig } from './ollama-client';
import { getOpenRouterClient, checkOpenRouterHealth, getOpenRouterConfig } from './openrouter-client';

// Health check interval: 30 seconds
const HEALTH_CHECK_INTERVAL_MS = 30000;

// Router state
let routerState: LLMRouterState = {
  primaryProvider: 'auto',
  ollamaAvailable: false,
  openrouterAvailable: false,
  lastHealthCheck: null,
};

/**
 * Get LLM configuration from environment
 */
export function getLLMConfig(): LLMConfig {
  const ollamaConfig = getOllamaConfig();
  const openrouterConfig = getOpenRouterConfig();

  return {
    provider: (process.env.LLM_PROVIDER || 'auto') as LLMProvider,
    ollamaEnabled: process.env.OLLAMA_ENABLED !== 'false',
    ollamaApiUrl: ollamaConfig.apiUrl,
    ollamaModel: ollamaConfig.model,
    ollamaSmallModel: ollamaConfig.smallModel,
    openrouterApiKey: openrouterConfig.apiKey,
    openrouterApiUrl: openrouterConfig.apiUrl,
    openrouterModel: openrouterConfig.model,
    fallbackEnabled: process.env.LLM_FALLBACK_ENABLED !== 'false',
  };
}

/**
 * Get current router state
 */
export function getRouterState(): LLMRouterState {
  return { ...routerState };
}

/**
 * Check health of all providers
 */
export async function checkAllHealth(): Promise<HealthCheckResult[]> {
  const config = getLLMConfig();
  const results: HealthCheckResult[] = [];

  // Check Ollama
  if (config.ollamaEnabled) {
    const ollamaHealth = await checkOllamaHealth();
    results.push(ollamaHealth);
    routerState.ollamaAvailable = ollamaHealth.available;
  }

  // Check OpenRouter
  const openrouterHealth = await checkOpenRouterHealth();
  results.push(openrouterHealth);
  routerState.openrouterAvailable = openrouterHealth.available;

  routerState.lastHealthCheck = new Date();

  console.log('🔍 Health check results:', {
    ollama: routerState.ollamaAvailable,
    openrouter: routerState.openrouterAvailable,
  });

  return results;
}

/**
 * Check if health check is stale and needs refresh
 */
function isHealthCheckStale(): boolean {
  if (!routerState.lastHealthCheck) return true;
  const elapsed = Date.now() - routerState.lastHealthCheck.getTime();
  return elapsed > HEALTH_CHECK_INTERVAL_MS;
}

/**
 * Ensure health check is fresh
 */
async function ensureFreshHealthCheck(): Promise<void> {
  if (isHealthCheckStale()) {
    await checkAllHealth();
  }
}

/**
 * Select the best provider based on configuration and availability
 */
export async function selectProvider(
  requestedProvider?: LLMProvider,
  hints?: ModelSelectionHints
): Promise<{ provider: LLMProvider; client: LLMClient }> {
  const config = getLLMConfig();

  // Refresh health check if stale
  await ensureFreshHealthCheck();

  // Determine which provider to use
  let targetProvider = requestedProvider || config.provider;

  if (targetProvider === 'auto') {
    // Auto mode: prefer Ollama if available
    if (config.ollamaEnabled && routerState.ollamaAvailable) {
      targetProvider = 'ollama';
    } else if (routerState.openrouterAvailable) {
      targetProvider = 'openrouter';
    } else {
      throw new Error('No LLM provider available');
    }
  }

  // Get the client for the selected provider
  if (targetProvider === 'ollama') {
    if (!routerState.ollamaAvailable && config.fallbackEnabled) {
      console.log('⚠️ Ollama unavailable, falling back to OpenRouter');
      targetProvider = 'openrouter';
    } else if (!routerState.ollamaAvailable) {
      throw new Error('Ollama is not available and fallback is disabled');
    }
  }

  if (targetProvider === 'openrouter') {
    if (!routerState.openrouterAvailable && config.fallbackEnabled && routerState.ollamaAvailable) {
      console.log('⚠️ OpenRouter unavailable, falling back to Ollama');
      targetProvider = 'ollama';
    } else if (!routerState.openrouterAvailable) {
      throw new Error('OpenRouter is not available');
    }
  }

  const client = targetProvider === 'ollama' ? getOllamaClient() : getOpenRouterClient();

  return { provider: targetProvider, client };
}

/**
 * Select model based on task complexity
 */
export function selectModel(
  provider: LLMProvider,
  size: ModelSize = 'large'
): string {
  const config = getLLMConfig();

  if (provider === 'ollama') {
    return size === 'small' ? config.ollamaSmallModel : config.ollamaModel;
  }

  return config.openrouterModel;
}

/**
 * Create a routed LLM client that handles fallback
 */
export function createRoutedClient(): LLMClient {
  return {
    name: 'auto',

    async isAvailable(): Promise<boolean> {
      await ensureFreshHealthCheck();
      return routerState.ollamaAvailable || routerState.openrouterAvailable;
    },

    async complete(options: CompletionOptions): Promise<string> {
      const { provider, client } = await selectProvider(options.provider);

      console.log(`🔀 Router: Using ${provider} for completion`);

      try {
        return await client.complete(options);
      } catch (error) {
        // Try fallback
        const config = getLLMConfig();
        if (config.fallbackEnabled) {
          const fallbackProvider = provider === 'ollama' ? 'openrouter' : 'ollama';
          const fallbackAvailable = fallbackProvider === 'ollama' 
            ? routerState.ollamaAvailable 
            : routerState.openrouterAvailable;

          if (fallbackAvailable) {
            console.log(`⚠️ ${provider} failed, trying ${fallbackProvider}`);
            const fallbackClient = fallbackProvider === 'ollama' 
              ? getOllamaClient() 
              : getOpenRouterClient();
            return await fallbackClient.complete(options);
          }
        }
        throw error;
      }
    },

    async *streamComplete(options: CompletionOptions): AsyncGenerator<string> {
      const { provider, client } = await selectProvider(options.provider);

      console.log(`🔀 Router: Using ${provider} for streaming`);

      try {
        yield* client.streamComplete(options);
      } catch (error) {
        // Try fallback
        const config = getLLMConfig();
        if (config.fallbackEnabled) {
          const fallbackProvider = provider === 'ollama' ? 'openrouter' : 'ollama';
          const fallbackAvailable = fallbackProvider === 'ollama' 
            ? routerState.ollamaAvailable 
            : routerState.openrouterAvailable;

          if (fallbackAvailable) {
            console.log(`⚠️ ${provider} failed, trying ${fallbackProvider}`);
            const fallbackClient = fallbackProvider === 'ollama' 
              ? getOllamaClient() 
              : getOpenRouterClient();
            yield* fallbackClient.streamComplete(options);
            return;
          }
        }
        throw error;
      }
    },

    async completeJSON<T>(options: CompletionOptions & { schema?: string }): Promise<T> {
      const { provider, client } = await selectProvider(options.provider);

      console.log(`🔀 Router: Using ${provider} for JSON completion`);

      try {
        return await client.completeJSON<T>(options);
      } catch (error) {
        // Try fallback
        const config = getLLMConfig();
        if (config.fallbackEnabled) {
          const fallbackProvider = provider === 'ollama' ? 'openrouter' : 'ollama';
          const fallbackAvailable = fallbackProvider === 'ollama' 
            ? routerState.ollamaAvailable 
            : routerState.openrouterAvailable;

          if (fallbackAvailable) {
            console.log(`⚠️ ${provider} failed, trying ${fallbackProvider}`);
            const fallbackClient = fallbackProvider === 'ollama' 
              ? getOllamaClient() 
              : getOpenRouterClient();
            return await fallbackClient.completeJSON<T>(options);
          }
        }
        throw error;
      }
    },
  };
}

// Singleton routed client
let routedClient: LLMClient | null = null;

export function getRoutedClient(): LLMClient {
  if (!routedClient) {
    routedClient = createRoutedClient();
  }
  return routedClient;
}

/**
 * Convenience functions that use the routed client
 */
export async function complete(options: CompletionOptions): Promise<string> {
  return getRoutedClient().complete(options);
}

export async function* streamComplete(options: CompletionOptions): AsyncGenerator<string> {
  yield* getRoutedClient().streamComplete(options);
}

export async function completeJSON<T>(options: CompletionOptions & { schema?: string }): Promise<T> {
  return getRoutedClient().completeJSON<T>(options);
}

/**
 * Force refresh health check
 */
export async function refreshHealth(): Promise<HealthCheckResult[]> {
  routerState.lastHealthCheck = null;
  return checkAllHealth();
}

/**
 * Set preferred provider (for user settings)
 */
export function setPreferredProvider(provider: LLMProvider): void {
  routerState.primaryProvider = provider;
}
