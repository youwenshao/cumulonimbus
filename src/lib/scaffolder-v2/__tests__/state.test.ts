/**
 * Unit tests for Scaffolder V2 State Management
 */

import {
  createConversationState,
  addMessageToState,
  updateConversationState,
  transitionPhase,
  updateSchema,
  addSchema,
  updateLayout,
  addRefinementEntry,
  updateGeneratedCode,
  addComponentSpec,
  undoLastRefinement,
  getLastMessage,
  isReadyToFinalize,
  serializeState,
  deserializeState,
  createDynamicConversationState,
  ensureDynamicState,
  updateReadiness,
  setEnhancedIntent,
  addWorkflow,
  setSuggestions,
  createCheckpoint,
  restoreCheckpoint,
  isReadyToBuild,
  getPhaseFromReadiness,
} from '../state';
import type { 
  ConversationState, 
  Schema, 
  LayoutNode,
  Message,
  RefinementEntry,
  ComponentSpec,
  DynamicConversationState,
  EnhancedIntent,
  WorkflowDefinition,
  ProactiveSuggestion,
} from '../types';

describe('createConversationState', () => {
  it('should create state with unique ID', () => {
    const state = createConversationState();
    expect(state.id).toBeTruthy();
    expect(state.id.length).toBeGreaterThan(0);
  });

  it('should set version to v2', () => {
    const state = createConversationState();
    expect(state.version).toBe('v2');
  });

  it('should start in intent phase', () => {
    const state = createConversationState();
    expect(state.phase).toBe('intent');
  });

  it('should initialize empty messages array', () => {
    const state = createConversationState();
    expect(state.messages).toEqual([]);
  });

  it('should initialize empty schemas array', () => {
    const state = createConversationState();
    expect(state.schemas).toEqual([]);
  });

  it('should initialize empty generatedCode object', () => {
    const state = createConversationState();
    expect(state.generatedCode).toEqual({});
  });

  it('should initialize empty componentSpecs array', () => {
    const state = createConversationState();
    expect(state.componentSpecs).toEqual([]);
  });

  it('should initialize empty refinementHistory array', () => {
    const state = createConversationState();
    expect(state.refinementHistory).toEqual([]);
  });

  it('should set createdAt timestamp', () => {
    const before = new Date();
    const state = createConversationState();
    const after = new Date();
    
    expect(state.createdAt.getTime()).toBeGreaterThanOrEqual(before.getTime());
    expect(state.createdAt.getTime()).toBeLessThanOrEqual(after.getTime());
  });

  it('should set updatedAt timestamp', () => {
    const state = createConversationState();
    expect(state.updatedAt).toBeInstanceOf(Date);
  });

  it('should generate unique IDs for each state', () => {
    const ids = new Set<string>();
    for (let i = 0; i < 100; i++) {
      ids.add(createConversationState().id);
    }
    expect(ids.size).toBe(100);
  });
});

describe('addMessageToState', () => {
  let state: ConversationState;

  beforeEach(() => {
    state = createConversationState();
  });

  it('should add user message', () => {
    const updated = addMessageToState(state, 'user', 'Hello');
    expect(updated.messages).toHaveLength(1);
    expect(updated.messages[0].role).toBe('user');
    expect(updated.messages[0].content).toBe('Hello');
  });

  it('should add assistant message', () => {
    const updated = addMessageToState(state, 'assistant', 'Hi there!');
    expect(updated.messages[0].role).toBe('assistant');
  });

  it('should add system message', () => {
    const updated = addMessageToState(state, 'system', 'System message');
    expect(updated.messages[0].role).toBe('system');
  });

  it('should generate unique message ID', () => {
    const updated = addMessageToState(state, 'user', 'Test');
    expect(updated.messages[0].id).toBeTruthy();
  });

  it('should set timestamp', () => {
    const updated = addMessageToState(state, 'user', 'Test');
    expect(updated.messages[0].timestamp).toBeInstanceOf(Date);
  });

  it('should update updatedAt', () => {
    const originalUpdated = state.updatedAt;
    const updated = addMessageToState(state, 'user', 'Test');
    expect(updated.updatedAt.getTime()).toBeGreaterThanOrEqual(originalUpdated.getTime());
  });

  it('should preserve existing messages', () => {
    let updated = addMessageToState(state, 'user', 'First');
    updated = addMessageToState(updated, 'assistant', 'Second');
    expect(updated.messages).toHaveLength(2);
  });

  it('should add metadata to message', () => {
    const metadata = { phase: 'schema' as const };
    const updated = addMessageToState(state, 'user', 'Test', metadata);
    expect(updated.messages[0].metadata).toEqual(metadata);
  });
});

describe('updateConversationState', () => {
  let state: ConversationState;

  beforeEach(() => {
    state = createConversationState();
  });

  it('should update single field', () => {
    const updated = updateConversationState(state, { phase: 'schema' });
    expect(updated.phase).toBe('schema');
  });

  it('should update multiple fields', () => {
    const updated = updateConversationState(state, {
      phase: 'ui',
      suggestedAppName: 'Test App',
    });
    expect(updated.phase).toBe('ui');
    expect(updated.suggestedAppName).toBe('Test App');
  });

  it('should preserve unchanged fields', () => {
    const updated = updateConversationState(state, { phase: 'schema' });
    expect(updated.id).toBe(state.id);
    expect(updated.version).toBe(state.version);
    expect(updated.messages).toEqual(state.messages);
  });

  it('should update updatedAt', () => {
    const updated = updateConversationState(state, { phase: 'schema' });
    expect(updated.updatedAt.getTime()).toBeGreaterThanOrEqual(state.updatedAt.getTime());
  });
});

describe('transitionPhase', () => {
  let state: ConversationState;

  beforeEach(() => {
    state = createConversationState();
  });

  it('should transition to schema phase', () => {
    const updated = transitionPhase(state, 'schema');
    expect(updated.phase).toBe('schema');
  });

  it('should transition to ui phase', () => {
    const updated = transitionPhase(state, 'ui');
    expect(updated.phase).toBe('ui');
  });

  it('should transition to code phase', () => {
    const updated = transitionPhase(state, 'code');
    expect(updated.phase).toBe('code');
  });

  it('should transition to complete phase', () => {
    const updated = transitionPhase(state, 'complete');
    expect(updated.phase).toBe('complete');
  });
});

describe('Schema Management', () => {
  let state: ConversationState;
  const mockSchema: Schema = {
    name: 'entries',
    label: 'Entries',
    fields: [
      { name: 'title', label: 'Title', type: 'string', required: true },
    ],
  };

  beforeEach(() => {
    state = createConversationState();
  });

  describe('updateSchema', () => {
    it('should add schema at index 0', () => {
      const updated = updateSchema(state, mockSchema, 0);
      expect(updated.schemas[0]).toEqual(mockSchema);
    });

    it('should update existing schema at index', () => {
      let updated = addSchema(state, mockSchema);
      const newSchema = { ...mockSchema, name: 'updated' };
      updated = updateSchema(updated, newSchema, 0);
      expect(updated.schemas[0].name).toBe('updated');
    });
  });

  describe('addSchema', () => {
    it('should add schema to empty array', () => {
      const updated = addSchema(state, mockSchema);
      expect(updated.schemas).toHaveLength(1);
    });

    it('should append schema to existing schemas', () => {
      let updated = addSchema(state, mockSchema);
      const secondSchema = { ...mockSchema, name: 'second' };
      updated = addSchema(updated, secondSchema);
      expect(updated.schemas).toHaveLength(2);
    });
  });
});

describe('Layout Management', () => {
  let state: ConversationState;
  const mockLayout: LayoutNode = {
    id: 'root',
    type: 'container',
    container: {
      direction: 'column',
      children: [],
    },
  };

  beforeEach(() => {
    state = createConversationState();
  });

  describe('updateLayout', () => {
    it('should set layout', () => {
      const updated = updateLayout(state, mockLayout);
      expect(updated.layout).toEqual(mockLayout);
    });

    it('should replace existing layout', () => {
      let updated = updateLayout(state, mockLayout);
      const newLayout = { ...mockLayout, id: 'new-root' };
      updated = updateLayout(updated, newLayout);
      expect(updated.layout?.id).toBe('new-root');
    });
  });
});

describe('Refinement History', () => {
  let state: ConversationState;

  beforeEach(() => {
    state = createConversationState();
  });

  describe('addRefinementEntry', () => {
    it('should add refinement entry', () => {
      const updated = addRefinementEntry(state, {
        phase: 'schema',
        userFeedback: 'Add a date field',
        agentResponse: 'Added date field',
        changes: [],
      });
      expect(updated.refinementHistory).toHaveLength(1);
    });

    it('should generate ID for entry', () => {
      const updated = addRefinementEntry(state, {
        phase: 'schema',
        userFeedback: 'Test',
        agentResponse: 'Done',
        changes: [],
      });
      expect(updated.refinementHistory[0].id).toBeTruthy();
    });

    it('should set timestamp', () => {
      const updated = addRefinementEntry(state, {
        phase: 'ui',
        userFeedback: 'Test',
        agentResponse: 'Done',
        changes: [],
      });
      expect(updated.refinementHistory[0].timestamp).toBeInstanceOf(Date);
    });
  });

  describe('undoLastRefinement', () => {
    it('should remove last refinement', () => {
      let updated = addRefinementEntry(state, {
        phase: 'schema',
        userFeedback: 'First',
        agentResponse: 'Done',
        changes: [],
      });
      updated = addRefinementEntry(updated, {
        phase: 'ui',
        userFeedback: 'Second',
        agentResponse: 'Done',
        changes: [],
      });
      updated = undoLastRefinement(updated);
      expect(updated.refinementHistory).toHaveLength(1);
    });

    it('should handle empty history', () => {
      const updated = undoLastRefinement(state);
      expect(updated.refinementHistory).toHaveLength(0);
    });
  });
});

describe('Generated Code Management', () => {
  let state: ConversationState;

  beforeEach(() => {
    state = createConversationState();
  });

  describe('updateGeneratedCode', () => {
    it('should add code file', () => {
      const updated = updateGeneratedCode(state, 'page.tsx', 'export default function Page() {}');
      expect(updated.generatedCode['page.tsx']).toBeTruthy();
    });

    it('should update existing file', () => {
      let updated = updateGeneratedCode(state, 'page.tsx', 'version 1');
      updated = updateGeneratedCode(updated, 'page.tsx', 'version 2');
      expect(updated.generatedCode['page.tsx']).toBe('version 2');
    });

    it('should handle multiple files', () => {
      let updated = updateGeneratedCode(state, 'page.tsx', 'page code');
      updated = updateGeneratedCode(updated, 'types.ts', 'type code');
      expect(Object.keys(updated.generatedCode)).toHaveLength(2);
    });
  });
});

describe('Component Specs', () => {
  let state: ConversationState;
  const mockSpec: ComponentSpec = {
    id: 'form1',
    name: 'EntryForm',
    type: 'form',
    schemaRef: 'entries',
    props: {},
  };

  beforeEach(() => {
    state = createConversationState();
  });

  describe('addComponentSpec', () => {
    it('should add component spec', () => {
      const updated = addComponentSpec(state, mockSpec);
      expect(updated.componentSpecs).toHaveLength(1);
    });

    it('should append to existing specs', () => {
      let updated = addComponentSpec(state, mockSpec);
      updated = addComponentSpec(updated, { ...mockSpec, id: 'form2' });
      expect(updated.componentSpecs).toHaveLength(2);
    });
  });
});

describe('getLastMessage', () => {
  let state: ConversationState;

  beforeEach(() => {
    state = createConversationState();
    state = addMessageToState(state, 'user', 'User 1');
    state = addMessageToState(state, 'assistant', 'Assistant 1');
    state = addMessageToState(state, 'user', 'User 2');
  });

  it('should get last message of any role', () => {
    const message = getLastMessage(state);
    expect(message?.content).toBe('User 2');
  });

  it('should get last user message', () => {
    const message = getLastMessage(state, 'user');
    expect(message?.content).toBe('User 2');
  });

  it('should get last assistant message', () => {
    const message = getLastMessage(state, 'assistant');
    expect(message?.content).toBe('Assistant 1');
  });

  it('should return undefined for missing role', () => {
    const message = getLastMessage(state, 'system');
    expect(message).toBeUndefined();
  });

  it('should return undefined for empty messages', () => {
    const emptyState = createConversationState();
    const message = getLastMessage(emptyState);
    expect(message).toBeUndefined();
  });
});

describe('isReadyToFinalize', () => {
  it('should return false without schemas', () => {
    const state = createConversationState();
    expect(isReadyToFinalize(state)).toBe(false);
  });

  it('should return false without layout', () => {
    let state = createConversationState();
    state = addSchema(state, { name: 'test', label: 'Test', fields: [] });
    expect(isReadyToFinalize(state)).toBe(false);
  });

  it('should return false in intent phase', () => {
    let state = createConversationState();
    state = addSchema(state, { name: 'test', label: 'Test', fields: [] });
    state = updateLayout(state, { id: 'root', type: 'container', container: { direction: 'column', children: [] } });
    expect(isReadyToFinalize(state)).toBe(false);
  });

  it('should return true when ready', () => {
    let state = createConversationState();
    state = addSchema(state, { name: 'test', label: 'Test', fields: [] });
    state = updateLayout(state, { id: 'root', type: 'container', container: { direction: 'column', children: [] } });
    state = transitionPhase(state, 'code');
    expect(isReadyToFinalize(state)).toBe(true);
  });
});

describe('Serialization', () => {
  describe('serializeState', () => {
    it('should convert dates to ISO strings', () => {
      let state = createConversationState();
      state = addMessageToState(state, 'user', 'Test');
      const serialized = serializeState(state);
      
      expect(typeof (serialized as { createdAt: string }).createdAt).toBe('string');
      expect(typeof (serialized as { updatedAt: string }).updatedAt).toBe('string');
    });

    it('should serialize message timestamps', () => {
      let state = createConversationState();
      state = addMessageToState(state, 'user', 'Test');
      const serialized = serializeState(state) as { messages: Array<{ timestamp: string }> };
      
      expect(typeof serialized.messages[0].timestamp).toBe('string');
    });
  });

  describe('deserializeState', () => {
    it('should convert ISO strings to dates', () => {
      const state = createConversationState();
      const serialized = serializeState(state);
      const deserialized = deserializeState(serialized);
      
      expect(deserialized.createdAt).toBeInstanceOf(Date);
      expect(deserialized.updatedAt).toBeInstanceOf(Date);
    });

    it('should restore message timestamps', () => {
      let state = createConversationState();
      state = addMessageToState(state, 'user', 'Test');
      const serialized = serializeState(state);
      const deserialized = deserializeState(serialized);
      
      expect(deserialized.messages[0].timestamp).toBeInstanceOf(Date);
    });

    it('should round-trip state correctly', () => {
      let state = createConversationState();
      state = addMessageToState(state, 'user', 'Test');
      state = addSchema(state, { name: 'test', label: 'Test', fields: [] });
      
      const serialized = serializeState(state);
      const deserialized = deserializeState(serialized);
      
      expect(deserialized.id).toBe(state.id);
      expect(deserialized.messages[0].content).toBe('Test');
      expect(deserialized.schemas[0].name).toBe('test');
    });
  });
});

describe('Dynamic State Management', () => {
  describe('createDynamicConversationState', () => {
    it('should include readiness scores', () => {
      const state = createDynamicConversationState();
      expect(state.readiness).toBeDefined();
      expect(state.readiness.schema).toBe(0);
      expect(state.readiness.ui).toBe(0);
      expect(state.readiness.workflow).toBe(0);
      expect(state.readiness.overall).toBe(0);
    });

    it('should initialize workflows array', () => {
      const state = createDynamicConversationState();
      expect(state.workflows).toEqual([]);
    });

    it('should initialize suggestions array', () => {
      const state = createDynamicConversationState();
      expect(state.suggestions).toEqual([]);
    });

    it('should initialize checkpoints array', () => {
      const state = createDynamicConversationState();
      expect(state.checkpoints).toEqual([]);
    });
  });

  describe('ensureDynamicState', () => {
    it('should convert legacy state to dynamic', () => {
      const legacyState = createConversationState();
      const dynamicState = ensureDynamicState(legacyState);
      expect(dynamicState.readiness).toBeDefined();
      expect(dynamicState.workflows).toBeDefined();
    });
  });

  describe('updateReadiness', () => {
    it('should update schema readiness', () => {
      let state = createDynamicConversationState();
      state = updateReadiness(state, { schema: 50 });
      expect(state.readiness.schema).toBe(50);
    });

    it('should recalculate overall score', () => {
      let state = createDynamicConversationState();
      state = updateReadiness(state, { schema: 100, ui: 100 });
      expect(state.readiness.overall).toBeGreaterThan(0);
    });
  });

  describe('Workflows', () => {
    it('should add workflow', () => {
      let state = createDynamicConversationState();
      const workflow: WorkflowDefinition = {
        id: 'wf1',
        name: 'Test Workflow',
        description: 'A test',
        trigger: { type: 'manual' },
        actions: [],
        enabled: true,
      };
      state = addWorkflow(state, workflow);
      expect(state.workflows).toHaveLength(1);
    });
  });

  describe('Suggestions', () => {
    it('should set suggestions', () => {
      let state = createDynamicConversationState();
      const suggestions: ProactiveSuggestion[] = [
        {
          id: 'sug1',
          feature: 'Add charts',
          reasoning: 'Visualize data',
          confidence: 0.8,
          implementation: { effort: 'easy' },
          category: 'visualization',
        },
      ];
      state = setSuggestions(state, suggestions);
      expect(state.suggestions).toHaveLength(1);
    });
  });

  describe('Checkpoints', () => {
    it('should create checkpoint', () => {
      let state = createDynamicConversationState();
      state = updateReadiness(state, { schema: 50 });
      state = createCheckpoint(state, 'Before UI changes');
      expect(state.checkpoints).toHaveLength(1);
      expect(state.checkpoints[0].label).toBe('Before UI changes');
    });

    it('should restore from checkpoint', () => {
      let state = createDynamicConversationState();
      state = updateReadiness(state, { schema: 50 });
      state = createCheckpoint(state, 'Checkpoint 1');
      const checkpointId = state.checkpoints[0].id;
      
      state = updateReadiness(state, { schema: 80 });
      const restored = restoreCheckpoint(state, checkpointId);
      
      expect(restored?.readiness.schema).toBe(50);
    });

    it('should limit checkpoints to 10', () => {
      let state = createDynamicConversationState();
      for (let i = 0; i < 15; i++) {
        state = createCheckpoint(state, `Checkpoint ${i}`);
      }
      expect(state.checkpoints.length).toBeLessThanOrEqual(10);
    });
  });

  describe('isReadyToBuild', () => {
    it('should return false when overall < 80', () => {
      let state = createDynamicConversationState();
      state = updateReadiness(state, { schema: 50, ui: 50 });
      expect(isReadyToBuild(state)).toBe(false);
    });

    it('should return true when overall >= 80', () => {
      let state = createDynamicConversationState();
      state = updateReadiness(state, { schema: 100, ui: 100, workflow: 100 });
      expect(isReadyToBuild(state)).toBe(true);
    });
  });

  describe('getPhaseFromReadiness', () => {
    it('should return intent for low readiness', () => {
      const phase = getPhaseFromReadiness({ schema: 0, ui: 0, workflow: 0, overall: 0 });
      expect(phase).toBe('intent');
    });

    it('should return schema for medium schema readiness', () => {
      const phase = getPhaseFromReadiness({ schema: 50, ui: 0, workflow: 0, overall: 30 });
      expect(phase).toBe('schema');
    });

    it('should return ui for high ui readiness', () => {
      const phase = getPhaseFromReadiness({ schema: 70, ui: 70, workflow: 50, overall: 65 });
      expect(phase).toBe('ui');
    });

    it('should return preview for high overall', () => {
      const phase = getPhaseFromReadiness({ schema: 90, ui: 90, workflow: 50, overall: 85 });
      expect(phase).toBe('preview');
    });

    it('should return complete for very high overall', () => {
      const phase = getPhaseFromReadiness({ schema: 100, ui: 100, workflow: 100, overall: 100 });
      expect(phase).toBe('complete');
    });
  });
});
