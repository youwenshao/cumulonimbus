'use client';

import { useState, useEffect } from 'react';
import { ArrowLeft, Settings, Cpu, Palette, Bell } from 'lucide-react';
import Link from 'next/link';
import { NavigationRail, Button, Card } from '@/components/ui';
import { LLMProviderSettings, type LLMSettings } from '@/components/settings/LLMProviderSettings';
import type { LLMProvider } from '@/lib/llm/types';

type SettingsTab = 'llm' | 'appearance' | 'notifications';

const defaultLLMSettings: LLMSettings = {
  provider: 'auto',
  ollamaEndpoint: 'http://localhost:11434',
  ollamaModel: 'qwen3-coder:30b',
  ollamaSmallModel: 'qwen3:4b',
  fallbackEnabled: true,
};

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<SettingsTab>('llm');
  const [llmSettings, setLLMSettings] = useState<LLMSettings>(defaultLLMSettings);
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  // Load settings on mount
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
    <div className="h-screen bg-black flex">
      {/* Navigation Rail */}
      <div className="hidden md:block">
        <NavigationRail />
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <header className="border-b border-outline-mid bg-surface-dark px-6 py-4">
          <div className="flex items-center gap-4">
            <Link href="/dashboard" className="btn-ghost p-2">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div className="flex items-center gap-3">
              <Settings className="w-6 h-6 text-red-500" />
              <h1 className="text-xl font-bold text-white">Settings</h1>
            </div>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-y-auto">
          <div className="max-w-4xl mx-auto p-6">
            {/* Save message */}
            {saveMessage && (
              <div className={`mb-4 p-3 rounded-lg ${
                saveMessage.includes('success') 
                  ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                  : 'bg-red-500/20 text-red-400 border border-red-500/30'
              }`}>
                {saveMessage}
              </div>
            )}

            {/* Tabs */}
            <div className="flex gap-2 mb-6 border-b border-gray-800 pb-4">
              {tabs.map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                    activeTab === tab.id
                      ? 'bg-red-500/20 text-red-500'
                      : 'text-gray-400 hover:text-white hover:bg-gray-800'
                  }`}
                >
                  <tab.icon className="w-4 h-4" />
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Tab Content */}
            {activeTab === 'llm' && (
              <LLMProviderSettings
                settings={llmSettings}
                onSettingsChange={setLLMSettings}
                onSave={saveSettings}
                isSaving={isSaving}
              />
            )}

            {activeTab === 'appearance' && (
              <Card variant="outlined" padding="lg">
                <h3 className="text-lg font-semibold mb-4">Appearance Settings</h3>
                <p className="text-gray-400">
                  Appearance settings coming soon...
                </p>
              </Card>
            )}

            {activeTab === 'notifications' && (
              <Card variant="outlined" padding="lg">
                <h3 className="text-lg font-semibold mb-4">Notification Settings</h3>
                <p className="text-gray-400">
                  Notification settings coming soon...
                </p>
              </Card>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
