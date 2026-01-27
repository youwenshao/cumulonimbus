/**
 * V3 Scaffolder Tools
 * Export all tool definitions and utilities
 */

// Re-export types
export * from './types';

// Import all tools
import { writeFileTool } from './write_file';
import { editFileTool } from './edit_file';
import { deleteFileTool } from './delete_file';
import { renameFileTool } from './rename_file';
import { readFileTool } from './read_file';
import { listFilesTool } from './list_files';
import { grepTool } from './grep';
import { codeSearchTool } from './code_search';
import { addDependencyTool } from './add_dependency';
import { setChatSummaryTool } from './set_chat_summary';
import { updateTodosTool } from './update_todos';

import type { ToolDefinition, AgentContext, AgentToolConsent } from './types';

// Export individual tools
export {
  writeFileTool,
  editFileTool,
  deleteFileTool,
  renameFileTool,
  readFileTool,
  listFilesTool,
  grepTool,
  codeSearchTool,
  addDependencyTool,
  setChatSummaryTool,
  updateTodosTool,
};

/**
 * All available tools for the V3 scaffolder
 */
export const TOOL_DEFINITIONS = [
  // File operations (state-modifying)
  writeFileTool,
  editFileTool,
  deleteFileTool,
  renameFileTool,
  
  // File reading (non-modifying)
  readFileTool,
  listFilesTool,
  
  // Code analysis (non-modifying)
  grepTool,
  codeSearchTool,
  
  // Dependency management (state-modifying)
  addDependencyTool,
  
  // Helper tools (non-modifying)
  setChatSummaryTool,
  updateTodosTool,
] as const;

/**
 * Get tool by name
 */
export function getToolByName(name: string): ToolDefinition<unknown> | undefined {
  return TOOL_DEFINITIONS.find(t => t.name === name) as ToolDefinition<unknown> | undefined;
}

/**
 * Get all tool names
 */
export type ToolName = typeof TOOL_DEFINITIONS[number]['name'];

/**
 * Build tool set for AI SDK from tool definitions
 */
export interface BuildToolSetOptions {
  /** If true, exclude tools that modify state (files, database, etc.) */
  readOnly?: boolean;
  /** Tool consent overrides */
  consents?: Partial<Record<ToolName, AgentToolConsent>>;
}

/**
 * Build a tool set for the AI SDK
 */
export function buildToolSet(ctx: AgentContext, options: BuildToolSetOptions = {}) {
  const toolSet: Record<string, {
    description: string;
    parameters: Record<string, unknown>;
    execute: (args: unknown) => Promise<string>;
  }> = {};

  for (const tool of TOOL_DEFINITIONS) {
    // Skip state-modifying tools in read-only mode
    if (options.readOnly && tool.modifiesState) {
      continue;
    }

    // Check tool-specific consent
    const consent = options.consents?.[tool.name as ToolName] ?? tool.defaultConsent;
    if (consent === 'never') {
      continue;
    }

    // Check if tool is enabled in this context
    if (tool.isEnabled && !tool.isEnabled(ctx)) {
      continue;
    }

    // Convert zod schema to JSON schema for AI SDK
    toolSet[tool.name] = {
      description: tool.description,
      parameters: zodToJsonSchema(tool.inputSchema),
      execute: async (args: unknown) => {
        try {
          // Handle consent if needed
          if (consent === 'ask') {
            const preview = tool.getConsentPreview?.(args as any) ?? `Execute ${tool.name}`;
            const allowed = await ctx.requireConsent({
              toolName: tool.name,
              toolDescription: tool.description,
              inputPreview: preview,
            });
            if (!allowed) {
              throw new Error(`User denied permission for ${tool.name}`);
            }
          }

          return await tool.execute(args as any, ctx);
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          throw new Error(`Tool '${tool.name}' failed: ${errorMessage}`);
        }
      },
    };
  }

  return toolSet;
}

/**
 * Simple zod to JSON schema converter
 * This is a basic implementation - in production you'd use a library like zod-to-json-schema
 */
function zodToJsonSchema(schema: unknown): Record<string, unknown> {
  // This is a simplified version - the AI SDK will parse this
  // In production, use a proper zod-to-json-schema converter
  const zodSchema = schema as any;
  
  if (zodSchema._def?.typeName === 'ZodObject') {
    const shape = zodSchema._def.shape();
    const properties: Record<string, unknown> = {};
    const required: string[] = [];
    
    for (const [key, value] of Object.entries(shape)) {
      const fieldSchema = value as any;
      properties[key] = zodFieldToJsonSchema(fieldSchema);
      
      // Check if field is required (not optional)
      if (!fieldSchema._def?.typeName?.includes('Optional')) {
        required.push(key);
      }
    }
    
    return {
      type: 'object',
      properties,
      required,
    };
  }
  
  return { type: 'object' };
}

function zodFieldToJsonSchema(field: any): Record<string, unknown> {
  const typeName = field._def?.typeName;
  const description = field._def?.description;
  
  const base: Record<string, unknown> = {};
  if (description) {
    base.description = description;
  }
  
  switch (typeName) {
    case 'ZodString':
      return { ...base, type: 'string' };
    case 'ZodNumber':
      return { ...base, type: 'number' };
    case 'ZodBoolean':
      return { ...base, type: 'boolean' };
    case 'ZodArray':
      return { ...base, type: 'array', items: zodFieldToJsonSchema(field._def.type) };
    case 'ZodEnum':
      return { ...base, type: 'string', enum: field._def.values };
    case 'ZodOptional':
      return zodFieldToJsonSchema(field._def.innerType);
    case 'ZodDefault':
      return { ...zodFieldToJsonSchema(field._def.innerType), default: field._def.defaultValue() };
    default:
      return { ...base, type: 'string' };
  }
}
