'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import type { FreeformDesign } from '@/lib/scaffolder-v2/agents';

export interface CodeStreamEvent {
  type: 'design' | 'chunk' | 'file' | 'progress' | 'complete' | 'error';
  data: {
    design?: FreeformDesign;
    content?: string;
    filename?: string;
    progress?: number;
    appId?: string;
    error?: string;
    message?: string;
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
}

export interface UseCodeStreamOptions {
  onProgress?: (progress: number, message: string) => void;
  onDesign?: (design: FreeformDesign) => void;
  onChunk?: (chunk: string) => void;
  onFile?: (filename: string, content: string) => void;
  onComplete?: (appId: string) => void;
  onError?: (error: string) => void;
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

    // Reset state
    setState({
      ...initialState,
      isStreaming: true,
      message: 'Starting generation...',
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
  }, []);

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
          }));
          optionsRef.current.onFile?.(data.filename, data.content);
        }
        break;

      case 'complete':
        setState(prev => ({
          ...prev,
          isStreaming: false,
          progress: 100,
          message: data.message || 'Complete!',
          appId: data.appId || null,
        }));
        if (data.appId) {
          optionsRef.current.onComplete?.(data.appId);
        }
        break;

      case 'error':
        setState(prev => ({
          ...prev,
          isStreaming: false,
          error: data.error || 'Unknown error',
        }));
        if (data.error) {
          optionsRef.current.onError?.(data.error);
        }
        break;
    }
  }, []);

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
