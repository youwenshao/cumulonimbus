'use client';

import { useState, useCallback, useEffect } from 'react';
import Link from 'next/link';
import { ArrowLeft, Settings, RefreshCw, Code2, ExternalLink } from 'lucide-react';
import { NavigationRail, Button, Card } from '@/components/ui';
import { IframeSandbox } from '@/components/runtime';
import { CodeStreamViewer } from '@/components/scaffolder';
import type { Schema } from '@/lib/scaffolder-v2/types';
import type { DataRecord } from '@/lib/primitives/types';

export interface V2SandboxRuntimeProps {
  appId: string;
  name: string;
  description: string;
  bundledCode: string;
  schema?: Schema;
  componentFiles?: Record<string, string>;
  initialData: DataRecord[];
}

type ViewMode = 'app' | 'code' | 'split';

/**
 * V2 Sandbox Runtime
 * Runs freeform AI-generated apps in a secure iframe sandbox
 */
export function V2SandboxRuntime({
  appId,
  name,
  description,
  bundledCode,
  schema,
  componentFiles = {},
  initialData,
}: V2SandboxRuntimeProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('app');
  const [data, setData] = useState<DataRecord[]>(initialData);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Refresh data from API
  const refreshData = useCallback(async () => {
    setIsRefreshing(true);
    try {
      const response = await fetch(`/api/apps/${appId}/data`);
      if (response.ok) {
        const result = await response.json();
        setData(result.data || []);
      }
    } catch (err) {
      console.error('Failed to refresh data:', err);
    } finally {
      setIsRefreshing(false);
    }
  }, [appId]);

  // Handle data changes from the sandbox
  const handleDataChange = useCallback((newData: Record<string, unknown>[]) => {
    setData(newData as DataRecord[]);
  }, []);

  // Handle errors from the sandbox
  const handleError = useCallback((errorMessage: string) => {
    setError(errorMessage);
    console.error('Sandbox error:', errorMessage);
  }, []);

  // Preview in new tab
  const openInNewTab = useCallback(() => {
    // For now, just reload the current page
    // In the future, this could open a full-screen standalone version
    window.open(`/apps/${appId}`, '_blank');
  }, [appId]);

  return (
    <div className="h-screen bg-black flex">
      {/* Navigation Rail */}
      <div className="hidden md:block">
        <NavigationRail />
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <header className="border-b border-outline-mid bg-surface-base px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href="/dashboard" className="btn-ghost p-2">
                <ArrowLeft className="w-5 h-5" />
              </Link>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-xl font-bold text-text-primary">{name}</h1>
                  <span className="text-xs bg-gradient-to-r from-purple-600 to-pink-600 px-2 py-1 rounded text-text-primary">
                    Sandbox
                  </span>
                </div>
                <p className="text-sm text-text-secondary">{description}</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {/* View mode toggle */}
              <div className="flex bg-gray-800 rounded-lg p-1">
                <button
                  onClick={() => setViewMode('app')}
                  className={`px-3 py-1.5 rounded text-sm transition-colors ${
                    viewMode === 'app'
                      ? 'bg-red-500 text-text-primary'
                      : 'text-gray-400 hover:text-text-primary'
                  }`}
                >
                  App
                </button>
                <button
                  onClick={() => setViewMode('code')}
                  className={`px-3 py-1.5 rounded text-sm transition-colors ${
                    viewMode === 'code'
                      ? 'bg-red-500 text-text-primary'
                      : 'text-gray-400 hover:text-text-primary'
                  }`}
                >
                  Code
                </button>
                <button
                  onClick={() => setViewMode('split')}
                  className={`px-3 py-1.5 rounded text-sm transition-colors ${
                    viewMode === 'split'
                      ? 'bg-red-500 text-text-primary'
                      : 'text-gray-400 hover:text-text-primary'
                  }`}
                >
                  Split
                </button>
              </div>

              <Button
                variant="ghost"
                size="sm"
                onClick={refreshData}
                disabled={isRefreshing}
                title="Refresh data"
              >
                <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
              </Button>

              <Button
                variant="ghost"
                size="sm"
                onClick={openInNewTab}
                title="Open in new tab"
              >
                <ExternalLink className="w-4 h-4" />
              </Button>

              <Button variant="ghost" size="sm">
                <Settings className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </header>

        {/* Error banner */}
        {error && (
          <div className="bg-red-500/20 border-b border-red-500/30 px-6 py-3">
            <div className="flex items-center justify-between">
              <span className="text-red-400 text-sm">{error}</span>
              <button
                onClick={() => setError(null)}
                className="text-red-400 hover:text-red-300"
              >
                Dismiss
              </button>
            </div>
          </div>
        )}

        {/* Main content area */}
        <main className="flex-1 overflow-hidden">
          {viewMode === 'app' && (
            <div className="h-full p-6">
              <IframeSandbox
                appId={appId}
                bundledCode={bundledCode}
                initialData={data}
                onDataChange={handleDataChange}
                onError={handleError}
                className="h-full"
              />
            </div>
          )}

          {viewMode === 'code' && (
            <div className="h-full p-6">
              <CodeStreamViewer
                code={bundledCode}
                files={componentFiles}
                appId={appId}
                className="h-full"
              />
            </div>
          )}

          {viewMode === 'split' && (
            <div className="h-full flex gap-4 p-6">
              <div className="flex-1 min-w-0">
                <IframeSandbox
                  appId={appId}
                  bundledCode={bundledCode}
                  initialData={data}
                  onDataChange={handleDataChange}
                  onError={handleError}
                  className="h-full"
                />
              </div>
              <div className="w-[500px] flex-shrink-0">
                <CodeStreamViewer
                  code={bundledCode}
                  files={componentFiles}
                  appId={appId}
                  className="h-full"
                />
              </div>
            </div>
          )}
        </main>

        {/* Footer with stats */}
        <footer className="border-t border-outline-mid bg-surface-dark px-6 py-3">
          <div className="flex items-center justify-between text-sm text-gray-500">
            <div className="flex items-center gap-4">
              <span>Records: {data.length}</span>
              {schema && <span>Schema: {schema.name}</span>}
              <span>Mode: Sandbox</span>
            </div>
            <div className="flex items-center gap-2">
              <Code2 className="w-4 h-4" />
              <span>{(bundledCode.length / 1024).toFixed(1)} KB</span>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}
