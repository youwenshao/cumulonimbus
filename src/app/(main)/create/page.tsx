'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  ArrowLeft, 
  Sparkles, 
  Send, 
  Loader2, 
  Check,
  ChevronRight,
  Rocket,
} from 'lucide-react';
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
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [state, setState] = useState<ConversationState | null>(null);
  const [selectedOptions, setSelectedOptions] = useState<string[]>([]);
  const [currentQuestionId, setCurrentQuestionId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput('');
    setIsLoading(true);

    // Add user message to UI
    const tempUserMsg: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: userMessage,
    };
    setMessages(prev => [...prev, tempUserMsg]);

    try {
      const response = await fetch('/api/scaffolder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'start',
          message: userMessage,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setConversationId(data.conversationId);
        setState(data.state);
        
        // Replace temp message with real messages
        setMessages(data.messages.filter((m: Message) => m.role !== 'system'));

        // Set current question ID for answer handling
        if (data.state?.questions?.length > 0) {
          const unanswered = data.state.questions.find((q: { answered: boolean }) => !q.answered);
          if (unanswered) {
            setCurrentQuestionId(unanswered.id);
          }
        }
      } else {
        setMessages(prev => [...prev.slice(0, -1), {
          id: Date.now().toString(),
          role: 'assistant',
          content: `Sorry, something went wrong: ${data.error}`,
        }]);
      }
    } catch (error) {
      console.error('Error:', error);
      setMessages(prev => [...prev.slice(0, -1), {
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
        setMessages(prev => [...prev.slice(0, -1), ...newMessages.slice(-2)]);

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
        setMessages(prev => [...prev, {
          id: Date.now().toString(),
          role: 'assistant',
          content: `🎉 Your **${data.app.name}** is ready! Redirecting you now...`,
        }]);

        // Redirect to the new app
        setTimeout(() => {
          router.push(data.app.url);
        }, 1500);
      } else {
        setMessages(prev => [...prev, {
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
    <div className="min-h-screen bg-gradient-to-br from-surface-50 via-surface-100 to-primary-50 flex flex-col">
      {/* Background effects */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-primary-200/30 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-accent-200/20 rounded-full blur-3xl" />
      </div>

      {/* Header */}
      <header className="relative z-10 border-b border-surface-200 bg-white/80 backdrop-blur-lg">
        <div className="max-w-3xl mx-auto px-6 py-4">
          <div className="flex items-center gap-4">
            <Link
              href="/dashboard"
              className="p-2 hover:bg-surface-100 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-surface-600" />
            </Link>
            <div>
              <h1 className="text-xl font-bold font-display text-surface-900">Create New App</h1>
              <p className="text-sm text-surface-500">Describe what you want to build</p>
            </div>
          </div>
        </div>
      </header>

      {/* Chat area */}
      <main className="relative z-10 flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto px-6 py-8">
          {messages.length === 0 ? (
            <WelcomeMessage />
          ) : (
            <div className="space-y-6">
              {messages.map((message) => (
                <ChatMessage key={message.id} message={message} />
              ))}

              {/* Loading indicator */}
              {isLoading && (
                <div className="flex items-center gap-2 text-surface-500">
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Thinking...</span>
                </div>
              )}

              {/* Options */}
              {showOptions && (
                <div className="space-y-2 animate-slide-up">
                  {lastMessage.metadata!.options!.map((option) => (
                    <button
                      key={option.id}
                      onClick={() => handleOptionSelect(option)}
                      className={cn(
                        "w-full p-4 rounded-xl border-2 text-left transition-all",
                        selectedOptions.includes(option.id)
                          ? "border-primary-500 bg-primary-50"
                          : "border-surface-200 bg-white hover:border-primary-300 hover:bg-surface-50"
                      )}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-medium text-surface-900">{option.label}</div>
                          {option.description && (
                            <div className="text-sm text-surface-500">{option.description}</div>
                          )}
                        </div>
                        {selectedOptions.includes(option.id) && (
                          <Check className="w-5 h-5 text-primary-500" />
                        )}
                      </div>
                    </button>
                  ))}

                  {/* Submit button for multiple choice */}
                  {lastMessage.metadata?.questionType === 'multiple' && selectedOptions.length > 0 && (
                    <button
                      onClick={() => submitAnswer(selectedOptions)}
                      className="w-full mt-4 flex items-center justify-center gap-2 py-3 px-4 bg-primary-500 text-white rounded-xl font-medium hover:bg-primary-600 transition-colors"
                    >
                      Continue
                      <ChevronRight className="w-5 h-5" />
                    </button>
                  )}
                </div>
              )}

              {/* Finalize button */}
              {showFinalize && !isLoading && (
                <div className="animate-slide-up">
                  <button
                    onClick={handleFinalize}
                    className="w-full flex items-center justify-center gap-2 py-4 px-6 bg-gradient-to-r from-primary-500 to-accent-500 text-white rounded-2xl font-semibold text-lg hover:from-primary-600 hover:to-accent-600 transition-all shadow-lg"
                  >
                    <Rocket className="w-6 h-6" />
                    Build My App
                  </button>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>
          )}
        </div>
      </main>

      {/* Input area */}
      {messages.length === 0 && (
        <div className="relative z-10 border-t border-surface-200 bg-white/80 backdrop-blur-lg p-6">
          <form onSubmit={handleSubmit} className="max-w-3xl mx-auto">
            <div className="flex gap-3">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Describe the app you want to build..."
                className="flex-1 px-5 py-4 rounded-2xl border border-surface-200 bg-white focus:outline-none focus:ring-2 focus:ring-primary-500/50 focus:border-primary-500 transition-all text-lg"
                disabled={isLoading}
              />
              <button
                type="submit"
                disabled={!input.trim() || isLoading}
                className="px-6 py-4 bg-gradient-to-r from-primary-500 to-primary-600 text-white rounded-2xl font-medium hover:from-primary-600 hover:to-primary-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <Loader2 className="w-6 h-6 animate-spin" />
                ) : (
                  <Send className="w-6 h-6" />
                )}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

function WelcomeMessage() {
  return (
    <div className="text-center py-12 animate-fade-in">
      <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-primary-100 to-accent-100 flex items-center justify-center">
        <Sparkles className="w-10 h-10 text-primary-600" />
      </div>
      <h2 className="text-2xl font-bold font-display text-surface-900 mb-3">
        What would you like to track?
      </h2>
      <p className="text-surface-600 max-w-md mx-auto mb-8">
        Describe your tracking needs in plain English. I will ask a few questions to understand exactly what you need, then build a custom app for you.
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
    <div className="p-4 rounded-xl bg-white border border-surface-200 text-left hover:border-primary-300 hover:bg-surface-50 transition-colors cursor-pointer">
      <p className="text-surface-700">{text}</p>
    </div>
  );
}

function ChatMessage({ message }: { message: Message }) {
  const isUser = message.role === 'user';

  return (
    <div className={cn("flex", isUser ? "justify-end" : "justify-start")}>
      <div
        className={cn(
          "max-w-[85%] rounded-2xl px-5 py-3",
          isUser
            ? "bg-primary-500 text-white"
            : "glass"
        )}
      >
        <p className={cn(
          "whitespace-pre-wrap",
          isUser ? "text-white" : "text-surface-900"
        )}>
          {message.content}
        </p>
      </div>
    </div>
  );
}
