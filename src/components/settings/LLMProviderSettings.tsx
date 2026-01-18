'use client';

import { useState, useEffect } from 'react';
import {
  CheckCircle2,
  XCircle,
  Loader2,
  RefreshCw,
  AlertCircle,
} from 'lucide-react';
import { Button, Card } from '@/components/ui';
import { AutoIcon, OllamaIcon, LMStudioIcon, OpenRouterIcon, DeepseekIcon } from '@/components/icons/ProviderIcons';
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
  deepseek: HealthCheckResult | null;
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
    deepseek: null,
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
        deepseek: data.results?.find((r: HealthCheckResult) => r.provider === 'deepseek') || null,
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
      <div className="p-6">
        <h2 className="text-xl font-serif font-medium mb-4 text-text-primary">
          LLM Provider
        </h2>
        <p className="text-sm text-text-secondary mb-6">
          Choose which AI provider to use for generating your apps.
        </p>

        <div className="space-y-3">
          <label className={`
            group flex items-start gap-4 p-4 rounded-xl border cursor-pointer transition-colors
            ${settings.provider === 'auto' 
              ? 'border-accent-yellow/60 bg-accent-yellow/10' 
              : 'border-outline-light hover:border-accent-yellow/40 bg-surface-base/80'}
          `}>
            <input
              type="radio"
              name="provider"
              value="auto"
              checked={settings.provider === 'auto'}
              onChange={() => handleProviderChange('auto')}
              className="mt-1 accent-accent-yellow"
            />
            <div className="flex-1">
              <div className={`flex items-center gap-2 font-medium transition-colors ${
                settings.provider === 'auto' ? 'text-accent-yellow' : 'text-text-primary group-hover:text-accent-yellow'
              }`}>
                <AutoIcon className="w-6 h-6" />
                Auto (Local-first)
              </div>
              <p className="text-sm text-text-secondary mt-1 leading-relaxed">
                Prefer local providers when available, fall back to hosted APIs otherwise.
              </p>
            </div>
          </label>

          <label className={`
            group flex items-start gap-4 p-4 rounded-xl border cursor-pointer transition-colors
            ${settings.provider === 'deepseek' 
              ? 'border-accent-yellow/60 bg-accent-yellow/10' 
              : 'border-outline-light hover:border-accent-yellow/40 bg-surface-base/80'}
          `}>
            <input
              type="radio"
              name="provider"
              value="deepseek"
              checked={settings.provider === 'deepseek'}
              onChange={() => handleProviderChange('deepseek')}
              className="mt-1 accent-accent-yellow"
            />
            <div className="flex-1">
              <div className={`flex items-center gap-2 font-medium transition-colors ${
                settings.provider === 'deepseek' ? 'text-accent-yellow' : 'text-text-primary group-hover:text-accent-yellow'
              }`}>
                <DeepseekIcon className="w-6 h-6" />
                DeepSeek (Hosted)
                {healthStatus.deepseek && (
                  healthStatus.deepseek.available ? (
                    <CheckCircle2 className="w-4 h-4 text-green-500 ml-auto" />
                  ) : (
                    <XCircle className="w-4 h-4 text-red-500 ml-auto" />
                  )
                )}
              </div>
              <p className="text-sm text-text-secondary mt-1 leading-relaxed">
                Use DeepSeek API for generation. Requires DeepSeek API key.
              </p>
            </div>
          </label>

          <label className={`
            group flex items-start gap-4 p-4 rounded-xl border cursor-pointer transition-colors
            ${settings.provider === 'ollama' 
              ? 'border-accent-yellow/60 bg-accent-yellow/10' 
              : 'border-outline-light hover:border-accent-yellow/40 bg-surface-base/80'}
          `}>
            <input
              type="radio"
              name="provider"
              value="ollama"
              checked={settings.provider === 'ollama'}
              onChange={() => handleProviderChange('ollama')}
              className="mt-1 accent-accent-yellow"
            />
            <div className="flex-1">
              <div className={`flex items-center gap-2 font-medium transition-colors ${
                settings.provider === 'ollama' ? 'text-accent-yellow' : 'text-text-primary group-hover:text-accent-yellow'
              }`}>
                <OllamaIcon className="w-6 h-6" />
                Ollama (Local)
                {healthStatus.ollama && (
                  healthStatus.ollama.available ? (
                    <CheckCircle2 className="w-4 h-4 text-green-500 ml-auto" />
                  ) : (
                    <XCircle className="w-4 h-4 text-red-500 ml-auto" />
                  )
                )}
              </div>
              <p className="text-sm text-text-secondary mt-1 leading-relaxed">
                Run AI models locally for faster responses and no API costs.
                Requires Ollama to be installed and running.
              </p>
              {healthStatus.ollama && !healthStatus.ollama.available && (
                <p className="text-sm text-red-400 mt-2 flex items-center gap-1 leading-relaxed">
                  <AlertCircle className="w-4 h-4" />
                  {healthStatus.ollama.error || 'Ollama is not available'}
                </p>
              )}
            </div>
          </label>

          <label className={`
            group flex items-start gap-4 p-4 rounded-xl border cursor-pointer transition-colors
            ${settings.provider === 'lmstudio'
              ? 'border-accent-yellow/60 bg-accent-yellow/10'
              : 'border-outline-light hover:border-accent-yellow/40 bg-surface-base/80'}
          `}>
            <input
              type="radio"
              name="provider"
              value="lmstudio"
              checked={settings.provider === 'lmstudio'}
              onChange={() => handleProviderChange('lmstudio')}
              className="mt-1 accent-accent-yellow"
            />
            <div className="flex-1">
              <div className={`flex items-center gap-2 font-medium transition-colors ${
                settings.provider === 'lmstudio' ? 'text-accent-yellow' : 'text-text-primary group-hover:text-accent-yellow'
              }`}>
                <LMStudioIcon className="w-6 h-6" />
                LM Studio (Local)
                {healthStatus.lmstudio && (
                  healthStatus.lmstudio.available ? (
                    <CheckCircle2 className="w-4 h-4 text-green-500 ml-auto" />
                  ) : (
                    <XCircle className="w-4 h-4 text-red-500 ml-auto" />
                  )
                )}
              </div>
              <p className="text-sm text-text-secondary mt-1 leading-relaxed">
                Run AI models locally with LM Studio.
                Fast responses, no API costs, requires LM Studio to be running.
              </p>
              {healthStatus.lmstudio && !healthStatus.lmstudio.available && (
                <p className="text-sm text-red-400 mt-2 flex items-center gap-1 leading-relaxed">
                  <AlertCircle className="w-4 h-4" />
                  {healthStatus.lmstudio.error || 'LM Studio is not available'}
                </p>
              )}
            </div>
          </label>

          <label className={`
            group flex items-start gap-4 p-4 rounded-xl border cursor-pointer transition-colors
            ${settings.provider === 'openrouter'
              ? 'border-accent-yellow/60 bg-accent-yellow/10'
              : 'border-outline-light hover:border-accent-yellow/40 bg-surface-base/80'}
          `}>
            <input
              type="radio"
              name="provider"
              value="openrouter"
              checked={settings.provider === 'openrouter'}
              onChange={() => handleProviderChange('openrouter')}
              className="mt-1 accent-accent-yellow"
            />
            <div className="flex-1">
              <div className={`flex items-center gap-2 font-medium transition-colors ${
                settings.provider === 'openrouter' ? 'text-accent-yellow' : 'text-text-primary group-hover:text-accent-yellow'
              }`}>
                <OpenRouterIcon className="w-6 h-6" />
                OpenRouter (Hosted)
                {healthStatus.openrouter && (
                  healthStatus.openrouter.available ? (
                    <CheckCircle2 className="w-4 h-4 text-green-500 ml-auto" />
                  ) : (
                    <XCircle className="w-4 h-4 text-red-500 ml-auto" />
                  )
                )}
              </div>
              <p className="text-sm text-text-secondary mt-1 leading-relaxed">
                Use hosted AI models via OpenRouter API.
                Works anywhere, requires API key.
              </p>
            </div>
          </label>
        </div>

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
      </div>

      {(settings.provider === 'ollama' || settings.provider === 'auto') && (
        <div className="p-6">
          <h2 className="text-xl font-serif font-medium mb-4 text-text-primary">
            Ollama Settings
          </h2>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-text-primary mb-1.5">
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
                className="w-full px-4 py-2 bg-surface-elevated border border-outline-light rounded-lg text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-accent-yellow/60"
              />
              <p className="text-xs text-text-secondary mt-1.5 leading-relaxed">
                The URL where Ollama is running
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-text-primary mb-1.5">
                Main Model
              </label>
              <select
                value={settings.ollamaModel}
                onChange={(e) => onSettingsChange({
                  ...settings,
                  ollamaModel: e.target.value
                })}
                className="w-full px-4 py-2 bg-surface-elevated border border-outline-light rounded-lg text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-accent-yellow/60"
              >
                <option value={settings.ollamaModel}>{settings.ollamaModel}</option>
                {healthStatus.ollama?.models?.filter(model => model !== settings.ollamaModel).map(model => (
                  <option key={model} value={model}>{model}</option>
                ))}
              </select>
              <p className="text-xs text-text-secondary mt-1.5 leading-relaxed">
                Main model for complex code generation tasks
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-text-primary mb-1.5">
                Small Model
              </label>
              <select
                value={settings.ollamaSmallModel}
                onChange={(e) => onSettingsChange({
                  ...settings,
                  ollamaSmallModel: e.target.value
                })}
                className="w-full px-4 py-2 bg-surface-elevated border border-outline-light rounded-lg text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-accent-yellow/60"
              >
                <option value={settings.ollamaSmallModel}>{settings.ollamaSmallModel}</option>
                {healthStatus.ollama?.models?.filter(model => model !== settings.ollamaSmallModel).map(model => (
                  <option key={model} value={model}>{model}</option>
                ))}
              </select>
              <p className="text-xs text-text-secondary mt-1.5 leading-relaxed">
                Faster model for quick tasks like intent analysis
              </p>
            </div>

            {healthStatus.ollama?.models && healthStatus.ollama.models.length > 0 && (
              <div className="p-3 bg-surface-elevated/70 rounded-lg border border-outline-light/60">
                <p className="text-sm font-medium text-text-primary mb-2">
                  Available Models:
                </p>
                <div className="flex flex-wrap gap-2">
                  {healthStatus.ollama.models.map(model => (
                    <span 
                      key={model}
                      className="px-2 py-1 bg-surface-layer rounded text-xs text-text-secondary"
                    >
                      {model}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {(settings.provider === 'lmstudio' || settings.provider === 'auto') && (
        <div className="p-6">
          <h2 className="text-xl font-serif font-medium mb-4 text-text-primary">
            LM Studio Settings
          </h2>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-text-primary mb-1.5">
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
                className="w-full px-4 py-2 bg-surface-elevated border border-outline-light rounded-lg text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-accent-yellow/60"
              />
              <p className="text-xs text-text-secondary mt-1.5 leading-relaxed">
                The URL where LM Studio is running
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-text-primary mb-1.5">
                Model
              </label>
              <select
                value={settings.lmstudioModel}
                onChange={(e) => onSettingsChange({
                  ...settings,
                  lmstudioModel: e.target.value
                })}
                className="w-full px-4 py-2 bg-surface-elevated border border-outline-light rounded-lg text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-accent-yellow/60"
              >
                <option value={settings.lmstudioModel}>{settings.lmstudioModel}</option>
                {healthStatus.lmstudio?.models?.filter(model => model !== settings.lmstudioModel).map(model => (
                  <option key={model} value={model}>{model}</option>
                ))}
              </select>
              <p className="text-xs text-text-secondary mt-1.5 leading-relaxed">
                The model name to use for generation
              </p>
            </div>

            {healthStatus.lmstudio?.models && healthStatus.lmstudio.models.length > 0 && (
              <div className="p-3 bg-surface-elevated/70 rounded-lg border border-outline-light/60">
                <p className="text-sm font-medium text-text-primary mb-2">
                  Available Models:
                </p>
                <div className="flex flex-wrap gap-2">
                  {healthStatus.lmstudio.models.map(model => (
                    <span
                      key={model}
                      className="px-2 py-1 bg-surface-layer rounded text-xs text-text-secondary"
                    >
                      {model}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      <div className="p-6">
        <h2 className="text-xl font-serif font-medium mb-4 text-text-primary">
          Fallback Settings
        </h2>

        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={settings.fallbackEnabled}
            onChange={(e) => onSettingsChange({ 
              ...settings, 
              fallbackEnabled: e.target.checked 
            })}
            className="w-5 h-5 rounded border-outline-mid text-accent-yellow focus:ring-accent-yellow focus:ring-offset-0 bg-surface-elevated accent-accent-yellow"
          />
          <div>
            <span className="font-medium text-text-primary">Enable Automatic Fallback</span>
            <p className="text-sm text-text-secondary leading-relaxed">
              Automatically switch to another provider if the primary one fails
            </p>
          </div>
        </label>
      </div>

      {onSave && (
        <div className="flex justify-end pt-2 px-6">
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
