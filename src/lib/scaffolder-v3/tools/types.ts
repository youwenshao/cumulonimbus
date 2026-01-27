/**
 * Shared types and utilities for V3 Scaffolder tools
 * Adapted from Dyad for Cumulonimbus database-backed storage
 */

import { z } from 'zod';

// ============================================================================
// XML Escape Helpers
// ============================================================================

/**
 * Escape special characters for XML attributes
 */
export function escapeXmlAttr(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * Unescape XML attribute special characters
 */
export function unescapeXmlAttr(str: string): string {
  return str
    .replace(/&apos;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&gt;/g, '>')
    .replace(/&lt;/g, '<')
    .replace(/&amp;/g, '&');
}

/**
 * Escape special characters for XML content
 */
export function escapeXmlContent(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

/**
 * Unescape XML content special characters
 */
export function unescapeXmlContent(str: string): string {
  return str
    .replace(/&gt;/g, '>')
    .replace(/&lt;/g, '<')
    .replace(/&amp;/g, '&');
}

// ============================================================================
// Todo Types
// ============================================================================

export interface AgentTodo {
  id: string;
  text: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
}

// ============================================================================
// Agent Context
// ============================================================================

/**
 * Content part types for user messages (supports images)
 */
export type UserMessageContentPart =
  | { type: 'text'; text: string }
  | { type: 'image-url'; url: string };

/**
 * Context provided to tool execute functions
 */
export interface AgentContext {
  /** App ID in database */
  appId: string;
  /** User ID */
  userId: string;
  /** Conversation ID */
  conversationId: string;
  /** In-memory file system - maps file paths to content */
  componentFiles: Record<string, string>;
  /** Package.json contents (parsed) */
  packageJson: Record<string, unknown>;
  /** Whether shared modules were changed (for deployments) */
  isSharedModulesChanged: boolean;
  /** Chat summary for the conversation */
  chatSummary?: string;
  /** Turn-scoped todo list for agent task tracking */
  todos: AgentTodo[];
  
  /**
   * Streams accumulated XML to UI without persisting to DB (for live preview).
   * Call this repeatedly with the full accumulated XML so far.
   */
  onXmlStream: (accumulatedXml: string) => void;
  
  /**
   * Writes final XML to UI and persists to DB.
   * Call this once when the tool's XML output is complete.
   */
  onXmlComplete: (finalXml: string) => void;
  
  /**
   * Request user consent for a tool operation
   */
  requireConsent: (params: {
    toolName: string;
    toolDescription?: string | null;
    inputPreview?: string | null;
  }) => Promise<boolean>;
  
  /**
   * Append a user message to be sent after the tool result.
   */
  appendUserMessage: (content: UserMessageContentPart[]) => void;
  
  /**
   * Sends updated todos to the renderer for UI display.
   */
  onUpdateTodos: (todos: AgentTodo[]) => void;
}

// ============================================================================
// Partial JSON Parser
// ============================================================================

/**
 * Parse partial/streaming JSON into a partial object.
 * Handles incomplete JSON gracefully during streaming.
 */
export function parsePartialJson<T extends Record<string, unknown>>(
  jsonText: string,
): Partial<T> {
  if (!jsonText.trim()) {
    return {} as Partial<T>;
  }

  try {
    // Try direct parse first
    return JSON.parse(jsonText) as Partial<T>;
  } catch {
    // Try to repair common issues
    let repaired = jsonText.trim();
    
    // Add missing closing braces
    const openBraces = (repaired.match(/{/g) || []).length;
    const closeBraces = (repaired.match(/}/g) || []).length;
    repaired += '}'.repeat(Math.max(0, openBraces - closeBraces));
    
    // Add missing closing brackets
    const openBrackets = (repaired.match(/\[/g) || []).length;
    const closeBrackets = (repaired.match(/\]/g) || []).length;
    repaired += ']'.repeat(Math.max(0, openBrackets - closeBrackets));
    
    // Remove trailing comma before closing brace/bracket
    repaired = repaired.replace(/,\s*([\]}])/g, '$1');
    
    try {
      return JSON.parse(repaired) as Partial<T>;
    } catch {
      return {} as Partial<T>;
    }
  }
}

// ============================================================================
// Tool Result Types
// ============================================================================

/**
 * Tool result - simple string for now
 */
export type ToolResult = string;

/**
 * Tool consent levels
 */
export type AgentToolConsent = 'always' | 'ask' | 'never';

// ============================================================================
// Tool Definition Interface
// ============================================================================

export interface ToolDefinition<T = unknown> {
  /** Unique tool name */
  readonly name: string;
  
  /** Description of what the tool does (shown to LLM) */
  readonly description: string;
  
  /** Zod schema for tool arguments */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  readonly inputSchema: z.ZodType<any>;
  
  /** Default consent level for this tool */
  readonly defaultConsent: AgentToolConsent;
  
  /**
   * If true, this tool modifies state (files, database, etc.).
   * Used to filter out state-modifying tools in read-only mode.
   */
  readonly modifiesState?: boolean;
  
  /**
   * Execute the tool with the given arguments
   */
  execute: (args: T, ctx: AgentContext) => Promise<ToolResult>;

  /**
   * If defined, returns whether the tool should be available in the current context.
   */
  isEnabled?: (ctx: AgentContext) => boolean;

  /**
   * Returns a preview string describing what the tool will do with the given args.
   * Used for consent prompts.
   */
  getConsentPreview?: (args: T) => string;

  /**
   * Build XML from parsed partial args.
   * Called during streaming and on completion.
   */
  buildXml?: (args: Partial<T>, isComplete: boolean) => string | undefined;
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Normalize file path (remove leading/trailing slashes, ensure consistent format)
 */
export function normalizePath(filePath: string): string {
  return filePath
    .replace(/^\/+/, '')
    .replace(/\/+$/, '')
    .replace(/\/+/g, '/');
}

/**
 * Get file extension from path
 */
export function getFileExtension(filePath: string): string {
  const lastDot = filePath.lastIndexOf('.');
  if (lastDot === -1 || lastDot === 0) return '';
  return filePath.slice(lastDot + 1).toLowerCase();
}

/**
 * Get directory from file path
 */
export function getDirectory(filePath: string): string {
  const lastSlash = filePath.lastIndexOf('/');
  if (lastSlash === -1) return '';
  return filePath.slice(0, lastSlash);
}

/**
 * Get filename from path
 */
export function getFilename(filePath: string): string {
  const lastSlash = filePath.lastIndexOf('/');
  if (lastSlash === -1) return filePath;
  return filePath.slice(lastSlash + 1);
}

/**
 * Check if a path is within src directory (for safety)
 */
export function isWithinSrc(filePath: string): boolean {
  const normalized = normalizePath(filePath);
  return normalized.startsWith('src/') || normalized === 'src';
}

/**
 * Check if path is a config file that can be modified
 */
export function isConfigFile(filePath: string): boolean {
  const normalized = normalizePath(filePath);
  const allowedConfigs = [
    'package.json',
    'tsconfig.json',
    'tsconfig.app.json',
    'tsconfig.node.json',
    'vite.config.ts',
    'tailwind.config.ts',
    'postcss.config.js',
    'eslint.config.js',
    'index.html',
  ];
  return allowedConfigs.includes(normalized);
}

/**
 * Validate that a file path is safe to write
 */
export function validateWritePath(filePath: string): { valid: boolean; error?: string } {
  const normalized = normalizePath(filePath);
  
  // Check for path traversal
  if (normalized.includes('..')) {
    return { valid: false, error: 'Path traversal not allowed' };
  }
  
  // Must be within src/ or be a config file
  if (!isWithinSrc(normalized) && !isConfigFile(normalized)) {
    return { valid: false, error: 'Can only write to src/ directory or config files' };
  }
  
  // Check for dangerous extensions
  const ext = getFileExtension(normalized);
  const dangerousExtensions = ['sh', 'bash', 'exe', 'bat', 'cmd', 'ps1'];
  if (dangerousExtensions.includes(ext)) {
    return { valid: false, error: `Cannot write ${ext} files` };
  }
  
  return { valid: true };
}
