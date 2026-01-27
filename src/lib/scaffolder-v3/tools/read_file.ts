/**
 * Read File Tool
 * Reads the content of a file from the codebase
 */

import { z } from 'zod';
import {
  ToolDefinition,
  AgentContext,
  normalizePath,
} from './types';

const readFileSchema = z.object({
  path: z.string().describe('The file path relative to the app root to read'),
  startLine: z.number().optional().describe('Optional: start line (1-indexed) to read from'),
  endLine: z.number().optional().describe('Optional: end line (1-indexed) to read to'),
});

type ReadFileArgs = z.infer<typeof readFileSchema>;

export const readFileTool: ToolDefinition<ReadFileArgs> = {
  name: 'read_file',
  description: 'Read the contents of a file. Optionally specify start and end lines to read a portion of the file.',
  inputSchema: readFileSchema,
  defaultConsent: 'always',
  modifiesState: false,

  execute: async (args, ctx: AgentContext) => {
    const normalized = normalizePath(args.path);
    
    // Check if file exists
    const content = ctx.componentFiles[normalized];
    if (content === undefined) {
      return `File not found: ${normalized}`;
    }
    
    // Handle line range if specified
    if (args.startLine !== undefined || args.endLine !== undefined) {
      const lines = content.split('\n');
      const start = Math.max(0, (args.startLine ?? 1) - 1);
      const end = args.endLine ?? lines.length;
      
      const selectedLines = lines.slice(start, end);
      return selectedLines.map((line, i) => `${start + i + 1}|${line}`).join('\n');
    }
    
    // Return full content with line numbers
    const lines = content.split('\n');
    return lines.map((line, i) => `${i + 1}|${line}`).join('\n');
  },
};

export default readFileTool;
