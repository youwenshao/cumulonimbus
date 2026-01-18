/**
 * Base Agent Class
 * Common functionality for all V2 agents
 */

import { streamComplete, completeJSON, type ChatMessage } from '@/lib/qwen';
import type { UserLLMSettings } from '@/lib/llm';
import type { AgentResponse, ConversationState } from '../types';

export interface AgentConfig {
  name: string;
  description: string;
  model?: string;
  temperature?: number;
  maxTokens?: number;
  userSettings?: UserLLMSettings;
}

export abstract class BaseAgent {
  protected config: AgentConfig;

  constructor(config: AgentConfig) {
    this.config = {
      temperature: 0.3,
      maxTokens: 4096,
      ...config,
    };
  }

  /**
   * Update user settings for this agent
   */
  setUserSettings(userSettings?: UserLLMSettings): void {
    this.config.userSettings = userSettings;
  }

  /**
   * Build the system prompt for this agent
   */
  protected abstract buildSystemPrompt(state: ConversationState): string;

  /**
   * Process a user message and return a response
   */
  abstract process(
    message: string,
    state: ConversationState
  ): Promise<AgentResponse>;

  /**
   * Call LLM with JSON response
   */
  protected async callLLMJSON<T>(
    messages: ChatMessage[],
    schema: string
  ): Promise<T> {
    return completeJSON<T>({
      messages,
      schema,
      temperature: this.config.temperature,
      maxTokens: this.config.maxTokens,
      userSettings: this.config.userSettings,
    });
  }

  /**
   * Call LLM with streaming response
   */
  protected async *callLLMStream(
    messages: ChatMessage[]
  ): AsyncGenerator<string> {
    for await (const chunk of streamComplete({
      messages,
      temperature: this.config.temperature,
      maxTokens: this.config.maxTokens,
      userSettings: this.config.userSettings,
    })) {
      yield chunk;
    }
  }

  /**
   * Build conversation history for LLM context
   */
  protected buildConversationHistory(
    state: ConversationState,
    maxMessages: number = 10
  ): ChatMessage[] {
    const relevantMessages = state.messages.slice(-maxMessages);
    
    return relevantMessages.map(msg => ({
      role: msg.role as 'user' | 'assistant' | 'system',
      content: msg.content,
    }));
  }

  /**
   * Log agent activity for debugging
   */
  protected log(action: string, details?: Record<string, unknown>): void {
    console.log(`[${this.config.name}] ${action}`, details || '');
  }
}
