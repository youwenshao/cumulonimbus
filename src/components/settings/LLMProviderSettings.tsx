'use client';

import { useState, useEffect } from 'react';
import {
  Server,
  Cloud,
  Zap,
  CheckCircle2,
  XCircle,
  Loader2,
  RefreshCw,
  AlertCircle,
  Palette,
} from 'lucide-react';
import { Button, Card } from '@/components/ui';
import type { LLMProvider, HealthCheckResult } from '@/lib/llm/types';

export interface LLMSettings {
  provider: LLMProvider;
  ollamaEndpoint: string;
  ollamaModel: string;
  ollamaSmallModel: string;
  lmstudioEndpoint: string;
  lmstudioModel: string;
  fallbackEnabled: boolean;
}

export interface LLMProviderSettingsProps {
  settings: LLMSettings;
  onSettingsChange: (settings: LLMSettings) => void;
  onSave?: () => Promise<void>;
  isSaving?: boolean;
}

interface HealthStatus {
  ollama: HealthCheckResult | null;
  openrouter: HealthCheckResult | null;
  lmstudio: HealthCheckResult | null;
  checking: boolean;
}

export function LLMProviderSettings({
  settings,
  onSettingsChange,
  onSave,
  isSaving = false,
}: LLMProviderSettingsProps) {
  const [healthStatus, setHealthStatus] = useState<HealthStatus>({
    ollama: null,
    openrouter: null,
    lmstudio: null,
    checking: false,
  });

  // Check health on mount
  useEffect(() => {
    checkHealth();
  }, []);

  const checkHealth = async () => {
    setHealthStatus(prev => ({ ...prev, checking: true }));

    try {
      const response = await fetch('/api/settings/llm/health');
      const data = await response.json();

      setHealthStatus({
        ollama: data.results?.find((r: HealthCheckResult) => r.provider === 'ollama') || null,
        openrouter: data.results?.find((r: HealthCheckResult) => r.provider === 'openrouter') || null,
        lmstudio: data.results?.find((r: HealthCheckResult) => r.provider === 'lmstudio') || null,
        checking: false,
      });
    } catch {
      setHealthStatus(prev => ({ ...prev, checking: false }));
    }
  };

  const handleProviderChange = (provider: LLMProvider) => {
    onSettingsChange({ ...settings, provider });
  };

  return (
    <div className="space-y-6">
      {/* Provider Selection */}
      <Card variant="outlined" padding="lg">
        <h3 className="text-lg font-semibold mb-4">LLM Provider</h3>
        <p className="text-sm text-gray-400 mb-6">
          Choose which AI provider to use for generating your apps.
        </p>

        <div className="space-y-3">
          {/* Auto */}
          <label className={`
            flex items-start gap-4 p-4 rounded-lg border cursor-pointer transition-colors
            ${settings.provider === 'auto' 
              ? 'border-red-500 bg-red-500/10' 
              : 'border-gray-700 hover:border-gray-600'}
          `}>
            <input
              type="radio"
              name="provider"
              value="auto"
              checked={settings.provider === 'auto'}
              onChange={() => handleProviderChange('auto')}
              className="mt-1"
            />
            <div className="flex-1">
              <div className="flex items-center gap-2 font-medium">
                <Zap className="w-5 h-5 text-yellow-500" />
                Auto (Recommended)
              </div>
              <p className="text-sm text-gray-400 mt-1">
                Automatically use Ollama when available, fall back to hosted API otherwise.
              </p>
            </div>
          </label>

          {/* Ollama */}
          <label className={`
            flex items-start gap-4 p-4 rounded-lg border cursor-pointer transition-colors
            ${settings.provider === 'ollama' 
              ? 'border-red-500 bg-red-500/10' 
              : 'border-gray-700 hover:border-gray-600'}
          `}>
            <input
              type="radio"
              name="provider"
              value="ollama"
              checked={settings.provider === 'ollama'}
              onChange={() => handleProviderChange('ollama')}
              className="mt-1"
            />
            <div className="flex-1">
              <div className="flex items-center gap-2 font-medium">
                <Server className="w-5 h-5 text-blue-500" />
                Ollama (Local)
                {healthStatus.ollama && (
                  healthStatus.ollama.available ? (
                    <CheckCircle2 className="w-4 h-4 text-green-500" />
                  ) : (
                    <XCircle className="w-4 h-4 text-red-500" />
                  )
                )}
              </div>
              <p className="text-sm text-gray-400 mt-1">
                Run AI models locally for faster responses and no API costs.
                Requires Ollama to be installed and running.
              </p>
              {healthStatus.ollama && !healthStatus.ollama.available && (
                <p className="text-sm text-red-400 mt-2 flex items-center gap-1">
                  <AlertCircle className="w-4 h-4" />
                  {healthStatus.ollama.error || 'Ollama is not available'}
                </p>
              )}
            </div>
          </label>

          {/* LM Studio */}
          <label className={`
            flex items-start gap-4 p-4 rounded-lg border cursor-pointer transition-colors
            ${settings.provider === 'lmstudio'
              ? 'border-red-500 bg-red-500/10'
              : 'border-gray-700 hover:border-gray-600'}
          `}>
            <input
              type="radio"
              name="provider"
              value="lmstudio"
              checked={settings.provider === 'lmstudio'}
              onChange={() => handleProviderChange('lmstudio')}
              className="mt-1"
            />
            <div className="flex-1">
              <div className="flex items-center gap-2 font-medium">
                <Palette className="w-5 h-5 text-pink-500" />
                LM Studio (Local)
                {healthStatus.lmstudio && (
                  healthStatus.lmstudio.available ? (
                    <CheckCircle2 className="w-4 h-4 text-green-500" />
                  ) : (
                    <XCircle className="w-4 h-4 text-red-500" />
                  )
                )}
              </div>
              <p className="text-sm text-gray-400 mt-1">
                Run AI models locally with LM Studio.
                Fast responses, no API costs, requires LM Studio to be running.
              </p>
              {healthStatus.lmstudio && !healthStatus.lmstudio.available && (
                <p className="text-sm text-red-400 mt-2 flex items-center gap-1">
                  <AlertCircle className="w-4 h-4" />
                  {healthStatus.lmstudio.error || 'LM Studio is not available'}
                </p>
              )}
            </div>
          </label>

          {/* OpenRouter */}
          <label className={`
            flex items-start gap-4 p-4 rounded-lg border cursor-pointer transition-colors
            ${settings.provider === 'openrouter'
              ? 'border-red-500 bg-red-500/10'
              : 'border-gray-700 hover:border-gray-600'}
          `}>
            <input
              type="radio"
              name="provider"
              value="openrouter"
              checked={settings.provider === 'openrouter'}
              onChange={() => handleProviderChange('openrouter')}
              className="mt-1"
            />
            <div className="flex-1">
              <div className="flex items-center gap-2 font-medium">
                <Cloud className="w-5 h-5 text-purple-500" />
                OpenRouter (Hosted)
                {healthStatus.openrouter && (
                  healthStatus.openrouter.available ? (
                    <CheckCircle2 className="w-4 h-4 text-green-500" />
                  ) : (
                    <XCircle className="w-4 h-4 text-red-500" />
                  )
                )}
              </div>
              <p className="text-sm text-gray-400 mt-1">
                Use hosted AI models via OpenRouter API.
                Works anywhere, requires API key.
              </p>
            </div>
          </label>
        </div>

        {/* Health check button */}
        <div className="mt-4 flex justify-end">
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
            Test Connection
          </Button>
        </div>
      </Card>

      {/* Ollama Settings */}
      {(settings.provider === 'ollama' || settings.provider === 'auto') && (
        <Card variant="outlined" padding="lg">
          <h3 className="text-lg font-semibold mb-4">Ollama Settings</h3>

          <div className="space-y-4">
            {/* Endpoint */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Ollama Endpoint
              </label>
              <input
                type="text"
                value={settings.ollamaEndpoint}
                onChange={(e) => onSettingsChange({ 
                  ...settings, 
                  ollamaEndpoint: e.target.value 
                })}
                placeholder="http://localhost:11434"
                className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-red-500"
              />
              <p className="text-xs text-gray-500 mt-1">
                The URL where Ollama is running
              </p>
            </div>

            {/* Primary Model */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Primary Model
              </label>
              <select
                value={settings.ollamaModel}
                onChange={(e) => onSettingsChange({
                  ...settings,
                  ollamaModel: e.target.value
                })}
                className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-red-500"
              >
                <option value={settings.ollamaModel}>{settings.ollamaModel}</option>
                {healthStatus.ollama?.models?.filter(model => model !== settings.ollamaModel).map(model => (
                  <option key={model} value={model}>{model}</option>
                ))}
              </select>
              <p className="text-xs text-gray-500 mt-1">
                Main model for complex code generation tasks
              </p>
            </div>

            {/* Small Model */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Small Model
              </label>
              <select
                value={settings.ollamaSmallModel}
                onChange={(e) => onSettingsChange({
                  ...settings,
                  ollamaSmallModel: e.target.value
                })}
                className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-red-500"
              >
                <option value={settings.ollamaSmallModel}>{settings.ollamaSmallModel}</option>
                {healthStatus.ollama?.models?.filter(model => model !== settings.ollamaSmallModel).map(model => (
                  <option key={model} value={model}>{model}</option>
                ))}
              </select>
              <p className="text-xs text-gray-500 mt-1">
                Faster model for quick tasks like intent analysis
              </p>
            </div>

            {/* Available models info */}
            {healthStatus.ollama?.models && healthStatus.ollama.models.length > 0 && (
              <div className="p-3 bg-gray-800/50 rounded-lg">
                <p className="text-sm font-medium text-gray-300 mb-2">
                  Available Models:
                </p>
                <div className="flex flex-wrap gap-2">
                  {healthStatus.ollama.models.map(model => (
                    <span 
                      key={model}
                      className="px-2 py-1 bg-gray-700 rounded text-xs text-gray-300"
                    >
                      {model}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </Card>
      )}

      {/* LM Studio Settings */}
      {(settings.provider === 'lmstudio' || settings.provider === 'auto') && (
        <Card variant="outlined" padding="lg">
          <h3 className="text-lg font-semibold mb-4">LM Studio Settings</h3>

          <div className="space-y-4">
            {/* Endpoint */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                LM Studio Endpoint
              </label>
              <input
                type="text"
                value={settings.lmstudioEndpoint}
                onChange={(e) => onSettingsChange({
                  ...settings,
                  lmstudioEndpoint: e.target.value
                })}
                placeholder="http://localhost:1234"
                className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-red-500"
              />
              <p className="text-xs text-gray-500 mt-1">
                The URL where LM Studio is running
              </p>
            </div>

            {/* Model */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Model
              </label>
              <select
                value={settings.lmstudioModel}
                onChange={(e) => onSettingsChange({
                  ...settings,
                  lmstudioModel: e.target.value
                })}
                className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-red-500"
              >
                <option value={settings.lmstudioModel}>{settings.lmstudioModel}</option>
                {healthStatus.lmstudio?.models?.filter(model => model !== settings.lmstudioModel).map(model => (
                  <option key={model} value={model}>{model}</option>
                ))}
              </select>
              <p className="text-xs text-gray-500 mt-1">
                The model name to use for generation
              </p>
            </div>

            {/* Available models info */}
            {healthStatus.lmstudio?.models && healthStatus.lmstudio.models.length > 0 && (
              <div className="p-3 bg-gray-800/50 rounded-lg">
                <p className="text-sm font-medium text-gray-300 mb-2">
                  Available Models:
                </p>
                <div className="flex flex-wrap gap-2">
                  {healthStatus.lmstudio.models.map(model => (
                    <span
                      key={model}
                      className="px-2 py-1 bg-gray-700 rounded text-xs text-gray-300"
                    >
                      {model}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </Card>
      )}

      {/* Fallback Settings */}
      <Card variant="outlined" padding="lg">
        <h3 className="text-lg font-semibold mb-4">Fallback Settings</h3>

        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={settings.fallbackEnabled}
            onChange={(e) => onSettingsChange({ 
              ...settings, 
              fallbackEnabled: e.target.checked 
            })}
            className="w-5 h-5 rounded border-gray-600 text-red-500 focus:ring-red-500 focus:ring-offset-0 bg-gray-800"
          />
          <div>
            <span className="font-medium">Enable Automatic Fallback</span>
            <p className="text-sm text-gray-400">
              Automatically switch to another provider if the primary one fails
            </p>
          </div>
        </label>
      </Card>

      {/* Save Button */}
      {onSave && (
        <div className="flex justify-end">
          <Button
            variant="primary"
            onClick={onSave}
            disabled={isSaving}
          >
            {isSaving ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              'Save Settings'
            )}
          </Button>
        </div>
      )}
    </div>
  );
}
