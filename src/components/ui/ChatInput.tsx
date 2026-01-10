'use client';

import { useState, useRef, useEffect } from 'react';
import { Send, ChevronUp } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ChatInputProps {
  onSubmit: (message: string) => void;
  placeholder?: string;
  disabled?: boolean;
  isThinking?: boolean;
  className?: string;
}

export function ChatInput({
  onSubmit,
  placeholder = "Describe, instruct, or question...",
  disabled = false,
  isThinking = false,
  className,
}: ChatInputProps) {
  const [message, setMessage] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (message.trim() && !disabled) {
      onSubmit(message.trim());
      setMessage('');
      // Reset textarea height
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  // Auto-resize textarea
  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = `${Math.min(textarea.scrollHeight, 120)}px`;
    }
  }, [message]);

  return (
    <div className={cn('relative bg-surface-light border-t border-outline-light', className)} role="region" aria-label="Message input">
      {/* Thinking indicator */}
      {isThinking && (
        <div
          className="absolute -top-1 left-1/2 transform -translate-x-1/2"
          role="status"
          aria-label="AI is thinking"
        >
          <div className="w-2 h-2 bg-accent-red rounded-full animate-pulse-red"></div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="max-w-4xl mx-auto p-4" role="form" aria-label="Send message">
        <div className="flex items-end gap-3">
          {/* Input area */}
          <div className="flex-1 relative">
            <label htmlFor="message-input" className="sr-only">
              {placeholder}
            </label>
            <textarea
              ref={textareaRef}
              id="message-input"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={placeholder}
              disabled={disabled}
              rows={1}
              className="w-full resize-none bg-transparent border-0 outline-none text-white placeholder-text-tertiary text-base leading-relaxed min-h-[44px] max-h-[120px] focus:ring-0"
              style={{ scrollbarWidth: 'thin', scrollbarColor: 'rgba(255, 255, 255, 0.2) transparent' }}
              aria-describedby="message-hint"
            />
            <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-outline-light to-transparent"></div>
          </div>

          {/* Send button */}
          <button
            type="submit"
            disabled={!message.trim() || disabled}
            className={cn(
              'w-12 h-12 rounded-full flex items-center justify-center transition-all duration-200 focus-ring-red',
              message.trim() && !disabled
                ? 'bg-accent-red hover:bg-accent-red/90 shadow-lg shadow-accent-red/25 hover:shadow-xl hover:shadow-accent-red/30'
                : 'bg-surface-dark text-text-tertiary cursor-not-allowed'
            )}
            aria-label={message.trim() ? "Send message" : "Message input is empty"}
            aria-disabled={!message.trim() || disabled}
          >
            <ChevronUp className="w-5 h-5" aria-hidden="true" />
          </button>
        </div>

        {/* Hint text */}
        <div id="message-hint" className="text-xs text-text-tertiary mt-2 text-center">
          Shift + Enter for new line
        </div>
      </form>
    </div>
  );
}

export default ChatInput;