/**
 * UI Designer Agent
 * Creates layouts and component arrangements from natural language
 */

import { BaseAgent } from './base-agent';
import { generateId } from '@/lib/utils';
import type { 
  ConversationState, 
  AgentResponse, 
  Schema,
  LayoutNode,
  LayoutProposal,
  ComponentType,
  ResponsiveConfig,
  SizingConfig,
} from '../types';

const LAYOUT_PROPOSAL_SCHEMA = `{
  "layout": {
    "id": "string",
    "type": "container|component",
    "container": {
      "direction": "row|column|grid",
      "children": [],
      "responsive": {
        "mobile": "stack|scroll|tabs",
        "tablet": "stack|grid|side-by-side",
        "desktop": "grid|side-by-side"
      },
      "gap": "string",
      "padding": "string"
    },
    "component": {
      "type": "form|table|chart|cards|kanban|calendar|stats|filters",
      "variant": "string",
      "props": {}
    },
    "sizing": {
      "basis": "string",
      "grow": 0,
      "shrink": 0
    }
  },
  "reasoning": "string",
  "responsiveNotes": "string"
}`;

const UI_DESIGNER_SYSTEM_PROMPT = `You are a UI designer for an AI app builder. Your job is to create intuitive, responsive layouts based on data schemas and user preferences.

When designing layouts:
1. Consider the data flow (input → display → analysis)
2. Use appropriate component types:
   - 'form': For data entry
   - 'table': For viewing/managing records
   - 'chart': For visualizations (bar, line, pie)
   - 'cards': For visual record display
   - 'kanban': For status-based workflows
   - 'calendar': For date-based data
   - 'stats': For KPIs and summaries
   - 'filters': For filtering data

3. Create responsive layouts:
   - Mobile: Stack vertically, collapse panels
   - Tablet: 2-column layouts where appropriate
   - Desktop: Full layouts with sidebars

4. Consider common patterns:
   - Dashboard: Stats at top, charts and tables below
   - Sidebar form: Form on left, content on right
   - Simple: Form above table
   - Kanban: Columns by status

5. Use sensible defaults for gaps and padding

Always explain your design decisions.`;

export class UIDesignerAgent extends BaseAgent {
  constructor() {
    super({
      name: 'UIDesigner',
      description: 'Designs UI layouts from natural language',
      temperature: 0.4,
      maxTokens: 4096,
    });
  }

  protected buildSystemPrompt(state: ConversationState): string {
    let contextPrompt = UI_DESIGNER_SYSTEM_PROMPT;

    // Add schema context
    if (state.schemas.length > 0) {
      const schema = state.schemas[0];
      contextPrompt += `\n\nData Schema:
- Name: ${schema.label}
- Fields: ${schema.fields.filter(f => !f.generated).map(f => `${f.label} (${f.type})`).join(', ')}
${schema.fields.some(f => f.type === 'enum') ? `- Has categories/status fields for grouping` : ''}
${schema.fields.some(f => f.type === 'number') ? `- Has numeric fields for charts` : ''}
${schema.fields.some(f => f.type === 'date' || f.type === 'datetime') ? `- Has date fields for timeline views` : ''}`;
    }

    return contextPrompt;
  }

  /**
   * Process a message and propose/refine layout
   */
  async process(
    message: string,
    state: ConversationState
  ): Promise<AgentResponse> {
    this.log('Processing UI request', { message: message.substring(0, 100) });

    // Determine if this is a new proposal or refinement
    if (!state.layout) {
      return this.proposeLayout(message, state);
    } else {
      return this.refineLayout(message, state);
    }
  }

  /**
   * Propose a new layout based on schema and preferences
   */
  async proposeLayout(
    preferences: string,
    state: ConversationState
  ): Promise<AgentResponse> {
    this.log('Proposing new layout');

    if (state.schemas.length === 0) {
      return {
        success: false,
        message: 'I need a data schema first before designing the UI. Please describe what you want to track.',
        requiresUserInput: true,
      };
    }

    const schema = state.schemas[0];
    const systemPrompt = this.buildSystemPrompt(state);

    const userPrompt = `Design a UI layout for this app:

Schema: ${schema.label}
Fields: ${schema.fields.filter(f => !f.generated).map(f => f.label).join(', ')}

User preferences: ${preferences || 'No specific preferences'}

Create a layout that:
1. Has a form to add new entries
2. Displays existing data effectively
3. Includes appropriate visualizations based on the field types
4. Is responsive for mobile, tablet, and desktop

Respond with JSON matching the layout schema format.`;

    try {
      const proposal = await this.callLLMJSON<LayoutProposal>(
        [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        LAYOUT_PROPOSAL_SCHEMA
      );

      // Validate and enhance the proposal
      const validatedProposal = this.validateProposal(proposal, schema);

      // Build user-friendly message
      const responseMessage = this.formatProposalMessage(validatedProposal, schema);

      return {
        success: true,
        message: responseMessage,
        data: validatedProposal,
        requiresUserInput: true,
        suggestedActions: [
          'Looks good, generate the app',
          'Put the form on the side',
          'Add a chart',
          'Make it a dashboard',
        ],
      };
    } catch (error) {
      this.log('Layout proposal failed, using fallback', { error });
      
      // Return fallback layout
      const fallback = this.createDefaultLayout(schema);
      return {
        success: true,
        message: this.formatProposalMessage(fallback, schema),
        data: fallback,
        requiresUserInput: true,
      };
    }
  }

  /**
   * Refine an existing layout based on user feedback
   */
  async refineLayout(
    feedback: string,
    state: ConversationState
  ): Promise<AgentResponse> {
    this.log('Refining layout', { feedback: feedback.substring(0, 100) });

    const currentLayout = state.layout!;
    const schema = state.schemas[0];
    const systemPrompt = this.buildSystemPrompt(state);

    const userPrompt = `Refine this layout based on user feedback:

Current Layout:
${JSON.stringify(currentLayout, null, 2)}

User Feedback:
"${feedback}"

Apply the requested changes while maintaining layout integrity.
Respond with the complete updated layout in JSON format.`;

    try {
      const proposal = await this.callLLMJSON<LayoutProposal>(
        [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        LAYOUT_PROPOSAL_SCHEMA
      );

      const validatedProposal = this.validateProposal(proposal, schema);
      const responseMessage = this.formatRefinementMessage(validatedProposal, feedback);

      return {
        success: true,
        message: responseMessage,
        data: validatedProposal,
        requiresUserInput: true,
        suggestedActions: [
          'Approve and generate',
          'Make more changes',
          'Go back to schema',
        ],
      };
    } catch (error) {
      this.log('Layout refinement failed', { error });
      return {
        success: false,
        message: 'I had trouble understanding those changes. Could you rephrase?',
        requiresUserInput: true,
      };
    }
  }

  /**
   * Validate and enhance a layout proposal
   */
  private validateProposal(proposal: LayoutProposal, schema: Schema): LayoutProposal {
    const validated: LayoutProposal = {
      ...proposal,
      layout: this.validateLayoutNode(proposal.layout, schema),
    };

    return validated;
  }

  /**
   * Validate a layout node recursively
   */
  private validateLayoutNode(node: LayoutNode, schema: Schema): LayoutNode {
    const validated: LayoutNode = {
      ...node,
      id: node.id || generateId(),
    };

    if (node.type === 'container' && node.container) {
      validated.container = {
        ...node.container,
        direction: node.container.direction || 'column',
        children: (node.container.children || []).map(child => 
          this.validateLayoutNode(child, schema)
        ),
        responsive: node.container.responsive || {
          mobile: 'stack',
          tablet: 'stack',
          desktop: 'side-by-side',
        },
        gap: node.container.gap || '1rem',
      };
    }

    if (node.type === 'component' && node.component) {
      validated.component = {
        ...node.component,
        type: this.validateComponentType(node.component.type),
        props: this.enrichComponentProps(node.component.type, node.component.props || {}, schema),
      };
    }

    return validated;
  }

  /**
   * Validate component type
   */
  private validateComponentType(type: string): ComponentType {
    const validTypes: ComponentType[] = [
      'form', 'table', 'chart', 'cards', 'kanban', 'calendar', 'stats', 'filters', 'custom'
    ];
    return validTypes.includes(type as ComponentType) ? type as ComponentType : 'table';
  }

  /**
   * Enrich component props based on schema
   */
  private enrichComponentProps(
    type: ComponentType,
    props: Record<string, unknown>,
    schema: Schema
  ): Record<string, unknown> {
    const enriched = { ...props };
    const fields = schema.fields.filter(f => !f.generated);

    switch (type) {
      case 'form':
        enriched.fields = enriched.fields || fields.map(f => f.name);
        enriched.submitLabel = enriched.submitLabel || 'Add Entry';
        break;

      case 'table':
        enriched.columns = enriched.columns || fields.map(f => ({
          field: f.name,
          label: f.label,
          sortable: true,
        }));
        enriched.paginated = enriched.paginated ?? true;
        enriched.pageSize = enriched.pageSize || 10;
        break;

      case 'chart':
        const numericField = fields.find(f => f.type === 'number');
        const categoryField = fields.find(f => f.type === 'enum');
        const dateField = fields.find(f => f.type === 'date' || f.type === 'datetime');
        
        enriched.chartType = enriched.chartType || 'bar';
        enriched.yAxis = enriched.yAxis || numericField?.name || fields[0]?.name;
        enriched.xAxis = enriched.xAxis || categoryField?.name || dateField?.name;
        enriched.groupBy = enriched.groupBy || categoryField?.name;
        break;

      case 'cards':
        enriched.titleField = enriched.titleField || fields[0]?.name;
        enriched.subtitleField = enriched.subtitleField || fields[1]?.name;
        break;

      case 'stats':
        const statsNumericFields = fields.filter(f => f.type === 'number');
        enriched.metrics = enriched.metrics || statsNumericFields.slice(0, 3).map(f => ({
          field: f.name,
          label: f.label,
          aggregation: 'sum',
        }));
        break;

      case 'filters':
        const filterableFields = fields.filter(f => 
          f.type === 'enum' || f.type === 'date' || f.searchable
        );
        enriched.fields = enriched.fields || filterableFields.map(f => f.name);
        break;
    }

    return enriched;
  }

  /**
   * Create a default layout for a schema
   */
  private createDefaultLayout(schema: Schema): LayoutProposal {
    const fields = schema.fields.filter(f => !f.generated);
    const hasNumericField = fields.some(f => f.type === 'number');
    const hasEnumField = fields.some(f => f.type === 'enum');

    // Determine best layout based on schema
    const useChart = hasNumericField && (hasEnumField || fields.some(f => f.type === 'date'));
    
    const layout: LayoutNode = {
      id: generateId(),
      type: 'container',
      container: {
        direction: 'column',
        gap: '1.5rem',
        padding: '1.5rem',
        children: [
          // Header section
          {
            id: generateId(),
            type: 'container',
            container: {
              direction: 'row',
              gap: '1rem',
              responsive: {
                mobile: 'stack',
                tablet: 'side-by-side',
                desktop: 'side-by-side',
              },
              children: [
                // Form
                {
                  id: generateId(),
                  type: 'component',
                  component: {
                    type: 'form',
                    props: {
                      fields: fields.map(f => f.name),
                      submitLabel: 'Add Entry',
                    },
                  },
                  sizing: {
                    basis: '400px',
                    grow: 0,
                    shrink: 0,
                  },
                },
                // Chart (if applicable) or stats
                useChart ? {
                  id: generateId(),
                  type: 'component',
                  component: {
                    type: 'chart',
                    props: {
                      chartType: 'bar',
                    },
                  },
                  sizing: {
                    basis: '1fr',
                    grow: 1,
                    shrink: 1,
                  },
                } : {
                  id: generateId(),
                  type: 'component',
                  component: {
                    type: 'stats',
                    props: {},
                  },
                  sizing: {
                    basis: '1fr',
                    grow: 1,
                    shrink: 1,
                  },
                },
              ],
            },
          },
          // Table section
          {
            id: generateId(),
            type: 'component',
            component: {
              type: 'table',
              props: {
                columns: fields.map(f => ({
                  field: f.name,
                  label: f.label,
                  sortable: true,
                })),
                paginated: true,
                pageSize: 10,
              },
            },
          },
        ],
        responsive: {
          mobile: 'stack',
          tablet: 'stack',
          desktop: 'side-by-side',
        },
      },
    };

    return {
      layout,
      reasoning: 'Created a standard layout with form and data visualization.',
      responsiveNotes: 'On mobile, components stack vertically. On desktop, form is on the left with chart/stats on the right.',
    };
  }

  /**
   * Format layout proposal as user-friendly message
   */
  private formatProposalMessage(proposal: LayoutProposal, schema: Schema): string {
    const components = this.extractComponents(proposal.layout);
    
    let message = `## UI Layout\n\n`;
    message += `${proposal.reasoning}\n\n`;
    message += `### Components\n\n`;

    for (const comp of components) {
      message += `- **${this.formatComponentType(comp.type)}**`;
      if (comp.variant) {
        message += ` (${comp.variant})`;
      }
      message += '\n';
    }

    message += `\n### Responsive Behavior\n\n`;
    message += `${proposal.responsiveNotes}\n\n`;

    message += `---\n\n`;
    message += `Does this layout work for you? You can:\n`;
    message += `- **Approve** to start generating the app\n`;
    message += `- **Request changes** (e.g., "put the form on the left")\n`;
    message += `- **Change layout style** (e.g., "make it a dashboard")\n`;

    return message;
  }

  /**
   * Format refinement message
   */
  private formatRefinementMessage(proposal: LayoutProposal, feedback: string): string {
    let message = `## Updated Layout\n\n`;
    message += `I've applied your changes: "${feedback}"\n\n`;
    message += this.formatProposalMessage(proposal, {} as Schema);
    return message;
  }

  /**
   * Extract all components from a layout tree
   */
  private extractComponents(node: LayoutNode): Array<{ type: ComponentType; variant?: string }> {
    const components: Array<{ type: ComponentType; variant?: string }> = [];

    if (node.type === 'component' && node.component) {
      components.push({
        type: node.component.type,
        variant: node.component.variant,
      });
    }

    if (node.type === 'container' && node.container?.children) {
      for (const child of node.container.children) {
        components.push(...this.extractComponents(child));
      }
    }

    return components;
  }

  /**
   * Format component type for display
   */
  private formatComponentType(type: ComponentType): string {
    const labels: Record<ComponentType, string> = {
      form: 'Data Entry Form',
      table: 'Data Table',
      chart: 'Chart/Visualization',
      cards: 'Card View',
      kanban: 'Kanban Board',
      calendar: 'Calendar View',
      stats: 'Statistics Dashboard',
      filters: 'Filter Panel',
      custom: 'Custom Component',
    };
    return labels[type] || type;
  }
}

// Export singleton instance
export const uiDesignerAgent = new UIDesignerAgent();
