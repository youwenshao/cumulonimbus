'use client';

import { ArrowLeft, Settings2, Cpu } from 'lucide-react';
import Link from 'next/link';
import { NavigationRail, ThemeToggle } from '@/components/ui';
import { AdvancedLLMSettings } from '@/components/settings/AdvancedLLMSettings';

export default function AdvancedLLMSettingsPage() {
  return (
    <div className="h-screen bg-surface-base flex">
      <div className="hidden md:block">
        <NavigationRail />
      </div>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="border-b border-outline-mid bg-surface-base/95 backdrop-blur-sm px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href="/settings" className="btn-ghost p-2">
                <ArrowLeft className="w-5 h-5" />
              </Link>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1.5">
                  <Cpu className="w-5 h-5 text-text-secondary" />
                  <span className="text-text-secondary">/</span>
                  <Settings2 className="w-6 h-6 text-accent-yellow" />
                </div>
                <div className="flex flex-col">
                  <h1 className="text-2xl font-serif font-medium text-text-primary leading-tight">
                    Advanced LLM Settings
                  </h1>
                  <p className="text-xs text-text-secondary">
                    Fine-tune model selection and manage your API keys
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
          <div className="max-w-4xl mx-auto px-6 py-6">
            <AdvancedLLMSettings />
          </div>
        </main>
      </div>
    </div>
  );
}
