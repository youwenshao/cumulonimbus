/**
 * V3 Scaffolder Agent
 * Main orchestrator for tool-based code generation
 * Uses streaming text completion with XML tag parsing
 */

import { streamComplete, type ChatMessage } from '@/lib/qwen';
import { constructSystemPrompt } from './prompts';
import { 
  AgentContext, 
  AgentTodo, 
  UserMessageContentPart,
  TOOL_DEFINITIONS,
  getToolByName,
  escapeXmlAttr,
  normalizePath,
} from './tools';
import type { UserLLMSettings } from '@/lib/llm';

// ============================================================================
// Types
// ============================================================================

export interface AgentStreamParams {
  conversationId: string;
  appId: string;
  userId: string;
  userMessage: string;
  /** Existing component files loaded from database */
  componentFiles: Record<string, string>;
  /** Package.json contents */
  packageJson: Record<string, unknown>;
  /** Previous messages in the conversation */
  messages: ChatMessage[];
  /** User LLM settings */
  userSettings?: UserLLMSettings;
  /** Callback for streaming chunks */
  onChunk: (chunk: string) => void;
  /** Callback for tool execution */
  onToolExecution?: (toolName: string, args: unknown, result: string) => void;
  /** Callback for completion */
  onComplete: (result: AgentResult) => void;
  /** Callback for errors */
  onError?: (error: Error) => void;
  /** Abort signal */
  abortSignal?: AbortSignal;
  /** Read-only mode (no file modifications) */
  readOnly?: boolean;
}

export interface AgentResult {
  /** Full response text (including XML tags) */
  fullResponse: string;
  /** Updated component files */
  componentFiles: Record<string, string>;
  /** Updated package.json */
  packageJson: Record<string, unknown>;
  /** Chat summary if set */
  chatSummary?: string;
  /** Files that were modified */
  modifiedFiles: string[];
  /** Files that were created */
  createdFiles: string[];
  /** Files that were deleted */
  deletedFiles: string[];
  /** Dependencies that were added */
  addedDependencies: string[];
  /** Tool executions performed */
  toolExecutions: { tool: string; args: unknown; result: string }[];
}

// ============================================================================
// XML Tag Parsing
// ============================================================================

interface ParsedTag {
  name: string;
  attributes: Record<string, string>;
  content: string;
  fullMatch: string;
}

/**
 * Parse Dyad-style XML tags from response text
 */
function parseDyadTags(text: string): ParsedTag[] {
  const tags: ParsedTag[] = [];
  
  // Match self-closing and content tags
  const tagRegex = /<dyad-(\w+)([^>]*)(?:\/>|>([\s\S]*?)<\/dyad-\1>)/g;
  
  let match;
  while ((match = tagRegex.exec(text)) !== null) {
    const [fullMatch, tagName, attrsString, content] = match;
    
    // Parse attributes
    const attributes: Record<string, string> = {};
    const attrRegex = /(\w+)="([^"]*)"/g;
    let attrMatch;
    while ((attrMatch = attrRegex.exec(attrsString)) !== null) {
      attributes[attrMatch[1]] = unescapeXmlAttr(attrMatch[2]);
    }
    
    tags.push({
      name: tagName,
      attributes,
      content: content?.trim() || '',
      fullMatch,
    });
  }
  
  return tags;
}

/**
 * Unescape XML attributes
 */
function unescapeXmlAttr(str: string): string {
  return str
    .replace(/&apos;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&gt;/g, '>')
    .replace(/&lt;/g, '<')
    .replace(/&amp;/g, '&');
}

// ============================================================================
// Tool Execution
// ============================================================================

/**
 * Execute tools based on parsed tags
 */
async function executeTool(
  tag: ParsedTag,
  ctx: AgentContext,
  readOnly: boolean
): Promise<{ success: boolean; result?: string; error?: string }> {
  const tagToTool: Record<string, string> = {
    'write': 'write_file',
    'edit': 'edit_file',
    'delete': 'delete_file',
    'rename': 'rename_file',
    'add-dependency': 'add_dependency',
    'chat-summary': 'set_chat_summary',
    'command': null as unknown as string, // Handled specially
  };
  
  const toolName = tagToTool[tag.name];
  
  // Handle commands (not a tool, just UI hint)
  if (tag.name === 'command') {
    return { success: true, result: `Command: ${tag.attributes.type}` };
  }
  
  if (!toolName) {
    return { success: false, error: `Unknown tag: dyad-${tag.name}` };
  }
  
  const tool = getToolByName(toolName);
  if (!tool) {
    return { success: false, error: `Tool not found: ${toolName}` };
  }
  
  // Check read-only mode
  if (readOnly && tool.modifiesState) {
    return { success: false, error: `Cannot use ${toolName} in read-only mode` };
  }
  
  try {
    // Build tool arguments from tag
    const args = buildToolArgs(tag, toolName);
    
    // Execute the tool
    const result = await tool.execute(args, ctx);
    
    return { success: true, result };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return { success: false, error: errorMessage };
  }
}

/**
 * Build tool arguments from a parsed tag
 */
function buildToolArgs(tag: ParsedTag, toolName: string): unknown {
  switch (toolName) {
    case 'write_file':
      return {
        path: tag.attributes.path,
        content: tag.content,
        description: tag.attributes.description,
      };
    case 'edit_file':
      return {
        path: tag.attributes.path,
        content: tag.content,
        description: tag.attributes.description,
      };
    case 'delete_file':
      return { path: tag.attributes.path };
    case 'rename_file':
      return {
        from: tag.attributes.from,
        to: tag.attributes.to,
      };
    case 'add_dependency':
      return {
        packages: tag.attributes.packages,
        dev: tag.attributes.dev === 'true',
      };
    case 'set_chat_summary':
      return { summary: tag.content || tag.attributes.summary };
    default:
      return tag.attributes;
  }
}

// ============================================================================
// Main Agent
// ============================================================================

/**
 * Execute the V3 agent with streaming
 */
export async function executeAgentStream(params: AgentStreamParams): Promise<void> {
  const {
    conversationId,
    appId,
    userId,
    userMessage,
    componentFiles,
    packageJson,
    messages,
    userSettings,
    onChunk,
    onToolExecution,
    onComplete,
    onError,
    abortSignal,
    readOnly = false,
  } = params;
  
  // Track modifications
  const modifiedFiles: string[] = [];
  const createdFiles: string[] = [];
  const deletedFiles: string[] = [];
  const addedDependencies: string[] = [];
  const toolExecutions: { tool: string; args: unknown; result: string }[] = [];
  
  // Create mutable copies for the context
  const workingFiles = { ...componentFiles };
  const workingPackageJson = { ...packageJson };
  
  // Build agent context
  let chatSummary: string | undefined;
  const todos: AgentTodo[] = [];
  const pendingUserMessages: UserMessageContentPart[][] = [];
  
  const ctx: AgentContext = {
    appId,
    userId,
    conversationId,
    componentFiles: workingFiles,
    packageJson: workingPackageJson,
    isSharedModulesChanged: false,
    chatSummary: undefined,
    todos,
    onXmlStream: (xml) => {
      // Stream preview - not persisted
    },
    onXmlComplete: (xml) => {
      // Final XML - can be used for UI
    },
    requireConsent: async ({ toolName }) => {
      // For now, auto-approve all tools
      return true;
    },
    appendUserMessage: (content) => {
      pendingUserMessages.push(content);
    },
    onUpdateTodos: (newTodos) => {
      todos.length = 0;
      todos.push(...newTodos);
    },
  };
  
  try {
    // Build system prompt
    const systemPrompt = constructSystemPrompt({ readOnly });
    
    // Build messages for LLM
    const llmMessages: ChatMessage[] = [
      { role: 'system', content: systemPrompt },
      ...messages,
      { role: 'user', content: userMessage },
    ];
    
    // Add file context to the first user message or system message
    const fileContext = buildFileContext(workingFiles, workingPackageJson);
    llmMessages[0] = {
      ...llmMessages[0],
      content: llmMessages[0].content + '\n\n' + fileContext,
    };
    
    // Stream the response
    let fullResponse = '';
    
    for await (const chunk of streamComplete({
      messages: llmMessages,
      temperature: 0.7,
      maxTokens: 8192,
      userSettings,
    })) {
      // Check for abort
      if (abortSignal?.aborted) {
        throw new Error('Aborted');
      }
      
      fullResponse += chunk;
      onChunk(chunk);
    }
    
    // Parse and execute tools from the response
    const tags = parseDyadTags(fullResponse);
    
    for (const tag of tags) {
      // Track which files existed before
      const existingFiles = new Set(Object.keys(workingFiles));
      
      // Execute the tool
      const result = await executeTool(tag, ctx, readOnly);
      
      if (result.success) {
        // Track modifications
        if (tag.name === 'write') {
          const path = normalizePath(tag.attributes.path);
          if (existingFiles.has(path)) {
            if (!modifiedFiles.includes(path)) modifiedFiles.push(path);
          } else {
            if (!createdFiles.includes(path)) createdFiles.push(path);
          }
        } else if (tag.name === 'edit') {
          const path = normalizePath(tag.attributes.path);
          if (!modifiedFiles.includes(path)) modifiedFiles.push(path);
        } else if (tag.name === 'delete') {
          const path = normalizePath(tag.attributes.path);
          if (!deletedFiles.includes(path)) deletedFiles.push(path);
        } else if (tag.name === 'add-dependency') {
          const packages = tag.attributes.packages?.split(/\s+/) || [];
          addedDependencies.push(...packages);
        } else if (tag.name === 'chat-summary') {
          chatSummary = tag.content || tag.attributes.summary;
        }
        
        // Track execution
        toolExecutions.push({
          tool: tag.name,
          args: tag.attributes,
          result: result.result || '',
        });
        
        // Notify callback
        onToolExecution?.(tag.name, tag.attributes, result.result || '');
      } else {
        console.error(`Tool execution failed for dyad-${tag.name}:`, result.error);
      }
    }
    
    // Complete
    onComplete({
      fullResponse,
      componentFiles: workingFiles,
      packageJson: workingPackageJson,
      chatSummary: chatSummary || ctx.chatSummary,
      modifiedFiles,
      createdFiles,
      deletedFiles,
      addedDependencies,
      toolExecutions,
    });
    
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));
    onError?.(err);
    throw err;
  }
}

/**
 * Build file context string for the LLM
 */
function buildFileContext(
  componentFiles: Record<string, string>,
  packageJson: Record<string, unknown>
): string {
  const lines: string[] = [
    '\n<current_codebase>',
    '',
    '## Project Files',
    '',
  ];
  
  // Sort files for consistent ordering
  const sortedFiles = Object.keys(componentFiles).sort();
  
  for (const filePath of sortedFiles) {
    const content = componentFiles[filePath];
    // Skip very large files or binary-looking content
    if (content.length > 50000 || /[\x00-\x08\x0E-\x1F]/.test(content)) {
      lines.push(`### ${filePath} (${content.length} bytes - too large to show)`);
      continue;
    }
    
    lines.push(`### ${filePath}`);
    lines.push('```');
    lines.push(content);
    lines.push('```');
    lines.push('');
  }
  
  // Add package.json info
  lines.push('## Dependencies (from package.json)');
  lines.push('```json');
  lines.push(JSON.stringify({
    dependencies: packageJson.dependencies,
    devDependencies: packageJson.devDependencies,
  }, null, 2));
  lines.push('```');
  
  lines.push('</current_codebase>');
  
  return lines.join('\n');
}

/**
 * Load scaffold template files
 */
export async function loadScaffoldTemplate(): Promise<{
  componentFiles: Record<string, string>;
  packageJson: Record<string, unknown>;
}> {
  // This would load from the scaffold directory
  // For now, return a minimal scaffold
  const scaffoldPackageJson = {
    name: 'cumulonimbus-app',
    version: '1.0.0',
    private: true,
    type: 'module',
    scripts: {
      dev: 'vite',
      build: 'vite build',
      preview: 'vite preview',
    },
    dependencies: {
      react: '^19.2.3',
      'react-dom': '^19.2.3',
      'react-router-dom': '^6.26.2',
      '@tanstack/react-query': '^5.56.2',
      'lucide-react': '^0.462.0',
      'clsx': '^2.1.1',
      'tailwind-merge': '^2.5.2',
      'class-variance-authority': '^0.7.1',
      'sonner': '^1.5.0',
      'zod': '^3.23.8',
      'react-hook-form': '^7.53.0',
      '@hookform/resolvers': '^3.9.0',
      'date-fns': '^3.6.0',
    },
    devDependencies: {
      '@types/react': '^19.2.8',
      '@types/react-dom': '^19.2.3',
      '@vitejs/plugin-react-swc': '^3.9.0',
      'typescript': '^5.5.3',
      'vite': '^6.3.4',
      'tailwindcss': '^3.4.11',
      'autoprefixer': '^10.4.20',
      'postcss': '^8.4.47',
    },
  };
  
  return {
    componentFiles: {},
    packageJson: scaffoldPackageJson,
  };
}

export default executeAgentStream;
