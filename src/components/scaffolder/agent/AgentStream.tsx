'use client';

import React, { useEffect, useRef } from 'react';
import { ThinkingBlock } from './ThinkingBlock';
import { ToolCall } from './ToolCall';
import { ChatMessage } from '@/components/ui';
import { SimulationEvent } from '@/lib/demo/seed-data';

interface AgentStreamProps {
  events: SimulationEvent[];
  isComplete: boolean;
}

export function AgentStream({ events, isComplete }: AgentStreamProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [events.length, isComplete]);

  return (
    <div className="space-y-6 pb-4">
      {events.map((event, index) => {
        // Determine if this event is the "active" one (last one unless complete)
        const isLast = index === events.length - 1;
        const isActive = isLast && !isComplete;

        switch (event.type) {
          case 'thinking':
            return (
              <ThinkingBlock 
                key={index} 
                content={event.content} 
                isComplete={!isActive} 
              />
            );
          
          case 'tool_call':
          case 'web_search':
            return (
              <ToolCall
                key={index}
                tool={event.type}
                input={event.content}
                status={isActive ? 'running' : 'completed'}
                result={event.metadata?.results?.[0]}
              />
            );

          case 'message':
            return (
              <ChatMessage
                key={index}
                message={{
                  id: `msg-${index}`,
                  role: 'assistant',
                  content: event.content,
                }}
                enableTypewriter={true}
              />
            );

          case 'code_generation':
            // Handled separately by the parent container switching views, 
            // or we could show a "Generating code..." placeholder here
            return null;

          default:
            return null;
        }
      })}
      <div ref={bottomRef} />
    </div>
  );
}
