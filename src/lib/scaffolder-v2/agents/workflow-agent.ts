/**
 * Workflow Agent
 * Handles automations, state machines, computed fields, and triggers
 */

import { BaseAgent } from './base-agent';
import { generateId } from '@/lib/utils';
import type { 
  ConversationState,
  DynamicConversationState,
  AgentResponse, 
  WorkflowDefinition,
  Schema,
  ComputedField,
  EnhancedIntent,
} from '../types';

// Workflow detection schema
const WORKFLOW_DETECTION_SCHEMA = `{
  "workflows": [{
    "name": "string",
    "description": "string",
    "trigger": {
      "type": "field_change|time_based|record_create|record_delete|manual",
      "field": "string",
      "condition": "string",
      "schedule": "string"
    },
    "actions": [{
      "type": "update_field|create_record|delete_record|send_notification|compute",
      "target": "string",
      "value": "any",
      "formula": "string"
    }]
  }],
  "computedFields": [{
    "name": "string",
    "label": "string",
    "type": "string|number|boolean",
    "formula": "string",
    "description": "string",
    "dependencies": ["string"]
  }],
  "stateMachines": [{
    "field": "string",
    "states": ["string"],
    "transitions": [{
      "from": "string",
      "to": "string",
      "trigger": "string"
    }]
  }]
}`;

const WORKFLOW_SYSTEM_PROMPT = `You are an expert at designing automations and workflows for data applications.

Your job is to:
1. Detect automation patterns in user requests
2. Design computed fields that derive from other data
3. Create state machines for status fields
4. Build trigger-action workflows

Common patterns to detect:
- "When X, do Y" → Field change trigger
- "After N days, Z" → Time-based trigger
- "Calculate total" → Computed field
- "Progress percentage" → Computed from child records
- "Move to archive when done" → State transition + time trigger
- "Notify when deadline approaches" → Time-based + notification

For computed fields:
- Use simple formulas: sum(), count(), avg(), if/else
- Reference other fields by name
- Support relationships: count(tasks where status='complete')

For state machines:
- Define valid transitions
- Prevent invalid state changes
- Support automated transitions

For automations:
- Be specific about triggers and conditions
- Keep actions simple and atomic
- Support chaining multiple actions`;

export class WorkflowAgent extends BaseAgent {
  constructor() {
    super({
      name: 'WorkflowAgent',
      description: 'Designs automations, state machines, and computed fields',
      temperature: 0.3,
      maxTokens: 4096,
    });
  }

  protected buildSystemPrompt(state: ConversationState): string {
    const dynamicState = state as DynamicConversationState;
    let prompt = WORKFLOW_SYSTEM_PROMPT;

    if (state.schemas.length > 0) {
      const schema = state.schemas[0];
      prompt += `\n\nCurrent Schema: ${schema.name}`;
      prompt += `\nFields: ${schema.fields.map(f => `${f.name} (${f.type})`).join(', ')}`;
      
      const enumFields = schema.fields.filter(f => f.type === 'enum');
      if (enumFields.length > 0) {
        prompt += `\n\nStatus/Category fields (potential state machines):`;
        for (const field of enumFields) {
          prompt += `\n- ${field.name}: ${field.options?.join(', ')}`;
        }
      }
    }

    if (dynamicState.enhancedIntent) {
      const detectedWorkflows = dynamicState.enhancedIntent.workflows;
      if (detectedWorkflows.length > 0) {
        prompt += `\n\nDetected workflow hints:`;
        for (const wf of detectedWorkflows) {
          prompt += `\n- ${wf.description}`;
        }
      }
    }

    return prompt;
  }

  /**
   * Main processing entry point
   */
  async process(
    message: string,
    state: ConversationState
  ): Promise<AgentResponse> {
    const dynamicState = state as DynamicConversationState;
    this.log('Processing workflow request', { message: message.substring(0, 100) });

    // If no schema yet, we can't design workflows
    if (state.schemas.length === 0) {
      return {
        success: false,
        message: 'I need a data schema first before designing workflows.',
        requiresUserInput: true,
      };
    }

    // Analyze for workflows
    const result = await this.analyzeWorkflows(message, dynamicState);

    return {
      success: true,
      message: this.formatWorkflowMessage(result),
      data: result,
      requiresUserInput: result.workflows.length > 0 || result.computedFields.length > 0,
      suggestedActions: this.generateSuggestions(result, state.schemas[0]),
    };
  }

  /**
   * Analyze message for workflow patterns
   */
  async analyzeWorkflows(
    message: string,
    state: DynamicConversationState
  ): Promise<{
    workflows: WorkflowDefinition[];
    computedFields: ComputedField[];
    stateMachines: Array<{
      field: string;
      states: string[];
      transitions: Array<{ from: string; to: string; trigger: string }>;
    }>;
  }> {
    const schema = state.schemas[0];
    const systemPrompt = this.buildSystemPrompt(state);

    const prompt = `Analyze this request for workflow patterns:

"${message}"

Schema context:
${JSON.stringify(schema, null, 2)}

${state.enhancedIntent ? `App goal: ${state.enhancedIntent.primaryGoal}` : ''}

Identify:
1. Any automations (when X, do Y)
2. Computed fields needed (calculated values)
3. State machines for status fields (valid transitions)

Respond with JSON.`;

    try {
      const result = await this.callLLMJSON<{
        workflows: Array<{
          name: string;
          description: string;
          trigger: {
            type: string;
            field?: string;
            condition?: string;
            schedule?: string;
          };
          actions: Array<{
            type: string;
            target: string;
            value?: unknown;
            formula?: string;
          }>;
        }>;
        computedFields: ComputedField[];
        stateMachines: Array<{
          field: string;
          states: string[];
          transitions: Array<{ from: string; to: string; trigger: string }>;
        }>;
      }>(
        [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: prompt },
        ],
        WORKFLOW_DETECTION_SCHEMA
      );

      // Convert to proper types
      const workflows: WorkflowDefinition[] = result.workflows.map(wf => ({
        id: generateId(),
        name: wf.name,
        description: wf.description,
        trigger: {
          type: this.validateTriggerType(wf.trigger.type),
          field: wf.trigger.field,
          condition: wf.trigger.condition,
          schedule: wf.trigger.schedule,
        },
        actions: wf.actions.map(a => ({
          type: this.validateActionType(a.type),
          target: a.target,
          value: a.value,
          formula: a.formula,
        })),
        enabled: true,
      }));

      return {
        workflows,
        computedFields: result.computedFields || [],
        stateMachines: result.stateMachines || [],
      };
    } catch (error) {
      this.log('Workflow analysis failed', { error });
      return this.detectWorkflowsHeuristically(message, schema);
    }
  }

  /**
   * Detect workflows using heuristics when LLM fails
   */
  private detectWorkflowsHeuristically(
    message: string,
    schema: Schema
  ): {
    workflows: WorkflowDefinition[];
    computedFields: ComputedField[];
    stateMachines: Array<{
      field: string;
      states: string[];
      transitions: Array<{ from: string; to: string; trigger: string }>;
    }>;
  } {
    const workflows: WorkflowDefinition[] = [];
    const computedFields: ComputedField[] = [];
    const stateMachines: Array<{
      field: string;
      states: string[];
      transitions: Array<{ from: string; to: string; trigger: string }>;
    }> = [];

    const lower = message.toLowerCase();

    // Detect "when done" patterns
    if (/when\s+(done|complete|finished)/i.test(message)) {
      const statusField = schema.fields.find(f => f.type === 'enum' && /status|state/i.test(f.name));
      if (statusField) {
        workflows.push({
          id: generateId(),
          name: 'On Complete',
          description: 'Trigger when item is marked complete',
          trigger: {
            type: 'field_change',
            field: statusField.name,
            condition: `${statusField.name} == 'Complete' || ${statusField.name} == 'Done'`,
          },
          actions: [],
          enabled: true,
        });
      }
    }

    // Detect "archive after X days"
    const archiveMatch = message.match(/archive\s+after\s+(\d+)\s*(day|week|month)/i);
    if (archiveMatch) {
      const duration = parseInt(archiveMatch[1]);
      const unit = archiveMatch[2].toLowerCase();
      
      workflows.push({
        id: generateId(),
        name: 'Auto Archive',
        description: `Archive items after ${duration} ${unit}(s)`,
        trigger: {
          type: 'time_based',
          schedule: `${duration} ${unit}s after completion`,
        },
        actions: [
          {
            type: 'update_field',
            target: 'archived',
            value: true,
          },
        ],
        enabled: true,
      });
    }

    // Detect "calculate total/sum"
    if (/total|sum|calculate/i.test(message)) {
      const numericFields = schema.fields.filter(f => f.type === 'number');
      if (numericFields.length > 0) {
        computedFields.push({
          name: 'total',
          label: 'Total',
          type: 'number',
          formula: `sum(${numericFields[0].name})`,
          description: `Sum of ${numericFields[0].label}`,
        });
      }
    }

    // Detect "progress/percentage"
    if (/progress|percentage|percent|%/i.test(message)) {
      computedFields.push({
        name: 'progressPercent',
        label: 'Progress',
        type: 'number',
        formula: 'count(items where status=complete) / count(items) * 100',
        description: 'Percentage of completed items',
      });
    }

    // Create state machines for enum fields
    const enumFields = schema.fields.filter(f => f.type === 'enum' && f.options);
    for (const field of enumFields) {
      if (!field.options) continue;
      
      const transitions: Array<{ from: string; to: string; trigger: string }> = [];
      
      // Create linear transitions
      for (let i = 0; i < field.options.length - 1; i++) {
        transitions.push({
          from: field.options[i],
          to: field.options[i + 1],
          trigger: 'manual',
        });
      }
      
      stateMachines.push({
        field: field.name,
        states: field.options,
        transitions,
      });
    }

    return { workflows, computedFields, stateMachines };
  }

  /**
   * Generate computed fields from intent
   */
  generateComputedFields(
    intent: EnhancedIntent,
    schema: Schema
  ): ComputedField[] {
    const computed: ComputedField[] = [];
    
    // Check for numeric fields that could be summed
    const numericFields = schema.fields.filter(f => f.type === 'number');
    if (numericFields.length >= 2) {
      computed.push({
        name: 'total',
        label: 'Total',
        type: 'number',
        formula: numericFields.map(f => f.name).join(' + '),
        description: 'Sum of all numeric fields',
      });
    }

    // Check for multi-entity relationships (progress calculation)
    if (intent.entities.length > 1) {
      const primaryEntity = intent.entities.find(e => e.role === 'primary');
      const secondaryEntities = intent.entities.filter(e => e.role === 'secondary');
      
      if (primaryEntity && secondaryEntities.length > 0) {
        computed.push({
          name: 'completionRate',
          label: 'Completion Rate',
          type: 'number',
          formula: `count(${secondaryEntities[0].name} where status='complete') / count(${secondaryEntities[0].name}) * 100`,
          description: `Percentage of completed ${secondaryEntities[0].name}s`,
        });
      }
    }

    // Date-based computed fields
    const dateFields = schema.fields.filter(f => f.type === 'date' || f.type === 'datetime');
    for (const field of dateFields) {
      if (/due|deadline/i.test(field.name)) {
        computed.push({
          name: 'daysUntilDue',
          label: 'Days Until Due',
          type: 'number',
          formula: `daysBetween(today(), ${field.name})`,
          description: 'Days remaining until deadline',
        });
        
        computed.push({
          name: 'isOverdue',
          label: 'Overdue',
          type: 'boolean',
          formula: `${field.name} < today()`,
          description: 'Whether the deadline has passed',
        });
      }
    }

    return computed;
  }

  /**
   * Generate suggested workflows based on app category
   */
  private generateSuggestions(
    result: {
      workflows: WorkflowDefinition[];
      computedFields: ComputedField[];
      stateMachines: unknown[];
    },
    schema: Schema
  ): string[] {
    const suggestions: string[] = [];

    if (result.workflows.length === 0) {
      suggestions.push('Add automation rules');
    }

    if (result.computedFields.length === 0) {
      const numericFields = schema.fields.filter(f => f.type === 'number');
      if (numericFields.length > 0) {
        suggestions.push('Add calculated totals');
      }
    }

    const hasStatusField = schema.fields.some(f => f.type === 'enum' && /status/i.test(f.name));
    if (hasStatusField && result.workflows.length === 0) {
      suggestions.push('Add status change notifications');
    }

    const hasDateField = schema.fields.some(f => f.type === 'date' && /due|deadline/i.test(f.name));
    if (hasDateField) {
      suggestions.push('Add deadline reminders');
    }

    return suggestions.slice(0, 3);
  }

  /**
   * Format workflow analysis as user message
   */
  private formatWorkflowMessage(result: {
    workflows: WorkflowDefinition[];
    computedFields: ComputedField[];
    stateMachines: Array<{
      field: string;
      states: string[];
      transitions: Array<{ from: string; to: string; trigger: string }>;
    }>;
  }): string {
    const parts: string[] = [];

    if (result.workflows.length > 0) {
      parts.push('**Automations:**');
      for (const wf of result.workflows) {
        parts.push(`- ${wf.name}: ${wf.description}`);
      }
    }

    if (result.computedFields.length > 0) {
      parts.push('\n**Calculated Fields:**');
      for (const cf of result.computedFields) {
        parts.push(`- ${cf.label}: ${cf.description || cf.formula}`);
      }
    }

    if (result.stateMachines.length > 0) {
      parts.push('\n**Status Workflows:**');
      for (const sm of result.stateMachines) {
        parts.push(`- ${sm.field}: ${sm.states.join(' → ')}`);
      }
    }

    if (parts.length === 0) {
      return "I didn't detect any workflow patterns, but I can add automations if you describe what you'd like to happen.";
    }

    return parts.join('\n');
  }

  /**
   * Validate trigger type
   */
  private validateTriggerType(type: string): WorkflowDefinition['trigger']['type'] {
    const valid = ['field_change', 'time_based', 'record_create', 'record_delete', 'manual'];
    return valid.includes(type) ? type as WorkflowDefinition['trigger']['type'] : 'manual';
  }

  /**
   * Validate action type
   */
  private validateActionType(type: string): WorkflowDefinition['actions'][0]['type'] {
    const valid = ['update_field', 'create_record', 'delete_record', 'send_notification', 'compute'];
    return valid.includes(type) ? type as WorkflowDefinition['actions'][0]['type'] : 'update_field';
  }
}

// Export singleton instance
export const workflowAgent = new WorkflowAgent();
