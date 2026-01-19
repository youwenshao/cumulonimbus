'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import type { FreeformDesign } from '@/lib/scaffolder-v2/agents';
import type { ErrorCategory } from '@/lib/scaffolder-v2/error-analyzer';
import type { ErrorStage } from '@/lib/scaffolder-v2/feedback-config';

/** Retry attempt information from server */
export interface RetryAttemptData {
  attempt: number;
  maxAttempts: number;
  stage: ErrorStage;
  errorCategory: ErrorCategory;
  errorMessage: string;
  errorLine?: number;
  fix?: string;
  strategy?: string;
}

/** Individual retry attempt for display */
export interface RetryAttempt {
  id: string;
  attempt: number;
  stage: ErrorStage;
  errorCategory: ErrorCategory;
  errorMessage: string;
  errorLine?: number;
  status: 'in_progress' | 'success' | 'failed';
  fix?: string;
  strategy?: string;
  timestamp: Date;
}

export interface CodeStreamEvent {
  type: 'design' | 'chunk' | 'file' | 'progress' | 'complete' | 'error' | 'retry';
  data: {
    design?: FreeformDesign;
    content?: string;
    filename?: string;
    progress?: number;
    appId?: string;
    error?: string;
    message?: string;
    retry?: RetryAttemptData;
  };
}

export interface CodeStreamState {
  isStreaming: boolean;
  progress: number;
  message: string;
  code: string;
  files: Record<string, string>;
  design: FreeformDesign | null;
  appId: string | null;
  error: string | null;
  /** Whether error correction is in progress */
  isRetrying: boolean;
  /** Current retry attempt number */
  currentRetryAttempt: number;
  /** Maximum retry attempts */
  maxRetryAttempts: number;
  /** History of retry attempts */
  retryAttempts: RetryAttempt[];
  /** Whether all retries were successful */
  allRetriesSuccessful: boolean;
}

export interface UseCodeStreamOptions {
  onProgress?: (progress: number, message: string) => void;
  onDesign?: (design: FreeformDesign) => void;
  onChunk?: (chunk: string) => void;
  onFile?: (filename: string, content: string) => void;
  onComplete?: (appId: string) => void;
  onError?: (error: string) => void;
  /** Called when a retry attempt starts */
  onRetryStart?: (attempt: RetryAttempt) => void;
  /** Called when a retry attempt completes (success or failure) */
  onRetryComplete?: (attempt: RetryAttempt) => void;
}

const initialState: CodeStreamState = {
  isStreaming: false,
  progress: 0,
  message: '',
  code: '',
  files: {},
  design: null,
  appId: null,
  error: null,
  isRetrying: false,
  currentRetryAttempt: 0,
  maxRetryAttempts: 5,
  retryAttempts: [],
  allRetriesSuccessful: true,
};

/**
 * Hook for consuming SSE code generation streams
 */
export function useCodeStream(options: UseCodeStreamOptions = {}) {
  const [state, setState] = useState<CodeStreamState>(initialState);
  const abortControllerRef = useRef<AbortController | null>(null);
  const optionsRef = useRef(options);

  // Keep options ref up to date
  useEffect(() => {
    optionsRef.current = options;
  }, [options]);

  /**
   * Handle SSE events
   */
  const handleEvent = useCallback((event: CodeStreamEvent) => {
    const { type, data } = event;

    switch (type) {
      case 'progress':
        setState(prev => ({
          ...prev,
          progress: data.progress || prev.progress,
          message: data.message || prev.message,
        }));
        optionsRef.current.onProgress?.(
          data.progress || 0, 
          data.message || ''
        );
        break;

      case 'design':
        if (data.design) {
          setState(prev => ({
            ...prev,
            design: data.design!,
            progress: data.progress || prev.progress,
            message: data.message || prev.message,
          }));
          optionsRef.current.onDesign?.(data.design);
        }
        break;

      case 'chunk':
        if (data.content) {
          setState(prev => ({
            ...prev,
            code: prev.code + data.content,
            progress: data.progress || prev.progress,
          }));
          optionsRef.current.onChunk?.(data.content);
        }
        break;

      case 'file':
        if (data.filename && data.content) {
          setState(prev => ({
            ...prev,
            files: {
              ...prev.files,
              [data.filename!]: data.content!,
            },
            progress: data.progress || prev.progress,
            message: data.message || prev.message,
          }));
          optionsRef.current.onFile?.(data.filename, data.content);
        }
        break;

      case 'retry':
        if (data.retry) {
          const retryData = data.retry;
          const attemptId = `retry_${retryData.attempt}_${Date.now()}`;
          
          // Check if this is a new attempt or an update to an existing one
          const existingAttemptIndex = state.retryAttempts.findIndex(
            a => a.attempt === retryData.attempt && a.status === 'in_progress'
          );

          const newAttempt: RetryAttempt = {
            id: attemptId,
            attempt: retryData.attempt,
            stage: retryData.stage,
            errorCategory: retryData.errorCategory,
            errorMessage: retryData.errorMessage,
            errorLine: retryData.errorLine,
            status: retryData.fix ? 'success' : 'in_progress',
            fix: retryData.fix,
            strategy: retryData.strategy,
            timestamp: new Date(),
          };

          setState(prev => {
            let updatedAttempts = [...prev.retryAttempts];
            
            if (existingAttemptIndex >= 0 && retryData.fix) {
              // Update existing attempt to success
              updatedAttempts[existingAttemptIndex] = {
                ...updatedAttempts[existingAttemptIndex],
                status: 'success',
                fix: retryData.fix,
              };
            } else if (existingAttemptIndex < 0) {
              // Add new attempt
              updatedAttempts.push(newAttempt);
            }

            return {
              ...prev,
              isRetrying: !retryData.fix, // Still retrying if no fix yet
              currentRetryAttempt: retryData.attempt,
              maxRetryAttempts: retryData.maxAttempts,
              retryAttempts: updatedAttempts,
              progress: data.progress || prev.progress,
              message: data.message || `Fixing error (attempt ${retryData.attempt}/${retryData.maxAttempts})...`,
            };
          });

          // Trigger callbacks
          if (retryData.fix) {
            optionsRef.current.onRetryComplete?.(newAttempt);
          } else {
            optionsRef.current.onRetryStart?.(newAttempt);
          }
        }
        break;

      case 'complete':
        setState(prev => {
          // Mark any in-progress retries as successful
          const finalAttempts = prev.retryAttempts.map(attempt => 
            attempt.status === 'in_progress' 
              ? { ...attempt, status: 'success' as const }
              : attempt
          );

          return {
            ...prev,
            isStreaming: false,
            isRetrying: false,
            progress: 100,
            message: data.message || 'Generation complete',
            appId: data.appId || prev.appId,
            retryAttempts: finalAttempts,
            allRetriesSuccessful: finalAttempts.every(a => a.status === 'success'),
          };
        });
        if (data.appId) {
          optionsRef.current.onComplete?.(data.appId);
        }
        break;

      case 'error':
        const errorMessage = data.error || 'Unknown error';
        setState(prev => {
          // Mark any in-progress retries as failed
          const finalAttempts = prev.retryAttempts.map(attempt => 
            attempt.status === 'in_progress' 
              ? { ...attempt, status: 'failed' as const }
              : attempt
          );

          return {
            ...prev,
            isStreaming: false,
            isRetrying: false,
            error: errorMessage,
            retryAttempts: finalAttempts,
            allRetriesSuccessful: false,
          };
        });
        optionsRef.current.onError?.(errorMessage);
        break;
    }
  }, [state.retryAttempts]);

  /**
   * Start streaming code generation
   */
  const startGeneration = useCallback(async (
    prompt: string,
    appName?: string,
    existingAppId?: string
  ) => {
    // Cancel any existing stream
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // Reset state including retry state
    setState({
      ...initialState,
      isStreaming: true,
      message: 'Starting generation...',
      retryAttempts: [],
      isRetrying: false,
      currentRetryAttempt: 0,
      allRetriesSuccessful: true,
    });

    abortControllerRef.current = new AbortController();

    try {
      const response = await fetch('/api/apps/generate-stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt,
          appName,
          existingAppId,
          regenerate: !!existingAppId,
        }),
        signal: abortControllerRef.current.signal,
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('No response body');
      }

      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();

        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        // Parse SSE events
        const lines = buffer.split('\n\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;

          try {
            const event: CodeStreamEvent = JSON.parse(line.slice(6));
            handleEvent(event);
          } catch {
            // Skip malformed events
          }
        }
      }

      // Process remaining buffer
      if (buffer.startsWith('data: ')) {
        try {
          const event: CodeStreamEvent = JSON.parse(buffer.slice(6));
          handleEvent(event);
        } catch {
          // Ignore
        }
      }
    } catch (error) {
      if ((error as Error).name === 'AbortError') {
        setState(prev => ({
          ...prev,
          isStreaming: false,
          message: 'Generation cancelled',
        }));
        return;
      }

      const errorMessage = error instanceof Error ? error.message : 'Generation failed';
      setState(prev => ({
        ...prev,
        isStreaming: false,
        error: errorMessage,
      }));
      optionsRef.current.onError?.(errorMessage);
    }
  }, [handleEvent]);

  /**
   * Cancel ongoing generation
   */
  const cancel = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
  }, []);

  /**
   * Reset state
   */
  const reset = useCallback(() => {
    cancel();
    setState(initialState);
  }, [cancel]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  return {
    ...state,
    startGeneration,
    cancel,
    reset,
  };
}
