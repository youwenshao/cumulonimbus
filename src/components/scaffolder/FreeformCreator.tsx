'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Sparkles, 
  Send, 
  Loader2, 
  ChevronRight,
  Lightbulb,
  Wand2,
} from 'lucide-react';
import { Button, Card } from '@/components/ui';
import { CodeStreamViewer } from './CodeStreamViewer';
import { IframeSandbox } from '@/components/runtime';
import { useCodeStream } from '@/hooks/useCodeStream';
import { cn } from '@/lib/utils';

export interface FreeformCreatorProps {
  className?: string;
  initialConversationId?: string;
  initialAppId?: string;
  onComplete?: (id: string, subdomain?: string) => void;
  onCancel?: () => void;
}

const EXAMPLE_PROMPTS = [
  "A habit tracker with daily streaks and weekly summaries",
  "A Kanban board for managing tasks with drag and drop",
  "An expense tracker with categories and monthly charts",
  "A recipe collection with ingredient lists and cooking times",
  "A book reading log with ratings and notes",
  "A workout tracker with exercise types and sets",
];

type CreatorStep = 'prompt' | 'generating' | 'preview';

export function FreeformCreator({ className = '' }: FreeformCreatorProps) {
  const router = useRouter();
  const [prompt, setPrompt] = useState('');
  const [step, setStep] = useState<CreatorStep>('prompt');
  const [showPreview, setShowPreview] = useState(false);

  const {
    isStreaming,
    progress,
    message,
    code,
    files,
    design,
    appId,
    error,
    startGeneration,
    reset,
  } = useCodeStream({
    onComplete: (id) => {
      console.log('App generated:', id);
      setStep('preview');
    },
    onError: (err) => {
      console.error('Generation error:', err);
    },
  });

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim() || isStreaming) return;

    setStep('generating');
    await startGeneration(prompt);
  }, [prompt, isStreaming, startGeneration]);

  const handleExampleClick = useCallback((example: string) => {
    setPrompt(example);
  }, []);

  const handleReset = useCallback(() => {
    reset();
    setPrompt('');
    setStep('prompt');
    setShowPreview(false);
  }, [reset]);

  const handleGoToApp = useCallback(() => {
    if (appId) {
      router.push(`/apps/${appId}`);
    }
  }, [appId, router]);

  return (
    <div className={cn('space-y-6', className)}>
      {/* Header */}
      <div className="text-center">
        <div className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-600/20 to-pink-600/20 rounded-full border border-purple-500/30 mb-4">
          <Sparkles className="w-4 h-4 text-purple-400" />
          <span className="text-sm text-purple-300">AI-Powered App Generation</span>
        </div>
        <h2 className="text-2xl font-serif font-medium mb-2 text-text-primary">Create Your App</h2>
        <p className="text-text-secondary">
          Describe what you want to build and watch it come to life
        </p>
      </div>

      {/* Step: Prompt Input */}
      {step === 'prompt' && (
        <>
          {/* Prompt form */}
          <Card variant="outlined" padding="lg">
            <form onSubmit={handleSubmit}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-2">
                    What would you like to build?
                  </label>
                  <textarea
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    placeholder="Describe your app idea in detail..."
                    className="w-full h-32 px-4 py-3 bg-surface-light border border-outline-light rounded-lg text-text-primary placeholder-text-tertiary focus:outline-none focus:ring-2 focus:ring-accent-yellow resize-none"
                  />
                </div>

                <div className="flex justify-end">
                  <Button
                    type="submit"
                    variant="primary"
                    disabled={!prompt.trim()}
                    className="gap-2"
                  >
                    <Wand2 className="w-4 h-4" />
                    Generate App
                  </Button>
                </div>
              </div>
            </form>
          </Card>

          {/* Example prompts */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Lightbulb className="w-4 h-4 text-accent-yellow" />
              <span className="text-sm text-text-secondary">Need inspiration? Try one of these:</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {EXAMPLE_PROMPTS.map((example, i) => (
                <button
                  key={i}
                  onClick={() => handleExampleClick(example)}
                  className="text-left p-3 bg-surface-light/50 hover:bg-surface-light border border-outline-light rounded-lg text-sm text-text-secondary hover:text-text-primary transition-colors"
                >
                  <ChevronRight className="w-4 h-4 inline mr-2 text-accent-yellow" />
                  {example}
                </button>
              ))}
            </div>
          </div>
        </>
      )}

      {/* Step: Generating */}
      {step === 'generating' && (
        <div className="space-y-6">
          {/* Progress indicator */}
          <Card variant="outlined" padding="lg">
            <div className="flex items-center gap-4 mb-4">
              {isStreaming ? (
                <Loader2 className="w-6 h-6 animate-spin text-red-500" />
              ) : (
                <Sparkles className="w-6 h-6 text-green-500" />
              )}
              <div className="flex-1">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-medium text-text-primary">
                    {isStreaming ? 'Generating your app...' : 'Generation complete!'}
                  </span>
                  <span className="text-sm text-text-secondary">{progress}%</span>
                </div>
                <div className="h-2 bg-surface-light rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-accent-yellow to-orange-500 transition-all duration-300"
                    style={{ width: `${progress}%` }}
                  />
                </div>
                {message && (
                  <p className="text-sm text-text-secondary mt-2">{message}</p>
                )}
              </div>
            </div>

            {/* Design summary */}
            {design && (
              <div className="mt-4 p-4 bg-surface-light/50 rounded-lg">
                <h3 className="font-semibold mb-2 text-text-primary">{design.appName}</h3>
                <p className="text-sm text-text-secondary mb-3">{design.description}</p>
                <div className="flex flex-wrap gap-2">
                  {design.features.map((feature, i) => (
                    <span
                      key={i}
                      className="px-2 py-1 bg-surface-mid rounded text-xs text-text-secondary"
                    >
                      {feature}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </Card>

          {/* Code viewer */}
          <CodeStreamViewer
            code={code}
            files={files}
            progress={progress}
            message={message}
            isStreaming={isStreaming}
            appId={appId || undefined}
            error={error || undefined}
          />

          {/* Actions */}
          {!isStreaming && (
            <div className="flex justify-between">
              <Button variant="ghost" onClick={handleReset}>
                Start Over
              </Button>
              {appId && (
                <Button variant="primary" onClick={handleGoToApp} className="gap-2">
                  Open App
                  <ChevronRight className="w-4 h-4" />
                </Button>
              )}
            </div>
          )}
        </div>
      )}

      {/* Step: Preview */}
      {step === 'preview' && appId && (
        <div className="space-y-6">
          <Card variant="outlined" padding="lg">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-semibold text-lg text-text-primary">{design?.appName || 'Your App'}</h3>
                <p className="text-sm text-text-secondary">{design?.description}</p>
              </div>
              <div className="flex gap-2">
                <Button variant="ghost" onClick={() => setShowPreview(!showPreview)}>
                  {showPreview ? 'Hide Preview' : 'Show Preview'}
                </Button>
                <Button variant="primary" onClick={handleGoToApp}>
                  Open Full App
                </Button>
              </div>
            </div>

            {showPreview && (
              <div className="mt-4 -mx-6 -mb-6 border-t border-gray-800">
                <IframeSandbox
                  appId={appId}
                  bundledCode={code}
                  initialData={[]}
                  className="rounded-b-lg"
                />
              </div>
            )}
          </Card>

          <div className="flex justify-center">
            <Button variant="ghost" onClick={handleReset}>
              Create Another App
            </Button>
          </div>
        </div>
      )}

      {/* Error state */}
      {error && step !== 'generating' && (
        <Card variant="outlined" className="border-red-500/30 bg-red-500/10">
          <div className="p-4 text-center">
            <p className="text-red-400 mb-4">{error}</p>
            <Button variant="secondary" onClick={handleReset}>
              Try Again
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
}
