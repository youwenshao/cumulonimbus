/**
 * List Files Tool
 * Lists files in the codebase, optionally filtered by directory
 */

import { z } from 'zod';
import {
  ToolDefinition,
  AgentContext,
  normalizePath,
} from './types';

const listFilesSchema = z.object({
  directory: z.string().optional().describe('Optional directory path to list files from (e.g., "src/components")'),
  recursive: z.boolean().optional().default(true).describe('Whether to list files recursively (default: true)'),
});

type ListFilesArgs = z.infer<typeof listFilesSchema>;

export const listFilesTool: ToolDefinition<ListFilesArgs> = {
  name: 'list_files',
  description: 'List files in the codebase. Optionally filter by directory.',
  inputSchema: listFilesSchema,
  defaultConsent: 'always',
  modifiesState: false,

  execute: async (args, ctx: AgentContext) => {
    const files = Object.keys(ctx.componentFiles);
    
    let filteredFiles = files;
    
    // Filter by directory if specified
    if (args.directory) {
      const dir = normalizePath(args.directory);
      const dirWithSlash = dir.endsWith('/') ? dir : dir + '/';
      
      if (args.recursive !== false) {
        // Recursive: include all files under this directory
        filteredFiles = files.filter(f => {
          const normalized = normalizePath(f);
          return normalized.startsWith(dirWithSlash) || normalized === dir;
        });
      } else {
        // Non-recursive: only direct children
        filteredFiles = files.filter(f => {
          const normalized = normalizePath(f);
          if (!normalized.startsWith(dirWithSlash)) return false;
          
          // Check if it's a direct child (no more slashes after the directory)
          const remainder = normalized.slice(dirWithSlash.length);
          return !remainder.includes('/');
        });
      }
    }
    
    // Sort files alphabetically
    filteredFiles.sort();
    
    if (filteredFiles.length === 0) {
      if (args.directory) {
        return `No files found in ${args.directory}`;
      }
      return 'No files in the codebase';
    }
    
    // Format as a tree-like structure
    const result: string[] = [];
    
    for (const file of filteredFiles) {
      const size = ctx.componentFiles[file]?.length ?? 0;
      const sizeStr = size > 1024 
        ? `${(size / 1024).toFixed(1)}KB`
        : `${size}B`;
      
      result.push(`${file} (${sizeStr})`);
    }
    
    return result.join('\n');
  },
};

export default listFilesTool;
