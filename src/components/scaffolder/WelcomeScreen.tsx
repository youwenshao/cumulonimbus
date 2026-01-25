'use client';

import React from 'react';

interface ExamplePromptProps {
  text: string;
  onClick?: () => void;
}

function ExamplePrompt({ text, onClick }: ExamplePromptProps) {
  return (
    <div 
      onClick={onClick}
      className="p-4 rounded-xl bg-surface-elevated border border-outline-light text-left hover:border-accent-yellow/50 transition-colors cursor-pointer group"
    >
      <p className="text-text-secondary group-hover:text-text-primary">{text}</p>
    </div>
  );
}

interface WelcomeScreenProps {
  onSelect: (text: string) => void;
}

export function WelcomeScreen({ onSelect }: WelcomeScreenProps) {
  return (
    <div className="text-center py-16 animate-fade-in">
      <h2 className="text-3xl font-serif font-medium text-text-primary mb-4">
        What would you like to <span className="bg-accent-yellow px-2 py-1 text-black">create</span>?
      </h2>
      <p className="text-text-secondary max-w-md mx-auto mb-8 leading-relaxed">
        Describe your idea in natural language. I&apos;ll guide you through the process of building a personalized web application.
      </p>
      <div className="space-y-3 max-w-lg mx-auto">
        <ExamplePrompt 
          text="An order tracker for a Hong Kong cha chaan teng restaurant" 
          onClick={() => onSelect("An order tracker for a Hong Kong cha chaan teng restaurant")}
        />
      </div>
    </div>
  );
}
