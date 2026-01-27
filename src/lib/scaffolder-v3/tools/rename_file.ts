/**
 * Rename File Tool
 * Renames or moves a file within the codebase
 */

import { z } from 'zod';
import {
  ToolDefinition,
  AgentContext,
  escapeXmlAttr,
  normalizePath,
  validateWritePath,
  isWithinSrc,
} from './types';

const renameFileSchema = z.object({
  from: z.string().describe('The current file path relative to the app root'),
  to: z.string().describe('The new file path relative to the app root'),
});

type RenameFileArgs = z.infer<typeof renameFileSchema>;

export const renameFileTool: ToolDefinition<RenameFileArgs> = {
  name: 'rename_file',
  description: 'Rename or move a file within the codebase. This will also update import statements in other files that reference this file.',
  inputSchema: renameFileSchema,
  defaultConsent: 'always',
  modifiesState: true,

  getConsentPreview: (args) => `Rename ${args.from} to ${args.to}`,

  buildXml: (args, isComplete) => {
    if (!args.from || !args.to) return undefined;
    
    if (isComplete) {
      return `<dyad-rename from="${escapeXmlAttr(args.from)}" to="${escapeXmlAttr(args.to)}"></dyad-rename>`;
    }
    return `<dyad-rename from="${escapeXmlAttr(args.from)}" to="${escapeXmlAttr(args.to)}"`;
  },

  execute: async (args, ctx: AgentContext) => {
    const fromNormalized = normalizePath(args.from);
    const toNormalized = normalizePath(args.to);
    
    // Validate source exists
    if (!isWithinSrc(fromNormalized)) {
      throw new Error(`Can only rename files within src/ directory`);
    }
    
    if (ctx.componentFiles[fromNormalized] === undefined) {
      throw new Error(`Source file does not exist: ${fromNormalized}`);
    }
    
    // Validate destination
    const validation = validateWritePath(toNormalized);
    if (!validation.valid) {
      throw new Error(`Invalid destination path: ${validation.error}`);
    }
    
    // Check if destination already exists
    if (ctx.componentFiles[toNormalized] !== undefined) {
      throw new Error(`Destination file already exists: ${toNormalized}`);
    }
    
    // Get the content
    const content = ctx.componentFiles[fromNormalized];
    
    // Delete old file and create new one
    delete ctx.componentFiles[fromNormalized];
    ctx.componentFiles[toNormalized] = content;
    
    // Update import statements in other files
    const fromWithoutExt = fromNormalized.replace(/\.(tsx?|jsx?)$/, '');
    const toWithoutExt = toNormalized.replace(/\.(tsx?|jsx?)$/, '');
    
    for (const [filePath, fileContent] of Object.entries(ctx.componentFiles)) {
      if (filePath === toNormalized) continue;
      
      // Update various import patterns
      let updatedContent = fileContent;
      
      // Handle relative imports
      const importPatterns = [
        new RegExp(`from\\s+['"](.*/)?${escapeRegExp(fromWithoutExt.split('/').pop()!)}['"]`, 'g'),
        new RegExp(`import\\s+['"](.*/)?${escapeRegExp(fromWithoutExt.split('/').pop()!)}['"]`, 'g'),
      ];
      
      for (const pattern of importPatterns) {
        updatedContent = updatedContent.replace(pattern, (match) => {
          // Calculate the relative path from the current file to the new location
          const currentDir = filePath.split('/').slice(0, -1).join('/') || '.';
          const newRelativePath = getRelativePath(currentDir, toWithoutExt);
          return match.replace(pattern, `from '${newRelativePath}'`);
        });
      }
      
      if (updatedContent !== fileContent) {
        ctx.componentFiles[filePath] = updatedContent;
      }
    }
    
    // Stream the XML output
    const xml = renameFileTool.buildXml!(args, true)!;
    ctx.onXmlComplete(xml);
    
    return `Successfully renamed ${fromNormalized} to ${toNormalized}`;
  },
};

/**
 * Escape special regex characters
 */
function escapeRegExp(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Get relative path from one file to another
 */
function getRelativePath(from: string, to: string): string {
  const fromParts = from.split('/').filter(Boolean);
  const toParts = to.split('/').filter(Boolean);
  
  // Find common prefix length
  let commonLength = 0;
  while (
    commonLength < fromParts.length &&
    commonLength < toParts.length &&
    fromParts[commonLength] === toParts[commonLength]
  ) {
    commonLength++;
  }
  
  // Build relative path
  const upCount = fromParts.length - commonLength;
  const remaining = toParts.slice(commonLength);
  
  if (upCount === 0 && remaining.length > 0) {
    return './' + remaining.join('/');
  }
  
  const ups = '../'.repeat(upCount);
  return ups + remaining.join('/');
}

export default renameFileTool;
