'use client';

import React, { useState, useRef, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { toast } from 'sonner';
import { NavigationRail, ContextPanel, ChatInput, ChatMessage, Button, StatusPanel, ThemeToggle, Logo, ParticleBackground, Card } from '@/components/ui';
import type { StatusMessage, StatusPhase } from '@/components/ui';
import { ImplementationPlan, CodeViewer, LivePreview, FreeformCreator, WelcomeScreen } from '@/components/scaffolder';
import { AgentStream } from '@/components/scaffolder/agent/AgentStream';
import { SimulationEvent } from '@/lib/demo/seed-data';
import type { ProjectSpec, ImplementationPlan as ImplementationPlanType } from '@/lib/scaffolder/types';
import type { GeneratedCode } from '@/lib/scaffolder/code-generator';
import { cn } from '@/lib/utils';
// V2 Components
import { ConversationalScaffolderV2 } from '@/components/scaffolder-v2';
import { Sparkles, Target, Rocket, Zap, Monitor, Cpu, GitBranch, Terminal, Layers } from 'lucide-react';

interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  metadata?: {
    phase?: string;
    options?: { id: string; label: string; description?: string }[];
    questionType?: 'single' | 'multiple';
    plan?: ImplementationPlanType;
  };
}

interface ConversationState {
  phase: string;
  questions?: { id: string; question: string; answered: boolean }[];
  spec?: ProjectSpec;
  plan?: ImplementationPlanType;
  allQuestionsAnswered?: boolean;
}

type CreateMode = 'guided' | 'v2' | 'demo';

function CreateContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [mode, setMode] = useState<CreateMode | null>(null);
  
  // Check for mode via query param
  const queryMode = searchParams.get('mode');
  const appId = searchParams.get('appId');
  const useV2 = searchParams.get('v2') === 'true' || 
                process.env.NEXT_PUBLIC_SCAFFOLDER_VERSION === 'v2';
  
  // If mode is specified in URL, use it
  useEffect(() => {
    if (queryMode === 'guided' || queryMode === 'v1') {
      setMode('guided');
    } else if (useV2 || queryMode === 'v2') {
      setMode('v2');
    } else if (queryMode === 'demo') {
      setMode('demo');
    } else if (appId) {
      // Default to guided mode if editing an app
      setMode('guided');
    }
  }, [queryMode, useV2, appId]);
  
  // Show mode selector if no mode is set
  if (!mode) {
    return <ModeSelector onSelect={setMode} />;
  }

  if (mode === 'demo') {
    return (
      <FreeformCreator 
        onComplete={(id, subdomain) => {
          if (subdomain) {
            window.location.href = `http://${subdomain}.localhost:3000`;
          } else {
            router.push(`/apps/${id}`);
          }
        }}
        onCancel={() => setMode(null)}
      />
    );
  }
  
  // Render advanced IDE landing page for v2 mode
  if (mode === 'v2') {
    return (
      <div className="h-screen bg-surface-base flex overflow-hidden">
        <div className="hidden md:block">
          <NavigationRail />
        </div>
        <div className="flex-1 flex flex-col min-w-0 relative">
          {/* Particle Background */}
          <div className="absolute inset-0 z-0">
            <ParticleBackground />
          </div>

          <header className="relative z-10 border-b border-outline-mid/50 bg-surface-base/80 backdrop-blur-md px-8 py-6">
            <div className="flex items-center justify-between max-w-7xl mx-auto">
              <div className="flex items-center gap-3">
                <Logo size="sm" />
                <div>
                  <h1 className="text-xl font-serif font-medium text-text-primary">
                    Cumulonimbus <span className="text-accent-yellow">IDE</span>
                  </h1>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <ThemeToggle />
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setMode(null)}
                >
                  Back to Create
                </Button>
              </div>
            </div>
          </header>

          <main className="relative z-10 flex-1 overflow-y-auto">
            <div className="max-w-7xl mx-auto px-6 py-20">
              {/* Hero Section */}
              <div className="text-center mb-24 animate-fade-in">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-accent-yellow/10 border border-accent-yellow/20 text-accent-yellow text-sm font-medium mb-6 animate-slide-down">
                  <Sparkles className="w-4 h-4" />
                  <span>Now in Private Beta</span>
                </div>
                <h1 className="text-5xl md:text-7xl font-serif font-medium text-text-primary mb-8 tracking-tight animate-slide-up">
                  Cumulonimbus <span className="text-accent-yellow">IDE</span>
                </h1>
                <p className="text-xl text-text-secondary max-w-2xl mx-auto leading-relaxed mb-10 animate-slide-up" style={{ animationDelay: '0.1s' }}>
                  The first integrated development environment built from the ground up for 
                  <span className="text-text-primary font-medium"> Agentic Workflows</span>.
                  Control the storm.
                </p>
                <div className="flex flex-col sm:flex-row items-center justify-center gap-4 animate-slide-up" style={{ animationDelay: '0.2s' }}>
                  <Button size="lg" className="h-14 px-8 text-lg gap-2 shadow-lg shadow-accent-yellow/20 w-full sm:w-auto">
                    <Monitor className="w-5 h-5" />
                    Download for macOS
                  </Button>
                  <Button variant="secondary" size="lg" className="h-14 px-8 text-lg w-full sm:w-auto">
                    Join Waitlist
                  </Button>
                </div>
                <p className="mt-6 text-sm text-text-tertiary animate-fade-in" style={{ animationDelay: '0.4s' }}>
                  v0.1.0 • Apple Silicon & Intel • Linux coming soon
                </p>
              </div>

              {/* Features Grid */}
              <div className="grid md:grid-cols-3 gap-6 mb-24 animate-slide-up" style={{ animationDelay: '0.3s' }}>
                <Card variant="outlined" className="p-8 bg-surface-elevated/50 backdrop-blur-sm border-outline-light/50 hover:border-accent-yellow/50 transition-colors group">
                  <div className="w-12 h-12 rounded-lg bg-surface-layer flex items-center justify-center mb-6 text-accent-yellow group-hover:scale-110 transition-transform">
                    <Layers className="w-6 h-6" />
                  </div>
                  <h3 className="text-xl font-serif font-medium text-text-primary mb-3">Agent Orchestration</h3>
                  <p className="text-text-secondary leading-relaxed">
                    Visualize and control multi-agent swarms directly in your editor. Intervene at any step of the generation process.
                  </p>
                </Card>
                <Card variant="outlined" className="p-8 bg-surface-elevated/50 backdrop-blur-sm border-outline-light/50 hover:border-accent-yellow/50 transition-colors group">
                  <div className="w-12 h-12 rounded-lg bg-surface-layer flex items-center justify-center mb-6 text-accent-yellow group-hover:scale-110 transition-transform">
                    <Cpu className="w-6 h-6" />
                  </div>
                  <h3 className="text-xl font-serif font-medium text-text-primary mb-3">Local-First Intelligence</h3>
                  <p className="text-text-secondary leading-relaxed">
                    Run small models locally for zero-latency autocomplete, while seamlessly offloading complex reasoning to the cloud.
                  </p>
                </Card>
                <Card variant="outlined" className="p-8 bg-surface-elevated/50 backdrop-blur-sm border-outline-light/50 hover:border-accent-yellow/50 transition-colors group">
                  <div className="w-12 h-12 rounded-lg bg-surface-layer flex items-center justify-center mb-6 text-accent-yellow group-hover:scale-110 transition-transform">
                    <GitBranch className="w-6 h-6" />
                  </div>
                  <h3 className="text-xl font-serif font-medium text-text-primary mb-3">Semantic Version Control</h3>
                  <p className="text-text-secondary leading-relaxed">
                    AI that understands your git history. Generate commit messages, PRs, and resolve merge conflicts with context.
                  </p>
                </Card>
              </div>

              {/* Preview/Mockup Section */}
              <div className="rounded-2xl border border-outline-mid bg-surface-elevated/30 backdrop-blur-sm overflow-hidden shadow-2xl mb-24 animate-slide-up" style={{ animationDelay: '0.4s' }}>
                <div className="border-b border-outline-light/30 bg-surface-elevated/50 px-4 py-3 flex items-center gap-2">
                   <div className="flex gap-1.5">
                     <div className="w-3 h-3 rounded-full bg-red-500/20 border border-red-500/50"></div>
                     <div className="w-3 h-3 rounded-full bg-yellow-500/20 border border-yellow-500/50"></div>
                     <div className="w-3 h-3 rounded-full bg-green-500/20 border border-green-500/50"></div>
                   </div>
                   <div className="ml-4 px-3 py-1 rounded bg-surface-layer/50 text-xs text-text-tertiary border border-outline-light/20 flex-1 max-w-md font-mono text-center">
                     cumulonimbus-ide — ~/projects/storm-tracker
                   </div>
                </div>
                <div className="aspect-[16/9] bg-surface-base/50 flex items-center justify-center relative group cursor-default">
                  <div className="absolute inset-0 bg-gradient-to-tr from-accent-yellow/5 via-transparent to-purple-500/5 opacity-50" />
                  <div className="text-center p-8 z-10">
                      <Terminal className="w-16 h-16 mx-auto mb-6 text-text-tertiary opacity-50" />
                      <h4 className="text-lg font-medium text-text-secondary mb-2">Interactive Preview</h4>
                      <p className="text-text-tertiary text-sm">Experience the future of coding in your browser soon.</p>
                  </div>
                </div>
              </div>
            </div>
          </main>
        </div>
      </div>
    );
  }
  
  // V1 scaffolder (existing implementation)
  return <CreatePageV1 onModeChange={() => setMode(null)} appId={appId} />;
}

function ModeSelector({ onSelect }: { onSelect: (mode: CreateMode) => void }) {
  return (
    <div className="h-screen bg-surface-base flex">
      <div className="hidden md:block">
        <NavigationRail />
      </div>
      <div className="flex-1 flex flex-col items-center justify-center p-8">
        <div className="absolute top-4 right-4">
          <ThemeToggle />
        </div>

        <h1 className="text-4xl font-serif font-medium text-text-primary mb-4 text-center">
          Create Your App
        </h1>
        <p className="text-text-secondary text-center max-w-lg mb-12">
          Choose the best way to bring your vision to life.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-6xl w-full">
          {/* Freeform Demo Mode */}
          <button
            onClick={() => onSelect('demo')}
            className="p-6 bg-surface-elevated/50 border border-accent-yellow/30 rounded-xl text-left hover:border-accent-yellow hover:bg-surface-elevated transition-all group relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 p-2">
              <div className="bg-accent-yellow text-black text-[10px] font-bold px-2 py-0.5 rounded-bl-lg uppercase tracking-tighter">Demo</div>
            </div>
            <div className="mb-4">
              <Sparkles className="w-8 h-8 text-accent-yellow" />
            </div>
            <h3 className="text-2xl font-medium font-serif text-text-primary mb-2">Freeform</h3>
            <p className="text-sm text-text-secondary">
              Describe your idea and watch the AI build it in real-time. A hands-free experience for rapid prototyping.
            </p>
            <div className="mt-4 text-xs text-text-tertiary group-hover:text-text-secondary">
              Best for: Fast experimentation, rapid prototyping
            </div>
          </button>

          {/* Guided Mode */}
          <button
            onClick={() => onSelect('guided')}
            className="p-6 bg-surface-elevated/50 border border-outline-light rounded-xl text-left hover:border-outline-mid hover:bg-surface-elevated transition-all group"
          >
            <div className="mb-4">
              <Target className="w-8 h-8 text-accent-yellow" />
            </div>
            <h3 className="text-2xl font-medium font-serif text-text-primary mb-2">Guided</h3>
            <p className="text-sm text-text-secondary">
              Step-by-step conversation to refine your requirements. More control over the final result.
            </p>
            <div className="mt-4 text-xs text-text-tertiary group-hover:text-text-secondary">
              Best for: Specific requirements, data-heavy apps
            </div>
          </button>

          {/* V2 Conversational Mode */}
          <button
            onClick={() => onSelect('v2')}
            className="p-6 bg-surface-elevated/50 border border-outline-light rounded-xl text-left hover:border-outline-mid hover:bg-surface-elevated transition-all group"
          >
            <div className="mb-4">
              <Rocket className="w-8 h-8 text-accent-yellow" />
            </div>
            <h3 className="text-2xl font-medium font-serif text-text-primary mb-2">Advanced</h3>
            <p className="text-sm text-text-secondary">
              Download the native desktop IDE for advanced multi-agent workflows and local development.
            </p>
            <div className="mt-4 text-xs text-text-tertiary group-hover:text-text-secondary">
              Best for: Professional developers, complex projects
            </div>
          </button>
        </div>
      </div>
    </div>
  );
}

function CreatePageV1({ onModeChange, appId }: { onModeChange?: () => void; appId?: string | null }) {
  const router = useRouter();
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [state, setState] = useState<ConversationState | null>(null);
  const [selectedOptions, setSelectedOptions] = useState<string[]>([]);
  const [currentQuestionId, setCurrentQuestionId] = useState<string | null>(null);
  const [contextPanelOpen, setContextPanelOpen] = useState(false);
  const [statusMessages, setStatusMessages] = useState<StatusMessage[]>([]);
  const [simulationEvents, setSimulationEvents] = useState<SimulationEvent[]>([]);
  const [currentPhase, setCurrentPhase] = useState<StatusPhase | undefined>();
  const [showTechnicalDetails, setShowTechnicalDetails] = useState(false);
  // Build phase state
  const [buildPhase, setBuildPhase] = useState<'idle' | 'generating' | 'preview' | 'complete'>('idle');
  const [generatedAppId, setGeneratedAppId] = useState<string | null>(null);
  const [generatedSubdomain, setGeneratedSubdomain] = useState<string | null>(null);
  const [generatedCode, setGeneratedCode] = useState<GeneratedCode | null>(null);
  const [showCodeView, setShowCodeView] = useState(false);
  const [showIssueDialog, setShowIssueDialog] = useState(false);
  const [issueDescription, setIssueDescription] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const eventSourceRef = useRef<EventSource | null>(null);
  const currentStreamIdRef = useRef<string | null>(null); // Track current stream ID

  // Connect to SSE for status updates - returns promise that resolves when connected
  // Includes retry logic with exponential backoff
  const connectToStatusStream = React.useCallback((convId: string, maxRetries = 3): Promise<void> => {
    return new Promise((resolve) => {
      let retryCount = 0;
      let resolved = false;

      const attemptConnection = () => {
        // If already connected to this ID, don't reconnect
        if (currentStreamIdRef.current === convId && eventSourceRef.current?.readyState === EventSource.OPEN) {
          console.log(`📡 SSE already connected to ${convId}`);
          if (!resolved) {
            resolved = true;
            resolve();
          }
          return;
        }

        // Close existing connection
        if (eventSourceRef.current) {
          eventSourceRef.current.close();
          eventSourceRef.current = null;
        }

        console.log(`📡 Connecting to SSE: ${convId} (attempt ${retryCount + 1}/${maxRetries})`);
        currentStreamIdRef.current = convId;
        const eventSource = new EventSource(`/api/scaffolder/status/${convId}`);
        eventSourceRef.current = eventSource;

        // Set timeout for this connection attempt
        const connectionTimeout = setTimeout(() => {
          if (resolved) return;
          
          console.log(`⚠️ SSE connection timeout for ${convId}`);
          eventSource.close();
          
          // Retry with exponential backoff
          if (retryCount < maxRetries - 1) {
            retryCount++;
            const delay = 100 * Math.pow(2, retryCount);
            console.log(`🔄 Retrying SSE connection in ${delay}ms...`);
            setTimeout(attemptConnection, delay);
          } else {
            console.log(`❌ Max SSE connection retries reached, proceeding without SSE`);
            eventSourceRef.current = null;
            currentStreamIdRef.current = null;
            resolved = true;
            resolve();
          }
        }, 2000);

        eventSource.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);

            // Check if this is the initial connection confirmation
            if (data.type === 'connected') {
              console.log(`✅ SSE connected: ${convId}`);
              clearTimeout(connectionTimeout);
              if (!resolved) {
                resolved = true;
                resolve();
              }
              return;
            }

            // Handle simulation events (Agent Stream)
            if (data.type === 'simulation_event') {
               const event: SimulationEvent = data.payload;

               setSimulationEvents(prev => [...prev, event]);

               // If code generation starts, switch view (finalize will be auto-triggered by useEffect)
               if (event.type === 'code_generation') {
                 setBuildPhase('generating');
                 // Don't clear events, we want to keep history
               }
               return;
            }

            // Handle status messages (Legacy / Fallback)
            const statusMessage: StatusMessage = data;
            if (statusMessage.phase) {
              console.log(`📥 SSE status: ${statusMessage.phase} - ${statusMessage.message}`);
              setStatusMessages(prev => [...prev, statusMessage]);
              setCurrentPhase(statusMessage.phase as StatusPhase);
            }
          } catch (error) {
            console.error('Failed to parse SSE message:', error);
          }
        };

        eventSource.onerror = (error) => {
          console.error('SSE connection error:', error);
          clearTimeout(connectionTimeout);
          eventSource.close();
          
          // Retry on error if we haven't resolved yet
          if (!resolved && retryCount < maxRetries - 1) {
            retryCount++;
            const delay = 100 * Math.pow(2, retryCount);
            console.log(`🔄 Retrying SSE connection after error in ${delay}ms...`);
            eventSourceRef.current = null;
            currentStreamIdRef.current = null;
            setTimeout(attemptConnection, delay);
          } else if (!resolved) {
            console.log(`❌ SSE connection failed after ${retryCount + 1} attempts`);
            eventSourceRef.current = null;
            currentStreamIdRef.current = null;
            resolved = true;
            resolve();
          }
        };
      };

      attemptConnection();
    });
  }, []);

  // Load existing conversation if appId is present
  useEffect(() => {
    if (appId && !conversationId) {
      const loadConversation = async () => {
        setIsLoading(true);
        try {
          // Attempt to load conversation for this app
          const response = await fetch('/api/scaffolder', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              action: 'load',
              appId,
            }),
          });
          
          if (response.ok) {
            const data = await response.json();
            if (data.conversationId) {
              setConversationId(data.conversationId);
              setMessages(data.messages || []);
              setState(data.state);
              
              if (data.state?.phase === 'plan' || data.state?.phase === 'complete') {
                setCurrentPhase('plan');
              }
              
              // Reconnect SSE
              connectToStatusStream(data.conversationId);
            }
          }
        } catch (error) {
          console.error('Failed to load conversation:', error);
          toast.error('Failed to load previous session');
        } finally {
          setIsLoading(false);
        }
      };
      
      loadConversation();
    }
  }, [appId, conversationId, connectToStatusStream]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Reconnect SSE when conversation ID changes
  useEffect(() => {
    if (conversationId && conversationId !== currentStreamIdRef.current) {
      console.log(`🔄 Conversation ID changed, reconnecting SSE to: ${conversationId}`);
      connectToStatusStream(conversationId).catch(error => {
        console.error('Failed to reconnect SSE:', error);
      });
    }
  }, [conversationId, connectToStatusStream]);

  // Cleanup SSE connection on unmount
  useEffect(() => {
    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
    };
  }, []);

  const handleSubmit = async (message: string) => {
    setIsLoading(true);
    setStatusMessages([]);
    setSimulationEvents([]); // Clear previous stream
    setCurrentPhase('parse');

    // Add user message to UI
    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: message,
    };
    setMessages(prev => [...prev, userMessage]);

    // Generate a temporary ID for status tracking during initialization
    const tempId = `temp-${Date.now()}`;
    
    try {
      // Connect to SSE and WAIT for connection to be ready
      console.log(`🚀 Starting app creation with tempId: ${tempId}`);
      await connectToStatusStream(tempId);
      console.log(`📤 SSE ready, sending POST request`);

      const response = await fetch('/api/scaffolder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'start',
          message,
          tempConversationId: tempId,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        const newConversationId = data.conversationId;
        setConversationId(newConversationId);
        setState(data.state);

        // Reconnect SSE to the real conversation ID
        console.log(`🔄 Switching SSE from temp ID to conversation ID: ${newConversationId}`);
        await connectToStatusStream(newConversationId);

        // Add assistant messages
        const assistantMessages = data.messages.filter((m: Message) => m.role !== 'system');
        setMessages(prev => [...prev, ...assistantMessages]);

        // Set current question ID for answer handling
        if (data.state?.questions?.length > 0) {
          const unanswered = data.state.questions.find((q: { answered: boolean }) => !q.answered);
          if (unanswered) {
            setCurrentQuestionId(unanswered.id);
          }
        }
      } else {
        setMessages(prev => [...prev, {
          id: Date.now().toString(),
          role: 'assistant',
          content: `Sorry, something went wrong: ${data.error}`,
        }]);
      }
    } catch (error) {
      console.error('Error:', error);
      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        role: 'assistant',
        content: 'Sorry, something went wrong. Please try again.',
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleOptionSelect = async (option: { id: string; label: string }) => {
    if (!conversationId || !currentQuestionId || isLoading) return;

    const lastMessage = messages[messages.length - 1];
    const isMultiple = lastMessage?.metadata?.questionType === 'multiple';

    if (isMultiple) {
      // Toggle selection for multiple choice
      setSelectedOptions(prev =>
        prev.includes(option.id)
          ? prev.filter(id => id !== option.id)
          : [...prev, option.id]
      );
    } else {
      // Single choice - submit immediately
      await submitAnswer([option.id]);
    }
  };

  const submitAnswer = async (answer: string[]) => {
    if (!conversationId || !currentQuestionId || isLoading) return;

    console.log(`📝 submitAnswer:`);
    console.log(`   conversationId: ${conversationId}`);
    console.log(`   currentQuestionId: ${currentQuestionId}`);
    console.log(`   answer: ${JSON.stringify(answer)}`);
    console.log(`   state questions: ${state?.questions?.map(q => `${q.id}(${q.answered})`).join(', ')}`);

    setIsLoading(true);
    setSelectedOptions([]);

    // Add user response to UI
    const answerLabels = answer.map(id => {
      const lastMessage = messages[messages.length - 1];
      const option = lastMessage?.metadata?.options?.find(o => o.id === id);
      return option?.label || id;
    });

    setMessages(prev => [...prev, {
      id: Date.now().toString(),
      role: 'user',
      content: answerLabels.join(', '),
    }]);

    try {
      const response = await fetch('/api/scaffolder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'answer',
          conversationId,
          questionId: currentQuestionId,
          answer,
        }),
      });
      
      console.log(`📤 Answer submitted for question: ${currentQuestionId}`);

      const data = await response.json();

      if (response.ok) {
        console.log(`✅ Answer recorded successfully`);
        console.log(`   Response state phase: ${data.state?.phase}`);
        console.log(`   Response answers: ${JSON.stringify(data.state?.answers || {})}`);
        
        setState(data.state);

        // Add new assistant messages
        const newMessages = data.messages.filter(
          (m: Message) => m.role !== 'system' && !messages.some(existing => existing.id === m.id)
        );
        setMessages(prev => [...prev, ...newMessages]);

        // Update current question
        if (data.state?.questions) {
          const unanswered = data.state.questions.find((q: { answered: boolean; id: string }) => !q.answered);
          console.log(`⏭️ Next question ID: ${unanswered?.id || 'NONE - all answered'}`);
          setCurrentQuestionId(unanswered?.id || null);
        }
      } else {
        console.error(`❌ Answer submission failed:`, data.error);
      }
    } catch (error) {
      console.error('Error submitting answer:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFinalize = React.useCallback(async () => {
    console.log('🎯 handleFinalize called', { conversationId, isLoading, isAgentStreaming, buildPhase });

    if (!conversationId || isLoading) return;

    setIsLoading(true);
    setCurrentPhase('build');
    setStatusMessages([]);
    setBuildPhase('generating');

    // Ensure we're connected to the right conversation for status updates
    console.log(`🏗️ Finalizing app, connecting to conversation: ${conversationId}`);
    await connectToStatusStream(conversationId);

    // Add execution message
    setMessages(prev => [...prev, {
      id: Date.now().toString(),
      role: 'assistant',
      content: 'Building your app... This may take a moment.',
      metadata: { phase: 'executing' },
    }]);

    try {
      const response = await fetch('/api/scaffolder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'finalize',
          conversationId,
        }),
      });

      const data = await response.json();

      if (response.ok && data.app) {
        setCurrentPhase('complete');
        setGeneratedAppId(data.app.id);
        setGeneratedSubdomain(data.app.subdomain);

        // Store generated code if available
        if (data.generatedCode) {
          setGeneratedCode(data.generatedCode);
        }

        // Update message
        setMessages(prev => [...prev.slice(0, -1), {
          id: Date.now().toString(),
          role: 'assistant',
          content: `🎉 Your **${data.app.name}** has been generated! Review the preview below.`,
        }]);

        // Move to preview phase
        setBuildPhase('preview');

      } else {
        setBuildPhase('idle');
        setMessages(prev => [...prev.slice(0, -1), {
          id: Date.now().toString(),
          role: 'assistant',
          content: `Sorry, there was an error creating your app: ${data.error}`,
        }]);

      }
    } catch (error) {
      console.error('Error:', error);
      setBuildPhase('idle');

    } finally {
      setIsLoading(false);

    }
  }, [conversationId, isLoading, isAgentStreaming, buildPhase, connectToStatusStream]);

  const handleCodeGenComplete = (code: GeneratedCode) => {
    console.log('Code generation complete:', code.pageComponent.length, 'chars');
    setGeneratedCode(code);
  };

  const handleReportIssue = () => {
    setShowIssueDialog(true);
  };

  const handleRegenerateWithIssues = async () => {
    if (!generatedAppId || !issueDescription.trim()) return;

    setShowIssueDialog(false);
    setIsLoading(true);
    setBuildPhase('generating');
    setStatusMessages([]);

    try {
      const response = await fetch('/api/scaffolder/regenerate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          appId: generatedAppId,
          issues: issueDescription,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setGeneratedCode(data.generatedCode);
        setBuildPhase('preview');
        setMessages(prev => [...prev, {
          id: Date.now().toString(),
          role: 'assistant',
          content: '✅ App has been regenerated with your fixes. Please review the preview.',
        }]);
      } else {
        setMessages(prev => [...prev, {
          id: Date.now().toString(),
          role: 'assistant',
          content: `Failed to regenerate: ${data.error}`,
        }]);
      }
    } catch (error) {
      console.error('Regeneration error:', error);
    } finally {
      setIsLoading(false);
      setIssueDescription('');
    }
  };

  const handleAcceptApp = () => {
    if (generatedAppId) {
      // Close SSE connection
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
      
      if (generatedSubdomain) {
        window.location.href = `http://${generatedSubdomain}.localhost:3000`;
      } else {
        router.push(`/apps/${generatedAppId}`);
      }
    }
  };

  const lastMessage = messages[messages.length - 1];
  const showOptions = lastMessage?.metadata?.options && !isLoading;
  // Show finalize when in picture or plan phase with all questions answered
  const showFinalize = (state?.phase === 'picture' || state?.phase === 'plan') && state?.allQuestionsAnswered;
  // Get plan from state or from message metadata
  const currentPlan = state?.plan || messages.find(m => m.metadata?.plan)?.metadata?.plan;

  // Check if we are in simulation mode (Agent Stream active)
  const isAgentStreaming = simulationEvents.length > 0;

  // Auto-trigger finalize when in agent streaming mode and buildPhase becomes generating
  React.useEffect(() => {
    console.log('🔍 useEffect check:', { isAgentStreaming, buildPhase, isLoading, conversationId });

    if (isAgentStreaming && buildPhase === 'generating') {
      console.log('🎯 Auto-triggering finalize for agent streaming mode');

      handleFinalize();
    }
  }, [isAgentStreaming, buildPhase, conversationId, handleFinalize, isLoading]);

  return (
    <div className="h-screen bg-surface-base flex">
      {/* Navigation Rail - Hidden on mobile, shown on desktop */}
      <div className="hidden md:block">
        <NavigationRail />
      </div>

      {/* Context Panel Overlay */}
      <ContextPanel
        isOpen={contextPanelOpen}
        onClose={() => setContextPanelOpen(false)}
      />

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <header className="border-b border-outline-mid bg-surface-base px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-serif font-medium text-text-primary">Create</h1>
              <p className="text-sm text-text-secondary mt-1">Guided Mode</p>
            </div>
            <div className="flex gap-2">
              <ThemeToggle />
              {onModeChange && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onModeChange}
                >
                  Change Mode
                </Button>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setContextPanelOpen(true)}
              >
                Context
              </Button>
            </div>
          </div>
        </header>

        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-4xl mx-auto p-8">
            {messages.length === 0 ? (
              <WelcomeScreen onSelect={handleSubmit} />
            ) : (
              <div className="space-y-6">

                {/* Standard Chat History */}
                {!isAgentStreaming && messages.map((message) => (
                  <ChatMessage key={message.id} message={message} />
                ))}

                {/* Legacy Status Panel (Only show if NOT streaming new agent events) */}
                {statusMessages.length > 0 && !isAgentStreaming && (isLoading || currentPhase === 'plan') && buildPhase !== 'generating' && (
                  <StatusPanel
                    messages={statusMessages}
                    currentPhase={currentPhase}
                    showTechnicalDetails={showTechnicalDetails}
                    onToggleTechnical={setShowTechnicalDetails}
                  />
                )}

                {/* NEW Agent Stream UI */}
                {isAgentStreaming && (
                  <div className="animate-fade-in">
                    {/* Show user message first if it exists */}
                    {messages.filter(m => m.role === 'user').map(m => (
                       <ChatMessage key={m.id} message={m} />
                    ))}

                    <div className="my-6">
                      <AgentStream
                        events={simulationEvents}
                        isComplete={buildPhase === 'preview' || buildPhase === 'complete'}
                      />
                    </div>
                  </div>
                )}

                {/* Options */}
                {showOptions && !isAgentStreaming && (
                  <div className="space-y-2 animate-slide-up">
                    {lastMessage.metadata!.options!.map((option) => (
                      <button
                        key={option.id}
                        onClick={() => handleOptionSelect(option)}
                        className={cn(
                          "w-full p-4 rounded-xl border-2 text-left transition-all bg-surface-elevated border-outline-light hover:border-accent-yellow text-text-primary",
                          selectedOptions.includes(option.id) && "border-pastel-yellow bg-pastel-yellow/10 text-black"
                        )}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="font-medium">{option.label}</div>
                            {option.description && (
                              <div className="text-sm text-text-secondary">{option.description}</div>
                            )}
                          </div>
                        </div>
                      </button>
                    ))}

                    {/* Submit button for multiple choice */}
                    {lastMessage.metadata?.questionType === 'multiple' && selectedOptions.length > 0 && (
                      <Button
                        onClick={() => submitAnswer(selectedOptions)}
                        className="w-full mt-4"
                      >
                        Continue
                      </Button>
                    )}
                  </div>
                )}

                {/* Implementation Plan Display */}
                {currentPlan && !isLoading && buildPhase === 'idle' && !isAgentStreaming && (
                  <div className="animate-slide-up">
                    <ImplementationPlan plan={currentPlan} className="mb-6" />
                  </div>
                )}

                {/* Build Button - Show after plan is displayed */}
                {showFinalize && buildPhase === 'idle' && !isLoading && !isAgentStreaming && (
                  <div className="animate-slide-up">
                    <Button
                      onClick={handleFinalize}
                      size="lg"
                      className="w-full gap-2"
                    >
                      <Zap className="w-4 h-4" />
                      Build My App
                    </Button>
                  </div>
                )}

                {/* Code Generation Phase */}
                {buildPhase === 'generating' && conversationId && (
                  <div className="animate-slide-up space-y-4 border-t border-outline-light pt-6 mt-6">
                    <div className="flex items-center justify-between">
                       <h3 className="text-lg font-medium text-text-primary">Generating Application Code</h3>
                       {/* Toggle between status and code view */}
                        <div className="flex gap-2">
                          <Button 
                            onClick={() => setShowCodeView(false)} 
                            variant={!showCodeView ? 'primary' : 'ghost'}
                            size="sm"
                          >
                            Status View
                          </Button>
                          <Button 
                            onClick={() => setShowCodeView(true)} 
                            variant={showCodeView ? 'primary' : 'ghost'}
                            size="sm"
                          >
                            Code View
                          </Button>
                        </div>
                    </div>
                    
                    {showCodeView ? (
                      <CodeViewer 
                        conversationId={conversationId}
                        onComplete={handleCodeGenComplete}
                      />
                    ) : (
                      <div className="p-4 bg-surface-elevated rounded-xl border border-outline-light">
                         <div className="flex items-center gap-3">
                            <div className="animate-spin text-xl">⚙️</div>
                            <div className="text-text-secondary">Writing components and resolving dependencies...</div>
                         </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Live Preview Phase */}
                {buildPhase === 'preview' && generatedAppId && (
                  <div className="animate-slide-up mt-8">
                    <LivePreview
                      appId={generatedAppId}
                      subdomain={generatedSubdomain || undefined}
                      appName={state?.spec?.name || 'Your App'}
                      onReportIssue={handleReportIssue}
                      onAccept={handleAcceptApp}
                    />
                  </div>
                )}

                {/* Issue Reporting Dialog */}
                {showIssueDialog && (
                  <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
                    <div className="bg-surface-base border border-outline-mid rounded-xl max-w-lg w-full p-6">
                      <h3 className="text-lg font-semibold text-text-primary mb-4">
                        Report Issues
                      </h3>
                      <p className="text-text-secondary text-sm mb-4">
                        Describe what&apos;s wrong with the generated app. We&apos;ll regenerate it with your feedback.
                      </p>
                      <textarea
                        value={issueDescription}
                        onChange={(e) => setIssueDescription(e.target.value)}
                        placeholder="e.g., The date picker isn't working correctly, the table columns are in the wrong order..."
                        className="w-full px-4 py-3 bg-surface-elevated border border-outline-light rounded-lg text-text-primary placeholder:text-text-secondary focus:outline-none focus:border-accent-yellow resize-none h-32"
                      />
                      <div className="flex justify-end gap-3 mt-4">
                        <Button
                          variant="ghost"
                          onClick={() => {
                            setShowIssueDialog(false);
                            setIssueDescription('');
                          }}
                        >
                          Cancel
                        </Button>
                        <Button
                          onClick={handleRegenerateWithIssues}
                          disabled={!issueDescription.trim()}
                        >
                          Regenerate
                        </Button>
                      </div>
                    </div>
                  </div>
                )}

                <div ref={messagesEndRef} />
              </div>
            )}
          </div>
        </div>

        {/* Chat Input */}
        <ChatInput
          onSubmit={handleSubmit}
          disabled={isLoading}
          isThinking={isLoading}
          placeholder={messages.length === 0 ? "Describe the app you want to build..." : "Describe, instruct, or question..."}
        />
      </div>
    </div>
  );
}

export default function CreatePage() {
  return (
    <Suspense fallback={<div className="flex h-screen items-center justify-center">Loading...</div>}>
      <CreateContent />
    </Suspense>
  );
}
