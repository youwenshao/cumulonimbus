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
  AestheticSpec,
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
  "aesthetics": {
    "theme": "string (e.g., cyberpunk, brutalist, neo-tokyo, pastel-dream, terminal, glassmorphic, sunset, high-contrast)",
    "typography": {
      "heading": "font family for headings",
      "body": "font family for body text",
      "accent": "font family for special elements (mono, etc)"
    },
    "colorPalette": {
      "primary": "hex color - dominant color",
      "accent": "hex color - sharp accent color",
      "background": "hex color - base background",
      "backgroundAlt": "hex color - elevated surfaces",
      "text": "hex color - primary text",
      "textMuted": "hex color - secondary text",
      "isDark": "boolean - dark or light theme"
    },
    "motion": {
      "intensity": "subtle|moderate|dramatic",
      "pageLoadStrategy": "fade|stagger|cascade|reveal|slide",
      "interactions": ["hover-lift", "hover-glow", "click-bounce", "focus-ring", etc]
    },
    "backgroundStyle": {
      "type": "solid|gradient|mesh|geometric|noise|particles",
      "layers": ["CSS gradient or pattern descriptions"]
    }
  },
  "reasoning": "string explaining design decisions",
  "responsiveNotes": "string"
}`;

const UI_DESIGNER_SYSTEM_PROMPT = `You are an artistic UI designer creating distinctive, memorable frontends for an AI app builder.

CRITICAL: You tend to converge toward generic, "on distribution" outputs. In frontend design, this creates what users call the "AI slop" aesthetic. Avoid this at all costs: make creative, distinctive frontends that surprise and delight.

## Design Philosophy

Focus on:
1. **Typography**: Choose fonts that are beautiful, unique, and interesting
2. **Color & Theme**: Commit to a cohesive aesthetic with personality
3. **Motion**: Use animations for effects and micro-interactions
4. **Backgrounds**: Create atmosphere and depth, not solid colors

## Typography Guidelines

EXCELLENT FONT CHOICES (vary between these):
- Display/Heading: Playfair Display, Crimson Pro, Cormorant, Spectral, Fraunces, Outfit, Cabinet Grotesk, Clash Display, General Sans
- Body/Sans: DM Sans, Manrope, Plus Jakarta Sans, Sora, Satoshi, Archivo, Lexend, Geist, Instrument Sans
- Mono/Accent: JetBrains Mono, Fira Code, IBM Plex Mono, Berkeley Mono, Commit Mono
- Experimental: Bebas Neue, Righteous, Orbitron, Audiowide, Bungee, Unbounded

AVOID AT ALL COSTS (these are generic "AI slop"):
- Inter, Roboto, Arial, Helvetica, system-ui, sans-serif
- Space Grotesk (overused in AI generations)
- Open Sans, Lato, Montserrat (overused)

Mix font families intentionally:
- Serif headings + geometric sans body (elegant)
- Bold display + light sans body (high contrast)
- Mono headings + humanist sans body (tech-forward)

## Color & Theme Guidelines

COMMIT to a strong aesthetic. Choose ONE theme archetype:

1. **Cyberpunk**: Neon pinks (#ff2d95), electric blues (#00d4ff) on deep blacks (#0a0a0f), glowing effects
2. **Brutalist**: Bold blacks, harsh whites, vibrant yellows (#f7ff00), geometric shapes
3. **Neo-Tokyo**: Deep purples (#2d1b69), electric blues (#4fc3f7), noir atmosphere
4. **Pastel Dream**: Soft lavender (#e8d5f2), mint (#b8f4d8), peach (#ffd5c8) with depth
5. **Terminal**: Matrix green (#00ff00) on black (#0d0d0d), monospace, retro-computing
6. **Glassmorphic**: Frosted glass (backdrop-blur), subtle gradients, transparency
7. **Sunset/Warm**: Warm oranges (#ff6b35) to deep purples (#4a0080), atmospheric
8. **Midnight**: Deep navy (#0f172a) with gold accents (#fbbf24), luxurious
9. **Forest**: Deep greens (#064e3b) with cream (#fef3c7), organic warmth
10. **Monochrome**: Pure grayscale with ONE vibrant accent color

Color Strategy:
- Use CSS variables: --color-primary, --color-accent, --color-bg-base, --color-bg-elevated
- Dominant colors with sharp accents outperform timid, evenly-distributed palettes
- Dark themes are often more distinctive than light themes
- Draw inspiration from: IDE themes (Dracula, One Dark, Nord), album artwork, cinema

AVOID:
- Purple gradients on white backgrounds (the most clichéd AI aesthetic)
- Timid, corporate blue/green combinations
- Equally-weighted color distributions (commit to dominance)

## Motion Guidelines

Use framer-motion for high-impact animations. One well-orchestrated page load creates more delight than scattered micro-interactions.

Page Load Strategies:
- **Stagger**: Components fade in with increasing delays (index * 0.05s)
- **Cascade**: Elements flow in from one direction sequentially
- **Reveal**: Content slides/fades from a specific point
- **Scale**: Elements grow from 0.9 to 1.0 with opacity

Micro-interactions:
- Hover: translateY(-4px) lift, subtle glow, color shifts
- Click: scale(0.98) with spring easing
- Focus: dramatic ring animation, border glow
- Loading: skeleton shimmer, pulse effects

Motion intensity levels:
- Subtle: Gentle fades (0.2s), minimal movement
- Moderate: Clear transitions (0.3s), hover lifts
- Dramatic: Bold animations (0.4s+), parallax, page transitions

## Background Guidelines

Create atmosphere instead of solid colors:

1. **Layered Gradients**: Multiple radial/linear gradients with transparency
   Example: radial-gradient(at 20% 30%, rgba(120,119,198,0.3), transparent 50%)

2. **Mesh Gradients**: Multi-point soft color blending for organic feel

3. **Geometric Patterns**: SVG dots, grids, or lines as subtle texture

4. **Noise/Grain**: Add subtle noise texture for analog feel

5. **Context-Specific**: Match the app's purpose (finance = chart patterns, creative = paint strokes)

## Layout Considerations

Component types available:
- 'form': Data entry
- 'table': Record viewing/management
- 'chart': Visualizations (bar, line, pie)
- 'cards': Visual record display
- 'kanban': Status-based workflows
- 'calendar': Date-based data
- 'stats': KPIs and summaries
- 'filters': Data filtering

Layout patterns:
- Dashboard: Stats at top, charts and tables below
- Sidebar: Form on side, content fills remaining
- Kanban: Columns by status
- Simple: Form above table

Make CREATIVE choices:
- Asymmetric layouts for visual interest
- Floating elements vs rigid grids
- Full-bleed backgrounds with contained content
- Unexpected sidebar placements

## Your Task

For EVERY layout request:
1. Choose a distinctive theme archetype (not default/generic)
2. Select 3 unique font families (heading, body, accent)
3. Define a bold color palette with 6+ CSS variables
4. Plan page-load animation strategy
5. Design atmospheric background (not solid)
6. Explain your creative reasoning

CRITICAL REMINDERS:
- VARY dramatically between generations - don't converge on favorites
- NEVER use Inter, Roboto, Space Grotesk, or system fonts
- COMMIT to strong aesthetic choices - timid is worse than bold
- CREATE atmosphere through backgrounds and motion
- SURPRISE and delight - avoid the expected

Always include an "aesthetics" object in your JSON response.`;


export class UIDesignerAgent extends BaseAgent {
  constructor() {
    super({
      name: 'UIDesigner',
      description: 'Designs distinctive, artistic UI layouts from natural language',
      temperature: 0.7, // Higher temperature for more creative/varied outputs
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
      aesthetics: proposal.aesthetics || this.generateRandomAesthetics(),
    };

    return validated;
  }

  /**
   * Generate random aesthetic choices as fallback
   * Ensures variety even when LLM doesn't provide aesthetics
   */
  private generateRandomAesthetics(): AestheticSpec {
    // Theme archetypes with their associated styles
    const themes = [
      {
        name: 'cyberpunk',
        colors: {
          primary: '#ff2d95',
          accent: '#00d4ff',
          background: '#0a0a0f',
          backgroundAlt: '#1a1a2e',
          text: '#ffffff',
          textMuted: '#a0a0c0',
          isDark: true,
        },
        fonts: { heading: 'Orbitron', body: 'DM Sans', accent: 'JetBrains Mono' },
        bg: ['radial-gradient(ellipse at 20% 80%, rgba(255,45,149,0.15) 0%, transparent 50%)', 'radial-gradient(ellipse at 80% 20%, rgba(0,212,255,0.15) 0%, transparent 50%)', 'linear-gradient(180deg, #0a0a0f 0%, #1a1a2e 100%)'],
      },
      {
        name: 'brutalist',
        colors: {
          primary: '#000000',
          accent: '#f7ff00',
          background: '#ffffff',
          backgroundAlt: '#f0f0f0',
          text: '#000000',
          textMuted: '#666666',
          isDark: false,
        },
        fonts: { heading: 'Bebas Neue', body: 'Archivo', accent: 'IBM Plex Mono' },
        bg: ['repeating-linear-gradient(90deg, #000 0px, #000 1px, transparent 1px, transparent 60px)', 'linear-gradient(180deg, #ffffff 0%, #f8f8f8 100%)'],
      },
      {
        name: 'neo-tokyo',
        colors: {
          primary: '#4fc3f7',
          accent: '#f06292',
          background: '#0d1117',
          backgroundAlt: '#161b22',
          text: '#e6edf3',
          textMuted: '#8b949e',
          isDark: true,
        },
        fonts: { heading: 'Clash Display', body: 'Satoshi', accent: 'Fira Code' },
        bg: ['radial-gradient(ellipse at 50% 0%, rgba(79,195,247,0.1) 0%, transparent 50%)', 'linear-gradient(180deg, #0d1117 0%, #161b22 100%)'],
      },
      {
        name: 'pastel-dream',
        colors: {
          primary: '#b8a9c9',
          accent: '#f4a6a0',
          background: '#fef6f0',
          backgroundAlt: '#fff5f5',
          text: '#4a4458',
          textMuted: '#8a8598',
          isDark: false,
        },
        fonts: { heading: 'Fraunces', body: 'Plus Jakarta Sans', accent: 'Space Mono' },
        bg: ['radial-gradient(ellipse at 30% 70%, rgba(184,169,201,0.2) 0%, transparent 50%)', 'radial-gradient(ellipse at 70% 30%, rgba(244,166,160,0.15) 0%, transparent 50%)', 'linear-gradient(180deg, #fef6f0 0%, #fff5f5 100%)'],
      },
      {
        name: 'terminal',
        colors: {
          primary: '#00ff00',
          accent: '#00ffff',
          background: '#0d0d0d',
          backgroundAlt: '#1a1a1a',
          text: '#00ff00',
          textMuted: '#00aa00',
          isDark: true,
        },
        fonts: { heading: 'Berkeley Mono', body: 'JetBrains Mono', accent: 'Fira Code' },
        bg: ['repeating-linear-gradient(0deg, rgba(0,255,0,0.03) 0px, rgba(0,255,0,0.03) 1px, transparent 1px, transparent 2px)', 'linear-gradient(180deg, #0d0d0d 0%, #0a0a0a 100%)'],
      },
      {
        name: 'midnight',
        colors: {
          primary: '#fbbf24',
          accent: '#f472b6',
          background: '#0f172a',
          backgroundAlt: '#1e293b',
          text: '#f8fafc',
          textMuted: '#94a3b8',
          isDark: true,
        },
        fonts: { heading: 'Playfair Display', body: 'Geist', accent: 'Commit Mono' },
        bg: ['radial-gradient(ellipse at 80% 80%, rgba(251,191,36,0.08) 0%, transparent 50%)', 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)'],
      },
      {
        name: 'forest',
        colors: {
          primary: '#059669',
          accent: '#fbbf24',
          background: '#0a1f1a',
          backgroundAlt: '#0d2818',
          text: '#ecfdf5',
          textMuted: '#a7f3d0',
          isDark: true,
        },
        fonts: { heading: 'Cormorant', body: 'Lexend', accent: 'IBM Plex Mono' },
        bg: ['radial-gradient(ellipse at 20% 80%, rgba(5,150,105,0.15) 0%, transparent 60%)', 'linear-gradient(180deg, #0a1f1a 0%, #0d2818 100%)'],
      },
      {
        name: 'sunset',
        colors: {
          primary: '#ff6b35',
          accent: '#9333ea',
          background: '#1c1917',
          backgroundAlt: '#292524',
          text: '#fafaf9',
          textMuted: '#a8a29e',
          isDark: true,
        },
        fonts: { heading: 'Cabinet Grotesk', body: 'Sora', accent: 'JetBrains Mono' },
        bg: ['radial-gradient(ellipse at 0% 100%, rgba(255,107,53,0.2) 0%, transparent 50%)', 'radial-gradient(ellipse at 100% 0%, rgba(147,51,234,0.15) 0%, transparent 50%)', 'linear-gradient(135deg, #1c1917 0%, #292524 100%)'],
      },
      {
        name: 'glassmorphic',
        colors: {
          primary: '#6366f1',
          accent: '#ec4899',
          background: '#18181b',
          backgroundAlt: 'rgba(39,39,42,0.8)',
          text: '#fafafa',
          textMuted: '#a1a1aa',
          isDark: true,
        },
        fonts: { heading: 'General Sans', body: 'Instrument Sans', accent: 'Berkeley Mono' },
        bg: ['radial-gradient(ellipse at 50% 50%, rgba(99,102,241,0.1) 0%, transparent 70%)', 'linear-gradient(180deg, #18181b 0%, #27272a 100%)'],
      },
      {
        name: 'monochrome-red',
        colors: {
          primary: '#ef4444',
          accent: '#ef4444',
          background: '#0a0a0a',
          backgroundAlt: '#171717',
          text: '#fafafa',
          textMuted: '#737373',
          isDark: true,
        },
        fonts: { heading: 'Unbounded', body: 'Manrope', accent: 'Fira Code' },
        bg: ['radial-gradient(ellipse at 50% 0%, rgba(239,68,68,0.08) 0%, transparent 50%)', 'linear-gradient(180deg, #0a0a0a 0%, #171717 100%)'],
      },
    ];

    // Pick random theme
    const theme = themes[Math.floor(Math.random() * themes.length)];
    
    // Motion strategies
    const pageLoadStrategies: Array<'fade' | 'stagger' | 'cascade' | 'reveal' | 'slide'> = ['fade', 'stagger', 'cascade', 'reveal', 'slide'];
    const motionIntensities: Array<'subtle' | 'moderate' | 'dramatic'> = ['subtle', 'moderate', 'dramatic'];
    
    const interactions = [
      ['hover-lift', 'focus-ring'],
      ['hover-glow', 'click-bounce'],
      ['hover-lift', 'hover-glow', 'focus-ring'],
      ['hover-scale', 'click-bounce', 'focus-ring'],
    ];

    return {
      theme: theme.name,
      typography: theme.fonts,
      colorPalette: theme.colors,
      motion: {
        intensity: motionIntensities[Math.floor(Math.random() * motionIntensities.length)],
        pageLoadStrategy: pageLoadStrategies[Math.floor(Math.random() * pageLoadStrategies.length)],
        interactions: interactions[Math.floor(Math.random() * interactions.length)],
      },
      backgroundStyle: {
        type: 'gradient',
        layers: theme.bg,
      },
    };
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

    // Generate distinctive aesthetics for the fallback layout
    const aesthetics = this.generateRandomAesthetics();

    return {
      layout,
      aesthetics,
      reasoning: `Created a ${aesthetics.theme} themed layout with ${aesthetics.typography.heading} headings and ${aesthetics.typography.body} body text. The ${aesthetics.colorPalette.isDark ? 'dark' : 'light'} theme uses ${aesthetics.colorPalette.primary} as the primary color with ${aesthetics.backgroundStyle.type} background effects.`,
      responsiveNotes: 'On mobile, components stack vertically. On desktop, form is on the left with chart/stats on the right.',
    };
  }

  /**
   * Format layout proposal as user-friendly message
   */
  private formatProposalMessage(proposal: LayoutProposal, schema: Schema): string {
    const components = this.extractComponents(proposal.layout);
    const aesthetics = proposal.aesthetics;
    
    let message = `## UI Layout\n\n`;
    message += `${proposal.reasoning}\n\n`;
    
    // Add aesthetic details if present
    if (aesthetics) {
      message += `### Design Aesthetic\n\n`;
      message += `**Theme**: ${aesthetics.theme}\n`;
      message += `**Typography**: ${aesthetics.typography.heading} (headings) + ${aesthetics.typography.body} (body)\n`;
      message += `**Colors**: ${aesthetics.colorPalette.isDark ? 'Dark' : 'Light'} theme with ${aesthetics.colorPalette.primary} primary\n`;
      message += `**Animation**: ${aesthetics.motion.intensity} intensity with ${aesthetics.motion.pageLoadStrategy} page load\n\n`;
    }
    
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
    message += `- **Change aesthetic** (e.g., "make it more cyberpunk" or "use lighter colors")\n`;

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
