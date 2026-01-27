'use client';

import { useState, useCallback, useRef } from 'react';

export interface UseCodeStreamOptions {
  onComplete?: (appId: string) => void;
  onError?: (error: string) => void;
}

export interface CodeStreamState {
  isStreaming: boolean;
  progress: number;
  message: string;
  code: string;
  files: Record<string, string>;
  design?: any;
  appId?: string;
  error?: string;
}

export function useCodeStream({ onComplete, onError }: UseCodeStreamOptions = {}) {
  const [state, setState] = useState<CodeStreamState>({
    isStreaming: false,
    progress: 0,
    message: '',
    code: '',
    files: {},
    appId: undefined,
    error: undefined,
  });

  const abortControllerRef = useRef<AbortController | null>(null);

  const reset = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setState({
      isStreaming: false,
      progress: 0,
      message: '',
      code: '',
      files: {},
      appId: undefined,
      error: undefined,
    });
  }, []);

  const startGeneration = useCallback(async (prompt: string) => {
    try {
      // Abort previous request if any
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      abortControllerRef.current = new AbortController();

      setState(prev => ({
        ...prev,
        isStreaming: true,
        error: undefined,
        progress: 0,
        message: 'Initializing...',
      }));

      const response = await fetch('/api/scaffolder/freeform', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          action: 'stream',
          message: prompt 
        }),
        signal: abortControllerRef.current.signal,
      });

      if (!response.ok) {
        throw new Error(`Failed to start generation: ${response.statusText}`);
      }

      if (!response.body) {
        throw new Error('No response body received');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        
        if (done) {
          break;
        }

        buffer += decoder.decode(value, { stream: true });
        
        // Split by double newline (SSE standard)
        const lines = buffer.split('\n\n');
        buffer = lines.pop() || ''; // Keep incomplete line

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          
          try {
            const jsonStr = line.slice(6);
            if (jsonStr === '[DONE]') break;
            
            const data = JSON.parse(jsonStr);
            
            // Handle different event types
            switch (data.type) {
              case 'connected':
                setState(prev => ({ ...prev, message: 'Connected to stream...' }));
                break;
                
              case 'chunk':
                // Update code and files
                setState(prev => {
                  const newFiles = { ...prev.files };
                  // If we have a specific file update
                  if (data.fileName && data.content) {
                    newFiles[data.fileName] = data.content;
                  }
                  
                  return {
                    ...prev,
                    code: data.code || prev.code, // Main code buffer
                    files: newFiles,
                    progress: data.progress || prev.progress,
                    message: data.message || prev.message || 'Generating code...',
                  };
                });
                break;
                
              case 'status':
                setState(prev => ({
                  ...prev,
                  message: data.message || prev.message,
                  progress: data.progress || prev.progress,
                }));
                break;
                
              case 'complete':
                setState(prev => ({
                  ...prev,
                  isStreaming: false,
                  progress: 100,
                  message: 'Generation complete',
                  appId: data.appId,
                }));
                if (data.appId && onComplete) {
                  onComplete(data.appId);
                }
                break;
                
              case 'error':
                throw new Error(data.error || 'Unknown error during generation');
            }
          } catch (e) {
            console.error('Error parsing SSE data:', e);
          }
        }
      }

    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        return; // Ignore abort errors
      }
      
      const errorMessage = err instanceof Error ? err.message : 'An error occurred';
      setState(prev => ({
        ...prev,
        isStreaming: false,
        error: errorMessage,
      }));
      onError?.(errorMessage);
    } finally {
      abortControllerRef.current = null;
    }
  }, [onComplete, onError]);

  return {
    ...state,
    startGeneration,
    reset,
  };
}
