/**
 * Adaptive Architect
 * Coordinates parallel agent execution with decision graphs and readiness tracking
 * Now includes creative iteration loop for design exploration
 */

import { BaseAgent } from './base-agent';
import { generateId } from '@/lib/utils';
import type { UserLLMSettings } from '@/lib/llm';
import type {
  ConversationState,
  DynamicConversationState,
  AgentResponse,
  EnhancedArchitectDecision,
  ParallelAction,
  ReadinessScores,
  EnhancedIntent,
  ParallelExecutionResult,
  MergedAgentResult,
  ProactiveSuggestion,
  AppCategory,
  AppCapabilities,
} from '../types';
import { DesignExplorerAgent, designExplorerAgent, type DesignConcept, type ExplorationResult } from './design-explorer';

// ============================================================================
// Creative Loop Types
// ============================================================================

/**
 * Tracks the state of creative design iteration
 */
export interface CreativeLoopState {
  /** Maximum iterations before forcing selection */
  maxIterations: number;
  /** Quality threshold (0-100) to pass before building */
  qualityThreshold: number;
  /** Current iteration number */
  currentIteration: number;
  /** All design concepts generated */
  designConcepts: DesignConcept[];
  /** The selected/best concept */
  selectedConcept?: DesignConcept;
  /** Whether the loop has completed */
  completed: boolean;
  /** Total creativity score achieved */
  creativityScore: number;
}

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

const ARCHITECT_SYSTEM_PROMPT = `You are the adaptive architect for an AI app builder. Your PRIMARY GOAL is to create CREATIVE, POLISHED applications - NOT generic CRUD interfaces.

## Creative Design Philosophy

CRITICAL: You are NOT building simple CRUD apps. Every app should be:
- CREATIVE: Unique, interesting, delightful to use
- PURPOSEFUL: Designed around the user's actual needs, not database operations
- POLISHED: Beautiful, well-animated, cohesive aesthetic
- FOCUSED: Primary interaction should be prominent, not buried in a form

## Before Building - Creative Exploration

ALWAYS explore at least 3 different design approaches before committing:
1. What is the PRIMARY thing the user will do MOST OFTEN?
2. What should they see IMMEDIATELY when opening the app?
3. What creative visualizations could make this app delightful?
4. How can we avoid the generic "form on left, table on right" pattern?

Examples of CREATIVE vs GENERIC designs:
- Habit tracker: CREATIVE = heatmap with floating check-in button, GENERIC = form + table
- Expense tracker: CREATIVE = visual pie chart with swipe gestures, GENERIC = form + table
- Task manager: CREATIVE = kanban with drag-drop, GENERIC = form + table

## Core Responsibilities:
1. DEEPLY UNDERSTAND user requests - what do they REALLY need, not just what data to store
2. EXPLORE creative design options through the Design Explorer agent
3. COORDINATE agents for collaborative design refinement
4. ENSURE quality threshold (creativity score >= 70) before building
5. REJECT generic CRUD patterns - iterate until design is creative

## Quality Gate

Do NOT proceed to code generation until:
- Creativity score >= 70 (not generic CRUD)
- Design serves the user's PRIMARY interaction
- Aesthetics are defined (theme, colors, animations)
- Layout avoids form+table default

## Autonomous Progression Strategy:
- After understanding intent, run CREATIVE EXPLORATION to generate multiple concepts
- Evaluate concepts for creativity - reject generic patterns
- Iterate on design until quality threshold is met
- Only then proceed to code generation

## Key Principles:
- PRIORITIZE creativity and user delight over speed
- Run agents in PARALLEL when they don't depend on each other
- INFER technical details - don't ask the user
- Detect REFERENCE APPS ("like Trello", "like GitHub") and apply their UX patterns
- Track both READINESS scores (0-100) and CREATIVITY scores (0-100)
- Block building if creativity score < 70

## Readiness Scoring:
- 0-30: Initial ideas - START CREATIVE EXPLORATION
- 30-60: Concepts generated - EVALUATE AND REFINE
- 60-80: Good design emerging - ENSURE CREATIVITY THRESHOLD MET
- 80-100: Creative, ready design - NOW prompt user to BUILD`;

export class AdaptiveArchitect extends BaseAgent {
  // Creative loop configuration
  private creativeLoopConfig = {
    maxIterations: 3,
    qualityThreshold: 70, // Minimum creativity score to proceed
    enableCreativeLoop: true,
  };

  constructor() {
    super({
      name: 'AdaptiveArchitect',
      description: 'Coordinates parallel agent execution with smart decision making and creative exploration',
      temperature: 0.2,
    });
  }

  /**
   * Enable or disable the creative exploration loop
   */
  setCreativeLoopEnabled(enabled: boolean): void {
    this.creativeLoopConfig.enableCreativeLoop = enabled;
  }

  /**
   * Set the quality threshold for the creative loop
   */
  setQualityThreshold(threshold: number): void {
    this.creativeLoopConfig.qualityThreshold = Math.max(0, Math.min(100, threshold));
  }

  protected buildSystemPrompt(state: ConversationState): string {
    const dynamicState = state as DynamicConversationState;
    const readiness = dynamicState.readiness || { schema: 0, ui: 0, workflow: 0, overall: 0 };
    
    return `${ARCHITECT_SYSTEM_PROMPT}

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
    state: ConversationState,
    userSettings?: UserLLMSettings
  ): Promise<AgentResponse> {
    const dynamicState = this.ensureDynamicState(state);
    this.log('Processing with adaptive architect', { message: message.substring(0, 100) });

    // Step 1: Analyze the request and determine actions
    const decision = await this.analyzeAndDecide(message, dynamicState, userSettings);
    this.log('Decision made', { 
      actions: decision.parallelActions.length,
      generateProposals: decision.generateProposals,
      currentReadiness: dynamicState.readiness.overall,
    });

    // Step 2: Determine if we should prompt user to build
    const isReadyToBuild = dynamicState.readiness.overall >= 80;
    const suggestedActions = this.generateSuggestedActions(dynamicState, decision);
    
    // If ready to build, make it the primary suggestion
    if (isReadyToBuild && !suggestedActions.includes('Build the app now')) {
      suggestedActions.unshift('Build the app now');
    }

    // Enhance the message with build readiness context
    let enhancedMessage = decision.userMessage || decision.reasoning;
    if (isReadyToBuild && !enhancedMessage.toLowerCase().includes('build')) {
      enhancedMessage += "\n\n**Your app is ready to build!** Click 'Build App' when you're satisfied with the design, or continue refining if you'd like to make changes.";
    } else if (dynamicState.readiness.overall >= 60 && dynamicState.readiness.overall < 80) {
      enhancedMessage += `\n\n*Progress: ${dynamicState.readiness.overall}% ready. A few more refinements and we can build!*`;
    }

    return {
      success: true,
      message: enhancedMessage,
      data: decision,
      requiresUserInput: decision.generateProposals || isReadyToBuild,
      suggestedActions,
    };
  }

  /**
   * Analyze user input and decide on parallel actions
   */
  async analyzeAndDecide(
    message: string,
    state: DynamicConversationState,
    userSettings?: UserLLMSettings
  ): Promise<EnhancedArchitectDecision> {
    const systemPrompt = this.buildSystemPrompt(state);
    
    const analysisPrompt = `Analyze this user message and determine the optimal execution plan to PROGRESS toward a build-ready app:

User message: "${message}"

Conversation context:
- Messages so far: ${state.messages.length}
- Has schema: ${state.schemas.length > 0}
- Has layout: ${state.layout !== undefined}
- Has enhanced intent: ${state.enhancedIntent !== undefined}
- Current readiness: Schema ${state.readiness.schema}%, UI ${state.readiness.ui}%, Overall ${state.readiness.overall}%

YOUR GOAL: Get the app to 80%+ readiness with minimal user questions.

Determine:
1. What is the user trying to do? (new request, refinement, approval, question)
2. Which agents need to act? Can they run in parallel?
3. If readiness < 80%, what actions will INCREASE readiness?
4. Should we show multiple proposals or just one solution?
5. What message should we show the user? Include progress context.

IMPORTANT: 
- If this is a new app request and we have no schema, ALWAYS include 'schema' and 'intent' agents
- If we have a schema but no layout, ALWAYS include 'ui' agent
- If readiness >= 80%, encourage the user to BUILD the app
- Don't ask unnecessary questions - make smart defaults

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
        context: { userMessage: message, userSettings },
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
      return this.createFallbackDecision(message, state, userSettings);
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
          const userSettings = action.context?.userSettings as UserLLMSettings;

          // Set user settings on the agent
          if (agent.setUserSettings) {
            agent.setUserSettings(userSettings);
          }

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
  // Creative Loop Methods
  // ============================================================================

  /**
   * Run the creative design exploration loop
   * Generates multiple concepts, evaluates them, and returns the best one
   */
  async runCreativeLoop(
    userMessage: string,
    state: DynamicConversationState
  ): Promise<{
    loopState: CreativeLoopState;
    result: ExplorationResult | null;
    capabilities: AppCapabilities | null;
  }> {
    if (!this.creativeLoopConfig.enableCreativeLoop) {
      this.log('Creative loop disabled, skipping exploration');
      return { 
        loopState: this.createEmptyLoopState(), 
        result: null,
        capabilities: null,
      };
    }

    if (state.schemas.length === 0) {
      this.log('No schema available, cannot run creative loop');
      return { 
        loopState: this.createEmptyLoopState(), 
        result: null,
        capabilities: null,
      };
    }

    this.log('Starting creative design exploration', {
      threshold: this.creativeLoopConfig.qualityThreshold,
      maxIterations: this.creativeLoopConfig.maxIterations,
    });

    // Use the DesignExplorerAgent for creative exploration
    const explorationResult = await designExplorerAgent.explore(
      userMessage,
      state.schemas[0],
      state.enhancedIntent
    );

    const loopState: CreativeLoopState = {
      maxIterations: this.creativeLoopConfig.maxIterations,
      qualityThreshold: this.creativeLoopConfig.qualityThreshold,
      currentIteration: explorationResult.iterations,
      designConcepts: explorationResult.concepts,
      selectedConcept: explorationResult.selectedConcept,
      completed: true,
      creativityScore: explorationResult.selectedConcept.scores.creativity,
    };

    this.log('Creative loop completed', {
      iterations: loopState.currentIteration,
      selectedConcept: loopState.selectedConcept?.name,
      creativityScore: loopState.creativityScore,
      meetsThreshold: loopState.creativityScore >= this.creativeLoopConfig.qualityThreshold,
    });

    return {
      loopState,
      result: explorationResult,
      capabilities: explorationResult.selectedConcept.capabilities,
    };
  }

  /**
   * Apply creative loop results to state
   */
  applyCreativeLoopResults(
    state: DynamicConversationState,
    loopState: CreativeLoopState,
    result: ExplorationResult
  ): DynamicConversationState {
    if (!loopState.selectedConcept) {
      return state;
    }

    const updatedState = { ...state };
    
    // Apply the selected concept's layout
    updatedState.layout = loopState.selectedConcept.layout;
    
    // Store the creative loop state for reference
    (updatedState as any).creativeLoopState = loopState;
    
    // Store capabilities for code generation
    (updatedState as any).appCapabilities = loopState.selectedConcept.capabilities;
    
    // Update readiness based on creativity score
    const creativityBonus = Math.min(30, loopState.creativityScore * 0.3);
    updatedState.readiness = {
      ...updatedState.readiness,
      ui: Math.min(100, updatedState.readiness.ui + creativityBonus),
      overall: Math.min(100, updatedState.readiness.overall + creativityBonus * 0.5),
    };

    // Add design exploration info to suggestions
    const explorationSuggestion = {
      id: generateId(),
      feature: `Design: ${loopState.selectedConcept.name}`,
      reasoning: loopState.selectedConcept.description,
      confidence: loopState.selectedConcept.confidence,
      implementation: { effort: 'easy' as const },
      category: 'ux' as const,
    };
    updatedState.suggestions = [explorationSuggestion, ...updatedState.suggestions];

    return updatedState;
  }

  /**
   * Check if creative exploration should be triggered
   */
  shouldRunCreativeLoop(
    state: DynamicConversationState,
    decision: EnhancedArchitectDecision
  ): boolean {
    // Run creative loop for new requests with schema but no layout
    if (state.schemas.length > 0 && !state.layout) {
      return true;
    }

    // Run if explicitly requested to redesign
    if (decision.parallelActions.some(a => 
      a.action === 'explore' || 
      a.action === 'redesign' ||
      a.action === 'creative'
    )) {
      return true;
    }

    // Run if current design has low creativity (stored from previous loop)
    const prevLoopState = (state as any).creativeLoopState as CreativeLoopState | undefined;
    if (prevLoopState && prevLoopState.creativityScore < this.creativeLoopConfig.qualityThreshold) {
      return true;
    }

    return false;
  }

  /**
   * Create empty loop state for when loop is disabled
   */
  private createEmptyLoopState(): CreativeLoopState {
    return {
      maxIterations: this.creativeLoopConfig.maxIterations,
      qualityThreshold: this.creativeLoopConfig.qualityThreshold,
      currentIteration: 0,
      designConcepts: [],
      selectedConcept: undefined,
      completed: false,
      creativityScore: 0,
    };
  }

  /**
   * Get creative loop status message
   */
  getCreativeLoopStatusMessage(loopState: CreativeLoopState): string {
    if (!loopState.completed) {
      return 'Creative exploration not run';
    }

    const meetsThreshold = loopState.creativityScore >= this.creativeLoopConfig.qualityThreshold;
    
    if (meetsThreshold) {
      return `Design "${loopState.selectedConcept?.name}" selected with creativity score ${loopState.creativityScore}/100. ` +
        `This design avoids generic CRUD patterns and focuses on your app's unique needs.`;
    } else {
      return `Best design "${loopState.selectedConcept?.name}" has creativity score ${loopState.creativityScore}/100. ` +
        `Consider requesting a more creative design for better results.`;
    }
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
   * This fallback is designed to ALWAYS progress toward build-ready state
   */
  private createFallbackDecision(
    message: string,
    state: DynamicConversationState,
    userSettings?: UserLLMSettings
  ): EnhancedArchitectDecision {
    const hasSchema = state.schemas.length > 0;
    const hasLayout = state.layout !== undefined;
    const readiness = state.readiness.overall;
    
    // Simple heuristics for fallback
    const isApproval = /looks? good|yes|ok|perfect|great|approve|build|create|generate/i.test(message);
    const isNewRequest = !hasSchema && !isApproval;
    const isBuildRequest = /build|create|generate|finalize|deploy/i.test(message) && readiness >= 60;
    
    const actions: ParallelAction[] = [];
    let userMessage = '';
    
    if (isBuildRequest && readiness >= 80) {
      // User wants to build and we're ready
      userMessage = "Great! Your app is ready to build. Click the 'Build App' button to generate your application.";
      // No additional actions needed - UI will handle the build
    } else if (isNewRequest) {
      // New request: run intent, schema and UI to maximize progress
      const intentId = generateId();
      const schemaId = generateId();
      
      actions.push({
        id: intentId,
        agent: 'intent',
        action: 'extract',
        priority: 10,
        estimatedMs: 1500,
        context: { userMessage: message, userSettings },
      });
      actions.push({
        id: schemaId,
        agent: 'schema',
        action: 'propose',
        priority: 9,
        dependsOn: [intentId],
        estimatedMs: 2000,
        context: { userMessage: message, userSettings },
      });
      actions.push({
        id: generateId(),
        agent: 'ui',
        action: 'propose',
        priority: 8,
        dependsOn: [schemaId],
        estimatedMs: 2000,
        context: { userMessage: message, userSettings },
      });
      userMessage = "I'm designing your app now. I'll create the data model and user interface for you.";
    } else if (!hasLayout && hasSchema) {
      // Have schema but no layout - progress to UI
      actions.push({
        id: generateId(),
        agent: 'ui',
        action: 'propose',
        priority: 9,
        estimatedMs: 2000,
        context: { userMessage: message, userSettings },
      });
      userMessage = "I'll design the user interface for your app now.";
    } else if (isApproval && hasSchema && hasLayout && readiness < 80) {
      // User approved but we need more readiness - add workflow
      actions.push({
        id: generateId(),
        agent: 'workflow',
        action: 'analyze',
        priority: 7,
        estimatedMs: 1500,
        context: { userMessage: message, userSettings },
      });
      userMessage = "Finalizing the design. I'm adding some smart automations to make your app more powerful.";
    } else {
      // Refinement - figure out what to refine
      const isSchemaRelated = /field|column|data|type|add|remove|property|attribute/i.test(message);
      const isUIRelated = /layout|form|table|chart|side|position|view|display/i.test(message);
      
      if (isSchemaRelated) {
        actions.push({
          id: generateId(),
          agent: 'schema',
          action: 'refine',
          priority: 8,
          context: { feedback: message, userSettings },
          estimatedMs: 2000,
        });
      }
      if (isUIRelated || (!isSchemaRelated && hasSchema && !hasLayout)) {
        actions.push({
          id: generateId(),
          agent: 'ui',
          action: hasLayout ? 'refine' : 'propose',
          priority: 8,
          context: { feedback: message, userSettings },
          estimatedMs: 2000,
        });
      }
      if (actions.length === 0) {
        // Default: progress based on what's missing
        if (!hasSchema) {
          actions.push({
            id: generateId(),
            agent: 'intent',
            action: 'extract',
            priority: 10,
            context: { feedback: message, userSettings },
            estimatedMs: 1500,
          });
        } else if (!hasLayout) {
          actions.push({
            id: generateId(),
            agent: 'ui',
            action: 'propose',
            priority: 9,
            context: { feedback: message, userSettings },
            estimatedMs: 2000,
          });
        } else {
          // Both exist - refine schema
          actions.push({
            id: generateId(),
            agent: 'schema',
            action: 'refine',
            priority: 5,
            context: { feedback: message, userSettings },
            estimatedMs: 2000,
          });
        }
      }
      userMessage = 'Updating the design based on your feedback.';
    }
    
    // Add readiness context to message
    if (readiness >= 80) {
      userMessage += " Your app is ready to build!";
    } else if (readiness >= 60) {
      userMessage += ` (${readiness}% ready - almost there!)`;
    }
    
    return {
      parallelActions: actions,
      dependencies: this.buildDependencyGraph(actions),
      reasoning: userMessage || 'Processing your request...',
      userMessage,
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
   * Prioritizes build action when ready, otherwise guides toward completion
   */
  private generateSuggestedActions(
    state: DynamicConversationState,
    decision: EnhancedArchitectDecision
  ): string[] {
    const suggestions: string[] = [];
    const readiness = state.readiness;
    
    // Priority 1: Build action when ready
    if (readiness.overall >= 80) {
      suggestions.push('Build the app now');
      suggestions.push('Add more features first');
      suggestions.push('Refine the design');
      return suggestions.slice(0, 4);
    }
    
    // Priority 2: Get to build-ready state
    if (readiness.overall >= 60) {
      suggestions.push('Looks good, finalize it');
      if (readiness.ui < 80) {
        suggestions.push('Adjust the layout');
      }
      if (readiness.schema < 80) {
        suggestions.push('Add another field');
      }
    } else {
      // Still early in the process
      if (state.schemas.length === 0) {
        suggestions.push('Tell me more about your app');
      } else if (!state.layout) {
        suggestions.push('Design the interface');
      }
      
      if (readiness.schema < 60) {
        suggestions.push('Add more data fields');
      }
    }
    
    // Add proactive suggestions from the state
    if (state.suggestions.length > 0) {
      const unusedSuggestions = state.suggestions
        .filter(s => !suggestions.includes(s.feature))
        .slice(0, 2)
        .map(s => s.feature);
      suggestions.push(...unusedSuggestions);
    }
    
    // Always provide some options
    if (suggestions.length < 2) {
      if (!suggestions.includes('Add more features first')) {
        suggestions.push('Add more features');
      }
      suggestions.push('Continue');
    }
    
    return suggestions.slice(0, 4);
  }
}

// Export singleton instance
export const adaptiveArchitect = new AdaptiveArchitect();
