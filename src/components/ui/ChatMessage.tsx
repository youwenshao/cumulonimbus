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
    };
  };
  className?: string;
}

export function ChatMessage({ message, className }: ChatMessageProps) {
  const isUser = message.role === 'user';

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

  return (
    <div className={cn('flex animate-confident', isUser ? 'justify-end' : 'justify-start', className)} role="article" aria-label={`${isUser ? 'Your' : 'Architect\'s'} message`}>
      <div className={cn('max-w-[85%] flex gap-3', isUser ? 'flex-row-reverse' : 'flex-row')}>
        {/* Avatar/Icon */}
        <div
          className={cn(
            'w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 mt-1',
            isUser
              ? 'bg-pastel-blue'
              : 'bg-accent-red'
          )}
          role="img"
          aria-label={isUser ? 'User avatar' : 'Architect avatar'}
        >
          {isUser ? (
            <User className="w-4 h-4 text-white" aria-hidden="true" />
          ) : (
            <span className="text-white font-bold text-sm" aria-hidden="true">A</span>
          )}
        </div>

        {/* Message bubble */}
        <div className={cn(
          'px-4 py-3 rounded-2xl text-white',
          isUser
            ? 'message-user'
            : 'bg-surface-light border border-outline-light'
        )}>
          <p className="whitespace-pre-wrap leading-relaxed">{message.content}</p>
        </div>
      </div>
    </div>
  );
}

function CodeMessage({ message, className }: ChatMessageProps) {
  // Split content by code blocks
  const parts = message.content.split(/(```[\s\S]*?```)/g);

  return (
    <div className={cn('flex justify-start animate-confident', className)}>
      <div className="max-w-[85%] flex gap-3">
        {/* Architect icon */}
        <div className="w-8 h-8 rounded-full bg-accent-red flex items-center justify-center flex-shrink-0 mt-1">
          <span className="text-white font-bold text-sm">A</span>
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
                <div key={index} className="text-white leading-relaxed">
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
            <div className="w-5 h-5 rounded-full bg-accent-red flex items-center justify-center">
              <Cpu className="w-3 h-3 text-white" />
            </div>
            <span className="text-white font-medium">Architect is executing the build plan...</span>
          </div>

          {/* Progress bar */}
          <div className="w-full bg-surface-dark rounded-full h-2 overflow-hidden">
            <div className="h-full bg-accent-red rounded-full animate-pulse" style={{ width: '60%' }}></div>
          </div>

          <div className="text-xs text-text-secondary mt-2">
            This may take a few moments...
          </div>
        </div>
      </div>
    </div>
  );
}

export default ChatMessage;