'use client';

import { useState, useCallback, useRef } from 'react';

interface StreamingState {
  content: string;
  isStreaming: boolean;
  isComplete: boolean;
  error: string | null;
}

interface UseStreamingAIOptions {
  onChunk?: (chunk: string) => void;
  onComplete?: (fullContent: string) => void;
  onError?: (error: string) => void;
}

export function useStreamingAI(options: UseStreamingAIOptions = {}) {
  const [state, setState] = useState<StreamingState>({
    content: '',
    isStreaming: false,
    isComplete: false,
    error: null,
  });
  
  const abortControllerRef = useRef<AbortController | null>(null);

  const startStream = useCallback(async (
    message: string,
    context: 'parse' | 'clarify' | 'summarize' = 'parse',
    conversationHistory: Array<{ role: string; content: string }> = []
  ) => {
    // Abort any existing stream
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // Create new abort controller
    abortControllerRef.current = new AbortController();

    // Reset state
    setState({
      content: '',
      isStreaming: true,
      isComplete: false,
      error: null,
    });

    try {
      const response = await fetch('/api/scaffolder/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message, context, conversationHistory }),
        signal: abortControllerRef.current.signal,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Stream request failed');
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('No response body');
      }

      const decoder = new TextDecoder();
      let buffer = '';
      let fullContent = '';

      while (true) {
        const { done, value } = await reader.read();
        
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        
        // Process complete SSE messages
        const lines = buffer.split('\n\n');
        buffer = lines.pop() || ''; // Keep incomplete line in buffer

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          
          try {
            const data = JSON.parse(line.slice(6));
            
            switch (data.type) {
              case 'start':
                // Stream started
                break;
                
              case 'chunk':
                fullContent += data.content;
                setState(prev => ({
                  ...prev,
                  content: fullContent,
                }));
                options.onChunk?.(data.content);
                break;
                
              case 'done':
                setState(prev => ({
                  ...prev,
                  content: data.fullContent || fullContent,
                  isStreaming: false,
                  isComplete: true,
                }));
                options.onComplete?.(data.fullContent || fullContent);
                break;
                
              case 'error':
                setState(prev => ({
                  ...prev,
                  error: data.error,
                  isStreaming: false,
                }));
                options.onError?.(data.error);
                break;
            }
          } catch (e) {
            console.error('Failed to parse SSE message:', e);
          }
        }
      }
    } catch (error) {
      if ((error as Error).name === 'AbortError') {
        // Intentional abort, don't set error
        setState(prev => ({ ...prev, isStreaming: false }));
        return;
      }
      
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setState(prev => ({
        ...prev,
        error: errorMessage,
        isStreaming: false,
      }));
      options.onError?.(errorMessage);
    }
  }, [options]);

  const stopStream = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setState(prev => ({ ...prev, isStreaming: false }));
  }, []);

  const reset = useCallback(() => {
    stopStream();
    setState({
      content: '',
      isStreaming: false,
      isComplete: false,
      error: null,
    });
  }, [stopStream]);

  return {
    ...state,
    startStream,
    stopStream,
    reset,
  };
}

export default useStreamingAI;
