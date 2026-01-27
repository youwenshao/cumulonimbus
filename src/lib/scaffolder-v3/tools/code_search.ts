/**
 * Code Search Tool
 * Semantic search for functions, components, imports, and other code constructs
 */

import { z } from 'zod';
import {
  ToolDefinition,
  AgentContext,
  normalizePath,
  getFileExtension,
} from './types';

const codeSearchSchema = z.object({
  query: z.string().describe('What to search for (e.g., "function that handles form submission", "Button component", "useState hook usage")'),
  type: z.enum(['all', 'function', 'component', 'hook', 'import', 'export', 'type', 'interface']).optional().default('all')
    .describe('Type of code construct to search for'),
  directory: z.string().optional().describe('Optional directory to search in'),
});

type CodeSearchArgs = z.infer<typeof codeSearchSchema>;

interface CodeMatch {
  file: string;
  line: number;
  type: string;
  name: string;
  snippet: string;
}

export const codeSearchTool: ToolDefinition<CodeSearchArgs> = {
  name: 'code_search',
  description: 'Search for code constructs like functions, components, hooks, imports, and types. More intelligent than grep for finding specific code patterns.',
  inputSchema: codeSearchSchema,
  defaultConsent: 'always',
  modifiesState: false,

  execute: async (args, ctx: AgentContext) => {
    const { query, type = 'all', directory } = args;
    
    // Get files to search
    let files = Object.keys(ctx.componentFiles);
    
    // Filter by directory
    if (directory) {
      const dir = normalizePath(directory);
      const dirWithSlash = dir.endsWith('/') ? dir : dir + '/';
      files = files.filter(f => normalizePath(f).startsWith(dirWithSlash));
    }
    
    // Only search TypeScript/JavaScript files
    files = files.filter(f => {
      const ext = getFileExtension(f);
      return ['ts', 'tsx', 'js', 'jsx'].includes(ext);
    });
    
    const matches: CodeMatch[] = [];
    const queryLower = query.toLowerCase();
    
    // Patterns for different code constructs
    const patterns: Record<string, RegExp[]> = {
      function: [
        /(?:export\s+)?(?:async\s+)?function\s+(\w+)/g,
        /(?:export\s+)?const\s+(\w+)\s*=\s*(?:async\s*)?\([^)]*\)\s*(?:=>|:)/g,
        /(?:export\s+)?const\s+(\w+)\s*=\s*(?:async\s*)?function/g,
      ],
      component: [
        /(?:export\s+)?(?:const|function)\s+([A-Z]\w+)\s*(?:=|:|\()/g,
        /(?:export\s+default\s+)?(?:const|function)\s+([A-Z]\w+)/g,
      ],
      hook: [
        /(?:export\s+)?(?:const|function)\s+(use\w+)/g,
      ],
      import: [
        /import\s+(?:{[^}]+}|\w+|\*\s+as\s+\w+)\s+from\s+['"]([^'"]+)['"]/g,
        /import\s+['"]([^'"]+)['"]/g,
      ],
      export: [
        /export\s+(?:default\s+)?(?:const|function|class|interface|type|enum)\s+(\w+)/g,
        /export\s+{\s*([^}]+)\s*}/g,
      ],
      type: [
        /(?:export\s+)?type\s+(\w+)\s*=/g,
      ],
      interface: [
        /(?:export\s+)?interface\s+(\w+)/g,
      ],
    };
    
    // Search each file
    for (const filePath of files) {
      const content = ctx.componentFiles[filePath];
      if (!content) continue;
      
      const lines = content.split('\n');
      
      // Get patterns based on type filter
      const patternsToUse = type === 'all' 
        ? Object.entries(patterns)
        : [[type, patterns[type] || []] as const];
      
      for (const [patternType, patternList] of patternsToUse) {
        for (const pattern of patternList) {
          // Search line by line for context
          for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            pattern.lastIndex = 0;
            
            let match;
            while ((match = pattern.exec(line)) !== null) {
              const name = match[1] || '';
              
              // Check if this matches the query
              const nameLower = name.toLowerCase();
              const lineContent = line.toLowerCase();
              
              if (nameLower.includes(queryLower) || queryLower.includes(nameLower) || lineContent.includes(queryLower)) {
                // Get a snippet with context
                const snippetLines = lines.slice(Math.max(0, i - 1), Math.min(lines.length, i + 3));
                
                matches.push({
                  file: filePath,
                  line: i + 1,
                  type: patternType,
                  name,
                  snippet: snippetLines.join('\n').trim(),
                });
              }
            }
          }
        }
      }
    }
    
    if (matches.length === 0) {
      return `No code matches found for: ${query}`;
    }
    
    // Format results
    const results: string[] = [];
    
    // Group by file
    const byFile = new Map<string, CodeMatch[]>();
    for (const match of matches) {
      const existing = byFile.get(match.file) || [];
      existing.push(match);
      byFile.set(match.file, existing);
    }
    
    for (const [file, fileMatches] of byFile) {
      results.push(`## ${file}`);
      
      for (const match of fileMatches) {
        results.push(`  [${match.type}] ${match.name} (line ${match.line})`);
        results.push('  ```');
        results.push('  ' + match.snippet.split('\n').join('\n  '));
        results.push('  ```');
        results.push('');
      }
    }
    
    return results.join('\n');
  },
};

export default codeSearchTool;
