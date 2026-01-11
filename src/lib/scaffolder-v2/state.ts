/**
 * Conversation State Management for V2
 * Handles state creation, updates, and persistence
 */

import { generateId } from '@/lib/utils';
import type { 
  ConversationState, 
  DynamicConversationState,
  Message, 
  ConversationPhase,
  Schema,
  LayoutNode,
  RefinementEntry,
  ComponentSpec,
  ReadinessScores,
  EnhancedIntent,
  WorkflowDefinition,
  ProactiveSuggestion,
  StateCheckpoint,
} from './types';

/**
 * Create a new conversation state
 */
export function createConversationState(): ConversationState {
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
export function addMessageToState(
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

/**
 * Update conversation state with partial updates
 */
export function updateConversationState(
  state: ConversationState,
  updates: Partial<Omit<ConversationState, 'id' | 'version' | 'createdAt'>>
): ConversationState {
  return {
    ...state,
    ...updates,
    updatedAt: new Date(),
  };
}

/**
 * Transition to a new phase
 */
export function transitionPhase(
  state: ConversationState,
  newPhase: ConversationPhase
): ConversationState {
  return updateConversationState(state, { phase: newPhase });
}

/**
 * Update schema in state
 */
export function updateSchema(
  state: ConversationState,
  schema: Schema,
  index: number = 0
): ConversationState {
  const schemas = [...state.schemas];
  schemas[index] = schema;
  
  return updateConversationState(state, { schemas });
}

/**
 * Add a schema to state
 */
export function addSchema(
  state: ConversationState,
  schema: Schema
): ConversationState {
  return updateConversationState(state, {
    schemas: [...state.schemas, schema],
  });
}

/**
 * Update layout in state
 */
export function updateLayout(
  state: ConversationState,
  layout: LayoutNode
): ConversationState {
  return updateConversationState(state, { layout });
}

/**
 * Add a refinement entry
 */
export function addRefinementEntry(
  state: ConversationState,
  entry: Omit<RefinementEntry, 'id' | 'timestamp'>
): ConversationState {
  const refinementEntry: RefinementEntry = {
    id: generateId(),
    timestamp: new Date(),
    ...entry,
  };

  return updateConversationState(state, {
    refinementHistory: [...state.refinementHistory, refinementEntry],
  });
}

/**
 * Update generated code
 */
export function updateGeneratedCode(
  state: ConversationState,
  filename: string,
  code: string
): ConversationState {
  return updateConversationState(state, {
    generatedCode: {
      ...state.generatedCode,
      [filename]: code,
    },
  });
}

/**
 * Add component spec
 */
export function addComponentSpec(
  state: ConversationState,
  spec: ComponentSpec
): ConversationState {
  return updateConversationState(state, {
    componentSpecs: [...state.componentSpecs, spec],
  });
}

/**
 * Undo to previous refinement state
 */
export function undoLastRefinement(
  state: ConversationState
): ConversationState {
  if (state.refinementHistory.length === 0) {
    return state;
  }

  // Remove the last refinement
  const history = state.refinementHistory.slice(0, -1);
  
  // TODO: Actually restore the state from before the refinement
  // For now, just remove the entry
  return updateConversationState(state, {
    refinementHistory: history,
  });
}

/**
 * Get the last message from a specific role
 */
export function getLastMessage(
  state: ConversationState,
  role?: 'user' | 'assistant' | 'system'
): Message | undefined {
  if (!role) {
    return state.messages[state.messages.length - 1];
  }
  
  for (let i = state.messages.length - 1; i >= 0; i--) {
    if (state.messages[i].role === role) {
      return state.messages[i];
    }
  }
  
  return undefined;
}

/**
 * Check if all required phases are complete
 */
export function isReadyToFinalize(state: ConversationState): boolean {
  return (
    state.schemas.length > 0 &&
    state.layout !== undefined &&
    state.phase !== 'intent'
  );
}

/**
 * Serialize state for database storage
 */
export function serializeState(state: ConversationState): object {
  return {
    ...state,
    messages: state.messages.map(m => ({
      ...m,
      timestamp: m.timestamp.toISOString(),
    })),
    refinementHistory: state.refinementHistory.map(r => ({
      ...r,
      timestamp: r.timestamp.toISOString(),
    })),
    createdAt: state.createdAt.toISOString(),
    updatedAt: state.updatedAt.toISOString(),
  };
}

/**
 * Deserialize state from database
 */
export function deserializeState(data: object): ConversationState {
  const raw = data as Record<string, unknown>;
  
  return {
    ...raw,
    messages: ((raw.messages as unknown[]) || []).map((m: unknown) => {
      const msg = m as Record<string, unknown>;
      return {
        ...msg,
        timestamp: new Date(msg.timestamp as string),
      } as Message;
    }),
    refinementHistory: ((raw.refinementHistory as unknown[]) || []).map((r: unknown) => {
      const ref = r as Record<string, unknown>;
      return {
        ...ref,
        timestamp: new Date(ref.timestamp as string),
      } as RefinementEntry;
    }),
    createdAt: new Date(raw.createdAt as string),
    updatedAt: new Date(raw.updatedAt as string),
  } as ConversationState;
}

// ============================================================================
// Dynamic State Management (Enhanced for parallel execution)
// ============================================================================

/**
 * Create a new dynamic conversation state with readiness tracking
 */
export function createDynamicConversationState(): DynamicConversationState {
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
    // Dynamic pipeline additions
    readiness: {
      schema: 0,
      ui: 0,
      workflow: 0,
      overall: 0,
    },
    workflows: [],
    suggestions: [],
    checkpoints: [],
  };
}

/**
 * Convert legacy state to dynamic state
 */
export function ensureDynamicState(state: ConversationState): DynamicConversationState {
  const dynamicState = state as DynamicConversationState;
  
  if (!dynamicState.readiness) {
    dynamicState.readiness = calculateReadinessFromLegacyState(state);
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
 * Calculate readiness scores from legacy state
 */
function calculateReadinessFromLegacyState(state: ConversationState): ReadinessScores {
  let schema = 0;
  let ui = 0;
  const workflow = 50; // Default for optional
  
  // Schema readiness based on phase and content
  if (state.schemas.length > 0) {
    const fieldCount = state.schemas[0].fields.filter(f => !f.generated).length;
    schema = Math.min(100, 30 + fieldCount * 10);
  }
  
  // UI readiness based on layout
  if (state.layout) {
    ui = 70;
  }
  
  // Map phase to readiness
  switch (state.phase) {
    case 'intent':
      break;
    case 'schema':
      schema = Math.max(schema, 40);
      break;
    case 'ui':
      schema = Math.max(schema, 70);
      ui = Math.max(ui, 40);
      break;
    case 'code':
    case 'preview':
      schema = Math.max(schema, 80);
      ui = Math.max(ui, 80);
      break;
    case 'complete':
      schema = 100;
      ui = 100;
      break;
  }
  
  const overall = Math.round((schema * 0.4 + ui * 0.4 + workflow * 0.2));
  
  return { schema, ui, workflow, overall };
}

/**
 * Update readiness scores
 */
export function updateReadiness(
  state: DynamicConversationState,
  updates: Partial<ReadinessScores>
): DynamicConversationState {
  const newReadiness = {
    ...state.readiness,
    ...updates,
  };
  
  // Recalculate overall
  newReadiness.overall = Math.round(
    (newReadiness.schema * 0.4 + newReadiness.ui * 0.4 + newReadiness.workflow * 0.2)
  );
  
  return {
    ...state,
    readiness: newReadiness,
    updatedAt: new Date(),
  };
}

/**
 * Set enhanced intent
 */
export function setEnhancedIntent(
  state: DynamicConversationState,
  intent: EnhancedIntent
): DynamicConversationState {
  return {
    ...state,
    enhancedIntent: intent,
    updatedAt: new Date(),
  };
}

/**
 * Add a workflow definition
 */
export function addWorkflow(
  state: DynamicConversationState,
  workflow: WorkflowDefinition
): DynamicConversationState {
  return {
    ...state,
    workflows: [...state.workflows, workflow],
    updatedAt: new Date(),
  };
}

/**
 * Update workflows
 */
export function updateWorkflows(
  state: DynamicConversationState,
  workflows: WorkflowDefinition[]
): DynamicConversationState {
  return {
    ...state,
    workflows,
    updatedAt: new Date(),
  };
}

/**
 * Set proactive suggestions
 */
export function setSuggestions(
  state: DynamicConversationState,
  suggestions: ProactiveSuggestion[]
): DynamicConversationState {
  return {
    ...state,
    suggestions,
    updatedAt: new Date(),
  };
}

/**
 * Create a checkpoint for undo
 */
export function createCheckpoint(
  state: DynamicConversationState,
  label: string
): DynamicConversationState {
  const checkpoint: StateCheckpoint = {
    id: generateId(),
    timestamp: new Date(),
    label,
    readiness: { ...state.readiness },
    schemas: JSON.parse(JSON.stringify(state.schemas)),
    layout: state.layout ? JSON.parse(JSON.stringify(state.layout)) : undefined,
    workflows: JSON.parse(JSON.stringify(state.workflows)),
  };
  
  // Keep last 10 checkpoints
  const checkpoints = [...state.checkpoints, checkpoint].slice(-10);
  
  return {
    ...state,
    checkpoints,
    updatedAt: new Date(),
  };
}

/**
 * Restore from a checkpoint
 */
export function restoreCheckpoint(
  state: DynamicConversationState,
  checkpointId: string
): DynamicConversationState | null {
  const checkpoint = state.checkpoints.find(c => c.id === checkpointId);
  if (!checkpoint) return null;
  
  return {
    ...state,
    readiness: checkpoint.readiness,
    schemas: checkpoint.schemas,
    layout: checkpoint.layout,
    workflows: checkpoint.workflows,
    updatedAt: new Date(),
  };
}

/**
 * Check if ready to build based on readiness scores
 */
export function isReadyToBuild(state: DynamicConversationState): boolean {
  return state.readiness.overall >= 80;
}

/**
 * Get phase from readiness (for backwards compatibility)
 */
export function getPhaseFromReadiness(readiness: ReadinessScores): ConversationPhase {
  if (readiness.overall >= 95) return 'complete';
  if (readiness.overall >= 80) return 'preview';
  if (readiness.ui >= 60) return 'ui';
  if (readiness.schema >= 40) return 'schema';
  return 'intent';
}

/**
 * Serialize dynamic state for database storage
 */
export function serializeDynamicState(state: DynamicConversationState): object {
  return {
    ...serializeState(state),
    readiness: state.readiness,
    enhancedIntent: state.enhancedIntent,
    currentProposals: state.currentProposals,
    selectedProposalId: state.selectedProposalId,
    workflows: state.workflows,
    suggestions: state.suggestions,
    checkpoints: state.checkpoints.map(c => ({
      ...c,
      timestamp: c.timestamp.toISOString(),
    })),
  };
}

/**
 * Deserialize dynamic state from database
 */
export function deserializeDynamicState(data: object): DynamicConversationState {
  const base = deserializeState(data);
  const raw = data as Record<string, unknown>;
  
  return {
    ...base,
    readiness: (raw.readiness as ReadinessScores) || { schema: 0, ui: 0, workflow: 0, overall: 0 },
    enhancedIntent: raw.enhancedIntent as EnhancedIntent | undefined,
    currentProposals: raw.currentProposals as DynamicConversationState['currentProposals'],
    selectedProposalId: raw.selectedProposalId as string | undefined,
    workflows: (raw.workflows as WorkflowDefinition[]) || [],
    suggestions: (raw.suggestions as ProactiveSuggestion[]) || [],
    checkpoints: ((raw.checkpoints as unknown[]) || []).map((c: unknown) => {
      const cp = c as Record<string, unknown>;
      return {
        ...cp,
        timestamp: new Date(cp.timestamp as string),
      } as StateCheckpoint;
    }),
  } as DynamicConversationState;
}
