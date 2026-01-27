'use client';

import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport } from 'ai';
import { useState } from 'react';
import { Button } from '@/components/ui';
import { nanoid } from 'nanoid';

export function V3Scaffolder() {
  const [chatId] = useState(() => nanoid());
  const [input, setInput] = useState('');
  
  const { messages, sendMessage, status, error } = useChat({
    transport: new DefaultChatTransport({
      api: '/api/scaffolder-v3',
      body: {
        appId: 'default-app', // TODO: Generate or select app
        chatId,
      },
    }),
  });

  const isLoading = status === 'streaming' || status === 'submitted';

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInput(e.target.value);
  };

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!input.trim()) return;
    sendMessage({ text: input });
    setInput('');
  };

  const getMessageContent = (message: any) => {
    if (!message.parts) return '';
    return message.parts
      .filter((part: any) => part.type === 'text')
      .map((part: any) => part.text)
      .join('');
  };

  return (
    <div className="flex flex-col h-screen bg-surface-base">
      <header className="border-b border-outline-mid bg-surface-base px-8 py-6">
        <h1 className="text-2xl font-serif font-medium text-text-primary">V3 Scaffolder (Dyad Engine)</h1>
      </header>

      <div className="flex-1 overflow-y-auto p-8">
        <div className="max-w-4xl mx-auto space-y-6">
          {messages.map(m => (
            <div key={m.id} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[80%] p-4 rounded-xl ${
                m.role === 'user' 
                  ? 'bg-accent-primary text-white' 
                  : 'bg-surface-elevated text-text-primary border border-outline-light'
              }`}>
                <div className="whitespace-pre-wrap">{getMessageContent(m)}</div>
                {/* Render tool invocations if any (from data stream or annotations) */}
              </div>
            </div>
          ))}
          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-surface-elevated p-4 rounded-xl border border-outline-light animate-pulse">
                Thinking...
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="p-4 border-t border-outline-mid bg-surface-base">
        <div className="max-w-4xl mx-auto">
          <form onSubmit={handleSubmit} className="relative">
            <input
              value={input}
              onChange={handleInputChange}
              placeholder="Describe the app you want to build..."
              className="w-full p-4 pr-24 rounded-xl bg-surface-elevated border border-outline-light focus:border-accent-yellow outline-none text-text-primary placeholder:text-text-tertiary"
              disabled={isLoading}
            />
            <div className="absolute right-2 top-2 bottom-2">
              <Button type="submit" disabled={isLoading || !input.trim()} size="sm">
                Send
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
