/**
 * Data Architect Agent
 * 
 * Designs the data layer AFTER the UX is defined.
 * Creates custom data operations based on what the UI actually needs,
 * NOT generic CRUD operations.
 */

import { BaseAgent } from './base-agent';
import { generateId } from '@/lib/utils';
import type { ConversationState, AgentResponse } from '../types';
import type {
  DataLayer,
  DataStructure,
  DataField,
  ComputedDataField,
  DataOperationSpec,
  OperationInput,
  StorageStrategy,
  CacheStrategy,
  RealtimeSpec,
  AgentContribution,
  UserJourney,
  InteractionSpec,
  ComponentSystem,
} from '../journey-types';

// ============================================================================
// Data Architect System Prompt
// ============================================================================

const DATA_ARCHITECT_SYSTEM_PROMPT = `You are a Data Architect who designs data layers FOR THE UX, not databases.

## Your Philosophy

- Data structures serve the UI, not the other way around
- Design CUSTOM operations, NOT generic CRUD
- Minimal data footprint - only what's needed
- Operations are named by what they DO, not database actions

## What You Design

1. **Data Structures**: What data the app needs
   - NOT database schemas
   - Designed around UI needs
   - Minimal required fields

2. **Operations**: What the app can DO with data
   - NOT create/read/update/delete
   - Named by user intent (e.g., "markComplete", "trackProgress")
   - Custom to this specific app

3. **Storage Strategy**: How to persist data
   - Local storage for simple apps
   - API for complex apps
   - Hybrid for offline support

## Operation Naming

Name operations by USER INTENT, not database action:
- ✅ markHabitComplete(habitId, date)
- ✅ getProgressForDateRange(start, end)
- ✅ calculateCurrentStreak(habitId)
- ❌ createCompletion(completion)
- ❌ updateHabit(id, data)
- ❌ deleteHabit(id)

## Example Data Designs

**Habit Tracker**:
Data: { habits: [{id, name}], completions: [{habitId, date}] }
Operations:
- addHabit(name) - Create a new habit to track
- markComplete(habitId, date) - Mark a habit as done for a day
- getCompletions(habitId, startDate, endDate) - Get data for heatmap
- calculateStreak(habitId) - Get current streak count

**Expense Tracker**:
Data: { expenses: [{id, amount, category, date}], budget: number }
Operations:
- recordExpense(amount, category) - Quick add expense
- getSpendingByCategory(startDate, endDate) - For pie chart
- checkBudgetStatus() - Are we over budget?
- getRecentExpenses(limit) - For list view

## Output Format

Return a DataLayer object:
{
  "structures": [DataStructure],
  "operations": [DataOperationSpec],
  "storage": StorageStrategy,
  "realtime": RealtimeSpec?
}

## Storage Considerations

- **Local**: Simple apps, offline-first, no sync
- **Session**: Temporary data, cleared on close
- **API**: Multi-device, shared data, complex queries
- **Hybrid**: Local cache + API sync

## Anti-Patterns to Avoid

❌ Generic CRUD operations (create, read, update, delete)
❌ Database-driven field naming (userId, createdAt on everything)
❌ Over-normalized data structures
❌ Operations designed around database, not UI`;

// ============================================================================
// Data Architect Agent
// ============================================================================

export class DataArchitect extends BaseAgent {
  constructor() {
    super({
      name: 'DataArchitect',
      description: 'Designs data layer based on UX needs, not database patterns',
      temperature: 0.5,
      maxTokens: 8192,
    });
  }

  protected buildSystemPrompt(): string {
    return DATA_ARCHITECT_SYSTEM_PROMPT;
  }

  /**
   * Design data layer based on UX and components
   */
  async designDataLayer(
    userRequest: string,
    journey?: UserJourney,
    interactions?: InteractionSpec,
    components?: ComponentSystem,
    previousContributions?: AgentContribution[]
  ): Promise<{
    content: string;
    structuredOutput: DataLayer;
  }> {
    this.log('Designing data layer', {
      hasJourney: !!journey,
      hasComponents: !!components,
    });

    const prompt = this.buildDesignPrompt(userRequest, journey, interactions, components, previousContributions);
    
    try {
      const response = await this.callLLMJSON<{
        structures: Array<{
          name: string;
          purpose: string;
          fields: Array<{
            name: string;
            type: string;
            description: string;
            required: boolean;
          }>;
          computed?: Array<{
            name: string;
            type: string;
            computation: string;
            description: string;
          }>;
          indexes?: string[];
        }>;
        operations: Array<{
          name: string;
          description: string;
          triggeredBy: string;
          inputs: Array<{
            name: string;
            type: string;
            required: boolean;
            description: string;
          }>;
          output: string;
          sideEffects?: string[];
          implementationHints?: string;
        }>;
        storage: {
          type: string;
          syncStrategy?: string;
          offlineSupport?: boolean;
          caching?: {
            type: string;
            ttl?: number;
          };
        };
        realtime?: {
          enabled: boolean;
          updates: string[];
          strategy: string;
          interval?: number;
        };
      }>(
        [
          { role: 'system', content: DATA_ARCHITECT_SYSTEM_PROMPT },
          { role: 'user', content: prompt },
        ],
        '{"structures": [...], "operations": [...], ...}'
      );

      const dataLayer = this.convertToDataLayer(response);
      const content = this.describeDataLayer(dataLayer);

      return { content, structuredOutput: dataLayer };
    } catch (error) {
      this.log('Data layer design failed, generating fallback', { error });
      const fallbackLayer = this.generateFallbackDataLayer(journey, components);
      return {
        content: this.describeDataLayer(fallbackLayer),
        structuredOutput: fallbackLayer,
      };
    }
  }

  /**
   * Build the design prompt
   */
  private buildDesignPrompt(
    userRequest: string,
    journey?: UserJourney,
    interactions?: InteractionSpec,
    components?: ComponentSystem,
    previousContributions?: AgentContribution[]
  ): string {
    let prompt = `Design the data layer for this app:

"${userRequest}"
`;

    if (journey) {
      prompt += `\n**User Journey**:
- App: ${journey.appName}
- Purpose: ${journey.appPurpose}
- Primary action: ${journey.navigation.primaryAction?.label || 'Not specified'}
- Key moments: ${journey.keyMoments.map(m => m.name).join(', ') || 'None'}
`;
    }

    if (components) {
      prompt += `\n**Components That Need Data**:
`;
      for (const c of components.components) {
        if (c.dataNeeds.length > 0) {
          prompt += `- ${c.name}:\n`;
          for (const d of c.dataNeeds) {
            prompt += `  - ${d.name}: ${d.type} (${d.description})\n`;
          }
        }
      }
    }

    if (previousContributions?.length) {
      prompt += `\n**Previous Discussion**:\n`;
      for (const c of previousContributions) {
        prompt += `${c.agentType}: ${c.content.substring(0, 300)}...\n\n`;
      }
    }

    prompt += `
Design a data layer that:
1. Provides what the components need
2. Uses CUSTOM operations (not generic CRUD)
3. Has minimal data footprint
4. Names operations by user intent

Output a complete DataLayer JSON.`;

    return prompt;
  }

  /**
   * Convert LLM response to typed DataLayer
   */
  private convertToDataLayer(response: any): DataLayer {
    const structures: DataStructure[] = (response.structures || []).map((s: any) => ({
      id: generateId(),
      name: s.name,
      purpose: s.purpose,
      fields: (s.fields || []).map((f: any) => ({
        name: f.name,
        type: f.type as DataField['type'] || 'string',
        description: f.description,
        required: f.required,
      })),
      computed: s.computed?.map((c: any) => ({
        name: c.name,
        type: c.type,
        computation: c.computation,
        description: c.description,
      })),
      indexes: s.indexes,
    }));

    const operations: DataOperationSpec[] = (response.operations || []).map((o: any) => ({
      id: generateId(),
      name: o.name,
      description: o.description,
      triggeredBy: o.triggeredBy,
      inputs: (o.inputs || []).map((i: any) => ({
        name: i.name,
        type: i.type,
        required: i.required,
        description: i.description,
      })),
      output: o.output,
      sideEffects: o.sideEffects,
      implementationHints: o.implementationHints,
    }));

    const storage: StorageStrategy = {
      type: response.storage?.type as StorageStrategy['type'] || 'local',
      syncStrategy: response.storage?.syncStrategy as StorageStrategy['syncStrategy'],
      offlineSupport: response.storage?.offlineSupport,
      caching: response.storage?.caching ? {
        type: response.storage.caching.type as CacheStrategy['type'] || 'memory',
        ttl: response.storage.caching.ttl,
      } : undefined,
    };

    const realtime: RealtimeSpec | undefined = response.realtime?.enabled ? {
      enabled: true,
      updates: response.realtime.updates || [],
      strategy: response.realtime.strategy as RealtimeSpec['strategy'] || 'polling',
      interval: response.realtime.interval,
    } : undefined;

    return {
      id: generateId(),
      structures,
      operations,
      storage,
      realtime,
    };
  }

  /**
   * Generate natural language description
   */
  private describeDataLayer(dataLayer: DataLayer): string {
    let description = 'I\'ve designed the following data layer:\n\n';

    description += '**Data Structures**:\n';
    for (const s of dataLayer.structures) {
      description += `\n*${s.name}* (${s.purpose}):\n`;
      for (const f of s.fields) {
        description += `- ${f.name}: ${f.type}${f.required ? ' (required)' : ''}\n`;
      }
      if (s.computed?.length) {
        description += 'Computed fields:\n';
        for (const c of s.computed) {
          description += `- ${c.name}: ${c.computation}\n`;
        }
      }
    }

    description += '\n**Operations** (NOT generic CRUD):\n';
    for (const o of dataLayer.operations) {
      description += `\n*${o.name}*\n`;
      description += `- Description: ${o.description}\n`;
      description += `- Triggered by: ${o.triggeredBy}\n`;
      if (o.inputs.length > 0) {
        description += `- Inputs: ${o.inputs.map(i => `${i.name}: ${i.type}`).join(', ')}\n`;
      }
      description += `- Returns: ${o.output}\n`;
      if (o.sideEffects?.length) {
        description += `- Side effects: ${o.sideEffects.join(', ')}\n`;
      }
    }

    description += `\n**Storage**: ${dataLayer.storage.type}`;
    if (dataLayer.storage.syncStrategy) {
      description += ` (sync: ${dataLayer.storage.syncStrategy})`;
    }
    if (dataLayer.storage.offlineSupport) {
      description += ' with offline support';
    }
    description += '\n';

    if (dataLayer.realtime?.enabled) {
      description += `\n**Realtime**: ${dataLayer.realtime.strategy}`;
      if (dataLayer.realtime.interval) {
        description += ` (${dataLayer.realtime.interval}ms)`;
      }
      description += `\n- Updates: ${dataLayer.realtime.updates.join(', ')}\n`;
    }

    return description;
  }

  /**
   * Generate fallback data layer
   */
  private generateFallbackDataLayer(
    journey?: UserJourney,
    components?: ComponentSystem
  ): DataLayer {
    const appName = journey?.appName || 'App';
    const primaryAction = journey?.navigation.primaryAction?.label || 'add';

    // Infer data needs from components
    const dataNeeds = components?.components
      .flatMap(c => c.dataNeeds)
      .filter((d, i, arr) => arr.findIndex(x => x.name === d.name) === i) || [];

    const structures: DataStructure[] = [{
      id: generateId(),
      name: 'items',
      purpose: 'Main data for the app',
      fields: [
        { name: 'id', type: 'string', description: 'Unique identifier', required: true },
        { name: 'createdAt', type: 'date', description: 'When created', required: true },
        ...dataNeeds.map(d => ({
          name: d.name,
          type: d.type as DataField['type'] || 'string',
          description: d.description,
          required: false,
        })),
      ],
    }];

    const operations: DataOperationSpec[] = [
      {
        id: generateId(),
        name: `${primaryAction.toLowerCase()}Item`,
        description: `Add a new item to ${appName}`,
        triggeredBy: journey?.navigation.primaryAction?.label || 'Primary action button',
        inputs: [
          { name: 'data', type: 'object', required: true, description: 'The item data' },
        ],
        output: 'Item',
      },
      {
        id: generateId(),
        name: 'getItems',
        description: 'Get all items for display',
        triggeredBy: 'Initial load and refresh',
        inputs: [],
        output: 'Item[]',
      },
    ];

    return {
      id: generateId(),
      structures,
      operations,
      storage: {
        type: 'local',
        syncStrategy: 'immediate',
      },
    };
  }

  /**
   * Respond to another agent's contribution
   */
  async respondTo(
    contribution: AgentContribution,
    context: {
      userRequest: string;
      journey?: UserJourney;
      components?: ComponentSystem;
    }
  ): Promise<{
    content: string;
    structuredOutput?: Partial<DataLayer>;
  }> {
    const prompt = `The ${contribution.agentType} proposed:

"${contribution.content}"

As the Data Architect, consider:
1. What data does this require?
2. What operations are needed?
3. How should data be structured?
4. Any concerns about data requirements?`;

    const response = await this.callLLMJSON<{
      dataRequirements: Array<{
        structure: string;
        fields: string[];
        operations: string[];
      }>;
      additionalOperations: Array<{
        name: string;
        description: string;
        triggeredBy: string;
      }>;
      concerns: string[];
      suggestions: string[];
    }>(
      [
        { role: 'system', content: DATA_ARCHITECT_SYSTEM_PROMPT },
        { role: 'user', content: prompt },
      ],
      '{"dataRequirements": [...], ...}'
    );

    let content = 'Based on this proposal:\n\n';

    if (response.dataRequirements?.length) {
      content += '**Data Requirements**:\n';
      for (const r of response.dataRequirements) {
        content += `- ${r.structure}: ${r.fields.join(', ')}\n`;
        if (r.operations?.length) {
          content += `  Operations: ${r.operations.join(', ')}\n`;
        }
      }
      content += '\n';
    }

    if (response.additionalOperations?.length) {
      content += '**Additional Operations Needed**:\n';
      for (const o of response.additionalOperations) {
        content += `- ${o.name}: ${o.description} (triggered by ${o.triggeredBy})\n`;
      }
      content += '\n';
    }

    if (response.concerns?.length) {
      content += '**Concerns**:\n';
      for (const c of response.concerns) {
        content += `- ${c}\n`;
      }
      content += '\n';
    }

    if (response.suggestions?.length) {
      content += '**Suggestions**:\n';
      for (const s of response.suggestions) {
        content += `- ${s}\n`;
      }
    }

    return { content };
  }

  /**
   * Process method for AgentResponse interface
   */
  async process(
    message: string,
    state: ConversationState
  ): Promise<AgentResponse> {
    const result = await this.designDataLayer(message);
    
    return {
      success: true,
      message: result.content,
      data: result.structuredOutput,
      requiresUserInput: false,
    };
  }
}

// Export singleton instance
export const dataArchitect = new DataArchitect();
