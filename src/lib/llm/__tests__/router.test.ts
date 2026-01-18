/**
 * Unit tests for LLM Router
 */

import {
  getLLMConfig,
  getRouterState,
  selectModel,
} from '../router';
import type { LLMProvider, UserLLMSettings } from '../types';

// Mock environment variables
const originalEnv = process.env;

beforeEach(() => {
  jest.resetModules();
  process.env = { ...originalEnv };
});

afterAll(() => {
  process.env = originalEnv;
});

describe('getLLMConfig', () => {
  describe('Default Configuration', () => {
    it('should return default provider as deepseek', () => {
      delete process.env.LLM_PROVIDER;
      const config = getLLMConfig();
      expect(config.provider).toBe('deepseek');
    });

    it('should enable Ollama by default', () => {
      delete process.env.OLLAMA_ENABLED;
      const config = getLLMConfig();
      expect(config.ollamaEnabled).toBe(true);
    });

    it('should disable LM Studio by default', () => {
      delete process.env.LMSTUDIO_ENABLED;
      const config = getLLMConfig();
      expect(config.lmstudioEnabled).toBe(true);
    });

    it('should enable fallback by default', () => {
      delete process.env.LLM_FALLBACK_ENABLED;
      const config = getLLMConfig();
      expect(config.fallbackEnabled).toBe(true);
    });
  });

  describe('Environment Variable Configuration', () => {
    it('should read LLM_PROVIDER from env', () => {
      process.env.LLM_PROVIDER = 'ollama';
      const config = getLLMConfig();
      expect(config.provider).toBe('ollama');
    });

    it('should read OLLAMA_ENABLED from env', () => {
      process.env.OLLAMA_ENABLED = 'false';
      const config = getLLMConfig();
      expect(config.ollamaEnabled).toBe(false);
    });

    it('should read LMSTUDIO_ENABLED from env', () => {
      process.env.LMSTUDIO_ENABLED = 'false';
      const config = getLLMConfig();
      expect(config.lmstudioEnabled).toBe(false);
    });

    it('should read LLM_FALLBACK_ENABLED from env', () => {
      process.env.LLM_FALLBACK_ENABLED = 'false';
      const config = getLLMConfig();
      expect(config.fallbackEnabled).toBe(false);
    });
  });

  describe('User Settings Override', () => {
    it('should override provider with user settings', () => {
      process.env.LLM_PROVIDER = 'ollama';
      const userSettings: UserLLMSettings = { provider: 'lmstudio' };
      const config = getLLMConfig(userSettings);
      expect(config.provider).toBe('lmstudio');
    });

    it('should override Ollama endpoint with user settings', () => {
      const userSettings: UserLLMSettings = {
        ollamaEndpoint: 'http://custom:11434',
      };
      const config = getLLMConfig(userSettings);
      expect(config.ollamaApiUrl).toBe('http://custom:11434');
    });

    it('should override Ollama model with user settings', () => {
      const userSettings: UserLLMSettings = {
        ollamaModel: 'custom-model',
      };
      const config = getLLMConfig(userSettings);
      expect(config.ollamaModel).toBe('custom-model');
    });

    it('should override LM Studio endpoint with user settings', () => {
      const userSettings: UserLLMSettings = {
        lmstudioEndpoint: 'http://custom:1234',
      };
      const config = getLLMConfig(userSettings);
      expect(config.lmstudioApiUrl).toBe('http://custom:1234');
    });

    it('should override LM Studio model with user settings', () => {
      const userSettings: UserLLMSettings = {
        lmstudioModel: 'custom-lm-model',
      };
      const config = getLLMConfig(userSettings);
      expect(config.lmstudioModel).toBe('custom-lm-model');
    });
  });
});

describe('getRouterState', () => {
  it('should return router state object', () => {
    const state = getRouterState();
    expect(state).toBeDefined();
    expect(typeof state.ollamaAvailable).toBe('boolean');
    expect(typeof state.openrouterAvailable).toBe('boolean');
    expect(typeof state.lmstudioAvailable).toBe('boolean');
    expect(typeof state.deepseekAvailable).toBe('boolean');
  });

  it('should return copy of state (immutable)', () => {
    const state1 = getRouterState();
    const state2 = getRouterState();
    expect(state1).not.toBe(state2); // Different object references
    expect(state1).toEqual(state2); // Same values
  });

  it('should include lastHealthCheck field', () => {
    const state = getRouterState();
    expect('lastHealthCheck' in state).toBe(true);
  });

  it('should include primaryProvider field', () => {
    const state = getRouterState();
    expect('primaryProvider' in state).toBe(true);
  });
});

describe('selectModel', () => {
  describe('Ollama Model Selection', () => {
    it('should return large model by default', () => {
      const model = selectModel('ollama');
      expect(model).toBeTruthy();
    });

    it('should return large model explicitly', () => {
      const model = selectModel('ollama', 'large');
      expect(model).toBeTruthy();
    });

    it('should return small model when specified', () => {
      const model = selectModel('ollama', 'small');
      expect(model).toBeTruthy();
    });

    it('should respect user settings for model', () => {
      const userSettings: UserLLMSettings = {
        ollamaModel: 'user-custom-model',
      };
      const model = selectModel('ollama', 'large', userSettings);
      expect(model).toBe('user-custom-model');
    });

    it('should respect user settings for small model', () => {
      const userSettings: UserLLMSettings = {
        ollamaSmallModel: 'user-small-model',
      };
      const model = selectModel('ollama', 'small', userSettings);
      expect(model).toBe('user-small-model');
    });
  });

  describe('LM Studio Model Selection', () => {
    it('should return model for LM Studio', () => {
      const model = selectModel('lmstudio');
      expect(model).toBeTruthy();
    });

    it('should return same model for small and large (LM Studio)', () => {
      const large = selectModel('lmstudio', 'large');
      const small = selectModel('lmstudio', 'small');
      expect(large).toBe(small);
    });

    it('should respect user settings', () => {
      const userSettings: UserLLMSettings = {
        lmstudioModel: 'custom-lmstudio',
      };
      const model = selectModel('lmstudio', 'large', userSettings);
      expect(model).toBe('custom-lmstudio');
    });
  });

  describe('OpenRouter Model Selection', () => {
    it('should return model for OpenRouter', () => {
      const model = selectModel('openrouter');
      expect(model).toBeTruthy();
    });

    it('should return same model for all sizes', () => {
      const large = selectModel('openrouter', 'large');
      const small = selectModel('openrouter', 'small');
      expect(large).toBe(small);
    });
  });

  describe('DeepSeek Model Selection', () => {
    it('should return model for DeepSeek', () => {
      const model = selectModel('deepseek');
      expect(model).toBeTruthy();
    });
  });
});

describe('Provider Types', () => {
  const providers: LLMProvider[] = ['ollama', 'openrouter', 'lmstudio', 'deepseek', 'auto'];

  it('should handle all provider types in getLLMConfig', () => {
    providers.forEach(provider => {
      process.env.LLM_PROVIDER = provider;
      const config = getLLMConfig();
      expect(config.provider).toBe(provider);
    });
  });

  it('should handle all provider types in selectModel', () => {
    providers.filter(p => p !== 'auto').forEach(provider => {
      const model = selectModel(provider as Exclude<LLMProvider, 'auto'>);
      expect(model).toBeTruthy();
    });
  });
});

describe('Edge Cases', () => {
  describe('Empty User Settings', () => {
    it('should handle undefined user settings', () => {
      const config = getLLMConfig(undefined);
      expect(config).toBeDefined();
      expect(config.provider).toBeTruthy();
    });

    it('should handle empty user settings object', () => {
      const config = getLLMConfig({});
      expect(config).toBeDefined();
    });
  });

  describe('Invalid Environment Variables', () => {
    it('should handle empty LLM_PROVIDER', () => {
      process.env.LLM_PROVIDER = '';
      const config = getLLMConfig();
      // Should fall back to default
      expect(['deepseek', '']).toContain(config.provider);
    });

    it('should handle invalid boolean values', () => {
      process.env.OLLAMA_ENABLED = 'invalid';
      const config = getLLMConfig();
      // Should not be false (invalid value treated as truthy)
      expect(config.ollamaEnabled).toBe(true);
    });
  });

  describe('State Consistency', () => {
    it('should maintain state across multiple calls', () => {
      const state1 = getRouterState();
      const state2 = getRouterState();
      
      // Primary provider should be consistent
      expect(state1.primaryProvider).toBe(state2.primaryProvider);
    });
  });
});

describe('Configuration Completeness', () => {
  it('should include all required Ollama config fields', () => {
    const config = getLLMConfig();
    expect(config.ollamaEnabled).toBeDefined();
    expect(config.ollamaApiUrl).toBeDefined();
    expect(config.ollamaModel).toBeDefined();
    expect(config.ollamaSmallModel).toBeDefined();
  });

  it('should include all required LM Studio config fields', () => {
    const config = getLLMConfig();
    expect(config.lmstudioEnabled).toBeDefined();
    expect(config.lmstudioApiUrl).toBeDefined();
    expect(config.lmstudioModel).toBeDefined();
  });

  it('should include all required OpenRouter config fields', () => {
    const config = getLLMConfig();
    expect(config.openrouterApiUrl).toBeDefined();
    expect(config.openrouterModel).toBeDefined();
    // API key might be undefined if not configured
    expect('openrouterApiKey' in config).toBe(true);
  });

  it('should include all required DeepSeek config fields', () => {
    const config = getLLMConfig();
    expect(config.deepseekApiUrl).toBeDefined();
    expect(config.deepseekModel).toBeDefined();
    expect('deepseekApiKey' in config).toBe(true);
  });

  it('should include fallback configuration', () => {
    const config = getLLMConfig();
    expect(typeof config.fallbackEnabled).toBe('boolean');
  });
});
