/**
 * Set Chat Summary Tool
 * Sets a title/summary for the current conversation
 */

import { z } from 'zod';
import {
  ToolDefinition,
  AgentContext,
  escapeXmlAttr,
} from './types';

const setChatSummarySchema = z.object({
  summary: z.string().describe('A brief summary of the conversation (less than a sentence, more than a few words)'),
});

type SetChatSummaryArgs = z.infer<typeof setChatSummarySchema>;

export const setChatSummaryTool: ToolDefinition<SetChatSummaryArgs> = {
  name: 'set_chat_summary',
  description: 'Set a title/summary for the current conversation. Use this at the end of a response to give the conversation a descriptive title.',
  inputSchema: setChatSummarySchema,
  defaultConsent: 'always',
  modifiesState: false, // Doesn't modify files

  buildXml: (args, isComplete) => {
    if (!args.summary) return undefined;
    
    if (isComplete) {
      return `<dyad-chat-summary>${escapeXmlAttr(args.summary)}</dyad-chat-summary>`;
    }
    return `<dyad-chat-summary>${args.summary || ''}`;
  },

  execute: async (args, ctx: AgentContext) => {
    // Store the summary in context
    ctx.chatSummary = args.summary;
    
    // Stream the XML output
    const xml = setChatSummaryTool.buildXml!(args, true)!;
    ctx.onXmlComplete(xml);
    
    return `Chat summary set to: ${args.summary}`;
  },
};

export default setChatSummaryTool;
