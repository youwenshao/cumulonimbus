'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { LivePreview } from './LivePreview';
import { Button, ThemeToggle, ChatInput, ChatMessage } from '@/components/ui';
import { WelcomeScreen } from './WelcomeScreen';
import { Terminal, Rocket, CheckCircle, Sparkles, Zap, ChevronDown, ChevronRight, Lightbulb, Scale } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface FreeformCreatorProps {
  onComplete?: (appId: string, subdomain?: string) => void;
  onCancel?: () => void;
  /** Initial conversation ID to resume an existing conversation */
  initialConversationId?: string;
  /** Initial app ID to edit an existing app */
  initialAppId?: string;
}

// Internal dialogue turn from dual-agent system
interface InternalTurn {
  id: string;
  agent: 'architect' | 'advisor';
  content: string;
  timestamp: string;
  metadata?: {
    confidence?: number;
    decision?: 'iterate' | 'approve';
    iteration?: number;
  };
  answeredQuestions?: Array<{ question: string; answer: string }>;
  decisions?: Array<{ choice: string; rationale: string }>;
}

// Live thinking event during streaming
interface ThinkingEvent {
  agent: 'architect' | 'advisor';
  content: string;
  iteration: number;
  isStreaming: boolean;
}

interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  isStreaming?: boolean;
  internalDialogue?: InternalTurn[];
  iterations?: number;
  confidence?: number;
}

interface FreeformState {
  conversationId: string | null;
  readinessScore: number;
  canBuild: boolean;
  entities: Array<{ name: string; fields: any[] }>;
}

type Phase = 'chatting' | 'building' | 'preview' | 'loading';

export function FreeformCreator({ onComplete, onCancel, initialConversationId, initialAppId }: FreeformCreatorProps) {
  const [phase, setPhase] = useState<Phase>(initialConversationId ? 'loading' : 'chatting');
  const [messages, setMessages] = useState<Message[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [currentStreamContent, setCurrentStreamContent] = useState('');
  const [freeformState, setFreeformState] = useState<FreeformState>({
    conversationId: initialConversationId || null,
    readinessScore: 0,
    canBuild: false,
    entities: [],
  });
  const [generatedAppId, setGeneratedAppId] = useState<string | null>(null);
  const [generatedSubdomain, setGeneratedSubdomain] = useState<string | null>(null);
  const [isBuilding, setIsBuilding] = useState(false);
  // Track which internal dialogues are expanded (for debugging)
  const [expandedDialogues, setExpandedDialogues] = useState<Set<string>>(new Set());
  const [loadError, setLoadError] = useState<string | null>(null);
  // Live thinking state for real-time display
  const [liveThinking, setLiveThinking] = useState<{
    isActive: boolean;
    currentAgent: 'architect' | 'advisor' | null;
    architectContent: string;
    advisorContent: string;
    iteration: number;
    isExpanded: boolean;
  }>({
    isActive: false,
    currentAgent: null,
    architectContent: '',
    advisorContent: '',
    iteration: 0,
    isExpanded: true,
  });
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  // Use ref for conversation ID to avoid stale closure issues
  const conversationIdRef = useRef<string | null>(initialConversationId || null);

  // Toggle internal dialogue visibility
  const toggleDialogue = useCallback((messageId: string) => {
    setExpandedDialogues(prev => {
      const next = new Set(prev);
      if (next.has(messageId)) {
        next.delete(messageId);
      } else {
        next.add(messageId);
      }
      return next;
    });
  }, []);

  // Sync conversationId ref with state
  useEffect(() => {
    conversationIdRef.current = freeformState.conversationId;
  }, [freeformState.conversationId]);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, currentStreamContent]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      abortControllerRef.current?.abort();
    };
  }, []);

  // Load existing conversation if initialConversationId is provided
  useEffect(() => {
    if (!initialConversationId) return;

    const loadConversation = async () => {
      try {
        setPhase('loading');
        setLoadError(null);

        const response = await fetch(`/api/conversations/${initialConversationId}`);
        
        if (!response.ok) {
          throw new Error('Failed to load conversation');
        }

        const { conversation } = await response.json();

        // Transform messages to our format
        const loadedMessages: Message[] = (conversation.messages || []).map((msg: any, idx: number) => ({
          id: msg.id || `msg-${idx}`,
          role: msg.role,
          content: msg.content,
        }));

        setMessages(loadedMessages);
        
        // Update state from conversation spec
        const spec = conversation.spec;
        if (spec) {
          conversationIdRef.current = initialConversationId;
          setFreeformState({
            conversationId: initialConversationId,
            readinessScore: spec.readinessScore || 0,
            canBuild: spec.phase === 'ready' || (spec.readinessScore || 0) >= 80,
            entities: spec.entities || [],
          });
        }

        // If conversation has an associated app, show it
        if (conversation.app && conversation.phase === 'COMPLETE') {
          setGeneratedAppId(conversation.app.id);
          setGeneratedSubdomain(conversation.app.subdomain);
          setPhase('preview');
        } else {
          setPhase('chatting');
        }

      } catch (error) {
        console.error('Failed to load conversation:', error);
        setLoadError('Failed to load conversation. Starting fresh.');
        setPhase('chatting');
      }
    };

    loadConversation();
  }, [initialConversationId]);

  const handleSubmit = useCallback(async (text: string) => {
    if (!text.trim() || isStreaming) return;

    // Add user message
    const userMsg: Message = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: text,
    };
    setMessages(prev => [...prev, userMsg]);

    // Start streaming
    setIsStreaming(true);
    setCurrentStreamContent('');

    // Create abort controller for this request
    abortControllerRef.current = new AbortController();

    // Track internal dialogue for this message
    let internalDialogue: InternalTurn[] = [];
    let iterations = 0;
    let finalConfidence = 0;

    // Reset and activate live thinking
    setLiveThinking({
      isActive: true,
      currentAgent: 'architect',
      architectContent: '',
      advisorContent: '',
      iteration: 1,
      isExpanded: true,
    });

    try {
      const response = await fetch('/api/scaffolder/freeform', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'stream',
          conversationId: conversationIdRef.current, // Use ref instead of state
          message: text,
        }),
        signal: abortControllerRef.current.signal,
      });

      if (!response.ok) {
        throw new Error('Failed to get response');
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('No response body');
      }

      const decoder = new TextDecoder();
      let buffer = '';
      let streamedContent = '';
      let finalData: any = null;

      // Add placeholder message for streaming
      const assistantMsgId = `assistant-${Date.now()}`;
      setMessages(prev => [...prev, {
        id: assistantMsgId,
        role: 'assistant',
        content: '',
        isStreaming: true,
      }]);

      while (true) {
        const { done, value } = await reader.read();
        
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        
        // Process complete SSE messages
        const lines = buffer.split('\n\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          
          try {
            const data = JSON.parse(line.slice(6));
            
            if (data.type === 'thinking') {
              // Live thinking stream - update in real-time
              setLiveThinking(prev => ({
                ...prev,
                isActive: true,
                currentAgent: data.agent,
                iteration: data.iteration || prev.iteration,
                ...(data.agent === 'architect' 
                  ? { architectContent: prev.architectContent + data.content }
                  : { advisorContent: data.content } // Advisor content replaces (not streaming word-by-word)
                ),
              }));
            } else if (data.type === 'chunk') {
              // Final response chunk - hide thinking panel
              setLiveThinking(prev => ({ ...prev, isActive: false }));
              streamedContent += data.content;
              setCurrentStreamContent(streamedContent);
              // Update the streaming message
              setMessages(prev => prev.map(msg =>
                msg.id === assistantMsgId
                  ? { ...msg, content: streamedContent }
                  : msg
              ));
            } else if (data.type === 'internal') {
              // Capture internal dialogue from dual-agent system
              internalDialogue.push({
                id: `internal-${Date.now()}-${internalDialogue.length}`,
                agent: data.agent,
                content: data.content,
                timestamp: new Date().toISOString(),
                metadata: {
                  confidence: data.confidence,
                  decision: data.decision,
                  iteration: data.iteration,
                },
                answeredQuestions: data.answeredQuestions,
                decisions: data.decisions,
              });
              // Reset content for next iteration
              if (data.agent === 'advisor') {
                setLiveThinking(prev => ({
                  ...prev,
                  architectContent: '',
                  advisorContent: '',
                  iteration: (data.iteration || 0) + 1,
                }));
              }
            } else if (data.type === 'done') {
              finalData = data;
              iterations = data.iterations || 1;
              finalConfidence = data.confidence || 0;
              // Include internal dialogue from final data if present
              if (data.internalDialogue) {
                internalDialogue = data.internalDialogue;
              }
            } else if (data.type === 'error') {
              throw new Error(data.error);
            }
          } catch (e) {
            // Only log if it's not a JSON parse error for a chunk
            if (!(e instanceof SyntaxError)) {
              console.error('Failed to parse SSE message:', e);
            }
          }
        }
      }

      // Finalize the message with internal dialogue
      setMessages(prev => prev.map(msg =>
        msg.id === assistantMsgId
          ? { 
              ...msg, 
              content: streamedContent, 
              isStreaming: false,
              internalDialogue: internalDialogue.length > 0 ? internalDialogue : undefined,
              iterations: iterations > 0 ? iterations : undefined,
              confidence: finalConfidence > 0 ? finalConfidence : undefined,
            }
          : msg
      ));

      // Update state from final data
      if (finalData) {
        const newConversationId = finalData.conversationId;
        conversationIdRef.current = newConversationId; // Update ref immediately
        setFreeformState({
          conversationId: newConversationId,
          readinessScore: finalData.readinessScore || 0,
          canBuild: finalData.canBuild || false,
          entities: finalData.entities || [],
        });
      }

    } catch (error) {
      if ((error as Error).name === 'AbortError') {
        // Request was aborted, don't show error
        // Still need to reset streaming state
        setIsStreaming(false);
        setCurrentStreamContent('');
        return;
      }
      
      console.error('Error:', error);
      toast.error('Failed to get response. Please try again.');
      
      // Remove the failed streaming message
      setMessages(prev => prev.filter(msg => !msg.isStreaming));
    } finally {
      setIsStreaming(false);
      setCurrentStreamContent('');
    }
  }, [isStreaming]); // Removed freeformState.conversationId - using ref instead

  const handleBuild = useCallback(async () => {
    // Use ref instead of state to avoid stale closure issues
    if (!conversationIdRef.current || isBuilding) return;

    setIsBuilding(true);
    setPhase('building');

    // Add building message
    setMessages(prev => [...prev, {
      id: `system-${Date.now()}`,
      role: 'assistant',
      content: 'Building your app... This may take a moment.',
    }]);

    try {
      const response = await fetch('/api/scaffolder/freeform', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'build',
          conversationId: conversationIdRef.current, // Use ref instead of state
        }),
      });

      const data = await response.json();

      if (response.ok && data.app) {
        setGeneratedAppId(data.app.id);
        setGeneratedSubdomain(data.app.subdomain);
        setPhase('preview');
        
        // Update final message
        setMessages(prev => {
          const updated = [...prev];
          updated[updated.length - 1] = {
            ...updated[updated.length - 1],
            content: `Your **${data.app.name}** has been built! Check out the preview below.`,
          };
          return updated;
        });

        toast.success('App built successfully!');
      } else {
        throw new Error(data.error || 'Build failed');
      }
    } catch (error) {
      console.error('Build error:', error);
      toast.error('Failed to build app. Please try again.');
      setPhase('chatting');
      
      // Update error message
      setMessages(prev => {
        const updated = [...prev];
        updated[updated.length - 1] = {
          ...updated[updated.length - 1],
          content: 'Sorry, there was an error building your app. Let me know if you want to try again.',
        };
        return updated;
      });
    } finally {
      setIsBuilding(false);
    }
  }, [isBuilding]); // Using conversationIdRef instead of state

  const handleAccept = useCallback(() => {
    if (generatedAppId) {
      onComplete?.(generatedAppId, generatedSubdomain || undefined);
    }
  }, [generatedAppId, generatedSubdomain, onComplete]);

  // Render readiness indicator
  const renderReadiness = () => {
    if (freeformState.readinessScore === 0) return null;

    const score = freeformState.readinessScore;
    const color = score >= 80 
      ? 'text-emerald-500' 
      : score >= 50 
        ? 'text-amber-500' 
        : 'text-text-tertiary';

    return (
      <div className="flex items-center gap-2 text-xs">
        <div className="w-24 h-1.5 bg-surface-layer rounded-full overflow-hidden">
          <div 
            className={cn(
              "h-full rounded-full transition-all duration-500",
              score >= 80 ? "bg-emerald-500" : score >= 50 ? "bg-amber-500" : "bg-text-tertiary"
            )}
            style={{ width: `${score}%` }}
          />
        </div>
        <span className={color}>{score}% ready</span>
      </div>
    );
  };

  // Render internal dialogue (collapsible for debugging)
  const renderInternalDialogue = (msg: Message) => {
    if (!msg.internalDialogue || msg.internalDialogue.length === 0) return null;

    const isExpanded = expandedDialogues.has(msg.id);

    return (
      <div className="mt-2">
        {/* Toggle button */}
        <button
          onClick={() => toggleDialogue(msg.id)}
          className="flex items-center gap-2 text-xs text-text-tertiary hover:text-text-secondary transition-colors"
        >
          {isExpanded ? (
            <ChevronDown className="w-3 h-3" />
          ) : (
            <ChevronRight className="w-3 h-3" />
          )}
          <Scale className="w-3 h-3" />
          <span>
            {msg.iterations || 1} iteration{(msg.iterations || 1) > 1 ? 's' : ''} 
            {msg.confidence ? ` • ${msg.confidence}% confidence` : ''}
          </span>
        </button>

        {/* Collapsible content */}
        {isExpanded && (
          <div className="mt-3 p-3 rounded-lg bg-surface-layer border border-outline-light space-y-3">
            <div className="text-xs font-medium text-text-tertiary uppercase tracking-wider mb-2">
              Internal Dialogue (Debug View)
            </div>
            {msg.internalDialogue.map((turn, idx) => (
              <div 
                key={turn.id || idx}
                className={cn(
                  "p-2 rounded-md text-xs",
                  turn.agent === 'architect' 
                    ? "bg-amber-500/10 border-l-2 border-amber-500" 
                    : "bg-purple-500/10 border-l-2 border-purple-500"
                )}
              >
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-1.5">
                    {turn.agent === 'architect' ? (
                      <Lightbulb className="w-3 h-3 text-amber-500" />
                    ) : (
                      <Scale className="w-3 h-3 text-purple-500" />
                    )}
                    <span className={cn(
                      "font-medium",
                      turn.agent === 'architect' ? "text-amber-600 dark:text-amber-400" : "text-purple-600 dark:text-purple-400"
                    )}>
                      {turn.agent === 'architect' ? 'Architect' : 'Advisor'}
                    </span>
                    {turn.metadata?.iteration && (
                      <span className="text-text-tertiary">(iteration {turn.metadata.iteration})</span>
                    )}
                  </div>
                  {turn.metadata?.confidence !== undefined && (
                    <span className={cn(
                      "px-1.5 py-0.5 rounded text-[10px] font-medium",
                      turn.metadata.confidence >= 75 
                        ? "bg-emerald-500/20 text-emerald-700 dark:text-emerald-400"
                        : turn.metadata.confidence >= 50
                          ? "bg-amber-500/20 text-amber-700 dark:text-amber-400"
                          : "bg-red-500/20 text-red-700 dark:text-red-400"
                    )}>
                      {turn.metadata.confidence}%
                    </span>
                  )}
                  {turn.metadata?.decision && (
                    <span className={cn(
                      "px-1.5 py-0.5 rounded text-[10px] font-medium",
                      turn.metadata.decision === 'approve'
                        ? "bg-emerald-500/20 text-emerald-700 dark:text-emerald-400"
                        : "bg-amber-500/20 text-amber-700 dark:text-amber-400"
                    )}>
                      {turn.metadata.decision === 'approve' ? 'APPROVED' : 'ITERATE'}
                    </span>
                  )}
                </div>
                <div className="text-text-secondary whitespace-pre-wrap break-words">
                  {turn.content.length > 500 
                    ? `${turn.content.substring(0, 500)}...` 
                    : turn.content
                  }
                </div>
                {/* Show answered questions if present */}
                {turn.answeredQuestions && turn.answeredQuestions.length > 0 && (
                  <div className="mt-2 pt-2 border-t border-purple-500/20">
                    <div className="text-[10px] font-medium text-purple-500 uppercase tracking-wider mb-1">
                      Questions Answered
                    </div>
                    {turn.answeredQuestions.map((aq, i) => (
                      <div key={i} className="text-text-tertiary text-[11px] mb-1">
                        <span className="text-purple-400">Q:</span> {aq.question}
                        <br />
                        <span className="text-emerald-400">A:</span> {aq.answer}
                      </div>
                    ))}
                  </div>
                )}
                {/* Show decisions if present */}
                {turn.decisions && turn.decisions.length > 0 && (
                  <div className="mt-2 pt-2 border-t border-purple-500/20">
                    <div className="text-[10px] font-medium text-purple-500 uppercase tracking-wider mb-1">
                      Decisions Made
                    </div>
                    {turn.decisions.map((d, i) => (
                      <div key={i} className="text-text-tertiary text-[11px]">
                        • {d.choice}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full bg-surface-base">
      <header className="border-b border-outline-mid bg-surface-base px-8 py-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-serif font-medium text-text-primary">Create</h1>
            <p className="text-sm text-text-secondary mt-1">
              {initialConversationId ? 'Resume Conversation' : 'Freeform Mode'}
            </p>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-surface-elevated border border-outline-light">
              <div className={cn(
                "w-2 h-2 rounded-full",
                phase === 'preview' 
                  ? "bg-emerald-500" 
                  : phase === 'loading'
                    ? "bg-blue-500 animate-pulse"
                  : isStreaming 
                    ? "bg-accent-yellow animate-pulse" 
                    : "bg-text-tertiary"
              )} />
              <span className="text-xs font-mono text-text-secondary uppercase tracking-wider">
                {phase === 'loading' && 'Loading'}
                {phase === 'chatting' && (isStreaming ? 'Thinking' : 'Ready')}
                {phase === 'building' && 'Building'}
                {phase === 'preview' && 'Complete'}
              </span>
            </div>
            {renderReadiness()}
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
        <div className="max-w-4xl mx-auto p-8 space-y-6">
          {/* Loading state */}
          {phase === 'loading' && (
            <div className="flex items-center justify-center min-h-[40vh]">
              <div className="text-center">
                <div className="flex justify-center mb-4">
                  <div className="flex space-x-1">
                    <div className="w-3 h-3 bg-accent-yellow rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <div className="w-3 h-3 bg-accent-yellow rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <div className="w-3 h-3 bg-accent-yellow rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
                <p className="text-text-secondary">Loading conversation...</p>
              </div>
            </div>
          )}

          {/* Load error */}
          {loadError && (
            <div className="p-4 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 text-sm mb-4">
              {loadError}
            </div>
          )}

          {/* Main content when not loading */}
          {phase !== 'loading' && messages.length === 0 ? (
            <WelcomeScreen onSelect={handleSubmit} />
          ) : phase !== 'loading' && (
            <>
              {/* Chat Messages */}
              <div className="space-y-6">
                {messages.map((msg) => (
                  <div key={msg.id}>
                    <ChatMessage 
                      message={msg}
                    />
                    {/* Render collapsible internal dialogue for assistant messages */}
                    {msg.role === 'assistant' && renderInternalDialogue(msg)}
                  </div>
                ))}
              </div>

              {/* Live Thinking Panel - shows real-time Architect/Advisor dialogue */}
              {isStreaming && liveThinking.isActive && (
                <div className="animate-fade-in rounded-xl bg-surface-elevated border border-outline-light overflow-hidden">
                  {/* Header with collapse toggle */}
                  <button
                    onClick={() => setLiveThinking(prev => ({ ...prev, isExpanded: !prev.isExpanded }))}
                    className="w-full flex items-center justify-between px-4 py-3 bg-surface-layer border-b border-outline-light hover:bg-surface-elevated transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex space-x-1">
                        <div className="w-2 h-2 bg-accent-yellow rounded-full animate-pulse" />
                        <div className="w-2 h-2 bg-purple-500 rounded-full animate-pulse" style={{ animationDelay: '200ms' }} />
                      </div>
                      <span className="text-sm font-medium text-text-primary">
                        Thinking... 
                        <span className="text-text-tertiary ml-2">
                          (Iteration {liveThinking.iteration})
                        </span>
                      </span>
                    </div>
                    {liveThinking.isExpanded ? (
                      <ChevronDown className="w-4 h-4 text-text-tertiary" />
                    ) : (
                      <ChevronRight className="w-4 h-4 text-text-tertiary" />
                    )}
                  </button>

                  {/* Collapsible content */}
                  {liveThinking.isExpanded && (
                    <div className="p-4 space-y-3 max-h-80 overflow-y-auto">
                      {/* Architect thinking */}
                      {liveThinking.architectContent && (
                        <div className="p-3 rounded-lg bg-amber-500/5 border-l-2 border-amber-500">
                          <div className="flex items-center gap-2 mb-2">
                            <Lightbulb className="w-4 h-4 text-amber-500" />
                            <span className="text-xs font-medium text-amber-600 dark:text-amber-400 uppercase tracking-wider">
                              Architect
                            </span>
                            {liveThinking.currentAgent === 'architect' && (
                              <span className="flex space-x-0.5 ml-auto">
                                <span className="w-1 h-1 bg-amber-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                                <span className="w-1 h-1 bg-amber-500 rounded-full animate-bounce" style={{ animationDelay: '100ms' }} />
                                <span className="w-1 h-1 bg-amber-500 rounded-full animate-bounce" style={{ animationDelay: '200ms' }} />
                              </span>
                            )}
                          </div>
                          <div className="text-sm text-text-secondary whitespace-pre-wrap leading-relaxed">
                            {liveThinking.architectContent.length > 800 
                              ? liveThinking.architectContent.slice(-800) + '...'
                              : liveThinking.architectContent
                            }
                          </div>
                        </div>
                      )}

                      {/* Advisor thinking */}
                      {liveThinking.advisorContent && (
                        <div className="p-3 rounded-lg bg-purple-500/5 border-l-2 border-purple-500">
                          <div className="flex items-center gap-2 mb-2">
                            <Scale className="w-4 h-4 text-purple-500" />
                            <span className="text-xs font-medium text-purple-600 dark:text-purple-400 uppercase tracking-wider">
                              Advisor
                            </span>
                            {liveThinking.currentAgent === 'advisor' && (
                              <span className="flex space-x-0.5 ml-auto">
                                <span className="w-1 h-1 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                                <span className="w-1 h-1 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: '100ms' }} />
                                <span className="w-1 h-1 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: '200ms' }} />
                              </span>
                            )}
                          </div>
                          <div className="text-sm text-text-secondary whitespace-pre-wrap leading-relaxed">
                            {liveThinking.advisorContent.length > 500 
                              ? liveThinking.advisorContent.slice(0, 500) + '...'
                              : liveThinking.advisorContent
                            }
                          </div>
                        </div>
                      )}

                      {/* Show waiting state if no content yet */}
                      {!liveThinking.architectContent && !liveThinking.advisorContent && (
                        <div className="flex items-center justify-center py-4">
                          <div className="flex space-x-1">
                            <div className="w-2 h-2 bg-accent-yellow rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                            <div className="w-2 h-2 bg-accent-yellow rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                            <div className="w-2 h-2 bg-accent-yellow rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                          </div>
                          <span className="text-text-tertiary text-sm ml-3">Starting...</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Streaming indicator - fallback when thinking panel is collapsed or done */}
              {isStreaming && !liveThinking.isActive && currentStreamContent === '' && (
                <div className="flex items-center gap-3 p-4 rounded-xl bg-surface-elevated border border-outline-light">
                  <div className="flex space-x-1">
                    <div className="w-2 h-2 bg-accent-yellow rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <div className="w-2 h-2 bg-accent-yellow rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <div className="w-2 h-2 bg-accent-yellow rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                  <span className="text-text-secondary text-sm">Architect is thinking...</span>
                </div>
              )}

              {/* Build Button - appears when ready */}
              {freeformState.canBuild && phase === 'chatting' && !isStreaming && (
                <div className="animate-slide-up pt-4 border-t border-outline-light">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-5 h-5 text-accent-yellow" />
                      <span className="text-text-primary font-medium">Ready to build!</span>
                    </div>
                    <div className="text-sm text-text-secondary">
                      {freeformState.entities.length} entities detected
                    </div>
                  </div>
                  <Button
                    onClick={handleBuild}
                    size="lg"
                    className="w-full gap-2"
                    disabled={isBuilding}
                  >
                    <Zap className="w-4 h-4" />
                    Build My App
                  </Button>
                </div>
              )}

              {/* Building indicator */}
              {phase === 'building' && (
                <div className="animate-slide-up p-6 rounded-xl bg-surface-elevated border border-outline-light">
                  <div className="flex items-center gap-4">
                    <div className="animate-spin">
                      <Terminal className="w-6 h-6 text-accent-yellow" />
                    </div>
                    <div>
                      <div className="font-medium text-text-primary">Generating your app...</div>
                      <div className="text-sm text-text-secondary">Writing components and resolving dependencies</div>
                    </div>
                  </div>
                </div>
              )}

              {/* Preview */}
              {phase === 'preview' && generatedAppId && (
                <section className="animate-fade-in pt-6 border-t border-outline-light">
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-2">
                      <Rocket className="w-5 h-5 text-accent-yellow" />
                      <h2 className="text-lg font-medium text-text-primary">App Ready</h2>
                    </div>
                    <div className="flex items-center gap-2 text-emerald-700/80 bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/20 dark:text-emerald-500/70 dark:bg-emerald-500/5 dark:border-emerald-500/20">
                      <CheckCircle className="w-4 h-4" />
                      <span className="text-xs font-bold uppercase tracking-wider">Built</span>
                    </div>
                  </div>
                  <LivePreview 
                    appId={generatedAppId} 
                    subdomain={generatedSubdomain || undefined}
                    appName="Your App"
                    onAccept={handleAccept}
                  />
                </section>
              )}

              <div ref={messagesEndRef} />
            </>
          )}
        </div>
      </main>

      {/* Input Area */}
      {phase === 'chatting' && (
        <div className="p-8 pt-0 max-w-4xl mx-auto w-full">
          <ChatInput
            onSubmit={handleSubmit}
            disabled={isStreaming || isBuilding}
            isThinking={isStreaming}
            placeholder={messages.length === 0 
              ? "Describe the app you want to build..." 
              : "Continue the conversation or refine your requirements..."
            }
          />
        </div>
      )}
    </div>
  );
}
