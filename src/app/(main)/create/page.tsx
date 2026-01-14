'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { NavigationRail, ContextPanel, ChatInput, ChatMessage, Button, StatusPanel } from '@/components/ui';
import type { StatusMessage, StatusPhase } from '@/components/ui';
import { ImplementationPlan, CodeViewer, LivePreview, FreeformCreator } from '@/components/scaffolder';
import type { ProjectSpec, ImplementationPlan as ImplementationPlanType } from '@/lib/scaffolder/types';
import type { GeneratedCode } from '@/lib/scaffolder/code-generator';
import { cn } from '@/lib/utils';
// V2 Components
import { ConversationalScaffolderV2 } from '@/components/scaffolder-v2';

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

type CreateMode = 'guided' | 'freeform' | 'v2';

export default function CreatePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [mode, setMode] = useState<CreateMode | null>(null);
  
  // Check for mode via query param
  const queryMode = searchParams.get('mode');
  const useV2 = searchParams.get('v2') === 'true' || 
                process.env.NEXT_PUBLIC_SCAFFOLDER_VERSION === 'v2';
  
  // If mode is specified in URL, use it
  useEffect(() => {
    if (queryMode === 'freeform') {
      setMode('freeform');
    } else if (queryMode === 'guided' || queryMode === 'v1') {
      setMode('guided');
    } else if (useV2 || queryMode === 'v2') {
      setMode('v2');
    }
  }, [queryMode, useV2]);
  
  // Show mode selector if no mode is set
  if (!mode) {
    return <ModeSelector onSelect={setMode} />;
  }
  
  // Render freeform creator
  if (mode === 'freeform') {
    return (
      <div className="h-screen bg-black flex">
        <div className="hidden md:block">
          <NavigationRail />
        </div>
        <div className="flex-1 flex flex-col min-w-0">
          <header className="border-b border-outline-mid bg-surface-dark px-8 py-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-serif font-medium text-white">Create</h1>
                <p className="text-sm text-gray-400 mt-1">Freeform AI Generation</p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setMode(null)}
              >
                Change Mode
              </Button>
            </div>
          </header>
          <div className="flex-1 overflow-y-auto p-8">
            <FreeformCreator className="max-w-4xl mx-auto" />
          </div>
        </div>
      </div>
    );
  }
  
  // Render v2 scaffolder if enabled
  if (mode === 'v2') {
    return <ConversationalScaffolderV2 className="h-screen" />;
  }
  
  // V1 scaffolder (existing implementation)
  return <CreatePageV1 onModeChange={() => setMode(null)} />;
}

function ModeSelector({ onSelect }: { onSelect: (mode: CreateMode) => void }) {
  return (
    <div className="h-screen bg-black flex">
      <div className="hidden md:block">
        <NavigationRail />
      </div>
      <div className="flex-1 flex flex-col items-center justify-center p-8">
        <h1 className="text-4xl font-serif font-medium text-white mb-4">
          Create Your App
        </h1>
        <p className="text-gray-400 text-center max-w-lg mb-12">
          Choose how you&apos;d like to build your app
        </p>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl w-full">
          {/* Freeform Mode */}
          <button
            onClick={() => onSelect('freeform')}
            className="p-6 bg-gradient-to-br from-purple-900/50 to-pink-900/50 border border-purple-500/30 rounded-xl text-left hover:border-purple-500/60 transition-all group"
          >
            <div className="text-3xl mb-4">✨</div>
            <h3 className="text-lg font-semibold text-white mb-2">Freeform</h3>
            <p className="text-sm text-gray-400">
              Describe your app and let AI generate everything. Complete creative freedom with instant preview.
            </p>
            <div className="mt-4 text-xs text-purple-400 group-hover:text-purple-300">
              Best for: Quick prototypes, creative ideas
            </div>
          </button>
          
          {/* Guided Mode */}
          <button
            onClick={() => onSelect('guided')}
            className="p-6 bg-gray-800/50 border border-gray-700 rounded-xl text-left hover:border-gray-600 transition-all group"
          >
            <div className="text-3xl mb-4">🎯</div>
            <h3 className="text-lg font-semibold text-white mb-2">Guided</h3>
            <p className="text-sm text-gray-400">
              Step-by-step conversation to refine your requirements. More control over the final result.
            </p>
            <div className="mt-4 text-xs text-gray-500 group-hover:text-gray-400">
              Best for: Specific requirements, data-heavy apps
            </div>
          </button>
          
          {/* V2 Conversational Mode */}
          <button
            onClick={() => onSelect('v2')}
            className="p-6 bg-gradient-to-br from-red-900/50 to-orange-900/50 border border-red-500/30 rounded-xl text-left hover:border-red-500/60 transition-all group"
          >
            <div className="text-3xl mb-4">🚀</div>
            <h3 className="text-lg font-semibold text-white mb-2">Advanced</h3>
            <p className="text-sm text-gray-400">
              Multi-agent system with schema design, layout proposals, and iterative refinement.
            </p>
            <div className="mt-4 text-xs text-red-400 group-hover:text-red-300">
              Best for: Complex apps, custom layouts
            </div>
          </button>
        </div>
      </div>
    </div>
  );
}

function CreatePageV1({ onModeChange }: { onModeChange?: () => void }) {
  const router = useRouter();
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [state, setState] = useState<ConversationState | null>(null);
  const [selectedOptions, setSelectedOptions] = useState<string[]>([]);
  const [currentQuestionId, setCurrentQuestionId] = useState<string | null>(null);
  const [contextPanelOpen, setContextPanelOpen] = useState(false);
  const [statusMessages, setStatusMessages] = useState<StatusMessage[]>([]);
  const [currentPhase, setCurrentPhase] = useState<StatusPhase | undefined>();
  const [showTechnicalDetails, setShowTechnicalDetails] = useState(false);
  // Build phase state
  const [buildPhase, setBuildPhase] = useState<'idle' | 'generating' | 'preview' | 'complete'>('idle');
  const [generatedAppId, setGeneratedAppId] = useState<string | null>(null);
  const [generatedCode, setGeneratedCode] = useState<GeneratedCode | null>(null);
  const [showCodeView, setShowCodeView] = useState(false);
  const [showIssueDialog, setShowIssueDialog] = useState(false);
  const [issueDescription, setIssueDescription] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const eventSourceRef = useRef<EventSource | null>(null);
  const currentStreamIdRef = useRef<string | null>(null); // Track current stream ID

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
  }, [conversationId]);

  // Cleanup SSE connection on unmount
  useEffect(() => {
    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
    };
  }, []);

  // Connect to SSE for status updates - returns promise that resolves when connected
  // Includes retry logic with exponential backoff
  const connectToStatusStream = (convId: string, maxRetries = 3): Promise<void> => {
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
              console.log(`✅ SSE connected: ${convId}${data.bufferedCount > 0 ? ` (${data.bufferedCount} buffered messages)` : ''}`);
              clearTimeout(connectionTimeout);
              if (!resolved) {
                resolved = true;
                resolve();
              }
              return;
            }

            // Handle status messages
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
  };

  const handleSubmit = async (message: string) => {
    setIsLoading(true);
    setStatusMessages([]);
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

  const handleFinalize = async () => {
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
  };

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
      router.push(`/apps/${generatedAppId}`);
    }
  };

  const lastMessage = messages[messages.length - 1];
  const showOptions = lastMessage?.metadata?.options && !isLoading;
  // Show finalize when in picture or plan phase with all questions answered
  const showFinalize = (state?.phase === 'picture' || state?.phase === 'plan') && state?.allQuestionsAnswered;
  // Get plan from state or from message metadata
  const currentPlan = state?.plan || messages.find(m => m.metadata?.plan)?.metadata?.plan;

  return (
    <div className="h-screen bg-black flex">
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
        <header className="border-b border-outline-mid bg-surface-dark px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-serif font-medium text-white">Create</h1>
              <p className="text-sm text-gray-400 mt-1">Guided Mode</p>
            </div>
            <div className="flex gap-2">
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
              <WelcomeScreen />
            ) : (
              <div className="space-y-6">
                {/* Status Panel - Show during loading (except during code generation which has its own) */}
                {statusMessages.length > 0 && (isLoading || currentPhase === 'plan') && buildPhase !== 'generating' && (
                  <StatusPanel
                    messages={statusMessages}
                    currentPhase={currentPhase}
                    showTechnicalDetails={showTechnicalDetails}
                    onToggleTechnical={setShowTechnicalDetails}
                  />
                )}

                {messages.map((message) => (
                  <ChatMessage key={message.id} message={message} />
                ))}

                {/* Options */}
                {showOptions && (
                  <div className="space-y-2 animate-slide-up">
                    {lastMessage.metadata!.options!.map((option) => (
                      <button
                        key={option.id}
                        onClick={() => handleOptionSelect(option)}
                        className={cn(
                          "w-full p-4 rounded-xl border-2 text-left transition-all bg-surface-light border-outline-light hover:border-accent-red text-white",
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
                {currentPlan && !isLoading && buildPhase === 'idle' && (
                  <div className="animate-slide-up">
                    <ImplementationPlan plan={currentPlan} className="mb-6" />
                  </div>
                )}

                {/* Build Button - Show after plan is displayed */}
                {showFinalize && buildPhase === 'idle' && !isLoading && (
                  <div className="animate-slide-up">
                    <Button
                      onClick={handleFinalize}
                      size="lg"
                      className="w-full"
                    >
                      ⚡ Build My App
                    </Button>
                  </div>
                )}

                {/* Code Generation Phase */}
                {buildPhase === 'generating' && conversationId && (
                  <div className="animate-slide-up space-y-4">
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
                    
                    {showCodeView ? (
                      <CodeViewer 
                        conversationId={conversationId}
                        onComplete={handleCodeGenComplete}
                      />
                    ) : (
                      <StatusPanel
                        messages={statusMessages}
                        currentPhase={currentPhase}
                        showTechnicalDetails={showTechnicalDetails}
                        onToggleTechnical={setShowTechnicalDetails}
                      />
                    )}
                  </div>
                )}

                {/* Live Preview Phase */}
                {buildPhase === 'preview' && generatedAppId && (
                  <div className="animate-slide-up">
                    <LivePreview
                      appId={generatedAppId}
                      appName={state?.spec?.name || 'Your App'}
                      onReportIssue={handleReportIssue}
                      onAccept={handleAcceptApp}
                    />
                  </div>
                )}

                {/* Issue Reporting Dialog */}
                {showIssueDialog && (
                  <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
                    <div className="bg-surface-dark border border-outline-mid rounded-xl max-w-lg w-full p-6">
                      <h3 className="text-lg font-semibold text-white mb-4">
                        Report Issues
                      </h3>
                      <p className="text-text-secondary text-sm mb-4">
                        Describe what&apos;s wrong with the generated app. We&apos;ll regenerate it with your feedback.
                      </p>
                      <textarea
                        value={issueDescription}
                        onChange={(e) => setIssueDescription(e.target.value)}
                        placeholder="e.g., The date picker isn't working correctly, the table columns are in the wrong order..."
                        className="w-full px-4 py-3 bg-surface-light border border-outline-light rounded-lg text-white placeholder:text-text-secondary focus:outline-none focus:border-accent-red resize-none h-32"
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

function WelcomeScreen() {
  return (
    <div className="text-center py-16 animate-fade-in">
      <h2 className="text-3xl font-serif font-medium text-white mb-4">
        What would you like to <span className="bg-accent-red px-2 py-1">create</span>?
      </h2>
        <p className="text-text-secondary max-w-md mx-auto mb-8 leading-relaxed">
        Describe your idea in natural language. I&apos;ll guide you through the process of building a personalized web application.
      </p>
      <div className="space-y-3 max-w-lg mx-auto">
        <ExamplePrompt text="I want to track my daily expenses and see monthly spending trends" />
        <ExamplePrompt text="Help me build a habit tracker for my morning routine" />
        <ExamplePrompt text="I need to manage my freelance projects and log hours" />
      </div>
    </div>
  );
}

function ExamplePrompt({ text }: { text: string }) {
  return (
    <div className="p-4 rounded-xl bg-surface-light border border-outline-light text-left hover:border-accent-red/50 transition-colors cursor-pointer group">
      <p className="text-text-secondary group-hover:text-white">{text}</p>
    </div>
  );
}
