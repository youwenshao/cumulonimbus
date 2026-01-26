'use client';

import { useState, useEffect } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Loader2,
  RefreshCw,
  Eye,
  EyeOff,
  Trash2,
  Key,
  Server,
  Shield,
} from 'lucide-react';
import { Button } from '@/components/ui';
import { OllamaIcon, LMStudioIcon, DeepseekIcon, OpenRouterIcon } from '@/components/icons/ProviderIcons';
import type { HealthCheckResult } from '@/lib/llm/types';

export interface AdvancedLLMSettingsProps {
  onSave?: () => Promise<void>;
  isSaving?: boolean;
}

interface HealthStatus {
  ollama: HealthCheckResult | null;
  lmstudio: HealthCheckResult | null;
  checking: boolean;
}

interface StoredApiKey {
  provider: 'deepseek' | 'openrouter';
  maskedKey: string;
  createdAt: string;
}

interface AdvancedSettings {
  manualModelSelection: boolean;
  manualOllamaModel: string;
  manualLMStudioModel: string;
  ollamaEndpoint: string;
  lmstudioEndpoint: string;
}

type ApiKeyProvider = 'deepseek' | 'openrouter';

export function AdvancedLLMSettings({
  onSave,
  isSaving = false,
}: AdvancedLLMSettingsProps) {
  // Health status
  const [healthStatus, setHealthStatus] = useState<HealthStatus>({
    ollama: null,
    lmstudio: null,
    checking: false,
  });

  // Advanced settings state
  const [settings, setSettings] = useState<AdvancedSettings>({
    manualModelSelection: false,
    manualOllamaModel: '',
    manualLMStudioModel: '',
    ollamaEndpoint: 'http://localhost:11434',
    lmstudioEndpoint: 'http://localhost:1234',
  });

  // API Key state
  const [storedKeys, setStoredKeys] = useState<StoredApiKey[]>([]);
  const [selectedProvider, setSelectedProvider] = useState<ApiKeyProvider>('deepseek');
  const [apiKeyInput, setApiKeyInput] = useState('');
  const [showApiKey, setShowApiKey] = useState(false);
  const [keyTesting, setKeyTesting] = useState(false);
  const [keySaving, setKeySaving] = useState(false);
  const [keyDeleting, setKeyDeleting] = useState<string | null>(null);
  const [keyMessage, setKeyMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Loading states
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Load data on mount
  useEffect(() => {
    Promise.all([
      loadAdvancedSettings(),
      loadApiKeys(),
      checkHealth(),
    ]).finally(() => setLoading(false));
  }, []);

  const loadAdvancedSettings = async () => {
    try {
      const response = await fetch('/api/settings/llm/advanced');
      if (response.ok) {
        const data = await response.json();
        setSettings({
          manualModelSelection: data.manualModelSelection ?? false,
          manualOllamaModel: data.manualOllamaModel ?? '',
          manualLMStudioModel: data.manualLMStudioModel ?? '',
          ollamaEndpoint: data.ollamaEndpoint ?? 'http://localhost:11434',
          lmstudioEndpoint: data.lmstudioEndpoint ?? 'http://localhost:1234',
        });
      }
    } catch (error) {
      console.error('Failed to load advanced settings:', error);
    }
  };

  const loadApiKeys = async () => {
    try {
      const response = await fetch('/api/settings/llm/api-keys');
      if (response.ok) {
        const data = await response.json();
        setStoredKeys(data.keys || []);
      }
    } catch (error) {
      console.error('Failed to load API keys:', error);
    }
  };

  const checkHealth = async () => {
    setHealthStatus(prev => ({ ...prev, checking: true }));

    try {
      const response = await fetch('/api/settings/llm/health');
      const data = await response.json();

      setHealthStatus({
        ollama: data.results?.find((r: HealthCheckResult) => r.provider === 'ollama') || null,
        lmstudio: data.results?.find((r: HealthCheckResult) => r.provider === 'lmstudio') || null,
        checking: false,
      });
    } catch {
      setHealthStatus(prev => ({ ...prev, checking: false }));
    }
  };

  const saveAdvancedSettings = async () => {
    setSaving(true);
    setSaveMessage(null);

    try {
      const response = await fetch('/api/settings/llm/advanced', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      });

      if (response.ok) {
        setSaveMessage({ type: 'success', text: 'Advanced settings saved successfully!' });
        setTimeout(() => setSaveMessage(null), 3000);
      } else {
        const errorData = await response.json().catch(() => ({}));
        setSaveMessage({ type: 'error', text: errorData.error || 'Failed to save settings' });
      }
    } catch (error) {
      console.error('Failed to save settings:', error);
      setSaveMessage({ type: 'error', text: 'Failed to save settings. Please try again.' });
    } finally {
      setSaving(false);
    }
  };

  const testApiKey = async () => {
    if (!apiKeyInput.trim()) {
      setKeyMessage({ type: 'error', text: 'Please enter an API key' });
      return;
    }

    setKeyTesting(true);
    setKeyMessage(null);

    try {
      const response = await fetch('/api/settings/llm/api-keys/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider: selectedProvider,
          apiKey: apiKeyInput.trim(),
        }),
      });

      const data = await response.json();

      if (response.ok && data.valid) {
        setKeyMessage({ type: 'success', text: 'API key is valid!' });
      } else {
        setKeyMessage({ type: 'error', text: data.error || 'API key validation failed' });
      }
    } catch (error) {
      console.error('Failed to test API key:', error);
      setKeyMessage({ type: 'error', text: 'Failed to test API key. Please try again.' });
    } finally {
      setKeyTesting(false);
    }
  };

  const saveApiKey = async () => {
    if (!apiKeyInput.trim()) {
      setKeyMessage({ type: 'error', text: 'Please enter an API key' });
      return;
    }

    setKeySaving(true);
    setKeyMessage(null);

    try {
      const response = await fetch('/api/settings/llm/api-keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider: selectedProvider,
          apiKey: apiKeyInput.trim(),
        }),
      });

      if (response.ok) {
        setKeyMessage({ type: 'success', text: 'API key saved securely!' });
        setApiKeyInput('');
        await loadApiKeys();
        setTimeout(() => setKeyMessage(null), 3000);
      } else {
        const errorData = await response.json().catch(() => ({}));
        setKeyMessage({ type: 'error', text: errorData.error || 'Failed to save API key' });
      }
    } catch (error) {
      console.error('Failed to save API key:', error);
      setKeyMessage({ type: 'error', text: 'Failed to save API key. Please try again.' });
    } finally {
      setKeySaving(false);
    }
  };

  const deleteApiKey = async (provider: string) => {
    setKeyDeleting(provider);

    try {
      const response = await fetch('/api/settings/llm/api-keys', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider }),
      });

      if (response.ok) {
        await loadApiKeys();
      } else {
        const errorData = await response.json().catch(() => ({}));
        setKeyMessage({ type: 'error', text: errorData.error || 'Failed to delete API key' });
      }
    } catch (error) {
      console.error('Failed to delete API key:', error);
      setKeyMessage({ type: 'error', text: 'Failed to delete API key. Please try again.' });
    } finally {
      setKeyDeleting(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-text-secondary" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Manual Model Selection Section */}
      <section className="p-6 rounded-xl border border-outline-light bg-surface-base/50">
        <div className="flex items-start gap-3 mb-6">
          <Server className="w-5 h-5 text-accent-yellow mt-0.5" />
          <div>
            <h2 className="text-lg font-serif font-medium text-text-primary">
              Internal Model Selection
            </h2>
            <p className="text-sm text-text-secondary mt-1">
              Manually select which models to use from our internal infrastructure.
            </p>
          </div>
        </div>

        <div className="space-y-4">
          {/* Enable Manual Selection */}
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={settings.manualModelSelection}
              onChange={(e) => setSettings({
                ...settings,
                manualModelSelection: e.target.checked,
              })}
              className="w-5 h-5 rounded border-outline-mid text-accent-yellow focus:ring-accent-yellow focus:ring-offset-0 bg-surface-elevated accent-accent-yellow"
            />
            <div>
              <span className="font-medium text-text-primary">Enable Manual Model Selection</span>
              <p className="text-sm text-text-secondary">
                Override automatic model selection with your preferred choices
              </p>
            </div>
          </label>

          {settings.manualModelSelection && (
            <div className="space-y-4 mt-4 pl-8 border-l-2 border-outline-light">
              {/* Ollama Model Selection */}
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <OllamaIcon className="w-5 h-5" />
                  <label className="text-sm font-medium text-text-primary">
                    Ollama Model
                  </label>
                  {healthStatus.ollama?.available ? (
                    <CheckCircle2 className="w-4 h-4 text-green-500" />
                  ) : (
                    <XCircle className="w-4 h-4 text-red-500" />
                  )}
                </div>
                <select
                  value={settings.manualOllamaModel}
                  onChange={(e) => setSettings({
                    ...settings,
                    manualOllamaModel: e.target.value,
                  })}
                  disabled={!healthStatus.ollama?.available}
                  className="w-full px-4 py-2 bg-surface-elevated border border-outline-light rounded-lg text-text-primary focus:outline-none focus:ring-2 focus:ring-accent-yellow/60 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <option value="">Auto-select best model</option>
                  {healthStatus.ollama?.models?.map(model => (
                    <option key={model} value={model}>{model}</option>
                  ))}
                </select>
                {healthStatus.ollama?.models && healthStatus.ollama.models.length > 0 && (
                  <p className="text-xs text-text-tertiary mt-1">
                    {healthStatus.ollama.models.length} models available
                  </p>
                )}
              </div>

              {/* LM Studio Model Selection */}
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <LMStudioIcon className="w-5 h-5" />
                  <label className="text-sm font-medium text-text-primary">
                    LM Studio Model
                  </label>
                  {healthStatus.lmstudio?.available ? (
                    <CheckCircle2 className="w-4 h-4 text-green-500" />
                  ) : (
                    <XCircle className="w-4 h-4 text-red-500" />
                  )}
                </div>
                <select
                  value={settings.manualLMStudioModel}
                  onChange={(e) => setSettings({
                    ...settings,
                    manualLMStudioModel: e.target.value,
                  })}
                  disabled={!healthStatus.lmstudio?.available}
                  className="w-full px-4 py-2 bg-surface-elevated border border-outline-light rounded-lg text-text-primary focus:outline-none focus:ring-2 focus:ring-accent-yellow/60 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <option value="">Auto-select best model</option>
                  {healthStatus.lmstudio?.models?.map(model => (
                    <option key={model} value={model}>{model}</option>
                  ))}
                </select>
                {healthStatus.lmstudio?.models && healthStatus.lmstudio.models.length > 0 && (
                  <p className="text-xs text-text-tertiary mt-1">
                    {healthStatus.lmstudio.models.length} models available
                  </p>
                )}
              </div>

              <div className="flex justify-end pt-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={checkHealth}
                  disabled={healthStatus.checking}
                >
                  {healthStatus.checking ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <RefreshCw className="w-4 h-4 mr-2" />
                  )}
                  Refresh Models
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Save Advanced Settings Button */}
        {saveMessage && (
          <div className={`mt-4 p-3 rounded-lg text-sm ${
            saveMessage.type === 'success'
              ? 'bg-green-500/20 text-green-400 border border-green-500/30'
              : 'bg-red-500/20 text-red-400 border border-red-500/30'
          }`}>
            {saveMessage.text}
          </div>
        )}

        <div className="flex justify-end mt-4">
          <Button
            variant="secondary"
            onClick={saveAdvancedSettings}
            disabled={saving}
          >
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              'Save Model Settings'
            )}
          </Button>
        </div>
      </section>

      {/* Bring Your Own Key Section */}
      <section className="p-6 rounded-xl border border-outline-light bg-surface-base/50">
        <div className="flex items-start gap-3 mb-4">
          <Key className="w-5 h-5 text-accent-yellow mt-0.5" />
          <div>
            <h2 className="text-lg font-serif font-medium text-text-primary">
              Bring Your Own Key
            </h2>
            <p className="text-sm text-text-secondary mt-1">
              Use your own API keys for cloud providers.
            </p>
          </div>
        </div>

        {/* Beta Warning */}
        <div className="flex items-start gap-3 p-3 mb-6 rounded-lg bg-amber-500/10 border border-amber-500/30">
          <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
          <div className="text-sm">
            <p className="font-medium text-amber-400">Beta Feature</p>
            <p className="text-amber-400/80 mt-1">
              BYOK is currently in beta. Only DeepSeek and OpenRouter keys are supported.
              We provide default keys, so this is optional.
            </p>
          </div>
        </div>

        {/* Stored Keys */}
        {storedKeys.length > 0 && (
          <div className="mb-6">
            <h3 className="text-sm font-medium text-text-primary mb-3">Saved Keys</h3>
            <div className="space-y-2">
              {storedKeys.map((key) => (
                <div
                  key={key.provider}
                  className="flex items-center justify-between p-3 rounded-lg bg-surface-elevated border border-outline-light"
                >
                  <div className="flex items-center gap-3">
                    {key.provider === 'deepseek' ? (
                      <DeepseekIcon className="w-5 h-5" />
                    ) : (
                      <OpenRouterIcon className="w-5 h-5" />
                    )}
                    <div>
                      <p className="text-sm font-medium text-text-primary capitalize">
                        {key.provider}
                      </p>
                      <p className="text-xs text-text-tertiary font-mono">
                        {key.maskedKey}
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => deleteApiKey(key.provider)}
                    disabled={keyDeleting === key.provider}
                    className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                  >
                    {keyDeleting === key.provider ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Trash2 className="w-4 h-4" />
                    )}
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Add New Key */}
        <div className="space-y-4">
          <h3 className="text-sm font-medium text-text-primary">Add API Key</h3>

          {/* Provider Selection */}
          <div>
            <label className="block text-sm text-text-secondary mb-2">Provider</label>
            <select
              value={selectedProvider}
              onChange={(e) => {
                setSelectedProvider(e.target.value as ApiKeyProvider);
                setApiKeyInput('');
                setKeyMessage(null);
              }}
              className="w-full px-4 py-2 bg-surface-elevated border border-outline-light rounded-lg text-text-primary focus:outline-none focus:ring-2 focus:ring-accent-yellow/60"
            >
              <option value="deepseek">DeepSeek</option>
              <option value="openrouter">OpenRouter</option>
            </select>
          </div>

          {/* API Key Input */}
          <div>
            <label className="block text-sm text-text-secondary mb-2">API Key</label>
            <div className="relative">
              <input
                type={showApiKey ? 'text' : 'password'}
                value={apiKeyInput}
                onChange={(e) => {
                  setApiKeyInput(e.target.value);
                  setKeyMessage(null);
                }}
                placeholder={selectedProvider === 'deepseek' ? 'sk-...' : 'sk-or-...'}
                className="w-full px-4 py-2 pr-10 bg-surface-elevated border border-outline-light rounded-lg text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-accent-yellow/60 font-mono text-sm"
              />
              <button
                type="button"
                onClick={() => setShowApiKey(!showApiKey)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-text-tertiary hover:text-text-secondary"
              >
                {showApiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Key Message */}
          {keyMessage && (
            <div className={`p-3 rounded-lg text-sm ${
              keyMessage.type === 'success'
                ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                : 'bg-red-500/20 text-red-400 border border-red-500/30'
            }`}>
              {keyMessage.text}
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex items-center gap-3">
            <Button
              variant="secondary"
              onClick={testApiKey}
              disabled={keyTesting || !apiKeyInput.trim()}
            >
              {keyTesting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Testing...
                </>
              ) : (
                'Test Connection'
              )}
            </Button>
            <Button
              variant="primary"
              onClick={saveApiKey}
              disabled={keySaving || !apiKeyInput.trim()}
            >
              {keySaving ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                'Save Key'
              )}
            </Button>
          </div>
        </div>

        {/* Security Note */}
        <div className="flex items-start gap-2 mt-6 pt-4 border-t border-outline-light">
          <Shield className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-text-tertiary">
            Your API keys are encrypted using AES-256-GCM before being stored securely in your account.
            Keys are never logged or exposed in API responses.
          </p>
        </div>
      </section>
    </div>
  );
}
