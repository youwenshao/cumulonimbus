'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Sparkles, 
  Wand2,
  Zap,
  Code2,
  Loader2
} from 'lucide-react';
import { Button, ChatInput, ChatMessage } from '@/components/ui';
import { CodeStreamViewer } from './CodeStreamViewer';
import { LivePreview } from './LivePreview';
import { useCodeStream } from '@/hooks/useCodeStream';
import { cn } from '@/lib/utils';

export interface FreeformCreatorProps {
  className?: string;
}

interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export function FreeformCreator({ className = '' }: FreeformCreatorProps) {
  const router = useRouter();
  const [messages, setMessages] = useState<Message[]>([]);
  const [showCode, setShowCode] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const {
    isStreaming,
    progress,
    message: statusMessage,
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
      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        role: 'assistant',
        content: 'App generation complete! You can now preview your application below.'
      }]);
    },
    onError: (err) => {
      console.error('Generation error:', err);
      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        role: 'assistant',
        content: `Sorry, something went wrong: ${err}`
      }]);
    },
  });

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isStreaming, appId]);

  const handleSubmit = useCallback(async (text: string) => {
    if (!text.trim() || isStreaming) return;

    // Add user message
    const userMsg: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: text
    };
    setMessages(prev => [...prev, userMsg]);

    // Start generation
    await startGeneration(text);
  }, [isStreaming, startGeneration]);

  const handleReset = useCallback(() => {
    reset();
    setMessages([]);
  }, [reset]);

  const handleGoToApp = useCallback(() => {
    if (appId) {
      router.push(`/apps/${appId}`);
    }
  }, [appId, router]);

  return (
    <div className={cn('flex flex-col h-full', className)}>
      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto min-h-0">
        <div className="max-w-4xl mx-auto p-4 md:p-8 space-y-6">
          {messages.length === 0 ? (
            <WelcomeScreen onSelect={handleSubmit} />
          ) : (
            <>
              {messages.map((msg) => (
                <ChatMessage key={msg.id} message={msg} />
              ))}

              {/* Streaming/Generation State */}
              {isStreaming && (
                <div className="animate-slide-up space-y-4">
                  <div className="flex items-center justify-between">
                     <div className="flex items-center gap-2 text-sm text-text-secondary">
                        <Loader2 className="w-4 h-4 animate-spin text-accent-yellow" />
                        <span>{statusMessage || 'Generating your app...'} ({progress}%)</span>
                     </div>
                     <Button 
                        onClick={() => setShowCode(!showCode)} 
                        variant="ghost" 
                        size="sm"
                        className="text-xs"
                     >
                        {showCode ? 'Hide Code' : 'Show Code'}
                     </Button>
                  </div>
                  
                  {showCode && (
                    <CodeStreamViewer
                      code={code}
                      files={files}
                      progress={progress}
                      message={statusMessage}
                      isStreaming={isStreaming}
                      className="h-64 md:h-[500px]"
                    />
                  )}
                </div>
              )}

              {/* Completion State */}
              {!isStreaming && appId && (
                <div className="animate-slide-up space-y-6">
                   {/* Generated Code Review (Collapsed by default or small) */}
                   {!showCode && (
                     <Button 
                        onClick={() => setShowCode(true)} 
                        variant="secondary" 
                        size="sm"
                        className="w-full"
                     >
                        <Code2 className="w-4 h-4 mr-2" />
                        View Generated Code
                     </Button>
                   )}
                   
                   {showCode && (
                    <CodeStreamViewer
                      code={code}
                      files={files}
                      progress={100}
                      isStreaming={false}
                      appId={appId}
                      className="h-64 md:h-[300px]"
                    />
                   )}

                   {/* Live Preview */}
                   <LivePreview
                      appId={appId}
                      appName={design?.appName || 'Generated App'}
                      onAccept={handleGoToApp}
                   />
                   
                   <div className="flex justify-center gap-4">
                      <Button variant="ghost" onClick={handleReset}>
                        Create Another
                      </Button>
                      <Button onClick={handleGoToApp} className="gap-2">
                        Open Full App
                        <Zap className="w-4 h-4" />
                      </Button>
                   </div>
                </div>
              )}
              
              <div ref={messagesEndRef} />
            </>
          )}
        </div>
      </div>

      {/* Input Area */}
      <div className="p-4 md:p-8 pt-0 max-w-4xl mx-auto w-full">
        <ChatInput
          onSubmit={handleSubmit}
          disabled={isStreaming}
          isThinking={isStreaming}
          placeholder={messages.length === 0 ? "Describe the app you want to build..." : "Describe changes or new requirements..."}
        />
      </div>
    </div>
  );
}

function WelcomeScreen({ onSelect }: { onSelect: (text: string) => void }) {
  return (
    <div className="text-center py-16 md:py-10 animate-fade-in">
      <div className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-accent-yellow/10 to-orange-900/20 rounded-full border border-accent-yellow/30 mb-8">
        <Sparkles className="w-4 h-4 text-accent-yellow" />
        <span className="text-sm text-accent-yellow">Freeform AI Generation</span>
      </div>
      
      <h2 className="text-3xl font-serif font-medium text-text-primary mb-4">
        What would you like to <span className="bg-accent-yellow px-2 py-1 text-black">create</span>?
      </h2>

      <p className="text-text-secondary max-w-md mx-auto mb-12 leading-relaxed text-lg">
        Describe your idea in natural language. I'll generate a complete, working application for you instantly.
      </p>
      
      <div className="space-y-3 max-w-lg mx-auto">
        <ExamplePrompt text="A habit tracker with daily streaks and weekly summaries" onSelect={onSelect} />
        <ExamplePrompt text="A Kanban board for managing tasks with drag and drop" onSelect={onSelect} />
        <ExamplePrompt text="An expense tracker with categories and monthly charts" onSelect={onSelect} />
      </div>
    </div>
  );
}

function ExamplePrompt({ text, onSelect }: { text: string; onSelect: (text: string) => void }) {
  return (
    <button
      onClick={() => onSelect(text)}
      className="w-full p-4 rounded-xl bg-surface-elevated border border-outline-light text-left hover:border-accent-yellow/50 transition-all hover:bg-surface-elevated/80 group"
    >
      <div className="flex items-center justify-between">
        <p className="text-text-secondary group-hover:text-text-primary transition-colors">{text}</p>
        <Wand2 className="w-4 h-4 text-accent-yellow opacity-0 group-hover:opacity-100 transition-opacity" />
      </div>
    </button>
  );
}
