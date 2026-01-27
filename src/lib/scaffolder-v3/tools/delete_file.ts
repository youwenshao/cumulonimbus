/**
 * Delete File Tool
 * Removes a file from the codebase
 */

import { z } from 'zod';
import {
  ToolDefinition,
  AgentContext,
  escapeXmlAttr,
  normalizePath,
  isWithinSrc,
  isConfigFile,
} from './types';

const deleteFileSchema = z.object({
  path: z.string().describe('The file path relative to the app root to delete'),
});

type DeleteFileArgs = z.infer<typeof deleteFileSchema>;

export const deleteFileTool: ToolDefinition<DeleteFileArgs> = {
  name: 'delete_file',
  description: 'Delete a file from the codebase. Use with caution.',
  inputSchema: deleteFileSchema,
  defaultConsent: 'ask',
  modifiesState: true,

  getConsentPreview: (args) => `Delete ${args.path}`,

  buildXml: (args, isComplete) => {
    if (!args.path) return undefined;
    
    if (isComplete) {
      return `<dyad-delete path="${escapeXmlAttr(args.path)}"></dyad-delete>`;
    }
    return `<dyad-delete path="${escapeXmlAttr(args.path)}"`;
  },

  execute: async (args, ctx: AgentContext) => {
    const normalized = normalizePath(args.path);
    
    // Validate path - can only delete files within src/
    if (!isWithinSrc(normalized)) {
      throw new Error(`Can only delete files within src/ directory`);
    }
    
    // Cannot delete config files
    if (isConfigFile(normalized)) {
      throw new Error(`Cannot delete config files`);
    }
    
    // Check if file exists
    if (ctx.componentFiles[normalized] === undefined) {
      throw new Error(`File does not exist: ${normalized}`);
    }
    
    // Delete the file
    delete ctx.componentFiles[normalized];
    
    // Stream the XML output
    const xml = deleteFileTool.buildXml!(args, true)!;
    ctx.onXmlComplete(xml);
    
    return `Successfully deleted ${normalized}`;
  },
};

export default deleteFileTool;
