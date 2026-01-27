/**
 * Edit File Tool
 * Performs incremental edits to existing files using a diff-style approach
 */

import { z } from 'zod';
import {
  ToolDefinition,
  AgentContext,
  escapeXmlAttr,
  validateWritePath,
  normalizePath,
} from './types';

const editFileSchema = z.object({
  path: z.string().describe('The file path relative to the app root'),
  content: z.string().describe('The updated code snippet to apply, using "// ... existing code ..." markers'),
  description: z.string().optional().describe('Brief description of the edit'),
});

type EditFileArgs = z.infer<typeof editFileSchema>;

const EDIT_FILE_DESCRIPTION = `
## When to Use edit_file

Use the \`edit_file\` tool ONLY when you are editing an existing file. The edit output will be read by a less intelligent model, which will quickly apply the edit. You should make it clear what the edit is, while also minimizing the unchanged code you write.

**Use only ONE edit_file call per file.** If you need to make multiple changes to the same file, include all edits in sequence using \`// ... existing code ...\` comments between them.

## When NOT to Use edit_file

Do NOT use this tool when:
- You are creating a brand-new file (use write_file instead).
- You are rewriting most of an existing file (use write_file instead).

## Basic Format

When writing the edit, specify each edit in sequence with the special comment // ... existing code ... to represent unchanged code.

Basic example:
\`\`\`
edit_file(path="file.js", content="""
// ... existing code ...
FIRST_EDIT
// ... existing code ...
SECOND_EDIT
// ... existing code ...
""")
\`\`\`

## General Principles

- Bias towards repeating as few lines of the original file as possible.
- NEVER show unmodified code without using // ... existing code ... comment.
- Include sufficient context around edits to resolve ambiguity.

## Example: Basic Edit
\`\`\`
edit_file(path="LandingPage.tsx", description="Update title.", content="""
// ... existing code ...

const LandingPage = () => {
  // ... existing code ...
  return (
    <div>hello</div>
  );
};

// ... existing code ...
""")
\`\`\`
`;

/**
 * Apply diff-style edits to original content
 */
function applyEdit(originalContent: string, editContent: string): { success: boolean; content?: string; error?: string } {
  const EXISTING_CODE_MARKER = '// ... existing code ...';
  
  // Split edit into segments
  const editSegments = editContent.split(EXISTING_CODE_MARKER);
  
  if (editSegments.length === 1) {
    // No markers - this is a complete replacement
    return { success: true, content: editContent };
  }
  
  const originalLines = originalContent.split('\n');
  let result = originalContent;
  
  // Process each segment
  for (let i = 0; i < editSegments.length; i++) {
    const segment = editSegments[i].trim();
    if (!segment) continue;
    
    // Try to find and replace the segment in the original
    const segmentLines = segment.split('\n').filter(l => l.trim());
    if (segmentLines.length === 0) continue;
    
    // Find the best match for this segment's context
    const firstLinePattern = segmentLines[0].trim();
    const lastLinePattern = segmentLines[segmentLines.length - 1].trim();
    
    // Look for a section that starts with similar content
    let bestMatchStart = -1;
    let bestMatchEnd = -1;
    let bestMatchScore = 0;
    
    for (let j = 0; j < originalLines.length; j++) {
      const originalLine = originalLines[j].trim();
      
      // Check if this could be the start of our segment
      if (similarLines(originalLine, firstLinePattern)) {
        // Look for the end of this section
        for (let k = j; k < originalLines.length; k++) {
          const endLine = originalLines[k].trim();
          if (similarLines(endLine, lastLinePattern)) {
            const score = k - j + 1;
            if (score > bestMatchScore) {
              bestMatchStart = j;
              bestMatchEnd = k;
              bestMatchScore = score;
            }
            break;
          }
        }
      }
    }
    
    // Apply the edit if we found a match
    if (bestMatchStart !== -1 && bestMatchEnd !== -1) {
      const before = originalLines.slice(0, bestMatchStart);
      const after = originalLines.slice(bestMatchEnd + 1);
      
      // Get the indentation from the original
      const indent = originalLines[bestMatchStart].match(/^(\s*)/)?.[1] || '';
      
      // Apply indentation to the new segment
      const indentedSegment = segment.split('\n').map(line => {
        if (line.trim()) {
          return indent + line.trimStart();
        }
        return line;
      }).join('\n');
      
      result = [...before, indentedSegment, ...after].join('\n');
      // Update original lines for the next iteration
      originalLines.length = 0;
      originalLines.push(...result.split('\n'));
    }
  }
  
  // If we made no changes, something went wrong
  if (result === originalContent) {
    // Fall back to a simpler approach - look for unique code blocks
    const cleanEdit = editContent
      .split(EXISTING_CODE_MARKER)
      .filter(s => s.trim())
      .join('\n\n');
    
    if (cleanEdit.trim()) {
      // Try to find where to insert the edit
      return { success: true, content: applySimpleEdit(originalContent, cleanEdit) };
    }
    
    return { success: false, error: 'Could not find matching code to edit' };
  }
  
  return { success: true, content: result };
}

/**
 * Check if two lines are similar (ignoring whitespace)
 */
function similarLines(line1: string, line2: string): boolean {
  const normalize = (s: string) => s.replace(/\s+/g, ' ').trim();
  const n1 = normalize(line1);
  const n2 = normalize(line2);
  
  if (n1 === n2) return true;
  
  // Check if one contains the other (for partial matches)
  if (n1.length > 5 && n2.length > 5) {
    if (n1.includes(n2) || n2.includes(n1)) return true;
  }
  
  return false;
}

/**
 * Simple edit application - find and replace code blocks
 */
function applySimpleEdit(original: string, edit: string): string {
  const editLines = edit.split('\n');
  const originalLines = original.split('\n');
  
  // Look for function/component declarations in the edit
  const functionMatch = edit.match(/(?:const|function|export\s+(?:const|function))\s+(\w+)/);
  if (functionMatch) {
    const funcName = functionMatch[1];
    
    // Find the function in the original
    const funcRegex = new RegExp(`(?:const|function|export\\s+(?:const|function))\\s+${funcName}`);
    const startIndex = originalLines.findIndex(line => funcRegex.test(line));
    
    if (startIndex !== -1) {
      // Find the end of the function (matching braces)
      let braceCount = 0;
      let endIndex = startIndex;
      
      for (let i = startIndex; i < originalLines.length; i++) {
        const line = originalLines[i];
        braceCount += (line.match(/{/g) || []).length;
        braceCount -= (line.match(/}/g) || []).length;
        
        if (braceCount === 0 && i > startIndex) {
          endIndex = i;
          break;
        }
      }
      
      // Replace the function
      return [
        ...originalLines.slice(0, startIndex),
        edit.trim(),
        ...originalLines.slice(endIndex + 1),
      ].join('\n');
    }
  }
  
  // Fallback: append at the end before export
  const exportIndex = originalLines.findIndex(line => line.trim().startsWith('export default'));
  if (exportIndex !== -1) {
    return [
      ...originalLines.slice(0, exportIndex),
      '',
      edit.trim(),
      '',
      ...originalLines.slice(exportIndex),
    ].join('\n');
  }
  
  // Last resort: append at end
  return original + '\n\n' + edit.trim();
}

export const editFileTool: ToolDefinition<EditFileArgs> = {
  name: 'edit_file',
  description: EDIT_FILE_DESCRIPTION,
  inputSchema: editFileSchema,
  defaultConsent: 'always',
  modifiesState: true,

  getConsentPreview: (args) => `Edit ${args.path}`,

  buildXml: (args, isComplete) => {
    if (!args.path) return undefined;

    let xml = `<dyad-edit path="${escapeXmlAttr(args.path)}"`;
    if (args.description) {
      xml += ` description="${escapeXmlAttr(args.description)}"`;
    }
    xml += `>\n${args.content ?? ''}`;
    
    if (isComplete) {
      xml += '\n</dyad-edit>';
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
    
    // Check if file exists
    const originalContent = ctx.componentFiles[normalized];
    if (originalContent === undefined) {
      throw new Error(`File does not exist: ${normalized}. Use write_file to create new files.`);
    }
    
    // Apply the edit
    const result = applyEdit(originalContent, args.content);
    
    if (!result.success || !result.content) {
      throw new Error(`Failed to apply edit: ${result.error || 'Unknown error'}`);
    }
    
    // Store the updated content
    ctx.componentFiles[normalized] = result.content;
    
    // Stream the XML output
    const xml = editFileTool.buildXml!(args, true)!;
    ctx.onXmlComplete(xml);
    
    return `Successfully edited ${normalized}`;
  },
};

export default editFileTool;
