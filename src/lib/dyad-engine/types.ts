/**
 * Shared types and utilities for Local Agent tools
 */

import { z } from "zod";
import { jsonrepair } from "jsonrepair";

// Mock IpcMainInvokeEvent since we are running in Next.js
export interface IpcMainInvokeEvent {
  sender: any;
}

// Minimal schemas/types to replace external dependencies
export type AgentToolConsent = "always_allow" | "require_confirmation";

export interface AgentTodo {
  id: string;
  description: string;
  completed: boolean;
}

// ============================================================================
// XML Escape Helpers
// ============================================================================

export {
  escapeXmlAttr,
  unescapeXmlAttr,
  escapeXmlContent,
  unescapeXmlContent,
} from "./xmlEscape";

// ============================================================================
// Todo Types
// ============================================================================

// Re-export AgentTodo as Todo for backwards compatibility within this module
export type Todo = AgentTodo;

export interface AgentContext {
  event: IpcMainInvokeEvent;
  appId: string; // Changed to string for Prisma compatibility
  appPath: string;
  chatId: string; // Changed to string for Prisma compatibility
  supabaseProjectId: string | null;
  supabaseOrganizationSlug: string | null;
  messageId: string; // Changed to string for Prisma compatibility
  isSharedModulesChanged: boolean;
  chatSummary?: string;
  /** Turn-scoped todo list for agent task tracking */
  todos: Todo[];
  /** Request ID for tracking requests to the Dyad engine */
  dyadRequestId: string;
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
  requireConsent: (params: {
    toolName: string;
    toolDescription?: string | null;
    inputPreview?: string | null;
  }) => Promise<boolean>;
  /**
   * Append a user message to be sent after the tool result.
   * Use this when the tool needs to provide non-text content (like images)
   * that models don't support in tool result messages.
   */
  appendUserMessage: (content: UserMessageContentPart[]) => void;
  /**
   * Sends updated todos to the renderer for UI display.
   * Call this when todos are updated to show them in the chat input area.
   */
  onUpdateTodos: (todos: Todo[]) => void;
}

// ============================================================================
// Partial JSON Parser
// ============================================================================

/**
 * Parse partial/streaming JSON into a partial object using jsonrepair.
 * Handles incomplete JSON gracefully during streaming.
 */
export function parsePartialJson<T extends Record<string, unknown>>(
  jsonText: string,
): Partial<T> {
  if (!jsonText.trim()) {
    return {} as Partial<T>;
  }

  try {
    const repaired = jsonrepair(jsonText);
    return JSON.parse(repaired) as Partial<T>;
  } catch {
    // If jsonrepair fails, return empty object
    return {} as Partial<T>;
  }
}

// ============================================================================
// Tool Result Types
// ============================================================================

/**
 * Content part types for user messages (supports images)
 * These can be appended as follow-up user messages after tool results
 */
export type UserMessageContentPart =
  | { type: "text"; text: string }
  | { type: "image-url"; url: string };

/**
 * Tool result can be a simple string or a structured result with content parts
 */
export type ToolResult = string;

// ============================================================================
// Tool Definition Interface
// ============================================================================

export interface ToolDefinition<T = any> {
  readonly name: string;
  readonly description: string;
  readonly inputSchema: z.ZodType<T>;
  readonly defaultConsent: AgentToolConsent;
  /**
   * If true, this tool modifies state (files, database, etc.).
   * Used to filter out state-modifying tools in read-only mode (e.g., ask mode).
   */
  readonly modifiesState?: boolean;
  execute: (args: T, ctx: AgentContext) => Promise<ToolResult>;

  /**
   * If defined, returns whether the tool should be available in the current context.
   * If it returns false, the tool will be filtered out.
   */
  isEnabled?: (ctx: AgentContext) => boolean;

  /**
   * Returns a preview string describing what the tool will do with the given args.
   * Used for consent prompts. If not provided, no inputPreview will be shown.
   *
   * @param args - The parsed args for the tool call
   * @returns A human-readable description of the operation
   */
  getConsentPreview?: (args: T) => string;

  /**
   * Build XML from parsed partial args.
   * Called by the handler during streaming and on completion.
   *
   * @param args - Partial args parsed from accumulated JSON (type inferred from inputSchema)
   * @param isComplete - True if this is the final call (include closing tags)
   * @returns The XML string, or undefined if not enough args yet
   */
  buildXml?: (args: Partial<T>, isComplete: boolean) => string | undefined;
}
