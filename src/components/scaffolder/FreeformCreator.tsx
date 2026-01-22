'use client';

import React from 'react';
import { AgentStream } from './agent/AgentStream';
import { CodeViewer } from './CodeViewer';
import { LivePreview } from './LivePreview';
import { SimulationEvent } from '@/lib/demo/seed-data';
import { GeneratedCode } from '@/lib/scaffolder/code-generator';
import { Button, StatusPanel, ThemeToggle, Logo, ChatInput, ChatMessage } from '@/components/ui';
import { WelcomeScreen } from './WelcomeScreen';
import { Sparkles, Terminal, Rocket, CheckCircle, ArrowRight } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface FreeformCreatorProps {
  onComplete?: (appId: string, subdomain?: string) => void;
  onCancel?: () => void;
}

interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
}

type Phase = 'thinking' | 'coding' | 'deploying' | 'preview';

export function FreeformCreator({ onComplete, onCancel }: FreeformCreatorProps) {
  const [phase, setPhase] = React.useState<Phase>('thinking');
  const [conversationId, setConversationId] = React.useState<string | null>(null);
  const [simulationEvents, setSimulationEvents] = React.useState<SimulationEvent[]>([]);
  const [generatedCode, setGeneratedCode] = React.useState<GeneratedCode | null>(null);
  const [generatedAppId, setGeneratedAppId] = React.useState<string | null>(null);
  const [generatedSubdomain, setGeneratedSubdomain] = React.useState<string | null>(null);
  const [isComplete, setIsComplete] = React.useState(false);
  const [messages, setMessages] = React.useState<Message[]>([]);
  const [isThinking, setIsThinking] = React.useState(false);
  
  const eventSourceRef = React.useRef<EventSource | null>(null);
  const conversationIdRef = React.useRef<string | null>(null);
  const didInitialize = React.useRef(false);
  const didTriggerFinalize = React.useRef(false);
  const messagesEndRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    // We no longer auto-start the demo here. 
    // It will be started when the user selects a prompt or sends a message.
    return () => {
      eventSourceRef.current?.close();
    };
  }, []);

  React.useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, simulationEvents, phase]);

  const startDemo = async (initialMessage?: string) => {
    const tempId = `demo-${Date.now()}`;
    
    // Add initial user message if provided to simulate the chat starting
    if (initialMessage) {
      const userMsg: Message = {
        id: `user-init-${Date.now()}`,
        role: 'user',
        content: initialMessage
      };
      setMessages(prev => [...prev, userMsg]);
    }

    // Connect to status stream
    const es = new EventSource(`/api/scaffolder/status/${tempId}`);
    eventSourceRef.current = es;

    es.onmessage = async (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'simulation_event') {
          const simEvent: SimulationEvent = data.payload;
          setSimulationEvents(prev => [...prev, simEvent]);
          
          if (simEvent.type === 'code_generation') {
            setPhase('coding');
            
            // Trigger the actual code generation on the server
            if (didTriggerFinalize.current) return;
            didTriggerFinalize.current = true;

            try {
              const currentConvId = conversationIdRef.current;
              if (currentConvId) {
                const res = await fetch('/api/scaffolder', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    action: 'finalize',
                    conversationId: currentConvId,
                  }),
                });

                const finalizeData = await res.json();

                if (res.ok && finalizeData.app) {
                  setGeneratedAppId(finalizeData.app.id);
                  setGeneratedSubdomain(finalizeData.app.subdomain);
                  setPhase('preview');
                  setIsComplete(true);
                  toast.success('App generated successfully!');
                } else {
                  toast.error('Generation failed: ' + (finalizeData.error || 'Unknown error'));
                }
              }
            } catch (err) {
              console.error('Failed to trigger finalize:', err);
              toast.error('Error during generation');
            }
          }
        }
      } catch (err) {
        console.error('Failed to parse message:', err);
      }
    };

    try {
      const res = await fetch('/api/scaffolder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'demo',
          tempConversationId: tempId,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setConversationId(data.conversationId);
        conversationIdRef.current = data.conversationId;
        // Switch event source to real ID
        es.close();
        const realEs = new EventSource(`/api/scaffolder/status/${data.conversationId}`);
        eventSourceRef.current = realEs;
        realEs.onmessage = es.onmessage;
      } else {
        toast.error('Failed to start demo');
      }
    } catch (err) {
      console.error(err);
      toast.error('Error starting demo');
    }
  };

  const handleCodeGenComplete = async (code: GeneratedCode) => {
    setGeneratedCode(code);
  };

  const handleSubmit = async (text: string) => {
    if (!text.trim() || isThinking) return;

    if (simulationEvents.length === 0) {
      // If we haven't started the demo yet, start it with this message
      startDemo(text);
      return;
    }

    // Add user message
    const userMsg: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: text
    };
    setMessages(prev => [...prev, userMsg]);

    setIsThinking(true);
    
    // Simulate assistant response for demo
    setTimeout(() => {
      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        role: 'assistant',
        content: "I've noted your request. I'm adjusting the generation logic accordingly."
      }]);
      setIsThinking(false);
    }, 1500);
  };

  return (
    <div className="flex flex-col h-full bg-surface-base">
      <header className="border-b border-outline-mid bg-surface-base px-8 py-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-serif font-medium text-text-primary">Create</h1>
            <p className="text-sm text-text-secondary mt-1">Freeform Mode</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-surface-elevated border border-outline-light">
              <div className={cn(
                "w-2 h-2 rounded-full animate-pulse",
                isComplete 
                  ? "bg-emerald-500 dark:bg-emerald-600/80" 
                  : (simulationEvents.length > 0 ? "bg-accent-yellow" : "bg-text-tertiary")
              )} />
              <span className="text-xs font-mono text-text-secondary uppercase tracking-wider">
                {simulationEvents.length === 0 && 'Awaiting Input'}
                {simulationEvents.length > 0 && phase === 'thinking' && 'Analyzing Intent'}
                {phase === 'coding' && 'Generating Code'}
                {phase === 'deploying' && 'Deploying to Nebula'}
                {phase === 'preview' && 'Ready for Use'}
              </span>
            </div>
            <div className="flex gap-2">
              <ThemeToggle />
              {onCancel && (
                <Button variant="ghost" size="sm" onClick={onCancel}>
                  Change Mode
                </Button>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto">
        <div className="max-w-5xl mx-auto p-8 space-y-12">
          {messages.length === 0 && simulationEvents.length === 0 ? (
            <WelcomeScreen 
              onSelect={(text) => startDemo(text)} 
              isDemo={true} 
              />
          ) : (
            <>
              {/* Chat Messages */}
              <div className="space-y-6">
                {messages.map((msg) => (
                  <ChatMessage key={msg.id} message={msg} />
                ))}
              </div>

              {/* Phase 1: Thinking (Agent Stream) */}
              {simulationEvents.length > 0 && (
                <section className={cn(
                  "transition-all duration-500",
                  phase === 'thinking' ? "opacity-100 translate-y-0" : "opacity-40 scale-[0.98]"
                )}>
                  <div className="flex items-center gap-2 mb-6">
                    <Terminal className="w-5 h-5 text-text-tertiary" />
                    <h2 className="text-lg font-medium text-text-secondary uppercase tracking-widest text-xs">Agent Intelligence Stream</h2>
                  </div>
                  <AgentStream events={simulationEvents} isComplete={phase !== 'thinking'} />
                </section>
              )}

              {/* Phase 2: Coding */}
              {(phase === 'coding' || phase === 'deploying') && (
                <section className={cn(
                  "transition-all duration-500 delay-300",
                  phase === 'coding' || phase === 'deploying' ? "opacity-100 translate-y-0" : "opacity-40 scale-[0.98]"
                )}>
                  <div className="flex items-center gap-2 mb-6">
                    <Terminal className="w-5 h-5 text-text-tertiary" />
                    <h2 className="text-lg font-medium text-text-secondary uppercase tracking-widest text-xs">Real-time Code Generation</h2>
                  </div>
                  <CodeViewer 
                    conversationId={conversationId!} 
                    onComplete={handleCodeGenComplete}
                  />
                </section>
              )}

              {/* Phase 3: Preview */}
              {phase === 'preview' && generatedAppId && (
                <section className="animate-fade-in translate-y-0">
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-2">
                      <Rocket className="w-5 h-5 text-accent-yellow" />
                      <h2 className="text-lg font-medium text-text-primary">App Deployed</h2>
                    </div>
                    <div className="flex items-center gap-2 text-emerald-700/80 bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/20 dark:text-emerald-500/70 dark:bg-emerald-500/5 dark:border-emerald-500/20">
                      <CheckCircle className="w-4 h-4" />
                      <span className="text-xs font-bold uppercase tracking-wider">Production Ready</span>
                    </div>
                  </div>
                  <LivePreview 
                    appId={generatedAppId} 
                    subdomain={generatedSubdomain || undefined}
                    appName="Cha Chaan Teng LaoBan"
                    onAccept={() => onComplete?.(generatedAppId, generatedSubdomain || undefined)}
                  />
                </section>
              )}
            </>
          )}
          <div ref={messagesEndRef} />
        </div>
      </main>

      {/* Input Area */}
      <div className="p-8 pt-0 max-w-5xl mx-auto w-full">
        <ChatInput
          onSubmit={handleSubmit}
          disabled={isComplete}
          isThinking={isThinking}
          placeholder="Describe changes or new requirements..."
        />
      </div>
    </div>
  );
}
