import { streamText, CoreMessage, DataStreamWriter } from 'ai';
import { prisma } from '@/lib/db';
import { getModelClient } from './utils/llm';
import { constructLocalAgentPrompt } from './prompts';
import { buildAgentToolSet } from './tool_definitions';
import { AgentContext } from './types';
import path from 'path';
import fs from 'fs';

// Define where apps are stored locally
// Ensure this directory exists and is writable
export const APPS_BASE_DIR = path.join(process.cwd(), 'private', 'apps');

export interface ChatRequest {
  appId: string;
  chatId: string;
  messages: CoreMessage[];
  model?: string;
}

export async function runDyadAgent(req: ChatRequest, dataStream: DataStreamWriter) {
  const { appId, chatId, messages, model } = req;
  
  // Ensure app directory exists
  const appPath = path.join(APPS_BASE_DIR, appId);
  if (!fs.existsSync(appPath)) {
    fs.mkdirSync(appPath, { recursive: true });
    // Initialize empty project if needed
  }

  // Setup context
  const context: AgentContext = {
    event: { sender: null }, // Mock
    appId,
    appPath,
    chatId,
    supabaseProjectId: null,
    supabaseOrganizationSlug: null,
    messageId: 'temp', 
    isSharedModulesChanged: false,
    todos: [],
    dyadRequestId: chatId,
    onXmlStream: (xml) => {
        // Send XML updates as data events
        dataStream.writeMessageAnnotation({ type: 'xml_stream', content: xml });
    },
    onXmlComplete: (xml) => {
        dataStream.writeMessageAnnotation({ type: 'xml_complete', content: xml });
    },
    requireConsent: async () => true,
    appendUserMessage: () => {},
    onUpdateTodos: (todos) => {
        dataStream.writeMessageAnnotation({ type: 'todos', content: todos });
    },
  };

  // Build tools
  const tools = buildAgentToolSet(context);

  // Get model client
  // Mock settings for now
  const settings = {
    providerSettings: {
        auto: { apiKey: { value: process.env.DEEPSEEK_API_KEY || '' } }
    },
    selectedModel: { provider: 'auto', name: 'gpt-4' }, // Default
    enableDyadPro: false
  } as any;

  // For now, force using a specific model if provided, or default to a known working one
  // We'll use 'openai' provider with DeepSeek key if configured, or OpenRouter
  // Since we don't have the full getModelClient working with all deps, we'll use a simplified one here or rely on the one we copied if we fixed it.
  // Actually, let's use the copied getModelClient if possible, but it has many deps.
  // Let's use a simple createOpenAI setup here for stability.
  
  const { createOpenAI } = await import('@ai-sdk/openai');
  const deepseek = createOpenAI({
    baseURL: 'https://api.deepseek.com',
    apiKey: process.env.DEEPSEEK_API_KEY,
  });

  const selectedModel = deepseek('deepseek-chat');

  const systemPrompt = constructLocalAgentPrompt(undefined);

  return streamText({
    model: selectedModel,
    system: systemPrompt,
    messages,
    tools,
    maxSteps: 25, // Multi-step
    onStepFinish: async (step) => {
        // Log step usage or save to DB
        // console.log('Step finished', step.usage);
    },
  });
}
