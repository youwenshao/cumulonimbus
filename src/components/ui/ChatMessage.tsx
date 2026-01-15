'use client';

import { useState, useEffect, useRef } from 'react';
import { CodeBlock } from './CodeBlock';
import { cn } from '@/lib/utils';
import { User, Cpu } from 'lucide-react';

interface ChatMessageProps {
  message: {
    id: string;
    role: 'user' | 'assistant' | 'system';
    content: string;
    metadata?: {
      phase?: string;
      options?: { id: string; label: string; description?: string }[];
      questionType?: 'single' | 'multiple';
      isStreaming?: boolean;
    };
  };
  className?: string;
  enableTypewriter?: boolean;
}

export function ChatMessage({ message, className, enableTypewriter = false }: ChatMessageProps) {
  const isUser = message.role === 'user';
  const isStreaming = message.metadata?.isStreaming;

  if (message.role === 'system') {
    return null; // Don't render system messages
  }

  // Check if message contains code blocks
  const hasCodeBlocks = message.content.includes('```');

  if (hasCodeBlocks) {
    return <CodeMessage message={message} className={className} />;
  }

  if (message.metadata?.phase === 'executing' || message.content.includes('executing')) {
    return <ActionMessage message={message} className={className} />;
  }

  // Use typewriter for non-user messages if enabled or streaming
  if (!isUser && (enableTypewriter || isStreaming)) {
    return (
      <TypewriterMessage 
        message={message} 
        className={className} 
        isStreaming={isStreaming}
      />
    );
  }

  return (
    <div className={cn('flex animate-confident', isUser ? 'justify-end' : 'justify-start', className)} role="article" aria-label={`${isUser ? 'Your' : 'Architect\'s'} message`}>
      <div className={cn('max-w-[85%] flex gap-3', isUser ? 'flex-row-reverse' : 'flex-row')}>
        {/* Avatar/Icon */}
        <div
          className={cn(
            'w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 mt-1',
            isUser
              ? 'bg-pastel-blue'
              : 'bg-accent-yellow'
          )}
          role="img"
          aria-label={isUser ? 'User avatar' : 'Architect avatar'}
        >
          {isUser ? (
            <User className="w-4 h-4 text-text-primary" aria-hidden="true" />
          ) : (
            <span className="text-text-primary font-bold text-sm" aria-hidden="true">A</span>
          )}
        </div>

        {/* Message bubble */}
        <div className={cn(
          'px-4 py-3 rounded-2xl text-text-primary',
          isUser
            ? 'message-user'
            : 'bg-surface-elevated border border-outline-light'
        )}>
          <p className="whitespace-pre-wrap leading-relaxed">{message.content}</p>
        </div>
      </div>
    </div>
  );
}

interface TypewriterMessageProps extends Omit<ChatMessageProps, 'enableTypewriter'> {
  isStreaming?: boolean;
}

function TypewriterMessage({ message, className, isStreaming }: TypewriterMessageProps) {
  const [displayedContent, setDisplayedContent] = useState('');
  const [isTyping, setIsTyping] = useState(true);
  const contentRef = useRef(message.content);
  const charIndexRef = useRef(0);

  useEffect(() => {
    // If streaming, always show the latest content immediately
    if (isStreaming) {
      setDisplayedContent(message.content);
      setIsTyping(true);
      return;
    }

    // For non-streaming, do typewriter animation
    if (message.content !== contentRef.current) {
      contentRef.current = message.content;
      charIndexRef.current = 0;
      setDisplayedContent('');
      setIsTyping(true);
    }

    if (charIndexRef.current >= message.content.length) {
      setIsTyping(false);
      return;
    }

    // Typewriter effect with variable speed
    const char = message.content[charIndexRef.current];
    const delay = getTypeDelay(char);

    const timeout = setTimeout(() => {
      setDisplayedContent(message.content.substring(0, charIndexRef.current + 1));
      charIndexRef.current++;
    }, delay);

    return () => clearTimeout(timeout);
  }, [message.content, displayedContent, isStreaming]);

  return (
    <div className={cn('flex justify-start animate-confident', className)} role="article" aria-label="Architect's message">
      <div className="max-w-[85%] flex gap-3">
        {/* Avatar */}
        <div
          className="w-8 h-8 rounded-full bg-accent-yellow flex items-center justify-center flex-shrink-0 mt-1"
          role="img"
          aria-label="Architect avatar"
        >
          <span className="text-text-primary font-bold text-sm" aria-hidden="true">A</span>
        </div>

        {/* Message bubble */}
        <div className="px-4 py-3 rounded-2xl bg-surface-elevated border border-outline-light text-text-primary">
          <p className="whitespace-pre-wrap leading-relaxed">
            {displayedContent}
            {isTyping && (
              <span className="inline-block w-2 h-4 ml-0.5 bg-accent-yellow animate-pulse" />
            )}
          </p>
        </div>
      </div>
    </div>
  );
}

/**
 * Get typing delay based on character for natural feel
 */
function getTypeDelay(char: string): number {
  // Longer pauses after punctuation
  if (['.', '!', '?'].includes(char)) return 100;
  if ([',', ';', ':'].includes(char)) return 50;
  // Shorter delay for spaces (words flow)
  if (char === ' ') return 15;
  // Normal character delay
  return 20;
}

function CodeMessage({ message, className }: ChatMessageProps) {
  // Split content by code blocks
  const parts = message.content.split(/(```[\s\S]*?```)/g);

  return (
    <div className={cn('flex justify-start animate-confident', className)}>
      <div className="max-w-[85%] flex gap-3">
        {/* Architect icon */}
        <div className="w-8 h-8 rounded-full bg-accent-yellow flex items-center justify-center flex-shrink-0 mt-1">
          <span className="text-text-primary font-bold text-sm">A</span>
        </div>

        {/* Message content */}
        <div className="space-y-3">
          {parts.map((part, index) => {
            if (part.startsWith('```')) {
              // Extract language and code
              const match = part.match(/```(\w+)?\n?([\s\S]*?)```/);
              const language = match?.[1] || 'javascript';
              const code = match?.[2] || part;

              return (
                <CodeBlock
                  key={index}
                  code={code.trim()}
                  language={language}
                />
              );
            } else if (part.trim()) {
              return (
                <div key={index} className="text-text-primary leading-relaxed">
                  <p className="whitespace-pre-wrap">{part.trim()}</p>
                </div>
              );
            }
            return null;
          })}
        </div>
      </div>
    </div>
  );
}

function ActionMessage({ message, className }: ChatMessageProps) {
  return (
    <div className={cn('flex justify-center animate-confident', className)}>
      <div className="max-w-[85%] w-full">
        <div className="message-action p-4 rounded-xl">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-5 h-5 rounded-full bg-accent-yellow flex items-center justify-center">
              <Cpu className="w-3 h-3 text-text-primary" />
            </div>
            <span className="text-text-primary font-medium">Architect is executing the build plan...</span>
          </div>

          {/* Progress bar */}
          <div className="w-full bg-surface-layer rounded-full h-2 overflow-hidden">
            <div className="h-full bg-accent-yellow rounded-full animate-pulse" style={{ width: '60%' }}></div>
          </div>

          <div className="text-xs text-text-secondary mt-2">
            This may take a few moments...
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Streaming message component that displays content as it arrives
 */
export function StreamingMessage({ 
  content, 
  isComplete,
  className 
}: { 
  content: string; 
  isComplete: boolean;
  className?: string;
}) {
  return (
    <div className={cn('flex justify-start animate-confident', className)} role="article" aria-label="Architect's message">
      <div className="max-w-[85%] flex gap-3">
        {/* Avatar */}
        <div className="w-8 h-8 rounded-full bg-accent-yellow flex items-center justify-center flex-shrink-0 mt-1">
          <span className="text-text-primary font-bold text-sm">A</span>
        </div>

        {/* Message bubble */}
        <div className="px-4 py-3 rounded-2xl bg-surface-light border border-outline-light text-text-primary">
          <p className="whitespace-pre-wrap leading-relaxed">
            {content}
            {!isComplete && (
              <span className="inline-block w-2 h-4 ml-0.5 bg-accent-yellow animate-pulse" />
            )}
          </p>
        </div>
      </div>
    </div>
  );
}

export default ChatMessage;
