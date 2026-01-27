'use client';

import React, { useState, useMemo } from 'react';
import { 
  FileCode, 
  FilePlus, 
  FileEdit, 
  FileX, 
  FileSymlink, 
  Package, 
  MessageSquare,
  ChevronDown,
  ChevronRight,
  Copy,
  Check,
  RefreshCw,
  Play,
  Pause,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface DyadMarkdownProps {
  content: string;
  className?: string;
}

interface ParsedTag {
  type: 'write' | 'edit' | 'delete' | 'rename' | 'add-dependency' | 'chat-summary' | 'command' | 'text';
  attributes: Record<string, string>;
  content: string;
  raw: string;
}

/**
 * Parse Dyad XML tags from content
 */
function parseDyadContent(content: string): ParsedTag[] {
  const parts: ParsedTag[] = [];
  
  // Regular expression to match Dyad tags
  const tagRegex = /<dyad-(\w+(?:-\w+)*)([^>]*)(?:\/>|>([\s\S]*?)<\/dyad-\1>)/g;
  
  let lastIndex = 0;
  let match;
  
  while ((match = tagRegex.exec(content)) !== null) {
    // Add text before this tag
    if (match.index > lastIndex) {
      const text = content.slice(lastIndex, match.index);
      if (text.trim()) {
        parts.push({
          type: 'text',
          attributes: {},
          content: text,
          raw: text,
        });
      }
    }
    
    const [fullMatch, tagName, attrsString, tagContent] = match;
    
    // Parse attributes
    const attributes: Record<string, string> = {};
    const attrRegex = /(\w+)="([^"]*)"/g;
    let attrMatch;
    while ((attrMatch = attrRegex.exec(attrsString)) !== null) {
      attributes[attrMatch[1]] = attrMatch[2]
        .replace(/&apos;/g, "'")
        .replace(/&quot;/g, '"')
        .replace(/&gt;/g, '>')
        .replace(/&lt;/g, '<')
        .replace(/&amp;/g, '&');
    }
    
    parts.push({
      type: tagName as ParsedTag['type'],
      attributes,
      content: tagContent?.trim() || '',
      raw: fullMatch,
    });
    
    lastIndex = match.index + fullMatch.length;
  }
  
  // Add remaining text
  if (lastIndex < content.length) {
    const text = content.slice(lastIndex);
    if (text.trim()) {
      parts.push({
        type: 'text',
        attributes: {},
        content: text,
        raw: text,
      });
    }
  }
  
  return parts;
}

/**
 * Code block with syntax highlighting and copy functionality
 */
function CodeBlock({ 
  code, 
  language = 'tsx',
  maxHeight = 400,
}: { 
  code: string; 
  language?: string;
  maxHeight?: number;
}) {
  const [copied, setCopied] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  
  const lineCount = code.split('\n').length;
  const shouldCollapse = lineCount > 20;
  
  const copyCode = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  
  return (
    <div className="relative group">
      <div 
        className={cn(
          "overflow-auto rounded bg-surface-base border border-outline-light",
          !isExpanded && shouldCollapse && "max-h-64"
        )}
      >
        <pre className="text-sm p-4 overflow-x-auto">
          <code className="text-text-secondary font-mono">
            {code}
          </code>
        </pre>
      </div>
      
      {/* Copy button */}
      <button
        onClick={copyCode}
        className="absolute top-2 right-2 p-1.5 rounded bg-surface-layer border border-outline-mid opacity-0 group-hover:opacity-100 transition-opacity"
      >
        {copied ? (
          <Check className="w-4 h-4 text-green-400" />
        ) : (
          <Copy className="w-4 h-4 text-text-tertiary" />
        )}
      </button>
      
      {/* Expand/collapse */}
      {shouldCollapse && (
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="w-full py-2 text-center text-sm text-text-tertiary hover:text-text-secondary bg-surface-layer border-t border-outline-light"
        >
          {isExpanded ? 'Show less' : `Show all ${lineCount} lines`}
        </button>
      )}
    </div>
  );
}

/**
 * File operation card
 */
function FileOperationCard({
  type,
  path,
  description,
  content,
  toPath,
}: {
  type: 'write' | 'edit' | 'delete' | 'rename';
  path: string;
  description?: string;
  content?: string;
  toPath?: string;
}) {
  const [isExpanded, setIsExpanded] = useState(true);
  
  const icons = {
    write: <FilePlus className="w-4 h-4 text-green-400" />,
    edit: <FileEdit className="w-4 h-4 text-blue-400" />,
    delete: <FileX className="w-4 h-4 text-red-400" />,
    rename: <FileSymlink className="w-4 h-4 text-yellow-400" />,
  };
  
  const labels = {
    write: 'Created',
    edit: 'Edited',
    delete: 'Deleted',
    rename: 'Renamed',
  };
  
  return (
    <div className="rounded-lg border border-outline-mid overflow-hidden bg-surface-base">
      {/* Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center gap-2 px-3 py-2 bg-surface-layer hover:bg-surface-elevated transition-colors"
      >
        {isExpanded ? (
          <ChevronDown className="w-4 h-4 text-text-tertiary" />
        ) : (
          <ChevronRight className="w-4 h-4 text-text-tertiary" />
        )}
        {icons[type]}
        <span className="text-sm font-medium text-text-primary flex-1 text-left truncate">
          {path}
        </span>
        <span className={cn(
          "text-xs px-2 py-0.5 rounded",
          type === 'write' && "bg-green-500/20 text-green-400",
          type === 'edit' && "bg-blue-500/20 text-blue-400",
          type === 'delete' && "bg-red-500/20 text-red-400",
          type === 'rename' && "bg-yellow-500/20 text-yellow-400",
        )}>
          {labels[type]}
        </span>
      </button>
      
      {/* Content */}
      {isExpanded && (
        <div className="border-t border-outline-mid">
          {description && (
            <div className="px-3 py-2 text-sm text-text-secondary border-b border-outline-light">
              {description}
            </div>
          )}
          
          {type === 'rename' && toPath && (
            <div className="px-3 py-2 text-sm text-text-secondary">
              <span className="text-text-tertiary">To:</span> {toPath}
            </div>
          )}
          
          {content && type !== 'delete' && (
            <CodeBlock code={content} />
          )}
        </div>
      )}
    </div>
  );
}

/**
 * Dependency card
 */
function DependencyCard({ packages, dev }: { packages: string; dev?: boolean }) {
  const packageList = packages.split(/\s+/).filter(Boolean);
  
  return (
    <div className="rounded-lg border border-outline-mid overflow-hidden bg-surface-base">
      <div className="flex items-center gap-2 px-3 py-2 bg-surface-layer">
        <Package className="w-4 h-4 text-purple-400" />
        <span className="text-sm font-medium text-text-primary">
          {dev ? 'Dev Dependencies' : 'Dependencies'} Added
        </span>
      </div>
      <div className="px-3 py-2 flex flex-wrap gap-2">
        {packageList.map((pkg) => (
          <span
            key={pkg}
            className="text-xs px-2 py-1 rounded bg-purple-500/20 text-purple-400 font-mono"
          >
            {pkg}
          </span>
        ))}
      </div>
    </div>
  );
}

/**
 * Command card
 */
function CommandCard({ type }: { type: string }) {
  const icons: Record<string, React.ReactNode> = {
    rebuild: <RefreshCw className="w-4 h-4 text-orange-400" />,
    restart: <Play className="w-4 h-4 text-green-400" />,
    refresh: <RefreshCw className="w-4 h-4 text-blue-400" />,
  };
  
  const labels: Record<string, string> = {
    rebuild: 'Rebuild App',
    restart: 'Restart Server',
    refresh: 'Refresh Preview',
  };
  
  return (
    <div className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-outline-mid bg-surface-layer">
      {icons[type] || <Play className="w-4 h-4 text-text-tertiary" />}
      <span className="text-sm text-text-primary">{labels[type] || type}</span>
    </div>
  );
}

/**
 * Chat summary card
 */
function ChatSummaryCard({ summary }: { summary: string }) {
  return (
    <div className="flex items-center gap-2 px-3 py-2 rounded-lg border border-outline-mid bg-surface-layer">
      <MessageSquare className="w-4 h-4 text-accent-yellow" />
      <span className="text-sm text-text-secondary">Summary:</span>
      <span className="text-sm text-text-primary">{summary}</span>
    </div>
  );
}

/**
 * Main DyadMarkdown component
 */
export function DyadMarkdown({ content, className }: DyadMarkdownProps) {
  const parts = useMemo(() => parseDyadContent(content), [content]);
  
  return (
    <div className={cn("space-y-3", className)}>
      {parts.map((part, index) => {
        switch (part.type) {
          case 'write':
            return (
              <FileOperationCard
                key={index}
                type="write"
                path={part.attributes.path}
                description={part.attributes.description}
                content={part.content}
              />
            );
          
          case 'edit':
            return (
              <FileOperationCard
                key={index}
                type="edit"
                path={part.attributes.path}
                description={part.attributes.description}
                content={part.content}
              />
            );
          
          case 'delete':
            return (
              <FileOperationCard
                key={index}
                type="delete"
                path={part.attributes.path}
              />
            );
          
          case 'rename':
            return (
              <FileOperationCard
                key={index}
                type="rename"
                path={part.attributes.from}
                toPath={part.attributes.to}
              />
            );
          
          case 'add-dependency':
            return (
              <DependencyCard
                key={index}
                packages={part.attributes.packages}
                dev={part.attributes.dev === 'true'}
              />
            );
          
          case 'command':
            return <CommandCard key={index} type={part.attributes.type} />;
          
          case 'chat-summary':
            return <ChatSummaryCard key={index} summary={part.content || part.attributes.summary} />;
          
          case 'text':
          default:
            // Render as plain text with basic formatting
            return (
              <div key={index} className="text-text-secondary whitespace-pre-wrap">
                {part.content}
              </div>
            );
        }
      })}
    </div>
  );
}

export default DyadMarkdown;
