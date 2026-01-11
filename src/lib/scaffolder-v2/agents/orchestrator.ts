/**
 * Orchestrator Agent
 * Coordinates other agents, maintains conversation context, decides next steps
 */

import { BaseAgent } from './base-agent';
import { generateId } from '@/lib/utils';
import type { 
  ConversationState, 
  AgentResponse, 
  OrchestratorDecision,
  AgentAction,
  ParsedIntent,
  IntentType,
  ConversationPhase,
  Message,
} from '../types';

const INTENT_CLASSIFICATION_SCHEMA = `{
  "type": "INITIAL_REQUEST|REFINEMENT|APPROVAL|QUESTION|NEW_REQUIREMENT|UNDO|FINALIZE",
  "subject": "schema|ui|code|general",
  "confidence": 0.0-1.0,
  "extractedEntities": ["string"],
  "extractedActions": ["string"],
  "reasoning": "string"
}`;

const ORCHESTRATOR_SYSTEM_PROMPT = `You are an orchestrator for an AI app builder. Your job is to:
1. Understand what the user wants
2. Classify their intent (new request, refinement, approval, question, etc.)
3. Determine which specialist agent should handle the request
4. Maintain conversation flow and context

When classifying user intent:
- INITIAL_REQUEST: User describes what they want to build
- REFINEMENT: User wants to change something already proposed (schema, UI, or code)
- APPROVAL: User confirms/accepts a proposal (e.g., "looks good", "yes", "that's perfect")
- QUESTION: User asks for clarification or more information
- NEW_REQUIREMENT: User adds a new feature or requirement
- UNDO: User wants to revert to a previous state
- FINALIZE: User wants to generate and deploy the app

For subject classification:
- schema: Related to data fields, types, relationships
- ui: Related to layout, appearance, components
- code: Related to functionality, logic, behavior
- general: Unclear or applies to everything

Be helpful and conversational. Guide users through the app building process.`;

export class OrchestratorAgent extends BaseAgent {
  constructor() {
    super({
      name: 'Orchestrator',
      description: 'Coordinates agents and manages conversation flow',
      temperature: 0.2, // Lower temperature for more consistent classification
    });
  }

  protected buildSystemPrompt(state: ConversationState): string {
    const phaseContext = this.getPhaseContext(state);
    return `${ORCHESTRATOR_SYSTEM_PROMPT}\n\nCurrent phase: ${state.phase}\n${phaseContext}`;
  }

  /**
   * Process a user message and determine next action
   */
  async process(
    message: string,
    state: ConversationState
  ): Promise<AgentResponse> {
    this.log('Processing message', { message: message.substring(0, 100) });

    // Classify the user's intent
    const intent = await this.classifyIntent(message, state);
    this.log('Classified intent', { type: intent.type, subject: intent.subject });

    // Determine next action based on intent and current state
    const decision = this.determineNextAction(intent, state);
    this.log('Decision', { action: decision.nextAction.action, agent: decision.nextAction.agent });

    return {
      success: true,
      message: decision.reasoning,
      data: decision,
      requiresUserInput: this.requiresUserInput(decision),
      suggestedActions: this.getSuggestedActions(state, decision),
    };
  }

  /**
   * Classify user intent using LLM
   */
  async classifyIntent(
    message: string,
    state: ConversationState
  ): Promise<ParsedIntent> {
    const systemPrompt = this.buildSystemPrompt(state);
    
    const userPrompt = `Classify this user message:
"${message}"

Context:
- Current phase: ${state.phase}
- Has schema: ${state.schemas.length > 0}
- Has layout: ${state.layout !== undefined}
- Has generated code: ${Object.keys(state.generatedCode).length > 0}
${state.schemas.length > 0 ? `- Schema fields: ${state.schemas[0]?.fields.map(f => f.name).join(', ')}` : ''}

Respond with JSON only.`;

    try {
      const result = await this.callLLMJSON<ParsedIntent & { reasoning: string }>(
        [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        INTENT_CLASSIFICATION_SCHEMA
      );

      return {
        type: this.validateIntentType(result.type),
        subject: result.subject || 'general',
        content: message,
        confidence: result.confidence || 0.5,
        extractedEntities: result.extractedEntities || [],
        extractedActions: result.extractedActions || [],
      };
    } catch (error) {
      this.log('Intent classification failed, using fallback', { error });
      return this.fallbackClassifyIntent(message, state);
    }
  }

  /**
   * Fallback intent classification using keywords
   */
  private fallbackClassifyIntent(
    message: string,
    state: ConversationState
  ): ParsedIntent {
    const lower = message.toLowerCase();
    
    // Check for approval signals
    const approvalKeywords = ['yes', 'looks good', 'perfect', 'great', 'ok', 'okay', 'confirm', 'accept', 'approve', 'love it', 'that works'];
    if (approvalKeywords.some(kw => lower.includes(kw))) {
      return { type: 'APPROVAL', subject: 'general', content: message, confidence: 0.7 };
    }

    // Check for finalize signals
    const finalizeKeywords = ['build', 'generate', 'create the app', 'deploy', 'finalize', 'done', 'finish'];
    if (finalizeKeywords.some(kw => lower.includes(kw)) && state.schemas.length > 0) {
      return { type: 'FINALIZE', subject: 'general', content: message, confidence: 0.7 };
    }

    // Check for undo signals
    const undoKeywords = ['undo', 'revert', 'go back', 'previous', 'cancel'];
    if (undoKeywords.some(kw => lower.includes(kw))) {
      return { type: 'UNDO', subject: 'general', content: message, confidence: 0.7 };
    }

    // Check for question signals
    const questionKeywords = ['what', 'how', 'why', 'can you', 'could you', 'is it', 'will it', '?'];
    if (questionKeywords.some(kw => lower.includes(kw))) {
      return { type: 'QUESTION', subject: 'general', content: message, confidence: 0.6 };
    }

    // Check for refinement signals (when we already have proposals)
    const refinementKeywords = ['change', 'modify', 'update', 'add', 'remove', 'instead', 'actually', 'make it', 'but'];
    if (refinementKeywords.some(kw => lower.includes(kw)) && state.phase !== 'intent') {
      const subject = this.detectRefinementSubject(lower, state);
      return { type: 'REFINEMENT', subject, content: message, confidence: 0.6 };
    }

    // Default based on phase
    if (state.phase === 'intent') {
      return { type: 'INITIAL_REQUEST', subject: 'general', content: message, confidence: 0.5 };
    }

    return { type: 'NEW_REQUIREMENT', subject: 'general', content: message, confidence: 0.4 };
  }

  /**
   * Detect what the user wants to refine
   */
  private detectRefinementSubject(message: string, state: ConversationState): 'schema' | 'ui' | 'code' | 'general' {
    const schemaKeywords = ['field', 'column', 'data', 'type', 'validation', 'required', 'schema'];
    const uiKeywords = ['layout', 'form', 'table', 'chart', 'button', 'color', 'style', 'position', 'side', 'left', 'right'];
    const codeKeywords = ['function', 'logic', 'calculation', 'formula', 'api', 'route'];

    if (schemaKeywords.some(kw => message.includes(kw))) return 'schema';
    if (uiKeywords.some(kw => message.includes(kw))) return 'ui';
    if (codeKeywords.some(kw => message.includes(kw))) return 'code';

    // Infer from current phase
    if (state.phase === 'schema') return 'schema';
    if (state.phase === 'ui') return 'ui';
    if (state.phase === 'code') return 'code';

    return 'general';
  }

  /**
   * Determine the next action based on intent and state
   */
  determineNextAction(
    intent: ParsedIntent,
    state: ConversationState
  ): OrchestratorDecision {
    switch (intent.type) {
      case 'INITIAL_REQUEST':
        return {
          nextAction: {
            agent: 'schema',
            action: 'propose',
            context: { 
              description: intent.content,
              entities: intent.extractedEntities,
              actions: intent.extractedActions,
            },
          },
          reasoning: 'User described what they want to build. Schema Designer will propose a data model.',
          phaseTransition: 'schema',
        };

      case 'REFINEMENT':
        return {
          nextAction: {
            agent: this.getAgentForSubject(intent.subject || 'general', state),
            action: 'refine',
            target: intent.subject,
            context: { feedback: intent.content },
          },
          reasoning: `User wants to refine the ${intent.subject}. Delegating to appropriate agent.`,
        };

      case 'APPROVAL':
        return this.handleApproval(state);

      case 'QUESTION':
        return {
          nextAction: {
            agent: this.getCurrentAgent(state),
            action: 'clarify',
            context: { question: intent.content },
          },
          reasoning: 'User has a question. Current agent will provide clarification.',
        };

      case 'NEW_REQUIREMENT':
        return {
          nextAction: {
            agent: 'schema',
            action: 'extend',
            context: { requirement: intent.content },
          },
          reasoning: 'User added a new requirement. Schema Designer will incorporate it.',
        };

      case 'UNDO':
        return {
          nextAction: {
            agent: 'orchestrator',
            action: 'refine',
            context: { action: 'undo' },
          },
          reasoning: 'User wants to undo. Reverting to previous state.',
        };

      case 'FINALIZE':
        return {
          nextAction: {
            agent: 'code',
            action: 'finalize',
          },
          reasoning: 'User wants to generate the app. Starting code generation.',
          phaseTransition: 'complete',
        };

      default:
        return {
          nextAction: {
            agent: 'orchestrator',
            action: 'clarify',
            context: { question: 'What would you like to do?' },
          },
          reasoning: 'Unclear intent. Asking for clarification.',
        };
    }
  }

  /**
   * Handle approval intent - move to next phase
   */
  private handleApproval(state: ConversationState): OrchestratorDecision {
    switch (state.phase) {
      case 'intent':
        return {
          nextAction: { agent: 'schema', action: 'propose' },
          reasoning: 'Starting schema design.',
          phaseTransition: 'schema',
        };

      case 'schema':
        return {
          nextAction: { agent: 'ui', action: 'propose' },
          reasoning: 'Schema approved. Moving to UI design.',
          phaseTransition: 'ui',
        };

      case 'ui':
        return {
          nextAction: { agent: 'code', action: 'generate' },
          reasoning: 'Layout approved. Starting code generation.',
          phaseTransition: 'code',
        };

      case 'code':
      case 'preview':
        return {
          nextAction: { agent: 'code', action: 'finalize' },
          reasoning: 'Code approved. Finalizing app.',
          phaseTransition: 'complete',
        };

      default:
        return {
          nextAction: { agent: 'orchestrator', action: 'clarify' },
          reasoning: 'Unexpected state. Asking for clarification.',
        };
    }
  }

  /**
   * Get the agent responsible for a subject
   */
  private getAgentForSubject(
    subject: 'schema' | 'ui' | 'code' | 'general',
    state: ConversationState
  ): 'orchestrator' | 'schema' | 'ui' | 'code' {
    switch (subject) {
      case 'schema': return 'schema';
      case 'ui': return 'ui';
      case 'code': return 'code';
      case 'general': return this.getCurrentAgent(state);
    }
  }

  /**
   * Get the current active agent based on phase
   */
  private getCurrentAgent(state: ConversationState): 'orchestrator' | 'schema' | 'ui' | 'code' {
    switch (state.phase) {
      case 'intent': return 'orchestrator';
      case 'schema': return 'schema';
      case 'ui': return 'ui';
      case 'code':
      case 'preview': return 'code';
      default: return 'orchestrator';
    }
  }

  /**
   * Check if the decision requires user input
   */
  private requiresUserInput(decision: OrchestratorDecision): boolean {
    return decision.nextAction.action === 'clarify' || 
           decision.nextAction.action === 'propose';
  }

  /**
   * Get suggested actions for the user
   */
  private getSuggestedActions(
    state: ConversationState,
    decision: OrchestratorDecision
  ): string[] {
    const suggestions: string[] = [];

    switch (state.phase) {
      case 'intent':
        suggestions.push('Describe what you want to track');
        suggestions.push('Tell me about your use case');
        break;

      case 'schema':
        suggestions.push('Approve the schema');
        suggestions.push('Add more fields');
        suggestions.push('Change field types');
        break;

      case 'ui':
        suggestions.push('Approve the layout');
        suggestions.push('Change the layout');
        suggestions.push('Add more components');
        break;

      case 'code':
      case 'preview':
        suggestions.push('Approve and finalize');
        suggestions.push('Make changes');
        suggestions.push('Go back to schema');
        break;
    }

    return suggestions;
  }

  /**
   * Get context information for the current phase
   */
  private getPhaseContext(state: ConversationState): string {
    const parts: string[] = [];

    if (state.intent) {
      parts.push(`Domain: ${state.intent.domain}`);
      parts.push(`Goals: ${state.intent.userGoals.join(', ')}`);
    }

    if (state.schemas.length > 0) {
      const schema = state.schemas[0];
      parts.push(`Schema: ${schema.name} with ${schema.fields.length} fields`);
    }

    if (state.layout) {
      parts.push(`Layout: ${state.layout.type} layout defined`);
    }

    return parts.join('\n');
  }

  /**
   * Validate intent type
   */
  private validateIntentType(type: string): IntentType {
    const validTypes: IntentType[] = [
      'INITIAL_REQUEST', 'REFINEMENT', 'APPROVAL', 'QUESTION', 
      'NEW_REQUIREMENT', 'UNDO', 'FINALIZE'
    ];
    
    if (validTypes.includes(type as IntentType)) {
      return type as IntentType;
    }
    
    return 'NEW_REQUIREMENT'; // Safe default
  }

  /**
   * Create initial conversation state
   */
  static createInitialState(): ConversationState {
    return {
      id: generateId(),
      version: 'v2',
      phase: 'intent',
      messages: [],
      schemas: [],
      generatedCode: {},
      componentSpecs: [],
      refinementHistory: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  }

  /**
   * Add a message to the conversation state
   */
  static addMessage(
    state: ConversationState,
    role: 'user' | 'assistant' | 'system',
    content: string,
    metadata?: Message['metadata']
  ): ConversationState {
    const message: Message = {
      id: generateId(),
      role,
      content,
      timestamp: new Date(),
      metadata,
    };

    return {
      ...state,
      messages: [...state.messages, message],
      updatedAt: new Date(),
    };
  }
}

// Export singleton instance
export const orchestratorAgent = new OrchestratorAgent();
