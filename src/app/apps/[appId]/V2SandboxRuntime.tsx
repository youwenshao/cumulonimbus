'use client';

import { useState, useCallback, useEffect } from 'react';
import Link from 'next/link';
import { ArrowLeft, Settings, RefreshCw, Code2, ExternalLink, Rocket, Square } from 'lucide-react';
import { NavigationRail, Button, Card } from '@/components/ui';
import { PreviewRuntime } from '@/components/runtime';
import { CodeStreamViewer } from '@/components/scaffolder';
import type { Schema } from '@/lib/scaffolder-v2/types';
import type { DataRecord } from '@/lib/primitives/types';
import type { BundleName } from '@/lib/runtime/dependency-bundle';

export interface V2SandboxRuntimeProps {
  appId: string;
  name: string;
  description: string;
  bundledCode: string;
  schema?: Schema;
  componentFiles?: Record<string, string>;
  initialData: DataRecord[];
  requiredBundles?: BundleName[];
}

type ViewMode = 'app' | 'code' | 'split';
type RuntimeMode = 'preview' | 'production';

interface ContainerStatus {
  status: 'not_running' | 'running' | 'starting' | 'error';
  url?: string;
  message?: string;
}

/**
 * V2 Sandbox Runtime
 * Runs freeform AI-generated apps in a secure iframe sandbox (preview)
 * or Docker containers (production)
 */
export function V2SandboxRuntime({
  appId,
  name,
  description,
  bundledCode,
  schema,
  componentFiles = {},
  initialData,
  requiredBundles = ['utils'],
}: V2SandboxRuntimeProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('app');
  const [runtimeMode, setRuntimeMode] = useState<RuntimeMode>('preview');
  const [data, setData] = useState<DataRecord[]>(initialData);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [containerStatus, setContainerStatus] = useState<ContainerStatus>({ status: 'not_running' });
  const [isPublishing, setIsPublishing] = useState(false);

  // Check container status on mount
  useEffect(() => {
    checkContainerStatus();
  }, [appId]);

  // Check container status
  const checkContainerStatus = useCallback(async () => {
    try {
      const response = await fetch(`/api/runtime/${appId}`);
      if (response.ok) {
        const result = await response.json();
        setContainerStatus({
          status: result.status === 'running' ? 'running' : 'not_running',
          url: result.environment?.url,
        });
        if (result.status === 'running') {
          setRuntimeMode('production');
        }
      }
    } catch (err) {
      console.error('Failed to check container status:', err);
    }
  }, [appId]);

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
    if (runtimeMode === 'production' && containerStatus.url) {
      window.open(containerStatus.url, '_blank');
    } else {
      window.open(`/apps/${appId}`, '_blank');
    }
  }, [appId, runtimeMode, containerStatus.url]);

  // Publish to Docker container
  const handlePublish = useCallback(async () => {
    setIsPublishing(true);
    setContainerStatus({ status: 'starting' });
    try {
      const response = await fetch(`/api/runtime/${appId}`, {
        method: 'POST',
      });
      
      if (response.ok) {
        const result = await response.json();
        setContainerStatus({
          status: 'running',
          url: result.environment?.url,
        });
        setRuntimeMode('production');
      } else {
        const error = await response.json();
        setContainerStatus({
          status: 'error',
          message: error.error || 'Failed to start container',
        });
      }
    } catch (err) {
      setContainerStatus({
        status: 'error',
        message: err instanceof Error ? err.message : 'Failed to publish',
      });
    } finally {
      setIsPublishing(false);
    }
  }, [appId]);

  // Stop Docker container
  const handleUnpublish = useCallback(async () => {
    setIsPublishing(true);
    try {
      const response = await fetch(`/api/runtime/${appId}`, {
        method: 'DELETE',
      });
      
      if (response.ok) {
        setContainerStatus({ status: 'not_running' });
        setRuntimeMode('preview');
      }
    } catch (err) {
      console.error('Failed to stop container:', err);
    } finally {
      setIsPublishing(false);
    }
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
                  <span className={`text-xs px-2 py-1 rounded text-text-primary ${
                    runtimeMode === 'production' 
                      ? 'bg-green-600' 
                      : 'bg-gradient-to-r from-purple-600 to-pink-600'
                  }`}>
                    {runtimeMode === 'production' ? 'Live' : 'Preview'}
                  </span>
                  {containerStatus.status === 'running' && (
                    <span className="text-xs text-green-400 flex items-center gap-1">
                      <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                      Container running
                    </span>
                  )}
                </div>
                <p className="text-sm text-text-secondary">{description}</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {/* Runtime mode toggle */}
              <div className="flex bg-gray-800 rounded-lg p-1 mr-2">
                <button
                  onClick={() => setRuntimeMode('preview')}
                  className={`px-3 py-1.5 rounded text-sm transition-colors ${
                    runtimeMode === 'preview'
                      ? 'bg-purple-600 text-text-primary'
                      : 'text-gray-400 hover:text-text-primary'
                  }`}
                >
                  Preview
                </button>
                <button
                  onClick={() => runtimeMode === 'production' || containerStatus.status === 'running' ? setRuntimeMode('production') : handlePublish()}
                  disabled={isPublishing}
                  className={`px-3 py-1.5 rounded text-sm transition-colors ${
                    runtimeMode === 'production'
                      ? 'bg-green-600 text-text-primary'
                      : 'text-gray-400 hover:text-text-primary'
                  }`}
                >
                  Production
                </button>
              </div>

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

              {/* Publish/Unpublish button */}
              {containerStatus.status === 'running' ? (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={handleUnpublish}
                  disabled={isPublishing}
                  title="Stop production container"
                  className="text-red-400 hover:text-red-300"
                >
                  <Square className="w-4 h-4 mr-1" />
                  Stop
                </Button>
              ) : (
                <Button
                  variant="primary"
                  size="sm"
                  onClick={handlePublish}
                  disabled={isPublishing || containerStatus.status === 'starting'}
                  title="Publish to production"
                >
                  <Rocket className={`w-4 h-4 mr-1 ${isPublishing ? 'animate-bounce' : ''}`} />
                  {isPublishing ? 'Publishing...' : 'Publish'}
                </Button>
              )}

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
          {/* Production mode - show iframe to container URL */}
          {runtimeMode === 'production' && containerStatus.status === 'running' && containerStatus.url ? (
            <div className="h-full p-6">
              <div className="h-full bg-gray-900 rounded-lg overflow-hidden border border-gray-800">
                <div className="flex items-center justify-between px-4 py-2 bg-gray-800/50 border-b border-gray-700">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 bg-green-400 rounded-full" />
                    <span className="text-xs text-gray-400">Production: {containerStatus.url}</span>
                  </div>
                </div>
                <iframe
                  src={containerStatus.url}
                  className="w-full bg-black"
                  style={{ height: 'calc(100% - 40px)' }}
                  title={`Production: ${appId}`}
                />
              </div>
            </div>
          ) : (
            /* Preview mode - use PreviewRuntime */
            <>
              {viewMode === 'app' && (
                <div className="h-full p-6">
                  <PreviewRuntime
                    appId={appId}
                    bundledCode={bundledCode}
                    requiredBundles={requiredBundles}
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
                    <PreviewRuntime
                      appId={appId}
                      bundledCode={bundledCode}
                      requiredBundles={requiredBundles}
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
            </>
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
