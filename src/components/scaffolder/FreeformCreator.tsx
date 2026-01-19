'use client';

import React, { useState, useEffect, useRef } from 'react';
import { AgentStream } from './agent/AgentStream';
import { CodeViewer } from './CodeViewer';
import { LivePreview } from './LivePreview';
import { SimulationEvent } from '@/lib/demo/seed-data';
import { GeneratedCode } from '@/lib/scaffolder/code-generator';
import { Button, StatusPanel, ThemeToggle, Logo } from '@/components/ui';
import { Sparkles, Terminal, Rocket, CheckCircle, ArrowRight } from 'lucide-react';
import { toast } from 'sonner';

interface FreeformCreatorProps {
  onComplete?: (appId: string) => void;
  onCancel?: () => void;
}

type Phase = 'thinking' | 'coding' | 'deploying' | 'preview';

export function FreeformCreator({ onComplete, onCancel }: FreeformCreatorProps) {
  const [phase, setPhase] = useState<Phase>('thinking');
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [simulationEvents, setSimulationEvents] = useState<SimulationEvent[]>([]);
  const [generatedCode, setGeneratedCode] = useState<GeneratedCode | null>(null);
  const [generatedAppId, setGeneratedAppId] = useState<string | null>(null);
  const [isComplete, setIsComplete] = useState(false);
  
  const eventSourceRef = useRef<EventSource | null>(null);

  useEffect(() => {
    startDemo();
    return () => {
      eventSourceRef.current?.close();
    };
  }, []);

  const startDemo = async () => {
    const tempId = `demo-${Date.now()}`;
    
    // Connect to status stream
    const es = new EventSource(`/api/scaffolder/status/${tempId}`);
    eventSourceRef.current = es;

    es.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type === 'simulation_event') {
        const simEvent: SimulationEvent = data.payload;
        setSimulationEvents(prev => [...prev, simEvent]);
        
        if (simEvent.type === 'code_generation') {
          setPhase('coding');
        }
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
    setPhase('deploying');
    
    // Auto-finalize
    try {
      const res = await fetch('/api/scaffolder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'finalize',
          conversationId,
        }),
      });

      const data = await res.json();
      if (res.ok && data.app) {
        setGeneratedAppId(data.app.id);
        setPhase('preview');
        setIsComplete(true);
        toast.success('App deployed successfully!');
      } else {
        toast.error('Deployment failed');
      }
    } catch (err) {
      console.error(err);
      toast.error('Error during deployment');
    }
  };

  return (
    <div className="flex flex-col h-full bg-surface-base">
      <header className="border-b border-outline-mid bg-surface-base px-8 py-6">
        <div className="flex items-center justify-between max-w-6xl mx-auto w-full">
          <div className="flex items-center gap-3">
            <Sparkles className="w-6 h-6 text-accent-yellow animate-pulse" />
            <h1 className="text-2xl font-serif font-medium text-text-primary">
              Freeform <span className="text-accent-yellow">Demo</span>
            </h1>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-surface-elevated border border-outline-light">
              <div className={cn(
                "w-2 h-2 rounded-full animate-pulse",
                isComplete ? "bg-green-500" : "bg-accent-yellow"
              )} />
              <span className="text-xs font-mono text-text-secondary uppercase tracking-wider">
                {phase === 'thinking' && 'Analyzing Intent'}
                {phase === 'coding' && 'Generating Code'}
                {phase === 'deploying' && 'Deploying to Nebula'}
                {phase === 'preview' && 'Ready for Use'}
              </span>
            </div>
            {onCancel && (
              <Button variant="ghost" size="sm" onClick={onCancel}>
                Exit Demo
              </Button>
            )}
          </div>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto p-8">
        <div className="max-w-5xl mx-auto space-y-12">
          {/* Phase 1: Thinking */}
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

          {/* Phase 2: Coding */}
          {(phase === 'coding' || phase === 'deploying' || phase === 'preview') && (
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
                <div className="flex items-center gap-2 text-green-500 bg-green-500/10 px-3 py-1 rounded-full border border-green-500/20">
                  <CheckCircle className="w-4 h-4" />
                  <span className="text-xs font-bold uppercase tracking-wider">Production Ready</span>
                </div>
              </div>
              <LivePreview 
                appId={generatedAppId} 
                appName="Cha Chaan Teng LaoBan"
                onAccept={() => onComplete?.(generatedAppId)}
              />
            </section>
          )}
        </div>
      </main>
    </div>
  );
}

function cn(...inputs: any[]) {
  return inputs.filter(Boolean).join(' ');
}
