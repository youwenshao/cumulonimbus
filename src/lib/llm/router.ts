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
  UserLLMSettings,
} from './types';
import { getOllamaClient, checkOllamaHealth, getOllamaConfig } from './ollama-client';
import { getOpenRouterClient, checkOpenRouterHealth, getOpenRouterConfig } from './openrouter-client';
import { getLMStudioClient, checkLMStudioHealth, getLMStudioConfig } from './lmstudio-client';
import { getDeepseekClient, checkDeepseekHealth, getDeepseekConfig } from './deepseek-client';
import { decryptApiKey, isEncryptionAvailable } from '@/lib/crypto';

// Health check interval: 30 seconds
const HEALTH_CHECK_INTERVAL_MS = 30000;

// Router state
let routerState: LLMRouterState = {
  primaryProvider: 'auto',
  ollamaAvailable: false,
  openrouterAvailable: false,
  lmstudioAvailable: false,
  deepseekAvailable: false,
  lastHealthCheck: null,
};

/**
 * Get LLM configuration from environment and user settings
 */
export function getLLMConfig(userSettings?: UserLLMSettings): LLMConfig {
  const ollamaConfig = getOllamaConfig();
  const openrouterConfig = getOpenRouterConfig();
  const lmstudioConfig = getLMStudioConfig();
  const deepseekConfig = getDeepseekConfig();

  return {
    provider: (userSettings?.provider || process.env.LLM_PROVIDER || 'deepseek') as LLMProvider,
    ollamaEnabled: process.env.OLLAMA_ENABLED !== 'false',
    ollamaApiUrl: userSettings?.ollamaEndpoint || ollamaConfig.apiUrl,
    ollamaModel: userSettings?.ollamaModel || ollamaConfig.model,
    ollamaSmallModel: userSettings?.ollamaSmallModel || ollamaConfig.smallModel,
    deepseekApiKey: deepseekConfig.apiKey,
    deepseekApiUrl: deepseekConfig.apiUrl,
    deepseekModel: deepseekConfig.model,
    openrouterApiKey: openrouterConfig.apiKey,
    openrouterApiUrl: openrouterConfig.apiUrl,
    openrouterModel: openrouterConfig.model,
    lmstudioEnabled: process.env.LMSTUDIO_ENABLED !== 'false',
    lmstudioApiUrl: userSettings?.lmstudioEndpoint || lmstudioConfig.apiUrl,
    lmstudioModel: userSettings?.lmstudioModel || lmstudioConfig.model,
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

  const deepseekHealth = await checkDeepseekHealth();
  results.push(deepseekHealth);
  routerState.deepseekAvailable = deepseekHealth.available;

  const openrouterHealth = await checkOpenRouterHealth();
  results.push(openrouterHealth);
  routerState.openrouterAvailable = openrouterHealth.available;

  // Check LM Studio (always check local providers)
  const lmstudioHealth = await checkLMStudioHealth();
  results.push(lmstudioHealth);
  routerState.lmstudioAvailable = lmstudioHealth.available;

  routerState.lastHealthCheck = new Date();

  console.log('🔍 Health check results:', {
    ollama: routerState.ollamaAvailable,
    openrouter: routerState.openrouterAvailable,
    lmstudio: routerState.lmstudioAvailable,
    deepseek: routerState.deepseekAvailable,
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
  hints?: ModelSelectionHints,
  userSettings?: UserLLMSettings
): Promise<{ provider: LLMProvider; client: LLMClient }> {
  const config = getLLMConfig(userSettings);

  // Refresh health check if stale
  await ensureFreshHealthCheck();

  // Determine which provider to use
  let targetProvider = requestedProvider || config.provider;

  if (targetProvider === 'auto') {
    if (config.ollamaEnabled && routerState.ollamaAvailable) {
      targetProvider = 'ollama';
    } else if (config.lmstudioEnabled && routerState.lmstudioAvailable) {
      targetProvider = 'lmstudio';
    } else if (routerState.deepseekAvailable) {
      targetProvider = 'deepseek';
    } else if (routerState.openrouterAvailable) {
      targetProvider = 'openrouter';
    } else {
      throw new Error('No LLM provider available');
    }
  }

  // Get the client for the selected provider
  if (targetProvider === 'ollama') {
    if (!routerState.ollamaAvailable && config.fallbackEnabled) {
      if (config.lmstudioEnabled && routerState.lmstudioAvailable) {
        console.log('⚠️ Ollama unavailable, falling back to LM Studio');
        targetProvider = 'lmstudio';
      } else if (routerState.openrouterAvailable) {
        console.log('⚠️ Ollama unavailable, falling back to OpenRouter');
        targetProvider = 'openrouter';
      }
    } else if (!routerState.ollamaAvailable) {
      throw new Error('Ollama is not available and fallback is disabled');
    }
  }

  if (targetProvider === 'lmstudio') {
    if (!routerState.lmstudioAvailable && config.fallbackEnabled) {
      if (config.ollamaEnabled && routerState.ollamaAvailable) {
        console.log('⚠️ LM Studio unavailable, falling back to Ollama');
        targetProvider = 'ollama';
      } else if (routerState.openrouterAvailable) {
        console.log('⚠️ LM Studio unavailable, falling back to OpenRouter');
        targetProvider = 'openrouter';
      }
    } else if (!routerState.lmstudioAvailable) {
      throw new Error('LM Studio is not available and fallback is disabled');
    }
  }

  if (targetProvider === 'openrouter') {
    if (!routerState.openrouterAvailable && config.fallbackEnabled) {
      if (config.ollamaEnabled && routerState.ollamaAvailable) {
        console.log('⚠️ OpenRouter unavailable, falling back to Ollama');
        targetProvider = 'ollama';
      } else if (config.lmstudioEnabled && routerState.lmstudioAvailable) {
        console.log('⚠️ OpenRouter unavailable, falling back to LM Studio');
        targetProvider = 'lmstudio';
      }
    } else if (!routerState.openrouterAvailable) {
      throw new Error('OpenRouter is not available');
    }
  }

  if (targetProvider === 'deepseek') {
    if (!routerState.deepseekAvailable && config.fallbackEnabled) {
      if (routerState.openrouterAvailable) {
        console.log('⚠️ DeepSeek unavailable, falling back to OpenRouter');
        targetProvider = 'openrouter';
      } else if (config.ollamaEnabled && routerState.ollamaAvailable) {
        console.log('⚠️ DeepSeek unavailable, falling back to Ollama');
        targetProvider = 'ollama';
      } else if (config.lmstudioEnabled && routerState.lmstudioAvailable) {
        console.log('⚠️ DeepSeek unavailable, falling back to LM Studio');
        targetProvider = 'lmstudio';
      }
    } else if (!routerState.deepseekAvailable) {
      throw new Error('DeepSeek is not available');
    }
  }

  const client: LLMClient =
    targetProvider === 'ollama'
      ? getOllamaClient()
      : targetProvider === 'lmstudio'
        ? getLMStudioClient()
        : targetProvider === 'deepseek'
          ? getDeepseekClient()
          : getOpenRouterClient();

  return { provider: targetProvider, client };
}

/**
 * Select model based on task complexity
 */
export function selectModel(
  provider: LLMProvider,
  size: ModelSize = 'large',
  userSettings?: UserLLMSettings
): string {
  const config = getLLMConfig(userSettings);

  if (provider === 'ollama') {
    return size === 'small' ? config.ollamaSmallModel : config.ollamaModel;
  }

  if (provider === 'lmstudio') {
    return config.lmstudioModel;
  }

  if (provider === 'deepseek') {
    return config.deepseekModel;
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
      return (
        routerState.ollamaAvailable ||
        routerState.openrouterAvailable ||
        routerState.lmstudioAvailable ||
        routerState.deepseekAvailable
      );
    },

    async complete(options: CompletionOptions): Promise<string> {
      const { provider, client } = await selectProvider(options.provider, undefined, options.userSettings);

      console.log(`🔀 Router: Using ${provider} for completion`);

      try {
        return await client.complete(options);
      } catch (error) {
        // Try fallback
        const config = getLLMConfig();
        if (config.fallbackEnabled) {
          let fallbackProvider: LLMProvider | null = null;
          let fallbackAvailable = false;

          if (provider === 'ollama') {
            if (config.lmstudioEnabled && routerState.lmstudioAvailable) {
              fallbackProvider = 'lmstudio';
              fallbackAvailable = true;
            } else if (routerState.deepseekAvailable) {
              fallbackProvider = 'deepseek';
              fallbackAvailable = true;
            } else if (routerState.openrouterAvailable) {
              fallbackProvider = 'openrouter';
              fallbackAvailable = true;
            }
          } else if (provider === 'lmstudio') {
            if (config.ollamaEnabled && routerState.ollamaAvailable) {
              fallbackProvider = 'ollama';
              fallbackAvailable = true;
            } else if (routerState.deepseekAvailable) {
              fallbackProvider = 'deepseek';
              fallbackAvailable = true;
            } else if (routerState.openrouterAvailable) {
              fallbackProvider = 'openrouter';
              fallbackAvailable = true;
            }
          } else if (provider === 'deepseek') {
            if (routerState.openrouterAvailable) {
              fallbackProvider = 'openrouter';
              fallbackAvailable = true;
            }
            // Do not fallback to local providers from a cloud provider
          } else {
            if (routerState.deepseekAvailable) {
              fallbackProvider = 'deepseek';
              fallbackAvailable = true;
            } else if (config.ollamaEnabled && routerState.ollamaAvailable) {
              fallbackProvider = 'ollama';
              fallbackAvailable = true;
            } else if (config.lmstudioEnabled && routerState.lmstudioAvailable) {
              fallbackProvider = 'lmstudio';
              fallbackAvailable = true;
            }
          }

          if (fallbackAvailable && fallbackProvider) {
            console.log(`⚠️ ${provider} failed, trying ${fallbackProvider}`);
            let fallbackClient: LLMClient;
            if (fallbackProvider === 'ollama') {
              fallbackClient = getOllamaClient();
            } else if (fallbackProvider === 'lmstudio') {
              fallbackClient = getLMStudioClient();
            } else if (fallbackProvider === 'deepseek') {
              fallbackClient = getDeepseekClient();
            } else {
              fallbackClient = getOpenRouterClient();
            }
            return await fallbackClient.complete(options);
          }
        }
        throw error;
      }
    },

    async *streamComplete(options: CompletionOptions): AsyncGenerator<string> {
      const { provider, client } = await selectProvider(options.provider, undefined, options.userSettings);

      console.log(`🔀 Router: Using ${provider} for streaming`);

      try {
        yield* client.streamComplete(options);
      } catch (error) {
        console.error(`❌ ${provider} stream failed:`, error);
        // Try fallback
        const config = getLLMConfig();
        if (config.fallbackEnabled) {
          let fallbackProvider: LLMProvider | null = null;
          let fallbackAvailable = false;

          if (provider === 'ollama') {
            if (config.lmstudioEnabled && routerState.lmstudioAvailable) {
              fallbackProvider = 'lmstudio';
              fallbackAvailable = true;
            } else if (routerState.deepseekAvailable) {
              fallbackProvider = 'deepseek';
              fallbackAvailable = true;
            } else if (routerState.openrouterAvailable) {
              fallbackProvider = 'openrouter';
              fallbackAvailable = true;
            }
          } else if (provider === 'lmstudio') {
            if (config.ollamaEnabled && routerState.ollamaAvailable) {
              fallbackProvider = 'ollama';
              fallbackAvailable = true;
            } else if (routerState.deepseekAvailable) {
              fallbackProvider = 'deepseek';
              fallbackAvailable = true;
            } else if (routerState.openrouterAvailable) {
              fallbackProvider = 'openrouter';
              fallbackAvailable = true;
            }
          } else if (provider === 'deepseek') {
            if (routerState.openrouterAvailable) {
              fallbackProvider = 'openrouter';
              fallbackAvailable = true;
            }
            // Do not fallback to local providers from a cloud provider
          } else {
            if (routerState.deepseekAvailable) {
              fallbackProvider = 'deepseek';
              fallbackAvailable = true;
            } else if (config.ollamaEnabled && routerState.ollamaAvailable) {
              fallbackProvider = 'ollama';
              fallbackAvailable = true;
            } else if (config.lmstudioEnabled && routerState.lmstudioAvailable) {
              fallbackProvider = 'lmstudio';
              fallbackAvailable = true;
            }
          }

          if (fallbackAvailable && fallbackProvider) {
            console.log(`⚠️ ${provider} failed, trying ${fallbackProvider}`);
            let fallbackClient: LLMClient;
            if (fallbackProvider === 'ollama') {
              fallbackClient = getOllamaClient();
            } else if (fallbackProvider === 'lmstudio') {
              fallbackClient = getLMStudioClient();
            } else if (fallbackProvider === 'deepseek') {
              fallbackClient = getDeepseekClient();
            } else {
              fallbackClient = getOpenRouterClient();
            }
            yield* fallbackClient.streamComplete(options);
            return;
          }
        }
        throw error;
      }
    },

    async completeJSON<T>(options: CompletionOptions & { schema?: string }): Promise<T> {
      const { provider, client } = await selectProvider(options.provider, undefined, options.userSettings);

      console.log(`🔀 Router: Using ${provider} for JSON completion`);

      try {
        return await client.completeJSON<T>(options);
      } catch (error) {
        // Try fallback
        const config = getLLMConfig();
        if (config.fallbackEnabled) {
          let fallbackProvider: LLMProvider | null = null;
          let fallbackAvailable = false;

          if (provider === 'ollama') {
            if (config.lmstudioEnabled && routerState.lmstudioAvailable) {
              fallbackProvider = 'lmstudio';
              fallbackAvailable = true;
            } else if (routerState.deepseekAvailable) {
              fallbackProvider = 'deepseek';
              fallbackAvailable = true;
            } else if (routerState.openrouterAvailable) {
              fallbackProvider = 'openrouter';
              fallbackAvailable = true;
            }
          } else if (provider === 'lmstudio') {
            if (config.ollamaEnabled && routerState.ollamaAvailable) {
              fallbackProvider = 'ollama';
              fallbackAvailable = true;
            } else if (routerState.deepseekAvailable) {
              fallbackProvider = 'deepseek';
              fallbackAvailable = true;
            } else if (routerState.openrouterAvailable) {
              fallbackProvider = 'openrouter';
              fallbackAvailable = true;
            }
          } else if (provider === 'deepseek') {
            if (routerState.openrouterAvailable) {
              fallbackProvider = 'openrouter';
              fallbackAvailable = true;
            } else if (config.ollamaEnabled && routerState.ollamaAvailable) {
              fallbackProvider = 'ollama';
              fallbackAvailable = true;
            } else if (config.lmstudioEnabled && routerState.lmstudioAvailable) {
              fallbackProvider = 'lmstudio';
              fallbackAvailable = true;
            }
          } else {
            if (routerState.deepseekAvailable) {
              fallbackProvider = 'deepseek';
              fallbackAvailable = true;
            } else if (config.ollamaEnabled && routerState.ollamaAvailable) {
              fallbackProvider = 'ollama';
              fallbackAvailable = true;
            } else if (config.lmstudioEnabled && routerState.lmstudioAvailable) {
              fallbackProvider = 'lmstudio';
              fallbackAvailable = true;
            }
          }

          if (fallbackAvailable && fallbackProvider) {
            console.log(`⚠️ ${provider} failed, trying ${fallbackProvider}`);
            let fallbackClient: LLMClient;
            if (fallbackProvider === 'ollama') {
              fallbackClient = getOllamaClient();
            } else if (fallbackProvider === 'lmstudio') {
              fallbackClient = getLMStudioClient();
            } else if (fallbackProvider === 'deepseek') {
              fallbackClient = getDeepseekClient();
            } else {
              fallbackClient = getOpenRouterClient();
            }
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

/**
 * Decrypt user API keys from encrypted database values
 * Returns an object with decrypted keys (or undefined if not set)
 */
export function decryptUserApiKeys(encryptedKeys: {
  deepseekApiKey?: string | null;
  openrouterApiKey?: string | null;
}): { deepseekApiKey?: string; openrouterApiKey?: string } {
  const result: { deepseekApiKey?: string; openrouterApiKey?: string } = {};

  if (!isEncryptionAvailable()) {
    console.warn('⚠️ Encryption not available - user API keys cannot be decrypted');
    return result;
  }

  if (encryptedKeys.deepseekApiKey) {
    try {
      result.deepseekApiKey = decryptApiKey(encryptedKeys.deepseekApiKey);
    } catch (error) {
      console.error('Failed to decrypt DeepSeek API key:', error);
    }
  }

  if (encryptedKeys.openrouterApiKey) {
    try {
      result.openrouterApiKey = decryptApiKey(encryptedKeys.openrouterApiKey);
    } catch (error) {
      console.error('Failed to decrypt OpenRouter API key:', error);
    }
  }

  return result;
}

/**
 * Enhance user settings with decrypted API keys
 * Merges decrypted API keys into existing user settings
 */
export function enhanceUserSettingsWithApiKeys(
  baseSettings: UserLLMSettings,
  encryptedKeys: {
    deepseekApiKey?: string | null;
    openrouterApiKey?: string | null;
  }
): UserLLMSettings {
  const decryptedKeys = decryptUserApiKeys(encryptedKeys);
  
  return {
    ...baseSettings,
    ...decryptedKeys,
  };
}
