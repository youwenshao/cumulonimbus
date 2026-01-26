'use client';

/**
 * ConversationalScaffolder V2
 * Main UI component for the dynamic AI pipeline
 * 
 * Features:
 * - Multi-proposal system with visual mockups
 * - Readiness indicators for build progress
 * - Proactive suggestions
 * - Natural language refinement
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { LivePreview } from './LivePreview';
import { ProposalSelector } from './ProposalSelector';
import { DebugPanel } from './DebugPanel';
import type { 
  Message, 
  ConversationState,
  Schema,
  LayoutNode,
  ReadinessScores,
  ProposalSet,
  ProactiveSuggestion,
  GeneratedComponent,
} from '@/lib/scaffolder-v2/types';

interface ConversationalScaffolderV2Props {
  className?: string;
}

export function ConversationalScaffolderV2({ className = '' }: ConversationalScaffolderV2Props) {
  const { data: session } = useSession();
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [phase, setPhase] = useState<string>('intent');
  const [schema, setSchema] = useState<Schema | undefined>();
  const [layout, setLayout] = useState<LayoutNode | undefined>();
  const [suggestedActions, setSuggestedActions] = useState<string[]>([]);
  const [appName, setAppName] = useState<string>('');
  
  // Dynamic pipeline state
  const [readiness, setReadiness] = useState<ReadinessScores>({ schema: 0, ui: 0, workflow: 0, overall: 0 });
  const [proposals, setProposals] = useState<ProposalSet | undefined>();
  const [suggestions, setSuggestions] = useState<ProactiveSuggestion[]>([]);
  
  // Debug state
  const [debugMode, setDebugMode] = useState(false);
  const [errorLog, setErrorLog] = useState<string>('');
  const [debugComponentCode, setDebugComponentCode] = useState<string>('');
  const [isFixing, setIsFixing] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Focus input on load
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  /**
   * Send a message to the v2 scaffolder
   */
  const sendMessage = useCallback(async (content: string) => {
    if (!content.trim() || isLoading) return;

    setIsLoading(true);
    setInputValue('');

    try {
      const response = await fetch('/api/scaffolder-v2', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conversationId,
          message: content,
          action: 'chat',
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to send message');
      }

      const data = await response.json();

      setConversationId(data.conversationId);
      setMessages(data.messages);
      setPhase(data.state?.phase || 'intent');
      setSuggestedActions(data.suggestedActions || []);

      if (data.state?.schemas?.[0]) {
        setSchema(data.state.schemas[0]);
      }
      if (data.state?.layout) {
        setLayout(data.state.layout);
      }
      if (data.state?.suggestedAppName) {
        setAppName(data.state.suggestedAppName);
      }
      
      // Dynamic pipeline state
      if (data.state?.readiness) {
        setReadiness(data.state.readiness);
      }
      if (data.state?.currentProposals) {
        setProposals(data.state.currentProposals);
      } else {
        setProposals(undefined);
      }
      if (data.state?.suggestions) {
        setSuggestions(data.state.suggestions);
      }
    } catch (error) {
      console.error('Error sending message:', error);
      // Add error message
      setMessages(prev => [
        ...prev,
        {
          id: Date.now().toString(),
          role: 'system',
          content: 'Sorry, something went wrong. Please try again.',
          timestamp: new Date(),
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  }, [conversationId, isLoading]);

  /**
   * Handle form submission
   */
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(inputValue);
  };

  /**
   * Handle suggested action click
   */
  const handleSuggestedAction = (action: string) => {
    sendMessage(action);
  };

  /**
   * Finalize and create the app
   */
  const handleFinalize = async () => {
    if (!conversationId) return;

    setIsLoading(true);

    try {
      const response = await fetch('/api/scaffolder-v2', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conversationId,
          action: 'finalize',
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to finalize app');
      }

      const data = await response.json();

      if (data.success && data.appUrl) {
        // Navigate to the new app
        window.location.href = data.appUrl;
      }
    } catch (error) {
      console.error('Error finalizing app:', error);
      setMessages(prev => [
        ...prev,
        {
          id: Date.now().toString(),
          role: 'system',
          content: 'Failed to create app. Please try again.',
          timestamp: new Date(),
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Handle proposal selection
   */
  const handleSelectProposal = async (proposalId: string) => {
    if (!conversationId) return;

    setIsLoading(true);

    try {
      const response = await fetch('/api/scaffolder-v2', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conversationId,
          message: proposalId,
          action: 'select_proposal',
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to select proposal');
      }

      const data = await response.json();

      setMessages(data.messages);
      setProposals(undefined); // Clear proposals after selection
      
      if (data.state?.schemas?.[0]) {
        setSchema(data.state.schemas[0]);
      }
      if (data.state?.layout) {
        setLayout(data.state.layout);
      }
      if (data.state?.readiness) {
        setReadiness(data.state.readiness);
      }
      if (data.state?.suggestedAppName) {
        setAppName(data.state.suggestedAppName);
      }
    } catch (error) {
      console.error('Error selecting proposal:', error);
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Handle suggestion click
   */
  const handleSuggestionClick = (suggestion: ProactiveSuggestion) => {
    sendMessage(suggestion.feature);
  };

  /**
   * Handle preview error
   */
  const handlePreviewError = (error: string, components: Map<string, GeneratedComponent>) => {
    setErrorLog(error);
    // Find the component that likely caused the error or default to the first one
    // In a real implementation, we would try to parse the stack trace to find the filename
    const firstComponent = components.values().next().value;
    if (firstComponent) {
      setDebugComponentCode(firstComponent.code);
    }
    setDebugMode(true);
  };

  /**
   * Handle debug fix
   */
  const handleDebugFix = async (instruction?: string) => {
    if (!conversationId) return;
    
    setIsFixing(true);
    try {
      const response = await fetch('/api/scaffolder-v2', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conversationId,
          action: 'fix_component',
          componentCode: debugComponentCode,
          errorLog,
          message: instruction || '',
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to fix component');
      }

      const data = await response.json();
      
      setMessages(data.messages);
      setDebugMode(false);
      setErrorLog('');
      
      // Note: The updated code should come via SSE or be handled here if returned
    } catch (error) {
      console.error('Error fixing component:', error);
    } finally {
      setIsFixing(false);
    }
  };

  /**
   * Handle debug approve
   */
  const handleDebugApprove = async () => {
    if (conversationId && debugComponentCode) {
      // Notify backend of resolution for tracking
      try {
        await fetch('/api/scaffolder-v2', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            conversationId,
            action: 'resolve_feedback',
            message: 'Feedback resolved',
            componentCode: debugComponentCode
          }),
        });
      } catch (e) {
        console.error('Error reporting resolution:', e);
      }
    }
    setDebugMode(false);
    setErrorLog('');
  };

  /**
   * Format message content with markdown-like styling
   */
  const formatContent = (content: string) => {
    // Simple markdown-like formatting
    return content
      .split('\n')
      .map((line, i) => {
        // Headers
        if (line.startsWith('## ')) {
          return <h2 key={i} className="message-header">{line.slice(3)}</h2>;
        }
        if (line.startsWith('### ')) {
          return <h3 key={i} className="message-subheader">{line.slice(4)}</h3>;
        }
        // Bold
        const boldFormatted = line.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
        // List items
        if (line.startsWith('- ')) {
          return (
            <li 
              key={i} 
              className="message-list-item"
              dangerouslySetInnerHTML={{ __html: boldFormatted.slice(2) }}
            />
          );
        }
        // Horizontal rule
        if (line === '---') {
          return <hr key={i} className="message-divider" />;
        }
        // Regular paragraph
        if (line.trim()) {
          return (
            <p 
              key={i} 
              className="message-paragraph"
              dangerouslySetInnerHTML={{ __html: boldFormatted }}
            />
          );
        }
        return null;
      })
      .filter(Boolean);
  };

  /**
   * Get phase indicator color
   */
  const getPhaseColor = (currentPhase: string) => {
    const colors: Record<string, string> = {
      intent: '#f0d890', // pastel-yellow
      schema: '#c8b0f0', // pastel-purple
      ui: '#6bb1e0', // pastel-blue
      code: '#8bd9b1', // pastel-green
      preview: '#fca000', // accent-yellow
      complete: '#8bd9b1', // pastel-green
    };
    return colors[currentPhase] || '#888888'; // text-tertiary
  };

  return (
    <div className={`scaffolder-v2 ${className}`}>
      {/* Header */}
      <div className="scaffolder-header">
        <div className="header-left">
          <h1>Build Your App</h1>
          {/* Readiness indicator */}
          <div className="readiness-indicator">
            <div className="readiness-bar">
              <div 
                className={`readiness-fill ${readiness.overall >= 80 ? 'ready' : readiness.overall >= 60 ? 'almost' : ''}`}
                style={{ width: `${readiness.overall}%` }}
              />
            </div>
            <span className={`readiness-label ${readiness.overall >= 80 ? 'ready' : ''}`}>
              {readiness.overall >= 80 
                ? '✓ Ready to build!' 
                : readiness.overall >= 60 
                  ? `${readiness.overall}% - Almost there!`
                  : `${readiness.overall}% ready`}
            </span>
          </div>
        </div>
        {/* Build button - prominent when ready */}
        <button
          className={`finalize-button ${readiness.overall >= 80 ? 'pulse-ready' : ''}`}
          onClick={handleFinalize}
          disabled={isLoading || readiness.overall < 60 || !schema}
        >
          {isLoading ? 'Creating...' : readiness.overall >= 80 ? '🚀 Build App Now' : 'Build App'}
        </button>
      </div>

      {/* Build-ready banner */}
      {readiness.overall >= 80 && schema && !isLoading && (
        <div className="build-ready-banner">
          <div className="banner-content">
            <span className="banner-icon">🎉</span>
            <span className="banner-text">Your app is ready to build!</span>
            <button 
              className="banner-build-button"
              onClick={handleFinalize}
            >
              Build Now
            </button>
          </div>
        </div>
      )}

      {/* Main content area */}
      <div className="scaffolder-content">
        {/* Chat panel */}
        <div className="chat-panel">
          {/* Messages */}
          <div className="messages-container">
            {messages.length === 0 ? (
              <div className="welcome-message">
                <h2>What would you like to build?</h2>
                <p>Describe your app idea and I&apos;ll design it for you automatically. Just tell me what you need:</p>
                <ul>
                  <li onClick={() => setInputValue('I want to track my daily expenses with categories')}>
                    &quot;I want to track my daily expenses with categories&quot;
                  </li>
                  <li onClick={() => setInputValue('Help me build a habit tracker with streaks')}>
                    &quot;Help me build a habit tracker with streaks&quot;
                  </li>
                  <li onClick={() => setInputValue('I need a project task manager with priorities')}>
                    &quot;I need a project task manager with priorities&quot;
                  </li>
                </ul>
                <p className="welcome-hint">
                  💡 I&apos;ll automatically design the data model and interface. You can refine it until you&apos;re happy, then build!
                </p>
              </div>
            ) : (
              messages.map((message) => (
                <div 
                  key={message.id} 
                  className={`message message-${message.role}`}
                >
                  <div className="message-content">
                    {formatContent(message.content)}
                  </div>
                  <div className="message-time">
                    {new Date(message.timestamp).toLocaleTimeString()}
                  </div>
                </div>
              ))
            )}
            
            {/* Proposal selector */}
            {proposals && proposals.proposals.length > 0 && !isLoading && (
              <ProposalSelector
                proposalSet={proposals}
                onSelect={handleSelectProposal}
                className="proposal-section"
              />
            )}
            
            <div ref={messagesEndRef} />
          </div>

          {/* Proactive suggestions */}
          {suggestions.length > 0 && !proposals && !isLoading && (
            <div className="suggestions-panel">
              <span className="suggestions-label">Suggestions:</span>
              <div className="suggestions-list">
                {suggestions.slice(0, 3).map((suggestion) => (
                  <button
                    key={suggestion.id}
                    className="suggestion-chip"
                    onClick={() => handleSuggestionClick(suggestion)}
                    title={suggestion.reasoning}
                  >
                    {suggestion.icon && <span className="suggestion-icon">{suggestion.icon}</span>}
                    {suggestion.feature}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Suggested actions */}
          {suggestedActions.length > 0 && !isLoading && !proposals && (
            <div className="suggested-actions">
              {suggestedActions.map((action, i) => (
                <button
                  key={i}
                  className="suggested-action"
                  onClick={() => handleSuggestedAction(action)}
                >
                  {action}
                </button>
              ))}
            </div>
          )}

          {/* Input form */}
          <form className="chat-input-form" onSubmit={handleSubmit}>
            <input
              ref={inputRef}
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder={isLoading ? 'Thinking...' : 'Describe what you want to build...'}
              disabled={isLoading}
              className="chat-input"
            />
            <button 
              type="submit" 
              disabled={isLoading || !inputValue.trim()}
              className="send-button"
            >
              {isLoading ? (
                <span className="loading-spinner" />
              ) : (
                '→'
              )}
            </button>
          </form>
        </div>

        {/* Preview panel */}
        <div className="preview-panel">
          <div className="preview-header">
            <h2>Preview</h2>
            {appName && <span className="app-name">{appName}</span>}
          </div>
          <div className="preview-content-wrapper">
            <LivePreview
              conversationId={conversationId || ''}
              schema={schema}
              layout={layout}
              className="preview-container"
              onError={handlePreviewError}
            />
            
            {debugMode && (
              <div className="debug-overlay">
                <DebugPanel
                  code={debugComponentCode}
                  errorLog={errorLog}
                  onFix={handleDebugFix}
                  onApprove={handleDebugApprove}
                  isFixing={isFixing}
                />
              </div>
            )}
          </div>
        </div>
      </div>

      <style jsx>{`
        .scaffolder-v2 {
          display: flex;
          flex-direction: column;
          height: 100%;
          background: var(--background);
          color: var(--foreground);
        }

        .preview-content-wrapper {
          position: relative;
          flex: 1;
          display: flex;
          overflow: hidden;
        }
        
        .debug-overlay {
          position: absolute;
          top: 0;
          right: 0;
          bottom: 0;
          width: 400px;
          z-index: 10;
          box-shadow: -4px 0 16px rgba(0, 0, 0, 0.5);
        }

        .scaffolder-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 1rem 1.5rem;
          border-bottom: 1px solid var(--border);
        }

        .header-left {
          display: flex;
          align-items: center;
          gap: 1rem;
        }

        .scaffolder-header h1 {
          font-size: 1.25rem;
          font-weight: 600;
          margin: 0;
        }

        .readiness-indicator {
          display: flex;
          align-items: center;
          gap: 0.75rem;
        }

        .readiness-bar {
          width: 100px;
          height: 6px;
          background: var(--muted);
          border-radius: 3px;
          overflow: hidden;
        }

        .readiness-fill {
          height: 100%;
          background: linear-gradient(90deg, #ef4444 0%, #f59e0b 50%, #22c55e 100%);
          transition: width 0.3s ease;
        }

        .readiness-fill.almost {
          background: linear-gradient(90deg, #f59e0b 0%, #22c55e 100%);
        }

        .readiness-fill.ready {
          background: #22c55e;
          box-shadow: 0 0 8px rgba(34, 197, 94, 0.5);
        }

        .readiness-label {
          font-size: 0.75rem;
          color: var(--muted-foreground);
          transition: color 0.3s ease;
        }

        .readiness-label.ready {
          color: #22c55e;
          font-weight: 600;
        }

        .finalize-button {
          padding: 0.5rem 1.25rem;
          background: hsl(var(--destructive));
          color: hsl(var(--destructive-foreground));
          border: none;
          border-radius: 6px;
          font-size: 0.875rem;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
        }

        .finalize-button:hover:not(:disabled) {
          background: hsl(var(--destructive) / 0.9);
          transform: translateY(-1px);
        }

        .finalize-button:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .finalize-button.pulse-ready {
          background: #22c55e;
          color: white;
          box-shadow: 0 0 0 0 rgba(34, 197, 94, 0.7);
          animation: pulse-green 2s infinite;
        }

        .finalize-button.pulse-ready:hover:not(:disabled) {
          background: #16a34a;
        }

        @keyframes pulse-green {
          0% {
            box-shadow: 0 0 0 0 rgba(34, 197, 94, 0.7);
          }
          70% {
            box-shadow: 0 0 0 10px rgba(34, 197, 94, 0);
          }
          100% {
            box-shadow: 0 0 0 0 rgba(34, 197, 94, 0);
          }
        }

        .build-ready-banner {
          background: linear-gradient(90deg, rgba(34, 197, 94, 0.15) 0%, rgba(34, 197, 94, 0.05) 100%);
          border-bottom: 1px solid rgba(34, 197, 94, 0.3);
          padding: 0.75rem 1.5rem;
        }

        .banner-content {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.75rem;
        }

        .banner-icon {
          font-size: 1.25rem;
        }

        .banner-text {
          font-size: 0.875rem;
          font-weight: 500;
          color: #22c55e;
        }

        .banner-build-button {
          padding: 0.375rem 1rem;
          background: #22c55e;
          color: white;
          border: none;
          border-radius: 4px;
          font-size: 0.75rem;
          font-weight: 600;
          cursor: pointer;
          transition: background 0.2s;
        }

        .banner-build-button:hover {
          background: #16a34a;
        }

        .scaffolder-content {
          display: grid;
          grid-template-columns: 1fr 1fr;
          flex: 1;
          overflow: hidden;
        }

        @media (max-width: 1024px) {
          .scaffolder-content {
            grid-template-columns: 1fr;
          }

          .preview-panel {
            display: none;
          }
        }

        .chat-panel {
          display: flex;
          flex-direction: column;
          border-right: 1px solid var(--border);
          overflow: hidden;
        }

        .messages-container {
          flex: 1;
          overflow-y: auto;
          padding: 1rem 1.5rem;
        }

        .welcome-message {
          text-align: center;
          padding: 3rem 1rem;
          color: var(--muted-foreground);
        }

        .welcome-message h2 {
          color: var(--foreground);
          margin-bottom: 1rem;
        }

        .welcome-message ul {
          list-style: none;
          padding: 0;
          margin-top: 1rem;
        }

        .welcome-message li {
          padding: 0.5rem;
          background: var(--muted);
          border-radius: 6px;
          margin: 0.5rem 0;
          font-size: 0.875rem;
          cursor: pointer;
        }

        .welcome-message li:hover {
          background: rgba(255, 255, 255, 0.1);
          cursor: pointer;
        }

        .welcome-hint {
          margin-top: 1.5rem;
          font-size: 0.8rem;
          color: var(--muted-foreground);
          opacity: 0.8;
        }

        .message {
          margin-bottom: 1rem;
          max-width: 85%;
        }

        .message-user {
          margin-left: auto;
        }

        .message-user .message-content {
          background: hsl(var(--destructive));
          border-radius: 12px 12px 0 12px;
        }

        .message-assistant .message-content {
          background: var(--muted);
          border-radius: 12px 12px 12px 0;
        }

        .message-system .message-content {
          background: hsl(var(--destructive) / 0.1);
          border: 1px solid hsl(var(--destructive) / 0.3);
          color: hsl(var(--destructive));
          border-radius: 8px;
        }

        .message-content {
          padding: 0.75rem 1rem;
        }

        :global(.message-header) {
          font-size: 1.125rem;
          font-weight: 600;
          margin: 0 0 0.5rem 0;
          color: hsl(var(--destructive));
        }

        :global(.message-subheader) {
          font-size: 0.875rem;
          font-weight: 600;
          margin: 0.75rem 0 0.25rem 0;
          color: #cccccc; /* text-secondary */
        }

        :global(.message-paragraph) {
          margin: 0.5rem 0;
          line-height: 1.5;
        }

        :global(.message-list-item) {
          margin: 0.25rem 0 0.25rem 1rem;
          list-style: disc;
        }

        :global(.message-divider) {
          border: none;
          border-top: 1px solid #2d2d2d; /* outline-light */
          margin: 1rem 0;
        }

        .message-time {
          font-size: 0.625rem;
          color: #888888; /* text-tertiary */
          margin-top: 0.25rem;
          text-align: right;
        }

        .suggested-actions {
          display: flex;
          flex-wrap: wrap;
          gap: 0.5rem;
          padding: 0.5rem 1.5rem;
          border-top: 1px solid var(--border);
        }

        .suggested-action {
          padding: 0.5rem 0.75rem;
          background: var(--muted);
          border: 1px solid var(--border);
          color: var(--foreground);
          border-radius: 9999px;
          font-size: 0.75rem;
          cursor: pointer;
          transition: all 0.2s;
        }

        .suggested-action:hover {
          background: var(--muted) / 0.8;
          border-color: var(--border) / 0.8;
        }

        .suggestions-panel {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          padding: 0.5rem 1.5rem;
          border-top: 1px solid var(--border);
          background: hsl(var(--destructive) / 0.03);
        }

        .suggestions-label {
          font-size: 0.75rem;
          color: var(--muted-foreground);
          white-space: nowrap;
        }

        .suggestions-list {
          display: flex;
          flex-wrap: wrap;
          gap: 0.5rem;
        }

        .suggestion-chip {
          display: flex;
          align-items: center;
          gap: 0.25rem;
          padding: 0.375rem 0.625rem;
          background: hsl(var(--destructive) / 0.1);
          border: 1px solid hsl(var(--destructive) / 0.2);
          color: hsl(var(--destructive));
          border-radius: 6px;
          font-size: 0.75rem;
          cursor: pointer;
          transition: all 0.2s;
        }

        .suggestion-chip:hover {
          background: hsl(var(--destructive) / 0.2);
          border-color: hsl(var(--destructive) / 0.4);
        }

        .suggestion-icon {
          font-size: 0.875rem;
        }

        :global(.proposal-section) {
          margin: 1rem 0;
          padding: 1rem;
          background: #111111; /* surface-mid */
          border-radius: 12px;
          border: 1px solid #2d2d2d; /* outline-light */
        }

        .chat-input-form {
          display: flex;
          gap: 0.5rem;
          padding: 1rem 1.5rem;
          border-top: 1px solid #2d2d2d; /* outline-light */
        }

        .chat-input {
          flex: 1;
          padding: 0.75rem 1rem;
          background: #1a1a1a; /* surface-light */
          border: 1px solid #333333; /* outline-mid */
          border-radius: 8px;
          color: #ffffff; /* text-primary */
          font-size: 0.875rem;
        }

        .chat-input:focus {
          outline: none;
          border-color: #fca000; /* accent-yellow */
        }

        .chat-input:disabled {
          opacity: 0.5;
        }

        .send-button {
          padding: 0.75rem 1rem;
          background: #fca000; /* accent-yellow */
          color: #0a0a0a; /* surface-dark for contrast */
          border: none;
          border-radius: 8px;
          font-size: 1rem;
          cursor: pointer;
          transition: background 0.2s;
          min-width: 44px;
        }

        .send-button:hover:not(:disabled) {
          background: hsl(var(--destructive) / 0.9);
        }

        .send-button:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .loading-spinner {
          display: inline-block;
          width: 16px;
          height: 16px;
          border: 2px solid rgba(255, 255, 255, 0.3);
          border-top-color: #ffffff; /* text-primary */
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        .preview-panel {
          display: flex;
          flex-direction: column;
          overflow: hidden;
          background: var(--card);
        }

        .preview-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0.75rem 1rem;
          border-bottom: 1px solid var(--border);
        }

        .preview-header h2 {
          font-size: 0.875rem;
          font-weight: 500;
          margin: 0;
          color: #cccccc; /* text-secondary */
        }

        .app-name {
          font-size: 0.75rem;
          color: #888888; /* text-tertiary */
        }

        :global(.preview-container) {
          flex: 1;
        }
      `}</style>
    </div>
  );
}

export default ConversationalScaffolderV2;
