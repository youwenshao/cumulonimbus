'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Button, ThemeToggle, ChatInput, ChatMessage } from '@/components/ui';
import { 
  Terminal, 
  Rocket, 
  CheckCircle, 
  Sparkles, 
  Code, 
  Eye, 
  PanelLeft, 
  PanelLeftClose, 
  Loader2, 
  FileCode,
  FolderOpen,
  ChevronDown,
  ChevronRight,
  Plus,
  Trash,
  RefreshCw,
} from 'lucide-react';
import { toast } from 'sonner';
import { cn, generateId, getAppUrl } from '@/lib/utils';
import { DyadMarkdown } from './DyadMarkdown';
import { FileExplorer } from './FileExplorer';

interface V3CreatorProps {
  onComplete?: (appId: string, subdomain?: string) => void;
  onCancel?: () => void;
  initialConversationId?: string;
  initialAppId?: string;
}

interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  isStreaming?: boolean;
  toolExecutions?: Array<{ tool: string; args: unknown; result: string }>;
}

interface FileInfo {
  path: string;
  size: number;
}

type Phase = 'chatting' | 'building' | 'preview' | 'loading';

export function V3Creator({ onComplete, onCancel, initialConversationId, initialAppId }: V3CreatorProps) {
  const [phase, setPhase] = useState<Phase>(initialConversationId ? 'loading' : 'chatting');
  const [messages, setMessages] = useState<Message[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [currentStreamContent, setCurrentStreamContent] = useState('');
  const [conversationId, setConversationId] = useState<string | null>(initialConversationId || null);
  const [appId, setAppId] = useState<string | null>(initialAppId || null);
  const [subdomain, setSubdomain] = useState<string | null>(null);
  const [files, setFiles] = useState<FileInfo[]>([]);
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [fileContent, setFileContent] = useState<string>('');
  const [showFiles, setShowFiles] = useState(true);
  const [showPreview, setShowPreview] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const eventSourceRef = useRef<EventSource | null>(null);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, currentStreamContent]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      abortControllerRef.current?.abort();
      eventSourceRef.current?.close();
    };
  }, []);

  // Load existing conversation
  useEffect(() => {
    if (!initialConversationId) return;
    
    async function loadConversation() {
      try {
        const res = await fetch(`/api/conversations/${initialConversationId}`);
        if (!res.ok) throw new Error('Failed to load conversation');
        
        const data = await res.json();
        const loadedMessages = JSON.parse(data.messages || '[]');
        
        setMessages(loadedMessages.map((m: any, i: number) => ({
          id: `msg-${i}`,
          role: m.role,
          content: m.content,
        })));
        
        if (data.appId) {
          setAppId(data.appId);
          await loadFiles(data.appId);
          await loadAppInfo(data.appId);
        }
        
        setPhase('chatting');
      } catch (error) {
        console.error('Failed to load conversation:', error);
        setLoadError('Failed to load conversation');
        setPhase('chatting');
      }
    }
    
    loadConversation();
  }, [initialConversationId]);

  // Load app files
  const loadFiles = async (id: string) => {
    try {
      const res = await fetch(`/api/scaffolder-v3/files/${id}`);
      if (!res.ok) return;
      
      const data = await res.json();
      setFiles(data.files || []);
    } catch (error) {
      console.error('Failed to load files:', error);
    }
  };

  // Load app info
  const loadAppInfo = async (id: string) => {
    try {
      const res = await fetch(`/api/apps/${id}`);
      if (!res.ok) return;
      
      const data = await res.json();
      setSubdomain(data.subdomain);
    } catch (error) {
      console.error('Failed to load app info:', error);
    }
  };

  // Load file content
  const loadFileContent = async (path: string) => {
    if (!appId) return;
    
    try {
      const res = await fetch(`/api/scaffolder-v3/files/${appId}?path=${encodeURIComponent(path)}`);
      if (!res.ok) return;
      
      const data = await res.json();
      setFileContent(data.content);
      setSelectedFile(path);
    } catch (error) {
      console.error('Failed to load file content:', error);
    }
  };

  // Send message
  const sendMessage = async (content: string) => {
    if (isStreaming) return;
    
    // Add user message
    const userMessage: Message = {
      id: generateId(),
      role: 'user',
      content,
    };
    setMessages(prev => [...prev, userMessage]);
    
    // Start streaming
    setIsStreaming(true);
    setCurrentStreamContent('');
    setPhase('building');
    
    try {
      // Send message to API
      const res = await fetch('/api/scaffolder-v3', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conversationId,
          message: content,
          action: 'chat',
          appId,
        }),
      });
      
      if (!res.ok) {
        throw new Error('Failed to send message');
      }
      
      const data = await res.json();
      
      if (!data.success) {
        throw new Error(data.error || 'Unknown error');
      }
      
      // Store IDs
      setConversationId(data.conversationId);
      setAppId(data.appId);
      
      // Connect to SSE stream
      const eventSource = new EventSource(`/api/scaffolder-v3/stream/${data.conversationId}`);
      eventSourceRef.current = eventSource;
      
      let streamContent = '';
      
      eventSource.addEventListener('connected', (e) => {
        console.log('Connected to stream');
      });
      
      eventSource.addEventListener('chunk', (e) => {
        const { content } = JSON.parse(e.data);
        streamContent += content;
        setCurrentStreamContent(streamContent);
      });
      
      eventSource.addEventListener('complete', async (e) => {
        const result = JSON.parse(e.data);
        
        // Add assistant message
        const assistantMessage: Message = {
          id: generateId(),
          role: 'assistant',
          content: streamContent,
          toolExecutions: result.toolExecutions,
        };
        setMessages(prev => [...prev, assistantMessage]);
        setCurrentStreamContent('');
        setIsStreaming(false);
        setPhase('preview');
        
        // Refresh files
        if (data.appId) {
          await loadFiles(data.appId);
          await loadAppInfo(data.appId);
        }
        
        eventSource.close();
        eventSourceRef.current = null;
        
        toast.success('Generation complete!');
      });
      
      eventSource.addEventListener('error', (e) => {
        let errorMsg = 'Stream error';
        try {
          const data = JSON.parse((e as any).data);
          errorMsg = data.error || errorMsg;
        } catch {}
        
        toast.error(errorMsg);
        setIsStreaming(false);
        setPhase('chatting');
        eventSource.close();
        eventSourceRef.current = null;
      });
      
      eventSource.onerror = () => {
        if (eventSource.readyState === EventSource.CLOSED) return;
        
        toast.error('Connection lost');
        setIsStreaming(false);
        setPhase('chatting');
        eventSource.close();
        eventSourceRef.current = null;
      };
      
    } catch (error) {
      console.error('Failed to send message:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to send message');
      setIsStreaming(false);
      setPhase('chatting');
    }
  };

  // Open app in new tab
  const openApp = () => {
    if (!subdomain) return;
    const url = getAppUrl(subdomain, window.location.host);
    window.open(url, '_blank');
  };

  // Render welcome screen for new conversations
  if (!conversationId && messages.length === 0) {
    return (
      <div className="h-screen flex flex-col bg-surface-base">
        <header className="border-b border-outline-mid/50 bg-surface-base/80 backdrop-blur-md px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-accent-yellow" />
            <span className="font-medium text-text-primary">V3 App Builder</span>
            <span className="text-xs px-2 py-0.5 bg-accent-yellow/20 text-accent-yellow rounded">Beta</span>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            {onCancel && (
              <Button variant="ghost" size="sm" onClick={onCancel}>
                Back
              </Button>
            )}
          </div>
        </header>
        
        <div className="flex-1 flex items-center justify-center p-8">
          <div className="max-w-2xl w-full text-center">
            <div className="w-16 h-16 rounded-xl bg-accent-yellow/20 flex items-center justify-center mx-auto mb-6">
              <Sparkles className="w-8 h-8 text-accent-yellow" />
            </div>
            <h1 className="text-3xl font-bold text-text-primary mb-2">
              Build Your App with AI
            </h1>
            <p className="text-text-secondary mb-8">
              Describe what you want to build and watch it come to life. Uses Vite + React + Shadcn/UI.
            </p>
            
            <div className="bg-surface-layer rounded-xl p-6 border border-outline-mid">
              <ChatInput
                onSubmit={sendMessage}
                placeholder="Describe the app you want to build..."
                disabled={isStreaming}
              />
            </div>
            
            <div className="mt-8 grid grid-cols-3 gap-4 text-left">
              <button
                onClick={() => sendMessage('Build a todo list app with categories and priorities')}
                className="p-4 bg-surface-layer rounded-lg border border-outline-mid hover:border-accent-yellow/50 transition-colors text-left"
              >
                <CheckCircle className="w-5 h-5 text-green-400 mb-2" />
                <h3 className="font-medium text-text-primary text-sm">Todo List</h3>
                <p className="text-xs text-text-tertiary">With categories & priorities</p>
              </button>
              
              <button
                onClick={() => sendMessage('Build a personal finance tracker with expense categories and charts')}
                className="p-4 bg-surface-layer rounded-lg border border-outline-mid hover:border-accent-yellow/50 transition-colors text-left"
              >
                <Terminal className="w-5 h-5 text-blue-400 mb-2" />
                <h3 className="font-medium text-text-primary text-sm">Finance Tracker</h3>
                <p className="text-xs text-text-tertiary">Expenses & charts</p>
              </button>
              
              <button
                onClick={() => sendMessage('Build a habit tracker with streaks and daily goals')}
                className="p-4 bg-surface-layer rounded-lg border border-outline-mid hover:border-accent-yellow/50 transition-colors text-left"
              >
                <Rocket className="w-5 h-5 text-purple-400 mb-2" />
                <h3 className="font-medium text-text-primary text-sm">Habit Tracker</h3>
                <p className="text-xs text-text-tertiary">Streaks & goals</p>
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-surface-base">
      {/* Header */}
      <header className="border-b border-outline-mid/50 bg-surface-base/80 backdrop-blur-md px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-accent-yellow" />
          <span className="font-medium text-text-primary">V3 App Builder</span>
          {subdomain && (
            <span className="text-xs px-2 py-0.5 bg-surface-layer text-text-secondary rounded">
              {subdomain}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowFiles(!showFiles)}
          >
            {showFiles ? <PanelLeftClose className="w-4 h-4" /> : <PanelLeft className="w-4 h-4" />}
          </Button>
          <ThemeToggle />
          {subdomain && (
            <Button variant="outline" size="sm" onClick={openApp}>
              <Eye className="w-4 h-4 mr-1" />
              Open App
            </Button>
          )}
          {onCancel && (
            <Button variant="ghost" size="sm" onClick={onCancel}>
              Back
            </Button>
          )}
        </div>
      </header>
      
      {/* Main content */}
      <div className="flex-1 flex overflow-hidden">
        {/* File explorer */}
        {showFiles && (
          <div className="w-64 border-r border-outline-mid bg-surface-layer overflow-auto">
            <FileExplorer
              files={files}
              selectedFile={selectedFile}
              onSelectFile={loadFileContent}
            />
          </div>
        )}
        
        {/* Chat area */}
        <div className="flex-1 flex flex-col">
          {/* Messages */}
          <div className="flex-1 overflow-auto p-4 space-y-4">
            {messages.map((message) => (
              <div key={message.id} className={cn(
                "max-w-4xl mx-auto",
                message.role === 'user' ? 'ml-auto' : 'mr-auto'
              )}>
                {message.role === 'user' ? (
                  <div className="bg-accent-yellow/20 text-text-primary rounded-lg px-4 py-3">
                    {message.content}
                  </div>
                ) : (
                  <div className="bg-surface-layer rounded-lg px-4 py-3 border border-outline-mid">
                    <DyadMarkdown content={message.content} />
                  </div>
                )}
              </div>
            ))}
            
            {/* Streaming content */}
            {isStreaming && currentStreamContent && (
              <div className="max-w-4xl mx-auto bg-surface-layer rounded-lg px-4 py-3 border border-outline-mid">
                <div className="flex items-center gap-2 mb-2">
                  <Loader2 className="w-4 h-4 animate-spin text-accent-yellow" />
                  <span className="text-sm text-text-secondary">Generating...</span>
                </div>
                <DyadMarkdown content={currentStreamContent} />
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </div>
          
          {/* Input */}
          <div className="border-t border-outline-mid p-4 bg-surface-layer">
            <div className="max-w-4xl mx-auto">
              <ChatInput
                onSubmit={sendMessage}
                placeholder={isStreaming ? "Generating..." : "Describe what you want to change..."}
                disabled={isStreaming}
              />
            </div>
          </div>
        </div>
        
        {/* Preview */}
        {showPreview && subdomain && phase === 'preview' && (
          <div className="w-1/2 border-l border-outline-mid bg-surface-base">
            <div className="h-full flex flex-col">
              <div className="flex items-center justify-between px-4 py-2 border-b border-outline-mid">
                <span className="text-sm text-text-secondary">Live Preview</span>
                <Button variant="ghost" size="sm" onClick={openApp}>
                  <Eye className="w-4 h-4" />
                </Button>
              </div>
              <div className="flex-1">
                <iframe
                  src={getAppUrl(subdomain, window.location.host)}
                  className="w-full h-full border-0"
                  title="App Preview"
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default V3Creator;
