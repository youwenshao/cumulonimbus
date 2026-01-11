/**
 * Proposal Engine
 * Generates multiple design proposals for users to choose from
 */

import { generateId } from '@/lib/utils';
import { completeJSON } from '@/lib/qwen';
import type { 
  DesignProposal, 
  ProposalSet, 
  EnhancedIntent,
  Schema,
  LayoutNode,
  DynamicConversationState,
  MockupData,
  ComponentType,
} from '../types';

// Proposal generation schema
const PROPOSAL_GENERATION_SCHEMA = `{
  "proposals": [{
    "name": "string",
    "description": "string",
    "schema": {
      "name": "string",
      "label": "string",
      "description": "string",
      "fields": [{
        "name": "string",
        "label": "string",
        "type": "string|text|number|boolean|date|datetime|enum|array",
        "required": true|false,
        "options": ["string"],
        "description": "string"
      }]
    },
    "layoutStructure": "dashboard"|"sidebar"|"kanban"|"simple"|"split",
    "components": ["form"|"table"|"chart"|"cards"|"kanban"|"stats"|"filters"],
    "tradeoffs": {
      "pros": ["string"],
      "cons": ["string"]
    },
    "bestFor": "string",
    "confidence": 0-1,
    "recommended": true|false
  }],
  "reasoning": "string",
  "recommendedIndex": 0
}`;

const PROPOSAL_SYSTEM_PROMPT = `You are an expert app designer. Generate 2-3 distinct design proposals for the user's app request.

Each proposal should be GENUINELY DIFFERENT, not just variations. Consider:

1. MINIMALIST: Simplest possible implementation
   - Few fields, basic layout
   - Quick to understand and use
   - Best for simple tracking

2. BALANCED: Good features, moderate complexity (usually RECOMMENDED)
   - Standard set of features
   - Common UI patterns
   - Best for most use cases

3. ADVANCED: Full-featured with extras
   - More fields and relationships
   - Dashboard/analytics focus
   - Best for power users

For each proposal:
- Design a complete schema with appropriate field types
- Choose layout structure (dashboard, sidebar, kanban, simple, split)
- Select components that make sense for the data
- Explain trade-offs clearly
- Set recommended=true for the best default choice

IMPORTANT:
- Infer field types automatically (don't ask user)
- Use enums for status/category fields with sensible options
- Add computed fields where useful
- Consider the app category when designing`;

export class ProposalEngine {
  /**
   * Generate multiple design proposals from enhanced intent
   */
  async generateProposals(
    intent: EnhancedIntent,
    state: DynamicConversationState
  ): Promise<ProposalSet> {
    console.log('[ProposalEngine] Generating proposals for:', intent.primaryGoal);

    const prompt = this.buildPrompt(intent, state);

    try {
      const result = await completeJSON<{
        proposals: {
          name: string;
          description: string;
          schema: {
            name: string;
            label: string;
            description?: string;
            fields: Array<{
              name: string;
              label: string;
              type: string;
              required?: boolean;
              options?: string[];
              description?: string;
            }>;
          };
          layoutStructure: string;
          components: string[];
          tradeoffs: {
            pros: string[];
            cons: string[];
          };
          bestFor: string;
          confidence: number;
          recommended: boolean;
        }[];
        reasoning: string;
        recommendedIndex: number;
      }>({
        messages: [
          { role: 'system', content: PROPOSAL_SYSTEM_PROMPT },
          { role: 'user', content: prompt },
        ],
        schema: PROPOSAL_GENERATION_SCHEMA,
        temperature: 0.4,
        maxTokens: 4096,
      });

      // Convert to typed proposals
      const proposals = result.proposals.map((p, i) => 
        this.convertToProposal(p, i, intent)
      );

      // Ensure exactly one is recommended
      const hasRecommended = proposals.some(p => p.recommended);
      if (!hasRecommended && proposals.length > 0) {
        proposals[result.recommendedIndex || 0].recommended = true;
      }

      return {
        proposals,
        reasoning: result.reasoning,
        recommendedIndex: result.recommendedIndex || 0,
        basedOnIntent: intent,
      };
    } catch (error) {
      console.error('[ProposalEngine] Generation failed:', error);
      return this.createFallbackProposals(intent);
    }
  }

  /**
   * Build the prompt for proposal generation
   */
  private buildPrompt(intent: EnhancedIntent, state: DynamicConversationState): string {
    let prompt = `Generate design proposals for this app:

App Goal: "${intent.primaryGoal}"
Category: ${intent.appCategory}
Complexity: ${intent.complexityScore}/10

Detected Entities:
${intent.entities.map(e => `- ${e.name} (${e.role}): ${e.fields.join(', ') || 'to be designed'}`).join('\n')}
`;

    if (intent.referenceApps.length > 0) {
      prompt += `\nReference Apps:\n`;
      for (const ref of intent.referenceApps) {
        prompt += `- Like ${ref.name}: ${ref.aspects.join(', ')}\n`;
      }
    }

    if (intent.workflows.length > 0) {
      prompt += `\nWorkflows Detected:\n`;
      for (const wf of intent.workflows) {
        prompt += `- ${wf.description}\n`;
      }
    }

    if (intent.layoutHints.structure !== 'simple') {
      prompt += `\nLayout Preference: ${intent.layoutHints.structure}\n`;
    }

    prompt += `\nGenerate 2-3 genuinely different proposals as JSON.`;

    return prompt;
  }

  /**
   * Convert raw LLM response to typed proposal
   */
  private convertToProposal(
    raw: {
      name: string;
      description: string;
      schema: {
        name: string;
        label: string;
        description?: string;
        fields: Array<{
          name: string;
          label: string;
          type: string;
          required?: boolean;
          options?: string[];
          description?: string;
        }>;
      };
      layoutStructure: string;
      components: string[];
      tradeoffs: { pros: string[]; cons: string[] };
      bestFor: string;
      confidence: number;
      recommended: boolean;
    },
    index: number,
    intent: EnhancedIntent
  ): DesignProposal {
    // Convert schema
    const schema: Schema = {
      name: this.sanitizeName(raw.schema.name),
      label: raw.schema.label,
      description: raw.schema.description,
      fields: [
        // Add ID field
        {
          name: 'id',
          label: 'ID',
          type: 'string',
          required: true,
          generated: true,
          primaryKey: true,
        },
        // User fields
        ...raw.schema.fields.map(f => ({
          name: this.sanitizeName(f.name),
          label: f.label,
          type: this.validateFieldType(f.type),
          required: f.required ?? true,
          options: f.options,
          description: f.description,
        })),
        // Add createdAt
        {
          name: 'createdAt',
          label: 'Created At',
          type: 'datetime' as const,
          required: true,
          generated: true,
        },
      ],
    };

    // Build layout
    const layout = this.buildLayout(
      raw.layoutStructure,
      raw.components as ComponentType[],
      schema
    );

    // Generate mockup
    const mockup = this.generateMockup(layout, schema, raw.name);

    return {
      id: generateId(),
      name: raw.name,
      description: raw.description,
      schema: [schema],
      layout,
      mockup,
      tradeoffs: raw.tradeoffs,
      bestFor: raw.bestFor,
      confidence: raw.confidence,
      recommended: raw.recommended,
    };
  }

  /**
   * Build layout from structure and components
   */
  private buildLayout(
    structure: string,
    components: ComponentType[],
    schema: Schema
  ): LayoutNode {
    const fields = schema.fields.filter(f => !f.generated);

    // Ensure we have form and table at minimum
    if (!components.includes('form')) components.unshift('form');
    if (!components.includes('table')) components.push('table');

    switch (structure) {
      case 'dashboard':
        return this.buildDashboardLayout(components, schema);
      case 'sidebar':
        return this.buildSidebarLayout(components, schema);
      case 'kanban':
        return this.buildKanbanLayout(components, schema);
      case 'split':
        return this.buildSplitLayout(components, schema);
      default:
        return this.buildSimpleLayout(components, schema);
    }
  }

  /**
   * Build dashboard layout (stats at top, content below)
   */
  private buildDashboardLayout(components: ComponentType[], schema: Schema): LayoutNode {
    const children: LayoutNode[] = [];

    // Stats row at top
    if (components.includes('stats')) {
      children.push({
        id: generateId(),
        type: 'component',
        component: { type: 'stats', props: {} },
      });
    }

    // Charts row
    if (components.includes('chart')) {
      children.push({
        id: generateId(),
        type: 'container',
        container: {
          direction: 'row',
          gap: '1rem',
          children: [
            {
              id: generateId(),
              type: 'component',
              component: { type: 'chart', props: { chartType: 'bar' } },
              sizing: { basis: '1fr', grow: 1, shrink: 1 },
            },
          ],
        },
      });
    }

    // Form and table row
    children.push({
      id: generateId(),
      type: 'container',
      container: {
        direction: 'row',
        gap: '1.5rem',
        responsive: {
          mobile: 'stack',
          tablet: 'stack',
          desktop: 'side-by-side',
        },
        children: [
          {
            id: generateId(),
            type: 'component',
            component: { type: 'form', props: {} },
            sizing: { basis: '350px', grow: 0, shrink: 0 },
          },
          {
            id: generateId(),
            type: 'component',
            component: { type: 'table', props: {} },
            sizing: { basis: '1fr', grow: 1, shrink: 1 },
          },
        ],
      },
    });

    return {
      id: generateId(),
      type: 'container',
      container: {
        direction: 'column',
        gap: '1.5rem',
        padding: '1.5rem',
        children,
      },
    };
  }

  /**
   * Build sidebar layout (form on left, content on right)
   */
  private buildSidebarLayout(components: ComponentType[], schema: Schema): LayoutNode {
    const sidebarChildren: LayoutNode[] = [
      {
        id: generateId(),
        type: 'component',
        component: { type: 'form', props: {} },
      },
    ];

    if (components.includes('filters')) {
      sidebarChildren.push({
        id: generateId(),
        type: 'component',
        component: { type: 'filters', props: {} },
      });
    }

    const mainChildren: LayoutNode[] = [];

    if (components.includes('stats')) {
      mainChildren.push({
        id: generateId(),
        type: 'component',
        component: { type: 'stats', props: {} },
      });
    }

    mainChildren.push({
      id: generateId(),
      type: 'component',
      component: { type: 'table', props: {} },
    });

    if (components.includes('chart')) {
      mainChildren.push({
        id: generateId(),
        type: 'component',
        component: { type: 'chart', props: {} },
      });
    }

    return {
      id: generateId(),
      type: 'container',
      container: {
        direction: 'row',
        gap: '1.5rem',
        padding: '1.5rem',
        responsive: {
          mobile: 'stack',
          tablet: 'side-by-side',
          desktop: 'side-by-side',
        },
        children: [
          {
            id: generateId(),
            type: 'container',
            container: {
              direction: 'column',
              gap: '1rem',
              children: sidebarChildren,
            },
            sizing: { basis: '320px', grow: 0, shrink: 0 },
          },
          {
            id: generateId(),
            type: 'container',
            container: {
              direction: 'column',
              gap: '1rem',
              children: mainChildren,
            },
            sizing: { basis: '1fr', grow: 1, shrink: 1 },
          },
        ],
      },
    };
  }

  /**
   * Build kanban layout
   */
  private buildKanbanLayout(components: ComponentType[], schema: Schema): LayoutNode {
    // Find status field for columns
    const statusField = schema.fields.find(f => f.type === 'enum');
    const columns = statusField?.options || ['To Do', 'In Progress', 'Done'];

    return {
      id: generateId(),
      type: 'container',
      container: {
        direction: 'column',
        gap: '1rem',
        padding: '1.5rem',
        children: [
          // Form for quick add
          {
            id: generateId(),
            type: 'component',
            component: { type: 'form', variant: 'inline', props: {} },
          },
          // Kanban board
          {
            id: generateId(),
            type: 'component',
            component: {
              type: 'kanban',
              props: {
                columns,
                statusField: statusField?.name || 'status',
              },
            },
          },
        ],
      },
    };
  }

  /**
   * Build split layout (50/50)
   */
  private buildSplitLayout(components: ComponentType[], schema: Schema): LayoutNode {
    return {
      id: generateId(),
      type: 'container',
      container: {
        direction: 'row',
        gap: '1.5rem',
        padding: '1.5rem',
        responsive: {
          mobile: 'stack',
          tablet: 'side-by-side',
          desktop: 'side-by-side',
        },
        children: [
          {
            id: generateId(),
            type: 'container',
            container: {
              direction: 'column',
              gap: '1rem',
              children: [
                {
                  id: generateId(),
                  type: 'component',
                  component: { type: 'form', props: {} },
                },
                ...(components.includes('stats') ? [{
                  id: generateId(),
                  type: 'component' as const,
                  component: { type: 'stats' as const, props: {} },
                }] : []),
              ],
            },
            sizing: { basis: '50%', grow: 1, shrink: 1 },
          },
          {
            id: generateId(),
            type: 'container',
            container: {
              direction: 'column',
              gap: '1rem',
              children: [
                {
                  id: generateId(),
                  type: 'component',
                  component: { type: 'table', props: {} },
                },
                ...(components.includes('chart') ? [{
                  id: generateId(),
                  type: 'component' as const,
                  component: { type: 'chart' as const, props: {} },
                }] : []),
              ],
            },
            sizing: { basis: '50%', grow: 1, shrink: 1 },
          },
        ],
      },
    };
  }

  /**
   * Build simple layout (vertical stack)
   */
  private buildSimpleLayout(components: ComponentType[], schema: Schema): LayoutNode {
    const children: LayoutNode[] = [];

    for (const comp of components) {
      children.push({
        id: generateId(),
        type: 'component',
        component: { type: comp, props: {} },
      });
    }

    return {
      id: generateId(),
      type: 'container',
      container: {
        direction: 'column',
        gap: '1.5rem',
        padding: '1.5rem',
        children,
      },
    };
  }

  /**
   * Generate ASCII mockup for proposal
   */
  private generateMockup(layout: LayoutNode, schema: Schema, proposalName: string): MockupData {
    const lines: string[] = [];
    const width = 50;
    
    // Header
    lines.push('┌' + '─'.repeat(width - 2) + '┐');
    lines.push(`│ ${schema.label.padEnd(width - 4)} │`);
    lines.push('├' + '─'.repeat(width - 2) + '┤');
    
    // Generate content based on layout structure
    this.renderLayoutToAscii(layout, lines, width, 0);
    
    // Footer
    lines.push('└' + '─'.repeat(width - 2) + '┘');

    return {
      type: 'ascii',
      content: lines.join('\n'),
      annotations: [
        {
          component: 'layout',
          description: proposalName,
        },
      ],
    };
  }

  /**
   * Render layout node to ASCII lines
   */
  private renderLayoutToAscii(node: LayoutNode, lines: string[], width: number, depth: number): void {
    const indent = '  '.repeat(depth);
    const innerWidth = width - 4 - (depth * 2);

    if (node.type === 'component' && node.component) {
      const label = this.getComponentLabel(node.component.type);
      const box = `│${indent}┌${'─'.repeat(innerWidth - 2)}┐`;
      const content = `│${indent}│ ${label.padEnd(innerWidth - 4)} │`;
      const bottom = `│${indent}└${'─'.repeat(innerWidth - 2)}┘`;
      
      lines.push(box.padEnd(width - 1) + '│');
      lines.push(content.padEnd(width - 1) + '│');
      lines.push(bottom.padEnd(width - 1) + '│');
    }

    if (node.type === 'container' && node.container?.children) {
      for (const child of node.container.children) {
        this.renderLayoutToAscii(child, lines, width, depth);
      }
    }
  }

  /**
   * Get display label for component type
   */
  private getComponentLabel(type: ComponentType): string {
    const labels: Record<ComponentType, string> = {
      form: '[ Add Entry Form ]',
      table: '[ Data Table ]',
      chart: '[ Chart ]',
      cards: '[ Cards View ]',
      kanban: '[ Kanban Board ]',
      calendar: '[ Calendar ]',
      stats: '[ Statistics ]',
      filters: '[ Filters ]',
      custom: '[ Custom ]',
    };
    return labels[type] || type;
  }

  /**
   * Create fallback proposals when LLM fails
   */
  private createFallbackProposals(intent: EnhancedIntent): ProposalSet {
    const entityName = intent.entities[0]?.name || 'item';
    const label = entityName.charAt(0).toUpperCase() + entityName.slice(1);

    const simpleSchema: Schema = {
      name: entityName,
      label,
      fields: [
        { name: 'id', label: 'ID', type: 'string', required: true, generated: true, primaryKey: true },
        { name: 'name', label: 'Name', type: 'string', required: true },
        { name: 'description', label: 'Description', type: 'text', required: false },
        { name: 'status', label: 'Status', type: 'enum', required: true, options: ['Active', 'Complete', 'Pending'] },
        { name: 'createdAt', label: 'Created At', type: 'datetime', required: true, generated: true },
      ],
    };

    const simpleLayout = this.buildSimpleLayout(['form', 'table'], simpleSchema);
    const dashboardLayout = this.buildDashboardLayout(['stats', 'form', 'table', 'chart'], simpleSchema);

    const proposals: DesignProposal[] = [
      {
        id: generateId(),
        name: 'Simple',
        description: `A straightforward ${label.toLowerCase()} tracker with just the essentials`,
        schema: [simpleSchema],
        layout: simpleLayout,
        mockup: this.generateMockup(simpleLayout, simpleSchema, 'Simple'),
        tradeoffs: {
          pros: ['Quick to set up', 'Easy to use', 'Minimal learning curve'],
          cons: ['No visualizations', 'Limited features'],
        },
        bestFor: 'Quick tracking tasks',
        confidence: 0.7,
        recommended: true,
      },
      {
        id: generateId(),
        name: 'Dashboard',
        description: `A dashboard view with statistics and charts for your ${label.toLowerCase()}s`,
        schema: [simpleSchema],
        layout: dashboardLayout,
        mockup: this.generateMockup(dashboardLayout, simpleSchema, 'Dashboard'),
        tradeoffs: {
          pros: ['Visual insights', 'Data overview', 'Better for analysis'],
          cons: ['More complex', 'More screen space needed'],
        },
        bestFor: 'Tracking with analytics',
        confidence: 0.6,
        recommended: false,
      },
    ];

    return {
      proposals,
      reasoning: 'Generated fallback proposals based on detected entities',
      recommendedIndex: 0,
      basedOnIntent: intent,
    };
  }

  /**
   * Sanitize name for code generation
   */
  private sanitizeName(name: string): string {
    return name
      .replace(/[^a-zA-Z0-9]/g, '')
      .replace(/^[0-9]/, '_$&');
  }

  /**
   * Validate field type
   */
  private validateFieldType(type: string): Schema['fields'][0]['type'] {
    const validTypes = ['string', 'text', 'number', 'boolean', 'date', 'datetime', 'enum', 'array', 'json'];
    return validTypes.includes(type) ? type as Schema['fields'][0]['type'] : 'string';
  }
}

// Export singleton instance
export const proposalEngine = new ProposalEngine();
