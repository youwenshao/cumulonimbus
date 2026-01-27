/**
 * Tool definitions for Local Agent v2
 * Each tool includes a zod schema, description, and execute function
 */

import { writeFileTool } from "./tools/write_file";
import { editFileTool } from "./tools/edit_file";
import { deleteFileTool } from "./tools/delete_file";
import { renameFileTool } from "./tools/rename_file";
import { readFileTool } from "./tools/read_file";
import { listFilesTool } from "./tools/list_files";
import { runTypeChecksTool } from "./tools/run_type_checks";
import { grepTool } from "./tools/grep";
import { codeSearchTool } from "./tools/code_search";
// import { webSearchTool } from "./tools/web_search"; // Disabled for now
import type { ToolDefinition, AgentContext, ToolResult } from "./types";
import { escapeXmlAttr, escapeXmlContent } from "./types";
import { AgentToolConsent } from "./types";

// Combined tool definitions array
export const TOOL_DEFINITIONS: readonly ToolDefinition[] = [
  writeFileTool,
  editFileTool,
  deleteFileTool,
  renameFileTool,
  readFileTool,
  listFilesTool,
  grepTool,
  codeSearchTool,
  runTypeChecksTool,
];

export type AgentToolName = (typeof TOOL_DEFINITIONS)[number]["name"];

// ============================================================================
// Agent Tool Consent Management
// ============================================================================

export function getAgentToolConsent(toolName: AgentToolName): AgentToolConsent {
  return "always_allow";
}

export async function requireAgentToolConsent(
  event: any,
  params: {
    chatId: string;
    toolName: AgentToolName;
    toolDescription?: string | null;
    inputPreview?: string | null;
  },
): Promise<boolean> {
  return true;
}

export function clearPendingConsentsForChat(chatId: string): void {}

// ============================================================================
// Build Agent Tool Set
// ============================================================================

/**
 * Process placeholders in tool args (e.g. $$SUPABASE_CLIENT_CODE$$)
 */
async function processArgPlaceholders<T extends Record<string, any>>(
  args: T,
  ctx: AgentContext,
): Promise<T> {
  // Placeholder processing disabled for now as we removed Supabase dependency
  return args;
}

function convertToolResultForAiSdk(result: ToolResult): any {
  if (typeof result === "string") {
    return { type: "text", text: result }; // AI SDK v3 format might differ, check this
  }
  return { type: "text", text: JSON.stringify(result) };
}

export interface BuildAgentToolSetOptions {
  readOnly?: boolean;
}

export function buildAgentToolSet(
  ctx: AgentContext,
  options: BuildAgentToolSetOptions = {},
) {
  const toolSet: Record<string, any> = {};

  for (const tool of TOOL_DEFINITIONS) {
    // In read-only mode, skip tools that modify state
    if (options.readOnly && tool.modifiesState) {
      continue;
    }

    if (tool.isEnabled && !tool.isEnabled(ctx)) {
      continue;
    }

    toolSet[tool.name] = {
      description: tool.description,
      parameters: tool.inputSchema, // AI SDK uses 'parameters'
      execute: async (args: any) => {
        try {
          const processedArgs = await processArgPlaceholders(args, ctx);

          // Emit consent/preview logic here if needed
          // For now, we assume consent is always given

          const result = await tool.execute(processedArgs, ctx);
          return result; // AI SDK handles string results
        } catch (error) {
          const errorMessage =
            error instanceof Error ? error.message : String(error);

          ctx.onXmlComplete(
            `<dyad-output type="error" message="Tool '${tool.name}' failed: ${escapeXmlAttr(errorMessage)}">${escapeXmlContent(errorMessage)}</dyad-output>`,
          );
          throw error;
        }
      },
    };
  }

  return toolSet;
}
