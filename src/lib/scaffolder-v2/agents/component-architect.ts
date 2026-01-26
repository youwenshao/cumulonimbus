/**
 * Component Architect Agent
 * 
 * Designs CUSTOM components for each specific app.
 * NO predefined component types - each app gets unique components
 * designed for its specific needs.
 */

import { BaseAgent } from './base-agent';
import { generateId } from '@/lib/utils';
import type { ConversationState, AgentResponse } from '../types';
import type {
  ComponentSystem,
  ComponentDesign,
  ComponentInteraction,
  ComponentVisualSpec,
  ComponentDataNeed,
  PropSpec,
  StateNeed,
  ComponentRelationship,
  DesignTokens,
  AgentContribution,
  UserJourney,
  InteractionSpec,
} from '../journey-types';

// ============================================================================
// Component Architect System Prompt
// ============================================================================

const COMPONENT_ARCHITECT_SYSTEM_PROMPT = `You are a Component Architect who designs CUSTOM components for each app.

## Your Philosophy

- NO predefined component types (form, table, etc.)
- Each app gets UNIQUE components designed for its specific needs
- Components are designed around USER ACTIONS, not data structure
- Every component should feel purposeful and crafted

## What You Design

For each component:
1. **Purpose**: What does this component DO?
2. **Interactions**: How do users interact with it?
3. **Visual Spec**: How should it look?
4. **Data Needs**: What data does it need?
5. **State**: What internal state does it manage?
6. **Libraries**: What libraries help implement it?

## Component Naming

Name components by their PURPOSE, not their type:
- ✅ "ContributionGrid" (for a habit tracker)
- ✅ "DailyCheckInFAB" (floating action button for check-in)
- ✅ "StreakCounter" (animated streak display)
- ❌ "HabitForm" (too generic)
- ❌ "DataTable" (database thinking)

## Example Component Designs

**ContributionGrid** (for habit tracker):
- Purpose: Display 52 weeks of completions as a heatmap
- Interactions: Hover shows tooltip, click opens day detail
- Visual: 10px cells, color intensity by count
- Data: Array of {date, count}
- Libraries: date-fns, framer-motion

**DailyCheckInFAB**:
- Purpose: One-tap completion of today's habit
- Interactions: Tap triggers completion + celebration
- Visual: Floating bottom-right, pulse animation
- State: isCompleted (persisted daily)
- Libraries: framer-motion, canvas-confetti

**SpendingBreakdown** (for expense tracker):
- Purpose: Visual pie chart of spending categories
- Interactions: Tap segment to drill down
- Visual: Animated pie chart with labels
- Data: Array of {category, amount}
- Libraries: recharts, framer-motion

## Output Format

Return a ComponentSystem object:
{
  "components": [ComponentDesign],
  "designTokens": DesignTokens,
  "relationships": [ComponentRelationship]
}

## Libraries to Consider

- **framer-motion**: Animation
- **recharts**: Charts
- **date-fns**: Date manipulation
- **react-spring**: Physics animations
- **canvas-confetti**: Celebrations
- **@dnd-kit**: Drag and drop
- **lucide-react**: Icons`;

// ============================================================================
// Component Architect Agent
// ============================================================================

export class ComponentArchitect extends BaseAgent {
  constructor() {
    super({
      name: 'ComponentArchitect',
      description: 'Designs custom components for each specific app',
      temperature: 0.7,
      maxTokens: 8192,
    });
  }

  protected buildSystemPrompt(): string {
    return COMPONENT_ARCHITECT_SYSTEM_PROMPT;
  }

  /**
   * Design components based on journey and interactions
   */
  async designComponents(
    userRequest: string,
    journey?: UserJourney,
    interactions?: InteractionSpec,
    previousContributions?: AgentContribution[]
  ): Promise<{
    content: string;
    structuredOutput: ComponentSystem;
  }> {
    this.log('Designing components', {
      hasJourney: !!journey,
      hasInteractions: !!interactions,
    });

    const prompt = this.buildDesignPrompt(userRequest, journey, interactions, previousContributions);
    
    try {
      const response = await this.callLLMJSON<{
        components: Array<{
          name: string;
          purpose: string;
          description: string;
          interactions: Array<{
            trigger: string;
            effect: string;
            animation?: string;
          }>;
          visual: {
            width: string;
            height: string;
            style: string;
            colors: {
              background: string;
              foreground: string;
              accent?: string;
            };
          };
          dataNeeds: Array<{
            name: string;
            type: string;
            description: string;
            source: string;
          }>;
          props: Array<{
            name: string;
            type: string;
            required: boolean;
            description: string;
          }>;
          state: Array<{
            name: string;
            type: string;
            initial: unknown;
            description: string;
            persistence: string;
          }>;
          suggestedLibraries: string[];
          isPrimary: boolean;
          layoutRole: string;
        }>;
        designTokens: {
          colors: Record<string, string>;
          fonts: Record<string, string>;
          spacing: Record<string, string>;
          radii: Record<string, string>;
          shadows: Record<string, string>;
          transitions: Record<string, string>;
        };
        relationships: Array<{
          parent: string;
          child: string;
          type: string;
          description: string;
        }>;
      }>(
        [
          { role: 'system', content: COMPONENT_ARCHITECT_SYSTEM_PROMPT },
          { role: 'user', content: prompt },
        ],
        '{"components": [...], "designTokens": {...}, ...}'
      );

      const system = this.convertToComponentSystem(response);
      const content = this.describeComponents(system);

      return { content, structuredOutput: system };
    } catch (error) {
      this.log('Component design failed, generating fallback', { error });
      const fallbackSystem = this.generateFallbackSystem(journey);
      return {
        content: this.describeComponents(fallbackSystem),
        structuredOutput: fallbackSystem,
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
    previousContributions?: AgentContribution[]
  ): string {
    let prompt = `Design CUSTOM components for this app:

"${userRequest}"
`;

    if (journey) {
      prompt += `\n**User Journey**:
- App: ${journey.appName}
- Purpose: ${journey.appPurpose}
- Primary flow: ${journey.flows.find(f => f.isPrimary)?.name}
- Navigation: ${journey.navigation.type}
`;

      if (journey.navigation.primaryAction) {
        prompt += `- Primary action: ${journey.navigation.primaryAction.label}
`;
      }

      if (journey.keyMoments.length > 0) {
        prompt += `- Key moments: ${journey.keyMoments.map(m => m.name).join(', ')}
`;
      }
    }

    if (interactions) {
      prompt += `\n**Interaction Design**:
- Gestures: ${interactions.gestures.map(g => g.name).join(', ')}
- Animations: ${interactions.animations.map(a => a.name).join(', ')}
- Micro-interactions: ${interactions.microInteractions.map(m => m.name).join(', ')}
`;
    }

    if (previousContributions?.length) {
      prompt += `\n**Previous Discussion**:\n`;
      for (const c of previousContributions) {
        prompt += `${c.agentType}: ${c.content.substring(0, 300)}...\n\n`;
      }
    }

    prompt += `
Design CUSTOM components (not generic types) that:
1. Serve the specific needs of this app
2. Handle the interactions specified
3. Create a cohesive visual system
4. Are named by their PURPOSE

Output a complete ComponentSystem JSON.`;

    return prompt;
  }

  /**
   * Convert LLM response to typed ComponentSystem
   */
  private convertToComponentSystem(response: any): ComponentSystem {
    const components: ComponentDesign[] = (response.components || []).map((c: any) => ({
      id: generateId(),
      name: c.name,
      purpose: c.purpose,
      description: c.description,
      interactions: (c.interactions || []).map((i: any) => ({
        id: generateId(),
        trigger: i.trigger,
        effect: i.effect,
        animation: i.animation,
      })),
      visual: {
        sizing: {
          width: c.visual?.width || 'auto',
          height: c.visual?.height || 'auto',
        },
        spacing: {
          padding: '1rem',
          margin: '0',
        },
        style: c.visual?.style || 'Modern, clean design',
        colors: {
          background: c.visual?.colors?.background || 'var(--color-bg-elevated)',
          foreground: c.visual?.colors?.foreground || 'var(--color-text)',
          accent: c.visual?.colors?.accent,
        },
      },
      dataNeeds: (c.dataNeeds || []).map((d: any) => ({
        name: d.name,
        type: d.type,
        description: d.description,
        source: d.source as ComponentDataNeed['source'] || 'prop',
      })),
      propsSpec: (c.props || []).map((p: any) => ({
        name: p.name,
        type: p.type,
        required: p.required,
        description: p.description,
      })),
      stateNeeds: (c.state || []).map((s: any) => ({
        name: s.name,
        type: s.type,
        initial: s.initial,
        description: s.description,
        persistence: s.persistence as StateNeed['persistence'] || 'none',
      })),
      suggestedLibraries: c.suggestedLibraries || [],
      isPrimary: c.isPrimary || false,
      layoutRole: c.layoutRole as ComponentDesign['layoutRole'] || 'supporting',
    }));

    const designTokens: DesignTokens = {
      colors: response.designTokens?.colors || {
        primary: '#3b82f6',
        accent: '#10b981',
        background: '#0a0a0a',
        backgroundElevated: '#1a1a2e',
        text: '#ffffff',
        textMuted: '#a0a0b0',
      },
      fonts: response.designTokens?.fonts || {
        heading: 'Outfit, system-ui, sans-serif',
        body: 'DM Sans, system-ui, sans-serif',
        mono: 'JetBrains Mono, monospace',
      },
      spacing: response.designTokens?.spacing || {
        xs: '0.25rem',
        sm: '0.5rem',
        md: '1rem',
        lg: '1.5rem',
        xl: '2rem',
      },
      radii: response.designTokens?.radii || {
        sm: '0.25rem',
        md: '0.5rem',
        lg: '1rem',
        full: '9999px',
      },
      shadows: response.designTokens?.shadows || {
        sm: '0 1px 2px rgba(0, 0, 0, 0.3)',
        md: '0 4px 6px rgba(0, 0, 0, 0.3)',
        lg: '0 10px 15px rgba(0, 0, 0, 0.3)',
      },
      transitions: response.designTokens?.transitions || {
        fast: '0.15s ease',
        normal: '0.3s ease',
        slow: '0.5s ease',
      },
    };

    const relationships: ComponentRelationship[] = (response.relationships || []).map((r: any) => ({
      parentId: components.find(c => c.name === r.parent)?.id || r.parent,
      childId: components.find(c => c.name === r.child)?.id || r.child,
      type: r.type as ComponentRelationship['type'] || 'contains',
      description: r.description,
    }));

    return {
      id: generateId(),
      components,
      designTokens,
      relationships,
    };
  }

  /**
   * Generate natural language description
   */
  private describeComponents(system: ComponentSystem): string {
    let description = 'I\'ve designed the following custom components:\n\n';

    for (const c of system.components) {
      description += `**${c.name}**${c.isPrimary ? ' (PRIMARY)' : ''}\n`;
      description += `- Purpose: ${c.purpose}\n`;
      description += `- Layout: ${c.layoutRole}\n`;
      
      if (c.interactions.length > 0) {
        description += `- Interactions:\n`;
        for (const i of c.interactions) {
          description += `  - ${i.trigger} → ${i.effect}`;
          if (i.animation) description += ` (${i.animation})`;
          description += '\n';
        }
      }
      
      if (c.suggestedLibraries.length > 0) {
        description += `- Libraries: ${c.suggestedLibraries.join(', ')}\n`;
      }
      
      description += '\n';
    }

    description += '**Design Tokens**:\n';
    description += `- Colors: ${Object.keys(system.designTokens.colors).join(', ')}\n`;
    description += `- Fonts: ${Object.values(system.designTokens.fonts).join(', ')}\n`;

    if (system.relationships.length > 0) {
      description += '\n**Component Relationships**:\n';
      for (const r of system.relationships) {
        description += `- ${r.parentId} ${r.type} ${r.childId}\n`;
      }
    }

    return description;
  }

  /**
   * Generate fallback component system
   */
  private generateFallbackSystem(journey?: UserJourney): ComponentSystem {
    const appName = journey?.appName || 'App';
    
    const components: ComponentDesign[] = [
      {
        id: generateId(),
        name: `${appName}MainView`,
        purpose: 'The primary view of the application',
        description: 'Main container that displays the core content',
        interactions: [
          {
            id: generateId(),
            trigger: 'mount',
            effect: 'Fade in content with stagger',
            animation: 'stagger-fade-in',
          },
        ],
        visual: {
          sizing: { width: '100%', height: '100%' },
          spacing: { padding: '1.5rem', margin: '0' },
          style: 'Clean, modern layout with subtle depth',
          colors: {
            background: 'var(--color-bg-base)',
            foreground: 'var(--color-text)',
          },
        },
        dataNeeds: [
          {
            name: 'data',
            type: 'array',
            description: 'The main data to display',
            source: 'hook',
          },
        ],
        propsSpec: [],
        stateNeeds: [
          {
            name: 'isLoading',
            type: 'boolean',
            initial: true,
            description: 'Loading state',
            persistence: 'none',
          },
        ],
        suggestedLibraries: ['framer-motion'],
        isPrimary: true,
        layoutRole: 'hero',
      },
      {
        id: generateId(),
        name: `${appName}ActionButton`,
        purpose: 'Primary action floating button',
        description: 'Floating action button for the main user action',
        interactions: [
          {
            id: generateId(),
            trigger: 'tap',
            effect: 'Execute primary action',
            animation: 'bounce-scale',
          },
          {
            id: generateId(),
            trigger: 'hover',
            effect: 'Show tooltip',
            animation: 'scale(1.05)',
          },
        ],
        visual: {
          sizing: { width: '56px', height: '56px' },
          spacing: { padding: '0', margin: '0' },
          style: 'Rounded, elevated button with shadow',
          colors: {
            background: 'var(--color-primary)',
            foreground: 'var(--color-text)',
          },
        },
        dataNeeds: [],
        propsSpec: [
          {
            name: 'onClick',
            type: '() => void',
            required: true,
            description: 'Click handler',
          },
          {
            name: 'icon',
            type: 'string',
            required: false,
            description: 'Icon to display',
          },
        ],
        stateNeeds: [],
        suggestedLibraries: ['framer-motion', 'lucide-react'],
        isPrimary: false,
        layoutRole: 'floating',
      },
    ];

    return {
      id: generateId(),
      components,
      designTokens: {
        colors: {
          primary: '#3b82f6',
          accent: '#10b981',
          background: '#0a0a0a',
          backgroundElevated: '#1a1a2e',
          text: '#ffffff',
          textMuted: '#a0a0b0',
        },
        fonts: {
          heading: 'Outfit, system-ui, sans-serif',
          body: 'DM Sans, system-ui, sans-serif',
          mono: 'JetBrains Mono, monospace',
        },
        spacing: {
          xs: '0.25rem',
          sm: '0.5rem',
          md: '1rem',
          lg: '1.5rem',
          xl: '2rem',
        },
        radii: {
          sm: '0.25rem',
          md: '0.5rem',
          lg: '1rem',
          full: '9999px',
        },
        shadows: {
          sm: '0 1px 2px rgba(0, 0, 0, 0.3)',
          md: '0 4px 6px rgba(0, 0, 0, 0.3)',
          lg: '0 10px 15px rgba(0, 0, 0, 0.3)',
        },
        transitions: {
          fast: '0.15s ease',
          normal: '0.3s ease',
          slow: '0.5s ease',
        },
      },
      relationships: [],
    };
  }

  /**
   * Respond to another agent's contribution
   */
  async respondTo(
    contribution: AgentContribution,
    context: { userRequest: string; journey?: UserJourney; interactions?: InteractionSpec }
  ): Promise<{
    content: string;
    structuredOutput?: Partial<ComponentSystem>;
  }> {
    const prompt = `The ${contribution.agentType} proposed:

"${contribution.content}"

As the Component Architect, consider:
1. What components does this require?
2. How do components relate to each other?
3. What libraries would help?
4. Any concerns about the component architecture?`;

    const response = await this.callLLMJSON<{
      additionalComponents: Array<{
        name: string;
        purpose: string;
        suggestedLibraries: string[];
      }>;
      componentUpdates: Array<{
        name: string;
        updates: string;
      }>;
      concerns: string[];
      suggestions: string[];
    }>(
      [
        { role: 'system', content: COMPONENT_ARCHITECT_SYSTEM_PROMPT },
        { role: 'user', content: prompt },
      ],
      '{"additionalComponents": [...], ...}'
    );

    let content = 'Based on this proposal:\n\n';

    if (response.additionalComponents?.length) {
      content += '**Components Needed**:\n';
      for (const c of response.additionalComponents) {
        content += `- ${c.name}: ${c.purpose}\n`;
        if (c.suggestedLibraries?.length) {
          content += `  └ Libraries: ${c.suggestedLibraries.join(', ')}\n`;
        }
      }
      content += '\n';
    }

    if (response.componentUpdates?.length) {
      content += '**Component Updates**:\n';
      for (const u of response.componentUpdates) {
        content += `- ${u.name}: ${u.updates}\n`;
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
    const result = await this.designComponents(message);
    
    return {
      success: true,
      message: result.content,
      data: result.structuredOutput,
      requiresUserInput: false,
    };
  }
}

// Export singleton instance
export const componentArchitect = new ComponentArchitect();
