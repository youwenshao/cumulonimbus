/**
 * Write File Tool
 * Creates or completely overwrites a file in the codebase
 */

import { z } from 'zod';
import {
  ToolDefinition,
  AgentContext,
  escapeXmlAttr,
  validateWritePath,
  normalizePath,
} from './types';

const writeFileSchema = z.object({
  path: z.string().describe('The file path relative to the app root (e.g., src/components/Button.tsx)'),
  content: z.string().describe('The complete content to write to the file'),
  description: z.string().optional().describe('Brief description of what this file does or why it was created'),
});

type WriteFileArgs = z.infer<typeof writeFileSchema>;

export const writeFileTool: ToolDefinition<WriteFileArgs> = {
  name: 'write_file',
  description: 'Create a new file or completely overwrite an existing file in the codebase. Use this when creating new components, pages, or utilities.',
  inputSchema: writeFileSchema,
  defaultConsent: 'always',
  modifiesState: true,

  getConsentPreview: (args) => `Write to ${args.path}`,

  buildXml: (args, isComplete) => {
    if (!args.path) return undefined;

    let xml = `<dyad-write path="${escapeXmlAttr(args.path)}"`;
    if (args.description) {
      xml += ` description="${escapeXmlAttr(args.description)}"`;
    }
    xml += `>\n${args.content ?? ''}`;
    
    if (isComplete) {
      xml += '\n</dyad-write>';
    }
    
    return xml;
  },

  execute: async (args, ctx: AgentContext) => {
    const normalized = normalizePath(args.path);
    
    // Validate path
    const validation = validateWritePath(normalized);
    if (!validation.valid) {
      throw new Error(`Invalid file path: ${validation.error}`);
    }
    
    // Store file content in the in-memory file system
    ctx.componentFiles[normalized] = args.content;
    
    // Stream the XML output
    const xml = writeFileTool.buildXml!(args, true)!;
    ctx.onXmlComplete(xml);
    
    return `Successfully wrote ${normalized}`;
  },
};

export default writeFileTool;
