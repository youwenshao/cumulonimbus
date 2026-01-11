/**
 * Adaptive Orchestrator
 * Coordinates parallel agent execution with decision graphs and readiness tracking
 */

import { BaseAgent } from './base-agent';
import { generateId } from '@/lib/utils';
import type { 
  ConversationState,
  DynamicConversationState,
  AgentResponse, 
  EnhancedOrchestratorDecision,
  ParallelAction,
  ReadinessScores,
  EnhancedIntent,
  ParallelExecutionResult,
  MergedAgentResult,
  ProactiveSuggestion,
  AppCategory,
} from '../types';

// Decision analysis schema for LLM
const DECISION_ANALYSIS_SCHEMA = `{
  "understanding": {
    "primaryIntent": "string",
    "isNewRequest": true|false,
    "isRefinement": true|false,
    "isApproval": true|false,
    "isQuestion": true|false,
    "affectedAreas": ["schema"|"ui"|"workflow"|"all"],
    "complexity": 1-10
  },
  "parallelActions": [{
    "agent": "schema"|"ui"|"workflow"|"intent",
    "action": "string",
    "priority": 1-10,
    "dependsOn": ["string"],
    "estimatedMs": number
  }],
  "shouldGenerateProposals": true|false,
  "userMessage": "string",
  "reasoning": "string"
}`;

// Enhanced intent extraction schema
const INTENT_EXTRACTION_SCHEMA = `{
  "primaryGoal": "string",
  "appCategory": "tracker"|"crm"|"dashboard"|"workflow"|"content"|"inventory"|"social"|"generic",
  "complexityScore": 1-10,
  "entities": [{
    "name": "string",
    "role": "primary"|"secondary",
    "fields": ["string"],
    "relationships": ["string"]
  }],
  "referenceApps": [{
    "name": "string",
    "aspects": ["string"],
    "confidence": 0-1
  }],
  "workflows": [{
    "trigger": "string",
    "action": "string",
    "description": "string"
  }],
  "layoutHints": {
    "structure": "dashboard"|"sidebar"|"kanban"|"simple"|"split",
    "components": ["string"],
    "emphasis": "data-entry"|"visualization"|"workflow"|"balanced"
  },
  "suggestedEnhancements": ["string"]
}`;

const ORCHESTRATOR_SYSTEM_PROMPT = `You are the adaptive orchestrator for an AI app builder. Your job is to:

1. DEEPLY UNDERSTAND user requests - extract entities, detect references, understand workflows
2. COORDINATE agents in parallel when possible - don't run sequentially unless necessary
3. MAKE SMART DECISIONS - the user should rarely need to answer technical questions
4. GENERATE PROPOSALS when appropriate - give users 2-3 options to choose from

Key principles:
- Run agents in PARALLEL when they don't depend on each other
- INFER technical details (field types, validations) - don't ask the user
- Detect REFERENCE APPS ("like Trello") and apply their patterns
- Track READINESS scores (0-100) for schema, UI, and workflow
- Generate VISUAL MOCKUPS for proposals

For parallel execution:
- Schema and UI agents CAN run in parallel for initial requests
- Workflow agent can run in parallel with Schema agent
- Code generation MUST wait for Schema and UI to be ready

For readiness scoring:
- 0-30: Initial ideas, needs refinement
- 30-60: Basic structure defined
- 60-90: Well-defined, minor tweaks needed
- 90-100: Ready for code generation`;

export class AdaptiveOrchestrator extends BaseAgent {
  constructor() {
    super({
      name: 'AdaptiveOrchestrator',
      description: 'Coordinates parallel agent execution with smart decision making',
      temperature: 0.2,
    });
  }

  protected buildSystemPrompt(state: ConversationState): string {
    const dynamicState = state as DynamicConversationState;
    const readiness = dynamicState.readiness || { schema: 0, ui: 0, workflow: 0, overall: 0 };
    
    return `${ORCHESTRATOR_SYSTEM_PROMPT}

Current readiness:
- Schema: ${readiness.schema}%
- UI: ${readiness.ui}%
- Workflow: ${readiness.workflow}%
- Overall: ${readiness.overall}%

${state.schemas.length > 0 ? `Current schema: ${state.schemas[0]?.name} with ${state.schemas[0]?.fields.length} fields` : 'No schema yet'}
${state.layout ? 'Layout defined' : 'No layout yet'}
${(dynamicState.workflows?.length || 0) > 0 ? `${dynamicState.workflows.length} workflows defined` : 'No workflows yet'}`;
  }

  /**
   * Main processing entry point
   */
  async process(
    message: string,
    state: ConversationState
  ): Promise<AgentResponse> {
    const dynamicState = this.ensureDynamicState(state);
    this.log('Processing with adaptive orchestrator', { message: message.substring(0, 100) });

    // Step 1: Analyze the request and determine actions
    const decision = await this.analyzeAndDecide(message, dynamicState);
    this.log('Decision made', { 
      actions: decision.parallelActions.length,
      generateProposals: decision.generateProposals 
    });

    return {
      success: true,
      message: decision.userMessage || decision.reasoning,
      data: decision,
      requiresUserInput: decision.generateProposals,
      suggestedActions: this.generateSuggestedActions(dynamicState, decision),
    };
  }

  /**
   * Analyze user input and decide on parallel actions
   */
  async analyzeAndDecide(
    message: string,
    state: DynamicConversationState
  ): Promise<EnhancedOrchestratorDecision> {
    const systemPrompt = this.buildSystemPrompt(state);
    
    const analysisPrompt = `Analyze this user message and determine the optimal execution plan:

User message: "${message}"

Conversation context:
- Messages so far: ${state.messages.length}
- Has schema: ${state.schemas.length > 0}
- Has layout: ${state.layout !== undefined}
- Has enhanced intent: ${state.enhancedIntent !== undefined}

Determine:
1. What is the user trying to do? (new request, refinement, approval, question)
2. Which agents need to act? Can they run in parallel?
3. Should we show multiple proposals or just one solution?
4. What message should we show the user?

Respond with JSON.`;

    try {
      const analysis = await this.callLLMJSON<{
        understanding: {
          primaryIntent: string;
          isNewRequest: boolean;
          isRefinement: boolean;
          isApproval: boolean;
          isQuestion: boolean;
          affectedAreas: ('schema' | 'ui' | 'workflow' | 'all')[];
          complexity: number;
        };
        parallelActions: {
          agent: string;
          action: string;
          priority: number;
          dependsOn?: string[];
          estimatedMs?: number;
        }[];
        shouldGenerateProposals: boolean;
        userMessage: string;
        reasoning: string;
      }>(
        [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: analysisPrompt },
        ],
        DECISION_ANALYSIS_SCHEMA
      );

      // Convert to parallel actions
      const parallelActions: ParallelAction[] = analysis.parallelActions.map((a, i) => ({
        id: generateId(),
        agent: a.agent as ParallelAction['agent'],
        action: a.action,
        priority: a.priority || 5,
        dependsOn: a.dependsOn,
        estimatedMs: a.estimatedMs || 2000,
        context: { userMessage: message },
      }));

      // Calculate expected readiness
      const expectedReadiness = this.calculateExpectedReadiness(
        state.readiness,
        analysis.understanding.affectedAreas,
        analysis.understanding.isNewRequest
      );

      return {
        parallelActions,
        dependencies: this.buildDependencyGraph(parallelActions),
        reasoning: analysis.reasoning,
        generateProposals: analysis.shouldGenerateProposals,
        userMessage: analysis.userMessage,
        expectedReadiness,
        estimatedTimeMs: parallelActions.reduce((sum, a) => sum + (a.estimatedMs || 2000), 0),
      };
    } catch (error) {
      this.log('Analysis failed, using fallback', { error });
      return this.createFallbackDecision(message, state);
    }
  }

  /**
   * Extract enhanced intent from user message
   */
  async extractEnhancedIntent(
    message: string,
    state: DynamicConversationState
  ): Promise<EnhancedIntent> {
    const systemPrompt = `You are an expert at understanding app requirements. Extract detailed information from user descriptions.

Key things to identify:
1. ENTITIES: What data will the app manage? (projects, tasks, users, etc.)
2. RELATIONSHIPS: How are entities connected? (projects have tasks, tasks belong to users)
3. REFERENCE APPS: Did they mention apps to emulate? ("like Trello", "similar to Notion")
4. WORKFLOWS: Any automations or rules? ("when done, archive", "notify on deadline")
5. LAYOUT HINTS: Any UI preferences? ("dashboard", "kanban", "sidebar")
6. COMPLEXITY: Simple tracker (1-3) vs. full workflow system (7-10)

Be generous with inferences - if they say "project tracker", infer they need projects and tasks.`;

    const extractionPrompt = `Extract a complete understanding of this app request:

"${message}"

${state.enhancedIntent ? `Previous understanding: ${JSON.stringify(state.enhancedIntent)}` : ''}

Provide a comprehensive analysis as JSON.`;

    try {
      const intent = await this.callLLMJSON<EnhancedIntent>(
        [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: extractionPrompt },
        ],
        INTENT_EXTRACTION_SCHEMA
      );

      return intent;
    } catch (error) {
      this.log('Intent extraction failed', { error });
      return this.createFallbackIntent(message);
    }
  }

  /**
   * Execute multiple agents in parallel
   */
  async executeParallel(
    actions: ParallelAction[],
    state: DynamicConversationState,
    agents: Record<string, BaseAgent>
  ): Promise<ParallelExecutionResult[]> {
    const results: ParallelExecutionResult[] = [];
    const completed = new Set<string>();
    const pending = [...actions];

    while (pending.length > 0) {
      // Find actions that can run (dependencies satisfied)
      const runnable = pending.filter(action => {
        if (!action.dependsOn || action.dependsOn.length === 0) return true;
        return action.dependsOn.every(dep => completed.has(dep));
      });

      if (runnable.length === 0) {
        this.log('Deadlock detected in parallel execution');
        break;
      }

      // Execute runnable actions in parallel
      const startTime = Date.now();
      const promises = runnable.map(async (action) => {
        const agent = agents[action.agent];
        if (!agent) {
          return {
            actionId: action.id,
            agent: action.agent,
            success: false,
            error: `Agent ${action.agent} not found`,
            durationMs: 0,
          };
        }

        try {
          const userMessage = (action.context?.userMessage as string) || '';
          const result = await agent.process(userMessage, state);
          return {
            actionId: action.id,
            agent: action.agent,
            success: result.success,
            result,
            durationMs: Date.now() - startTime,
          };
        } catch (error) {
          return {
            actionId: action.id,
            agent: action.agent,
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
            durationMs: Date.now() - startTime,
          };
        }
      });

      const batchResults = await Promise.all(promises);
      results.push(...batchResults);

      // Mark completed and remove from pending
      for (const result of batchResults) {
        completed.add(result.actionId);
        const idx = pending.findIndex(a => a.id === result.actionId);
        if (idx >= 0) pending.splice(idx, 1);
      }
    }

    return results;
  }

  /**
   * Merge results from parallel execution
   */
  mergeResults(
    results: ParallelExecutionResult[],
    state: DynamicConversationState
  ): MergedAgentResult {
    let schemaUpdates: DynamicConversationState['schemas'] | undefined;
    let layoutUpdate: DynamicConversationState['layout'] | undefined;
    let workflowUpdates: DynamicConversationState['workflows'] | undefined;
    const messages: string[] = [];
    const suggestions: ProactiveSuggestion[] = [];

    for (const result of results) {
      if (!result.success || !result.result) continue;

      const data = result.result.data as Record<string, unknown> | undefined;
      
      if (result.agent === 'schema' && data?.schemas) {
        schemaUpdates = data.schemas as DynamicConversationState['schemas'];
      }
      
      if (result.agent === 'ui' && data?.layout) {
        layoutUpdate = data.layout as DynamicConversationState['layout'];
      }
      
      if (result.agent === 'workflow' && data?.workflows) {
        workflowUpdates = data.workflows as DynamicConversationState['workflows'];
      }

      if (result.result.message) {
        messages.push(result.result.message);
      }

      if (result.result.suggestedActions) {
        for (const action of result.result.suggestedActions) {
          suggestions.push({
            id: generateId(),
            feature: action,
            reasoning: 'Suggested by agent',
            confidence: 0.7,
            implementation: { effort: 'easy' },
            category: 'ux',
          });
        }
      }
    }

    // Calculate new readiness
    const readiness = this.calculateReadinessFromState({
      ...state,
      schemas: schemaUpdates || state.schemas,
      layout: layoutUpdate || state.layout,
      workflows: workflowUpdates || state.workflows,
    });

    // Combine messages intelligently
    const userMessage = this.combineMessages(messages, readiness);

    return {
      schemaUpdates,
      layoutUpdate,
      workflowUpdates,
      userMessage,
      readiness,
      suggestions,
      individualResults: results,
    };
  }

  /**
   * Generate proactive suggestions based on current state
   */
  async generateSuggestions(
    state: DynamicConversationState
  ): Promise<ProactiveSuggestion[]> {
    if (!state.enhancedIntent) return [];

    const category = state.enhancedIntent.appCategory;
    const suggestions: ProactiveSuggestion[] = [];

    // Category-specific suggestions
    const categoryEnhancements: Record<AppCategory, ProactiveSuggestion[]> = {
      tracker: [
        {
          id: generateId(),
          feature: 'Add progress charts',
          reasoning: 'Visualize completion trends over time',
          confidence: 0.8,
          implementation: { effort: 'easy' },
          icon: '📊',
          category: 'visualization',
        },
        {
          id: generateId(),
          feature: 'Add streak tracking',
          reasoning: 'Gamify habit building with streaks',
          confidence: 0.7,
          implementation: { effort: 'moderate' },
          icon: '🔥',
          category: 'data',
        },
      ],
      crm: [
        {
          id: generateId(),
          feature: 'Add activity timeline',
          reasoning: 'Track all interactions with contacts',
          confidence: 0.85,
          implementation: { effort: 'moderate' },
          icon: '📅',
          category: 'data',
        },
      ],
      dashboard: [
        {
          id: generateId(),
          feature: 'Add real-time updates',
          reasoning: 'Keep data fresh without manual refresh',
          confidence: 0.75,
          implementation: { effort: 'moderate' },
          icon: '⚡',
          category: 'ux',
        },
      ],
      workflow: [
        {
          id: generateId(),
          feature: 'Add approval notifications',
          reasoning: 'Notify users when their action is needed',
          confidence: 0.9,
          implementation: { effort: 'easy' },
          icon: '🔔',
          category: 'workflow',
        },
      ],
      content: [],
      inventory: [
        {
          id: generateId(),
          feature: 'Add low stock alerts',
          reasoning: 'Get notified before items run out',
          confidence: 0.85,
          implementation: { effort: 'easy' },
          icon: '⚠️',
          category: 'workflow',
        },
      ],
      social: [],
      generic: [],
    };

    suggestions.push(...(categoryEnhancements[category] || []));

    // Check for missing common features
    if (!state.layout) {
      // No suggestions for missing layout
    } else if (state.schemas.length > 0) {
      const schema = state.schemas[0];
      const hasNumericField = schema.fields.some(f => f.type === 'number');
      const hasDateField = schema.fields.some(f => f.type === 'date' || f.type === 'datetime');
      
      if (hasNumericField && !this.hasComponent(state.layout, 'chart')) {
        suggestions.push({
          id: generateId(),
          feature: 'Add data charts',
          reasoning: 'Visualize your numeric data',
          confidence: 0.8,
          implementation: { effort: 'easy' },
          icon: '📈',
          category: 'visualization',
        });
      }
      
      if (hasDateField && !this.hasComponent(state.layout, 'calendar')) {
        suggestions.push({
          id: generateId(),
          feature: 'Add calendar view',
          reasoning: 'See your data on a calendar',
          confidence: 0.6,
          implementation: { effort: 'moderate' },
          icon: '📅',
          category: 'visualization',
        });
      }
    }

    return suggestions.slice(0, 5); // Limit to 5 suggestions
  }

  // ============================================================================
  // Helper Methods
  // ============================================================================

  /**
   * Ensure state has dynamic pipeline properties
   */
  private ensureDynamicState(state: ConversationState): DynamicConversationState {
    const dynamicState = state as DynamicConversationState;
    
    if (!dynamicState.readiness) {
      dynamicState.readiness = { schema: 0, ui: 0, workflow: 0, overall: 0 };
    }
    if (!dynamicState.workflows) {
      dynamicState.workflows = [];
    }
    if (!dynamicState.suggestions) {
      dynamicState.suggestions = [];
    }
    if (!dynamicState.checkpoints) {
      dynamicState.checkpoints = [];
    }
    
    return dynamicState;
  }

  /**
   * Build dependency graph from parallel actions
   */
  private buildDependencyGraph(actions: ParallelAction[]): Record<string, string[]> {
    const deps: Record<string, string[]> = {};
    
    for (const action of actions) {
      deps[action.id] = action.dependsOn || [];
    }
    
    return deps;
  }

  /**
   * Calculate expected readiness after actions
   */
  private calculateExpectedReadiness(
    current: ReadinessScores,
    affectedAreas: ('schema' | 'ui' | 'workflow' | 'all')[],
    isNewRequest: boolean
  ): Partial<ReadinessScores> {
    const updates: Partial<ReadinessScores> = {};
    
    const increment = isNewRequest ? 40 : 20;
    
    if (affectedAreas.includes('all') || affectedAreas.includes('schema')) {
      updates.schema = Math.min(100, current.schema + increment);
    }
    if (affectedAreas.includes('all') || affectedAreas.includes('ui')) {
      updates.ui = Math.min(100, current.ui + increment);
    }
    if (affectedAreas.includes('all') || affectedAreas.includes('workflow')) {
      updates.workflow = Math.min(100, current.workflow + increment);
    }
    
    return updates;
  }

  /**
   * Calculate readiness from current state
   */
  private calculateReadinessFromState(state: DynamicConversationState): ReadinessScores {
    let schemaScore = 0;
    let uiScore = 0;
    let workflowScore = 0;

    // Schema readiness
    if (state.schemas.length > 0) {
      const schema = state.schemas[0];
      const fieldCount = schema.fields.filter(f => !f.generated).length;
      
      if (fieldCount >= 1) schemaScore = 30;
      if (fieldCount >= 3) schemaScore = 50;
      if (fieldCount >= 5) schemaScore = 70;
      if (schema.description) schemaScore += 10;
      if (schema.relationships && schema.relationships.length > 0) schemaScore += 10;
      if (schema.computedFields && schema.computedFields.length > 0) schemaScore += 10;
    }

    // UI readiness
    if (state.layout) {
      uiScore = 50;
      const componentCount = this.countComponents(state.layout);
      if (componentCount >= 2) uiScore = 70;
      if (componentCount >= 4) uiScore = 85;
      if (state.layout.container?.responsive) uiScore += 10;
    }

    // Workflow readiness (optional, so starts higher)
    workflowScore = state.workflows.length === 0 ? 50 : 0;
    if (state.workflows.length > 0) {
      workflowScore = 60 + (state.workflows.length * 10);
    }

    // Cap at 100
    schemaScore = Math.min(100, schemaScore);
    uiScore = Math.min(100, uiScore);
    workflowScore = Math.min(100, workflowScore);

    // Overall is weighted average (workflow is optional so weighted less)
    const overall = Math.round((schemaScore * 0.4 + uiScore * 0.4 + workflowScore * 0.2));

    return { schema: schemaScore, ui: uiScore, workflow: workflowScore, overall };
  }

  /**
   * Count components in layout tree
   */
  private countComponents(node: DynamicConversationState['layout']): number {
    if (!node) return 0;
    
    if (node.type === 'component') return 1;
    
    if (node.type === 'container' && node.container?.children) {
      return node.container.children.reduce(
        (sum, child) => sum + this.countComponents(child),
        0
      );
    }
    
    return 0;
  }

  /**
   * Check if layout has a specific component type
   */
  private hasComponent(node: DynamicConversationState['layout'], type: string): boolean {
    if (!node) return false;
    
    if (node.type === 'component' && node.component?.type === type) return true;
    
    if (node.type === 'container' && node.container?.children) {
      return node.container.children.some(child => this.hasComponent(child, type));
    }
    
    return false;
  }

  /**
   * Combine multiple agent messages into one coherent message
   */
  private combineMessages(messages: string[], readiness: ReadinessScores): string {
    if (messages.length === 0) {
      return this.getReadinessMessage(readiness);
    }
    
    if (messages.length === 1) {
      return messages[0];
    }
    
    // Combine messages, remove duplicate info
    const combined = messages.join('\n\n---\n\n');
    const footer = `\n\n${this.getReadinessMessage(readiness)}`;
    
    return combined + footer;
  }

  /**
   * Get a user-friendly readiness message
   */
  private getReadinessMessage(readiness: ReadinessScores): string {
    if (readiness.overall >= 90) {
      return "Your app is ready to build! Say 'build it' when you're ready.";
    }
    if (readiness.overall >= 70) {
      return 'Looking good! A few more refinements and we can build.';
    }
    if (readiness.overall >= 50) {
      return "We're making progress. What would you like to adjust?";
    }
    return "Tell me more about what you'd like to build.";
  }

  /**
   * Create fallback decision when LLM fails
   */
  private createFallbackDecision(
    message: string,
    state: DynamicConversationState
  ): EnhancedOrchestratorDecision {
    const hasSchema = state.schemas.length > 0;
    const hasLayout = state.layout !== undefined;
    
    // Simple heuristics for fallback
    const isApproval = /looks? good|yes|ok|perfect|great|approve/i.test(message);
    const isNewRequest = !hasSchema && !isApproval;
    
    const actions: ParallelAction[] = [];
    
    if (isNewRequest) {
      // New request: run schema and UI in parallel
      actions.push({
        id: generateId(),
        agent: 'intent',
        action: 'extract',
        priority: 10,
        estimatedMs: 1500,
      });
      actions.push({
        id: generateId(),
        agent: 'schema',
        action: 'propose',
        priority: 8,
        dependsOn: [actions[0].id],
        estimatedMs: 2000,
      });
      actions.push({
        id: generateId(),
        agent: 'ui',
        action: 'propose',
        priority: 7,
        dependsOn: [actions[1].id],
        estimatedMs: 2000,
      });
    } else if (isApproval && hasSchema && !hasLayout) {
      actions.push({
        id: generateId(),
        agent: 'ui',
        action: 'propose',
        priority: 9,
        estimatedMs: 2000,
      });
    } else if (isApproval && hasSchema && hasLayout) {
      actions.push({
        id: generateId(),
        agent: 'code',
        action: 'generate',
        priority: 10,
        estimatedMs: 5000,
      });
    } else {
      // Refinement - figure out what to refine
      const isSchemaRelated = /field|column|data|type|add|remove/i.test(message);
      const isUIRelated = /layout|form|table|chart|side|position/i.test(message);
      
      if (isSchemaRelated) {
        actions.push({
          id: generateId(),
          agent: 'schema',
          action: 'refine',
          priority: 8,
          context: { feedback: message },
          estimatedMs: 2000,
        });
      }
      if (isUIRelated) {
        actions.push({
          id: generateId(),
          agent: 'ui',
          action: 'refine',
          priority: 8,
          context: { feedback: message },
          estimatedMs: 2000,
        });
      }
      if (actions.length === 0) {
        // Default: try schema first
        actions.push({
          id: generateId(),
          agent: hasSchema ? 'schema' : 'intent',
          action: hasSchema ? 'refine' : 'extract',
          priority: 5,
          context: { feedback: message },
          estimatedMs: 2000,
        });
      }
    }
    
    return {
      parallelActions: actions,
      dependencies: this.buildDependencyGraph(actions),
      reasoning: 'Fallback decision based on heuristics',
      generateProposals: isNewRequest,
      expectedReadiness: {},
      estimatedTimeMs: actions.reduce((sum, a) => sum + (a.estimatedMs || 2000), 0),
    };
  }

  /**
   * Create fallback intent when extraction fails
   */
  private createFallbackIntent(message: string): EnhancedIntent {
    // Simple extraction from message
    const words = message.toLowerCase().split(/\s+/);
    const entities: EnhancedIntent['entities'] = [];
    
    // Common entity patterns
    const entityPatterns = [
      'project', 'task', 'user', 'item', 'expense', 'habit',
      'contact', 'customer', 'order', 'product', 'event',
    ];
    
    for (const pattern of entityPatterns) {
      if (words.some(w => w.includes(pattern))) {
        entities.push({
          name: pattern,
          role: entities.length === 0 ? 'primary' : 'secondary',
          fields: [],
          relationships: [],
        });
      }
    }
    
    if (entities.length === 0) {
      entities.push({
        name: 'item',
        role: 'primary',
        fields: ['name', 'description'],
        relationships: [],
      });
    }
    
    // Detect category
    let category: AppCategory = 'generic';
    if (/track|habit|goal/i.test(message)) category = 'tracker';
    if (/customer|contact|crm|lead/i.test(message)) category = 'crm';
    if (/dashboard|analytics|stats/i.test(message)) category = 'dashboard';
    if (/workflow|approval|process/i.test(message)) category = 'workflow';
    if (/inventory|stock|warehouse/i.test(message)) category = 'inventory';
    
    // Detect reference apps
    const referenceApps: EnhancedIntent['referenceApps'] = [];
    if (/trello/i.test(message)) {
      referenceApps.push({ name: 'Trello', aspects: ['kanban_layout', 'drag_drop'], confidence: 0.9 });
    }
    if (/notion/i.test(message)) {
      referenceApps.push({ name: 'Notion', aspects: ['flexible_blocks', 'databases'], confidence: 0.9 });
    }
    if (/asana|jira/i.test(message)) {
      referenceApps.push({ name: 'Asana/Jira', aspects: ['project_management', 'task_views'], confidence: 0.8 });
    }
    
    return {
      primaryGoal: message,
      appCategory: category,
      complexityScore: Math.min(10, 3 + entities.length),
      entities,
      referenceApps,
      workflows: [],
      layoutHints: {
        structure: referenceApps.some(r => r.aspects.includes('kanban_layout')) ? 'kanban' : 'simple',
        components: ['form', 'table'],
        emphasis: 'balanced',
      },
      suggestedEnhancements: [],
    };
  }

  /**
   * Generate suggested actions for user
   */
  private generateSuggestedActions(
    state: DynamicConversationState,
    decision: EnhancedOrchestratorDecision
  ): string[] {
    const suggestions: string[] = [];
    const readiness = state.readiness;
    
    if (readiness.overall >= 80) {
      suggestions.push('Build the app now');
    }
    
    if (readiness.schema < 80) {
      suggestions.push('Add more fields');
      suggestions.push('Refine the data model');
    }
    
    if (readiness.ui < 80 && readiness.schema >= 50) {
      suggestions.push('Change the layout');
      suggestions.push('Add visualizations');
    }
    
    if (state.suggestions.length > 0) {
      suggestions.push(...state.suggestions.slice(0, 2).map(s => s.feature));
    }
    
    return suggestions.slice(0, 4);
  }
}

// Export singleton instance
export const adaptiveOrchestrator = new AdaptiveOrchestrator();
