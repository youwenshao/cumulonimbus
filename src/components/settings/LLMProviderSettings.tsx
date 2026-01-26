'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  CheckCircle2,
  XCircle,
  Loader2,
  RefreshCw,
  Settings2,
  Server,
  Cloud,
} from 'lucide-react';
import { Button } from '@/components/ui';
import { AutoIcon, DeepseekIcon, OpenRouterIcon } from '@/components/icons/ProviderIcons';
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

  // Check if internal infrastructure is available (ollama or lmstudio)
  const internalAvailable = healthStatus.ollama?.available || healthStatus.lmstudio?.available;

  return (
    <div className="space-y-6">
      <div className="p-6">
        <h2 className="text-xl font-serif font-medium mb-2 text-text-primary">
          AI Service
        </h2>
        <p className="text-sm text-text-secondary mb-6">
          Choose which AI service powers the Architect and Advisor when building your apps.
        </p>

        <div className="space-y-3">
          {/* Auto - Internally hosted */}
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
                <span>Auto</span>
                <span className="text-xs font-normal px-2 py-0.5 rounded-full bg-surface-elevated text-text-secondary flex items-center gap-1">
                  <Server className="w-3 h-3" />
                  Internally hosted LLM
                </span>
                {internalAvailable ? (
                  <CheckCircle2 className="w-4 h-4 text-green-500 ml-auto" />
                ) : (
                  <XCircle className="w-4 h-4 text-amber-500 ml-auto" />
                )}
              </div>
              <p className="text-sm text-text-secondary mt-1 leading-relaxed">
                Automatically selects the most optimal model hosted on our infrastructure.
                Fast and reliable with no additional API costs.
              </p>
              {!internalAvailable && (
                <p className="text-xs text-amber-500 mt-2">
                  Internal servers currently unavailable. Will automatically use cloud fallback.
                </p>
              )}
            </div>
          </label>

          {/* DeepSeek */}
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
                <span>DeepSeek</span>
                <span className="text-xs font-normal px-2 py-0.5 rounded-full bg-surface-elevated text-text-secondary flex items-center gap-1">
                  <Cloud className="w-3 h-3" />
                  deepseek-v3.2 via DeepSeek API
                </span>
                {healthStatus.deepseek && (
                  healthStatus.deepseek.available ? (
                    <CheckCircle2 className="w-4 h-4 text-green-500 ml-auto" />
                  ) : (
                    <XCircle className="w-4 h-4 text-red-500 ml-auto" />
                  )
                )}
              </div>
              <p className="text-sm text-text-secondary mt-1 leading-relaxed">
                Use DeepSeek&apos;s powerful cloud API for high-quality code generation.
                We provide a default key, or bring your own for priority access.
              </p>
            </div>
          </label>

          {/* Qwen via OpenRouter */}
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
                <span>Qwen</span>
                <span className="text-xs font-normal px-2 py-0.5 rounded-full bg-surface-elevated text-text-secondary flex items-center gap-1">
                  <Cloud className="w-3 h-3" />
                  qwen3-coder:free via OpenRouter
                </span>
                {healthStatus.openrouter && (
                  healthStatus.openrouter.available ? (
                    <CheckCircle2 className="w-4 h-4 text-green-500 ml-auto" />
                  ) : (
                    <XCircle className="w-4 h-4 text-red-500 ml-auto" />
                  )
                )}
              </div>
              <p className="text-sm text-text-secondary mt-1 leading-relaxed">
                Use Qwen 3 Coder via OpenRouter&apos;s free tier for cost-effective generation.
                Great balance of quality and accessibility.
              </p>
            </div>
          </label>
        </div>

        <div className="mt-4 flex items-center justify-between">
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

      {/* Fallback Settings */}
      <div className="p-6">
        <h2 className="text-xl font-serif font-medium mb-4 text-text-primary">
          Reliability Settings
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
              Automatically switch to another service if the selected one is temporarily unavailable
            </p>
          </div>
        </label>
      </div>

      {/* Save Button */}
      {onSave && (
        <div className="flex items-center justify-between pt-2 px-6">
          <Link 
            href="/settings/advanced-llm"
            className="text-sm text-text-tertiary hover:text-text-secondary transition-colors flex items-center gap-1.5"
          >
            <Settings2 className="w-4 h-4" />
            Advanced LLM Settings
          </Link>
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
