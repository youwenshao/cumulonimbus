/**
 * Agent Consolidator Tests
 * Tests for merging parallel agent results with validation
 */

import {
  consolidateAgentResults,
  toGeneratedSpec,
  type AgentResults,
  type ConsolidatedAgentResult,
} from '../agent-consolidator';
import type { 
  EnhancedIntent, 
  Schema, 
  LayoutNode,
  WorkflowDefinition,
  ComputedField,
  SchemaProposal,
  LayoutProposal,
} from '@/lib/scaffolder-v2/types';

// Mock data factories
const createMockIntent = (): EnhancedIntent => ({
  primaryGoal: 'Build a task tracker',
  appCategory: 'tracker',
  complexityScore: 5,
  entities: [
    {
      name: 'task',
      role: 'primary',
      fields: ['title', 'description', 'status', 'dueDate'],
      relationships: [],
    },
  ],
  referenceApps: [
    { name: 'Todoist', aspects: ['task_management'], confidence: 0.8 },
  ],
  workflows: [
    { trigger: 'status_change', action: 'notify', description: 'Notify when done' },
  ],
  layoutHints: {
    structure: 'simple',
    components: ['form', 'table'],
    emphasis: 'balanced',
  },
  suggestedEnhancements: ['Add due date reminders'],
});

const createMockSchema = (): Schema => ({
  name: 'task',
  label: 'Task',
  description: 'Task management',
  fields: [
    { name: 'id', label: 'ID', type: 'string', required: true, generated: true, primaryKey: true },
    { name: 'title', label: 'Title', type: 'string', required: true },
    { name: 'description', label: 'Description', type: 'text', required: false },
    { name: 'status', label: 'Status', type: 'enum', required: true, options: ['Todo', 'In Progress', 'Done'] },
    { name: 'dueDate', label: 'Due Date', type: 'date', required: false },
    { name: 'createdAt', label: 'Created At', type: 'datetime', required: true, generated: true },
  ],
});

const createMockLayout = (): LayoutNode => ({
  id: 'root',
  type: 'container',
  container: {
    direction: 'column',
    gap: '1.5rem',
    children: [
      {
        id: 'form',
        type: 'component',
        component: {
          type: 'form',
          props: { fields: ['title', 'description', 'status', 'dueDate'] },
        },
      },
      {
        id: 'table',
        type: 'component',
        component: {
          type: 'table',
          props: { 
            columns: [
              { field: 'title', label: 'Title' },
              { field: 'status', label: 'Status' },
            ],
          },
        },
      },
    ],
  },
});

const createMockWorkflows = (): WorkflowDefinition[] => [
  {
    id: 'wf1',
    name: 'Auto Complete',
    description: 'Mark as done when all subtasks complete',
    trigger: {
      type: 'field_change',
      field: 'status',
      condition: "status === 'Done'",
    },
    actions: [
      { type: 'send_notification', target: 'user', value: 'Task completed!' },
    ],
    enabled: true,
  },
];

const createMockComputedFields = (): ComputedField[] => [
  {
    name: 'isOverdue',
    label: 'Overdue',
    type: 'boolean',
    formula: 'dueDate < today() && status !== "Done"',
    description: 'Whether the task is past due',
  },
];

describe('Agent Consolidator', () => {
  describe('consolidateAgentResults', () => {
    it('should consolidate all agent results', async () => {
      const agentResults: AgentResults = {
        intentResult: createMockIntent(),
        schemaResult: { schemas: [createMockSchema()] },
        uiResult: { layout: createMockLayout() } as LayoutProposal,
        workflowResult: {
          workflows: createMockWorkflows(),
          computedFields: createMockComputedFields(),
        },
        timings: {
          'schema-designer': 500,
          'ui-designer': 300,
          'workflow-agent': 200,
        },
      };

      const result = await consolidateAgentResults(agentResults);

      expect(result.schema.name).toBe('task');
      expect(result.schema.fields.length).toBe(6);
      expect(result.layout.type).toBe('container');
      expect(result.workflows.length).toBe(1);
      expect(result.computedFields.length).toBe(1);
      expect(result.metadata.confidence).toBeGreaterThan(0);
    });

    it('should create fallback schema when Schema Designer fails', async () => {
      const agentResults: AgentResults = {
        intentResult: createMockIntent(),
        schemaResult: undefined,
        uiResult: undefined,
        workflowResult: undefined,
        timings: {},
      };

      const result = await consolidateAgentResults(agentResults);

      expect(result.schema).toBeDefined();
      expect(result.schema.name).toBe('task');
      expect(result.schema.fields.length).toBeGreaterThan(0);
      expect(result.metadata.validationWarnings).toContain(
        'Using fallback schema - Schema Designer result not available'
      );
    });

    it('should create fallback layout when UI Designer fails', async () => {
      const agentResults: AgentResults = {
        intentResult: createMockIntent(),
        schemaResult: { schemas: [createMockSchema()] },
        uiResult: undefined,
        workflowResult: undefined,
        timings: {},
      };

      const result = await consolidateAgentResults(agentResults);

      expect(result.layout).toBeDefined();
      expect(result.layout.type).toBe('container');
      expect(result.metadata.validationWarnings).toContain(
        'Using fallback layout - UI Designer result not available'
      );
    });

    it('should merge computed fields into schema', async () => {
      const agentResults: AgentResults = {
        intentResult: createMockIntent(),
        schemaResult: { schemas: [createMockSchema()] },
        uiResult: { layout: createMockLayout() } as LayoutProposal,
        workflowResult: {
          workflows: [],
          computedFields: createMockComputedFields(),
        },
        timings: {},
      };

      const result = await consolidateAgentResults(agentResults);

      expect(result.schema.computedFields).toBeDefined();
      expect(result.schema.computedFields?.length).toBe(1);
      expect(result.schema.computedFields?.[0].name).toBe('isOverdue');
    });

    it('should validate layout fields against schema', async () => {
      const layoutWithInvalidField: LayoutNode = {
        id: 'root',
        type: 'container',
        container: {
          direction: 'column',
          children: [
            {
              id: 'form',
              type: 'component',
              component: {
                type: 'form',
                props: { fields: ['title', 'nonExistentField', 'status'] },
              },
            },
          ],
        },
      };

      const agentResults: AgentResults = {
        intentResult: createMockIntent(),
        schemaResult: { schemas: [createMockSchema()] },
        uiResult: { layout: layoutWithInvalidField } as LayoutProposal,
        workflowResult: undefined,
        timings: {},
      };

      const result = await consolidateAgentResults(agentResults);

      // Should have a warning about the invalid field
      expect(result.metadata.validationWarnings).toContain(
        'Layout references unknown field: nonExistentField'
      );
    });

    it('should handle empty agent results gracefully', async () => {
      const agentResults: AgentResults = {
        intentResult: undefined,
        schemaResult: undefined,
        uiResult: undefined,
        workflowResult: undefined,
        timings: {},
      };

      const result = await consolidateAgentResults(agentResults);

      // Should create reasonable defaults
      expect(result.schema).toBeDefined();
      expect(result.layout).toBeDefined();
      expect(result.workflows).toEqual([]);
      expect(result.computedFields).toEqual([]);
    });
  });

  describe('toGeneratedSpec', () => {
    it('should convert consolidated result to GeneratedSpec format', async () => {
      const agentResults: AgentResults = {
        intentResult: createMockIntent(),
        schemaResult: { schemas: [createMockSchema()] },
        uiResult: { layout: createMockLayout() } as LayoutProposal,
        workflowResult: {
          workflows: createMockWorkflows(),
          computedFields: createMockComputedFields(),
        },
        timings: {},
      };

      const consolidated = await consolidateAgentResults(agentResults);
      const spec = toGeneratedSpec(consolidated);

      expect(spec.name).toBe('Task');
      expect(spec.entities.length).toBe(1);
      expect(spec.entities[0].name).toBe('task');
      expect(spec.entities[0].fields.length).toBeGreaterThan(0);
      expect(spec.views.length).toBeGreaterThan(0);
      expect(spec.views.some(v => v.type === 'table')).toBe(true);
    });

    it('should extract views from layout', async () => {
      const layoutWithMultipleViews: LayoutNode = {
        id: 'root',
        type: 'container',
        container: {
          direction: 'column',
          children: [
            {
              id: 'form',
              type: 'component',
              component: { type: 'form', props: {} },
            },
            {
              id: 'table',
              type: 'component',
              component: { type: 'table', props: {} },
            },
            {
              id: 'chart',
              type: 'component',
              component: { type: 'chart', props: {} },
            },
          ],
        },
      };

      const agentResults: AgentResults = {
        intentResult: createMockIntent(),
        schemaResult: { schemas: [createMockSchema()] },
        uiResult: { layout: layoutWithMultipleViews } as LayoutProposal,
        workflowResult: undefined,
        timings: {},
      };

      const consolidated = await consolidateAgentResults(agentResults);
      const spec = toGeneratedSpec(consolidated);

      expect(spec.views.some(v => v.type === 'table')).toBe(true);
      expect(spec.views.some(v => v.type === 'chart')).toBe(true);
    });
  });

  describe('confidence calculation', () => {
    it('should have higher confidence with more complete results', async () => {
      // Full results
      const fullResults: AgentResults = {
        intentResult: createMockIntent(),
        schemaResult: { schemas: [createMockSchema()] },
        uiResult: { layout: createMockLayout() } as LayoutProposal,
        workflowResult: {
          workflows: createMockWorkflows(),
          computedFields: createMockComputedFields(),
        },
        timings: {},
      };

      // Minimal results
      const minimalResults: AgentResults = {
        intentResult: undefined,
        schemaResult: undefined,
        uiResult: undefined,
        workflowResult: undefined,
        timings: {},
      };

      const fullConsolidated = await consolidateAgentResults(fullResults);
      const minimalConsolidated = await consolidateAgentResults(minimalResults);

      expect(fullConsolidated.metadata.confidence).toBeGreaterThan(
        minimalConsolidated.metadata.confidence
      );
    });
  });
});
