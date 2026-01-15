'use client';

import { useState, useEffect } from 'react';
import { ArrowLeft, Settings, Cpu, Palette, Bell, Monitor, Sun, Moon } from 'lucide-react';
import Link from 'next/link';
import { NavigationRail, Button, Card, ThemeToggle } from '@/components/ui';
import { LLMProviderSettings, type LLMSettings } from '@/components/settings/LLMProviderSettings';
import type { LLMProvider } from '@/lib/llm/types';

type SettingsTab = 'llm' | 'appearance' | 'notifications';

const defaultLLMSettings: LLMSettings = {
  provider: 'auto',
  ollamaEndpoint: 'http://localhost:11434',
  ollamaModel: 'qwen3-coder:30b',
  ollamaSmallModel: 'qwen3:4b',
  lmstudioEndpoint: 'http://localhost:1234',
  lmstudioModel: 'local-model',
  fallbackEnabled: true,
};

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<SettingsTab>('llm');
  const [llmSettings, setLLMSettings] = useState<LLMSettings>(defaultLLMSettings);
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const response = await fetch('/api/settings/llm');
      if (response.ok) {
        const data = await response.json();
        setLLMSettings({
          provider: data.provider || 'auto',
          ollamaEndpoint: data.ollamaEndpoint || defaultLLMSettings.ollamaEndpoint,
          ollamaModel: data.ollamaModel || defaultLLMSettings.ollamaModel,
          ollamaSmallModel: data.ollamaSmallModel || defaultLLMSettings.ollamaSmallModel,
          lmstudioEndpoint: data.lmstudioEndpoint || defaultLLMSettings.lmstudioEndpoint,
          lmstudioModel: data.lmstudioModel || defaultLLMSettings.lmstudioModel,
          fallbackEnabled: data.fallbackEnabled ?? true,
        });
      }
    } catch (error) {
      console.error('Failed to load settings:', error);
    }
  };

  const saveSettings = async () => {
    setIsSaving(true);
    setSaveMessage(null);

    try {
      const response = await fetch('/api/settings/llm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(llmSettings),
      });

      if (response.ok) {
        setSaveMessage('Settings saved successfully!');
        setTimeout(() => setSaveMessage(null), 3000);
      } else {
        throw new Error('Failed to save');
      }
    } catch (error) {
      setSaveMessage('Failed to save settings');
    } finally {
      setIsSaving(false);
    }
  };

  const tabs = [
    { id: 'llm' as const, label: 'AI / LLM', icon: Cpu },
    { id: 'appearance' as const, label: 'Appearance', icon: Palette },
    { id: 'notifications' as const, label: 'Notifications', icon: Bell },
  ];

  return (
    <div className="h-screen bg-surface-base flex">
      <div className="hidden md:block">
        <NavigationRail />
      </div>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="border-b border-outline-mid bg-surface-base/95 backdrop-blur-sm px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href="/dashboard" className="btn-ghost p-2">
                <ArrowLeft className="w-5 h-5" />
              </Link>
              <div className="flex items-center gap-3">
                <Settings className="w-6 h-6 text-accent-yellow" />
                <div className="flex flex-col">
                  <h1 className="text-2xl font-serif font-medium text-text-primary leading-tight">
                    Settings
                  </h1>
                  <p className="text-xs text-text-secondary">
                    Configure your workspace, providers, and appearance
                  </p>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <ThemeToggle />
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto">
          <div className="max-w-4xl mx-auto px-6 py-6 space-y-6">
            {saveMessage && (
              <div className={`p-3 rounded-lg text-sm ${
                saveMessage.includes('success') 
                  ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                  : 'bg-red-500/20 text-red-400 border border-red-500/30'
              }`}>
                {saveMessage}
              </div>
            )}

            <div className="flex gap-2 border-b border-outline-light pb-4">
              {tabs.map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium focus-ring-yellow transition-colors ${
                    activeTab === tab.id
                      ? 'bg-accent-yellow/15 text-accent-yellow border border-accent-yellow/40'
                      : 'text-text-secondary hover:text-text-primary hover:bg-surface-elevated/70 border border-transparent'
                  }`}
                >
                  <tab.icon className="w-4 h-4" />
                  {tab.label}
                </button>
              ))}
            </div>

            {activeTab === 'llm' && (
              <LLMProviderSettings
                settings={llmSettings}
                onSettingsChange={setLLMSettings}
                onSave={saveSettings}
                isSaving={isSaving}
              />
            )}

            {activeTab === 'appearance' && (
              <div className="p-6">
                <div className="flex items-start justify-between mb-6">
                  <div className="space-y-1">
                    <h2 className="text-xl font-serif font-medium text-text-primary leading-tight">
                      Appearance
                    </h2>
                    <p className="text-sm text-text-secondary">
                      Control the visual language of your workspace.
                    </p>
                  </div>
                </div>

                <div className="space-y-6">
                  <section className="flex items-center justify-between gap-6">
                    <div className="flex items-start gap-3">
                      <div className="mt-1">
                        <Monitor className="w-5 h-5 text-text-secondary" />
                      </div>
                      <div className="space-y-1">
                        <div className="font-medium text-text-primary">
                          Theme
                        </div>
                        <div className="text-sm text-text-secondary">
                          Toggle between light and dark atmospheric modes.
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <div className="flex items-center gap-2 px-3 py-1.5 bg-surface-elevated rounded-lg">
                        <Sun className="w-4 h-4 text-accent-yellow" />
                        <span className="text-xs text-text-secondary">Light</span>
                      </div>
                      <ThemeToggle />
                      <div className="flex items-center gap-2 px-3 py-1.5 bg-surface-elevated rounded-lg">
                        <Moon className="w-4 h-4 text-text-secondary" />
                        <span className="text-xs text-text-secondary">Dark</span>
                      </div>
                    </div>
                  </section>
                </div>

                <div className="mt-8 pt-6 border-t border-outline-light">
                  <p className="text-text-secondary text-sm leading-relaxed">
                    More appearance settings coming soon...
                  </p>
                </div>
              </div>
            )}

            {activeTab === 'notifications' && (
              <div className="p-6">
                <h3 className="text-lg font-serif font-medium mb-4 text-text-primary">Notification Settings</h3>
                <p className="text-text-secondary">
                  Notification settings coming soon...
                </p>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
