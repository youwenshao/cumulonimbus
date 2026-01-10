'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { NavigationRail, ContextPanel, ChatInput, ChatMessage, Button } from '@/components/ui';
import { cn } from '@/lib/utils';

interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  metadata?: {
    phase?: string;
    options?: { id: string; label: string; description?: string }[];
    questionType?: 'single' | 'multiple';
  };
}

interface ConversationState {
  phase: string;
  questions?: { id: string; question: string; answered: boolean }[];
  spec?: object;
  allQuestionsAnswered?: boolean;
}

export default function CreatePage() {
  const router = useRouter();
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [state, setState] = useState<ConversationState | null>(null);
  const [selectedOptions, setSelectedOptions] = useState<string[]>([]);
  const [currentQuestionId, setCurrentQuestionId] = useState<string | null>(null);
  const [contextPanelOpen, setContextPanelOpen] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSubmit = async (message: string) => {
    setIsLoading(true);

    // Add user message to UI
    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: message,
    };
    setMessages(prev => [...prev, userMessage]);

    try {
      const response = await fetch('/api/scaffolder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'start',
          message,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setConversationId(data.conversationId);
        setState(data.state);

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

      const data = await response.json();

      if (response.ok) {
        setState(data.state);

        // Add new assistant messages
        const newMessages = data.messages.filter(
          (m: Message) => m.role !== 'system' && !messages.some(existing => existing.id === m.id)
        );
        setMessages(prev => [...prev, ...newMessages]);

        // Update current question
        if (data.state?.questions) {
          const unanswered = data.state.questions.find((q: { answered: boolean }) => !q.answered);
          setCurrentQuestionId(unanswered?.id || null);
        }
      }
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFinalize = async () => {
    if (!conversationId || isLoading) return;

    setIsLoading(true);

    // Add execution message
    setMessages(prev => [...prev, {
      id: Date.now().toString(),
      role: 'assistant',
      content: 'Executing build plan...',
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
        // Show success message
        setMessages(prev => [...prev.slice(0, -1), {
          id: Date.now().toString(),
          role: 'assistant',
          content: `🎉 Your **${data.app.name}** is ready! Redirecting you now...`,
        }]);

        // Redirect to the new app
        setTimeout(() => {
          router.push(data.app.url);
        }, 1500);
      } else {
        setMessages(prev => [...prev.slice(0, -1), {
          id: Date.now().toString(),
          role: 'assistant',
          content: `Sorry, there was an error creating your app: ${data.error}`,
        }]);
      }
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const lastMessage = messages[messages.length - 1];
  const showOptions = lastMessage?.metadata?.options && !isLoading;
  const showFinalize = state?.phase === 'picture' && state?.allQuestionsAnswered;

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
        <header className="border-b border-outline-mid bg-surface-dark px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold text-white">Create New App</h1>
              <p className="text-sm text-text-secondary">Describe what you want to build</p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setContextPanelOpen(true)}
            >
              Context
            </Button>
          </div>
        </header>

        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-4xl mx-auto p-6">
            {messages.length === 0 ? (
              <WelcomeScreen />
            ) : (
              <div className="space-y-6">
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
                          selectedOptions.includes(option.id) && "border-accent-red bg-pastel-purple"
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

                {/* Finalize button */}
                {showFinalize && !isLoading && (
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
      <div className="w-20 h-20 mx-auto mb-8 rounded-2xl bg-accent-red flex items-center justify-center">
        <div className="w-10 h-10 rounded-lg bg-white flex items-center justify-center">
          <span className="text-accent-red font-bold text-xl">C</span>
        </div>
      </div>
      <h2 className="text-3xl font-bold text-white mb-4">
        What would you like to create?
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
