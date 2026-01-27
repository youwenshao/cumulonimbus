/**
 * Grep Tool
 * Searches for patterns in files using regular expressions
 */

import { z } from 'zod';
import {
  ToolDefinition,
  AgentContext,
  normalizePath,
} from './types';

const grepSchema = z.object({
  pattern: z.string().describe('The regular expression pattern to search for'),
  directory: z.string().optional().describe('Optional directory to search in (e.g., "src/components")'),
  filePattern: z.string().optional().describe('Optional glob-like pattern to filter files (e.g., "*.tsx")'),
  caseInsensitive: z.boolean().optional().default(false).describe('Whether to perform case-insensitive search'),
  maxResults: z.number().optional().default(50).describe('Maximum number of results to return'),
});

type GrepArgs = z.infer<typeof grepSchema>;

export const grepTool: ToolDefinition<GrepArgs> = {
  name: 'grep',
  description: 'Search for a pattern in files using regular expressions. Returns matching lines with context.',
  inputSchema: grepSchema,
  defaultConsent: 'always',
  modifiesState: false,

  execute: async (args, ctx: AgentContext) => {
    const { pattern, directory, filePattern, caseInsensitive, maxResults = 50 } = args;
    
    // Build the regex
    let regex: RegExp;
    try {
      regex = new RegExp(pattern, caseInsensitive ? 'gi' : 'g');
    } catch (e) {
      return `Invalid regex pattern: ${(e as Error).message}`;
    }
    
    const results: string[] = [];
    let totalMatches = 0;
    
    // Get files to search
    let files = Object.keys(ctx.componentFiles);
    
    // Filter by directory
    if (directory) {
      const dir = normalizePath(directory);
      const dirWithSlash = dir.endsWith('/') ? dir : dir + '/';
      files = files.filter(f => {
        const normalized = normalizePath(f);
        return normalized.startsWith(dirWithSlash) || normalized === dir;
      });
    }
    
    // Filter by file pattern
    if (filePattern) {
      const patternRegex = globToRegex(filePattern);
      files = files.filter(f => patternRegex.test(f));
    }
    
    // Search each file
    for (const filePath of files) {
      if (totalMatches >= maxResults) {
        results.push(`\n... truncated (reached ${maxResults} results)`);
        break;
      }
      
      const content = ctx.componentFiles[filePath];
      if (!content) continue;
      
      const lines = content.split('\n');
      const fileMatches: string[] = [];
      
      for (let i = 0; i < lines.length; i++) {
        if (totalMatches >= maxResults) break;
        
        const line = lines[i];
        regex.lastIndex = 0; // Reset regex state
        
        if (regex.test(line)) {
          fileMatches.push(`  ${i + 1}: ${line.trim()}`);
          totalMatches++;
        }
      }
      
      if (fileMatches.length > 0) {
        results.push(`${filePath}:`);
        results.push(...fileMatches);
        results.push('');
      }
    }
    
    if (results.length === 0) {
      return `No matches found for pattern: ${pattern}`;
    }
    
    return results.join('\n');
  },
};

/**
 * Convert a simple glob pattern to a regex
 */
function globToRegex(glob: string): RegExp {
  const escaped = glob
    .replace(/[.+^${}()|[\]\\]/g, '\\$&')
    .replace(/\*/g, '.*')
    .replace(/\?/g, '.');
  
  return new RegExp(escaped + '$', 'i');
}

export default grepTool;
