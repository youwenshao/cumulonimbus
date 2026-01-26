/**
 * UX Designer Agent (v3 - Journey-First)
 * 
 * Designs complete user journeys, NOT layouts for data display.
 * This agent thinks about what users DO, not what data they store.
 */

import { BaseAgent } from './base-agent';
import { generateId } from '@/lib/utils';
import type { ConversationState, AgentResponse } from '../types';
import type {
  UserJourney,
  UserFlow,
  FlowStep,
  UserAction,
  AppState,
  KeyMoment,
  NavigationSpec,
  PrimaryActionSpec,
  CelebrationSpec,
  AgentContribution,
} from '../journey-types';

// ============================================================================
// UX Designer System Prompt
// ============================================================================

const UX_DESIGNER_SYSTEM_PROMPT = `You are a UX Designer who designs USER JOURNEYS, not database interfaces.

## Your Philosophy

- Think about what users WANT TO DO, not what data to store
- Design for moments of delight, not data entry efficiency
- Every app has a PRIMARY action that should be prominent
- Secondary features should be accessible but not distracting

## What You Design

1. **User Flows**: The journeys users take through the app
   - What's the first-time experience?
   - What's the daily/frequent use pattern?
   - How do users achieve their goals?

2. **App States**: How the app looks in different situations
   - Empty state (no data yet)
   - Loading state
   - Error states
   - Success states

3. **Key Moments**: Special moments that deserve celebration
   - First completion
   - Milestones (streaks, totals)
   - Achievements

4. **Navigation**: How users move between flows
   - Primary action (the MAIN thing users do)
   - Secondary navigation (other features)

## Output Format

Return a UserJourney object:
{
  "appName": "string",
  "appPurpose": "string",
  "flows": [UserFlow],
  "states": [AppState],
  "keyMoments": [KeyMoment],
  "entryFlowId": "string",
  "navigation": NavigationSpec
}

## Examples

For a "habit tracker with GitHub heatmap":
- Primary flow: Daily check-in (one tap to mark complete)
- Primary view: The heatmap (see your progress visually)
- Key moment: Completing a streak milestone
- Navigation: Minimal - floating button for check-in, burger menu for settings

For an "expense tracker":
- Primary flow: Quick expense entry (minimal friction)
- Primary view: Visual spending breakdown (pie chart or categories)
- Key moment: Staying under budget
- Navigation: Bottom tabs for views, FAB for adding expense

## Anti-Patterns to Avoid

❌ "Form on the left, table on the right"
❌ "CRUD operations as the main UI"
❌ "Database schema determines the views"
❌ "Generic data entry interface"

✅ "What will users DO most often?"
✅ "How can we make the primary action delightful?"
✅ "What should users SEE first?"
✅ "What moments should feel special?"`;

// ============================================================================
// UX Designer Agent
// ============================================================================

export class UXDesignerV3 extends BaseAgent {
  constructor() {
    super({
      name: 'UXDesigner',
      description: 'Designs user journeys and flows, not data interfaces',
      temperature: 0.7, // Higher creativity
      maxTokens: 8192,
    });
  }

  protected buildSystemPrompt(): string {
    return UX_DESIGNER_SYSTEM_PROMPT;
  }

  /**
   * Design a user journey based on the user's request
   */
  async designJourney(
    userRequest: string,
    previousContributions?: AgentContribution[]
  ): Promise<{
    content: string;
    structuredOutput: UserJourney;
  }> {
    this.log('Designing user journey', { request: userRequest.substring(0, 100) });

    const prompt = this.buildDesignPrompt(userRequest, previousContributions);
    
    try {
      const response = await this.callLLMJSON<{
        appName: string;
        appPurpose: string;
        flows: Array<{
          name: string;
          description: string;
          isPrimary: boolean;
          steps: Array<{
            name: string;
            description: string;
            view: string;
            actions: Array<{
              name: string;
              type: string;
              effect: string;
            }>;
          }>;
        }>;
        states: Array<{
          name: string;
          description: string;
          view: string;
          conditions: string[];
        }>;
        keyMoments: Array<{
          name: string;
          description: string;
          trigger: string;
          celebrationType: string;
        }>;
        navigation: {
          type: string;
          primaryAction?: {
            label: string;
            icon: string;
            position: string;
          };
          items: Array<{
            label: string;
            icon: string;
            targetFlow: string;
          }>;
        };
      }>(
        [
          { role: 'system', content: UX_DESIGNER_SYSTEM_PROMPT },
          { role: 'user', content: prompt },
        ],
        '{"appName": "...", "flows": [...], ...}'
      );

      // Convert LLM response to typed UserJourney
      const journey = this.convertToUserJourney(response, userRequest);
      
      // Generate natural language description
      const content = this.describeJourney(journey);

      return { content, structuredOutput: journey };
    } catch (error) {
      this.log('Journey design failed, generating fallback', { error });
      const fallbackJourney = this.generateFallbackJourney(userRequest);
      return {
        content: this.describeJourney(fallbackJourney),
        structuredOutput: fallbackJourney,
      };
    }
  }

  /**
   * Build the design prompt
   */
  private buildDesignPrompt(
    userRequest: string,
    previousContributions?: AgentContribution[]
  ): string {
    let prompt = `Design the user journey for this app:

"${userRequest}"

Think about:
1. What will users DO most often with this app?
2. What should they SEE immediately when they open it?
3. What moments should feel special/memorable?
4. How should navigation work?

Output a complete UserJourney JSON.`;

    if (previousContributions?.length) {
      prompt += `\n\nPrevious discussion:\n${previousContributions.map(c => 
        `${c.agentType}: ${c.content.substring(0, 200)}...`
      ).join('\n\n')}`;
    }

    return prompt;
  }

  /**
   * Convert LLM response to typed UserJourney
   */
  private convertToUserJourney(response: any, userRequest: string): UserJourney {
    const flows: UserFlow[] = (response.flows || []).map((f: any) => ({
      id: generateId(),
      name: f.name,
      description: f.description,
      isPrimary: f.isPrimary || false,
      steps: (f.steps || []).map((s: any) => ({
        id: generateId(),
        name: s.name,
        description: s.description,
        view: s.view,
        possibleActions: (s.actions || []).map((a: any) => ({
          id: generateId(),
          name: a.name,
          type: a.type as UserAction['type'] || 'tap',
          description: a.description || a.effect,
          effect: a.effect,
        })),
        transitions: [],
      })),
      entryPoints: ['app-open'],
      exitPoints: [],
    }));

    const states: AppState[] = (response.states || []).map((s: any) => ({
      name: s.name,
      description: s.description,
      view: s.view,
      conditions: s.conditions || [],
    }));

    const keyMoments: KeyMoment[] = (response.keyMoments || []).map((m: any) => ({
      id: generateId(),
      name: m.name,
      description: m.description,
      trigger: m.trigger,
      celebration: m.celebrationType ? {
        type: this.mapCelebrationType(m.celebrationType),
        intensity: 'moderate' as const,
        duration: 2000,
      } : undefined,
    }));

    const navigation: NavigationSpec = {
      type: this.mapNavigationType(response.navigation?.type),
      items: (response.navigation?.items || []).map((i: any) => ({
        id: generateId(),
        label: i.label,
        icon: i.icon,
        targetFlowId: flows.find(f => f.name === i.targetFlow)?.id || flows[0]?.id || '',
      })),
      primaryAction: response.navigation?.primaryAction ? {
        type: 'fab' as const,
        position: this.mapPosition(response.navigation.primaryAction.position),
        label: response.navigation.primaryAction.label,
        icon: response.navigation.primaryAction.icon,
        action: {
          id: generateId(),
          name: response.navigation.primaryAction.label,
          type: 'tap' as const,
          description: 'Primary action',
          effect: 'Open primary action',
        },
      } : undefined,
    };

    const primaryFlow = flows.find(f => f.isPrimary) || flows[0];

    return {
      id: generateId(),
      appName: response.appName || 'App',
      appPurpose: response.appPurpose || userRequest,
      flows,
      states,
      keyMoments,
      entryFlowId: primaryFlow?.id || '',
      navigation,
    };
  }

  /**
   * Map celebration type string to typed enum
   */
  private mapCelebrationType(type: string): CelebrationSpec['type'] {
    const mapping: Record<string, CelebrationSpec['type']> = {
      confetti: 'confetti',
      fireworks: 'fireworks',
      particles: 'particles',
      glow: 'glow',
      shake: 'shake',
    };
    return mapping[type?.toLowerCase()] || 'confetti';
  }

  /**
   * Map navigation type string to typed enum
   */
  private mapNavigationType(type: string): NavigationSpec['type'] {
    const mapping: Record<string, NavigationSpec['type']> = {
      'bottom-tabs': 'bottom-tabs',
      sidebar: 'sidebar',
      hamburger: 'hamburger',
      floating: 'floating',
      minimal: 'minimal',
      none: 'none',
    };
    return mapping[type?.toLowerCase()] || 'minimal';
  }

  /**
   * Map position string to typed enum
   */
  private mapPosition(position: string): PrimaryActionSpec['position'] {
    const mapping: Record<string, PrimaryActionSpec['position']> = {
      'bottom-right': 'bottom-right',
      'bottom-center': 'bottom-center',
      'top-right': 'top-right',
      center: 'center',
    };
    return mapping[position?.toLowerCase()] || 'bottom-right';
  }

  /**
   * Generate natural language description of the journey
   */
  private describeJourney(journey: UserJourney): string {
    const primaryFlow = journey.flows.find(f => f.isPrimary) || journey.flows[0];
    
    let description = `I propose the following user journey for "${journey.appName}":\n\n`;
    
    description += `**App Purpose**: ${journey.appPurpose}\n\n`;
    
    description += `**Primary Flow** (${primaryFlow?.name || 'Main'}):\n`;
    if (primaryFlow) {
      for (const step of primaryFlow.steps) {
        description += `- ${step.name}: ${step.description}\n`;
      }
    }
    description += '\n';

    if (journey.flows.length > 1) {
      description += `**Other Flows**:\n`;
      for (const flow of journey.flows.filter(f => !f.isPrimary)) {
        description += `- ${flow.name}: ${flow.description}\n`;
      }
      description += '\n';
    }

    if (journey.keyMoments.length > 0) {
      description += `**Key Moments**:\n`;
      for (const moment of journey.keyMoments) {
        description += `- ${moment.name}: ${moment.description} (celebrated with ${moment.celebration?.type || 'animation'})\n`;
      }
      description += '\n';
    }

    description += `**Navigation**: ${journey.navigation.type}`;
    if (journey.navigation.primaryAction) {
      description += ` with "${journey.navigation.primaryAction.label}" as the primary action`;
    }
    description += '\n';

    return description;
  }

  /**
   * Generate fallback journey when LLM fails
   */
  private generateFallbackJourney(userRequest: string): UserJourney {
    const appName = userRequest.split(' ').slice(0, 3).join(' ');
    
    return {
      id: generateId(),
      appName,
      appPurpose: userRequest,
      flows: [{
        id: generateId(),
        name: 'Main Flow',
        description: 'The primary way users interact with the app',
        isPrimary: true,
        steps: [{
          id: generateId(),
          name: 'Primary View',
          description: 'The main view of the app',
          view: 'main',
          possibleActions: [{
            id: generateId(),
            name: 'Primary Action',
            type: 'tap',
            description: 'The main action users take',
            effect: 'Perform primary action',
          }],
          transitions: [],
        }],
        entryPoints: ['app-open'],
        exitPoints: [],
      }],
      states: [
        { name: 'empty', description: 'No data', view: 'empty-state', conditions: ['data.length === 0'] },
        { name: 'loaded', description: 'Data loaded', view: 'main', conditions: ['data.length > 0'] },
      ],
      keyMoments: [{
        id: generateId(),
        name: 'First Success',
        description: 'User completes their first action',
        trigger: 'first-action-complete',
        celebration: { type: 'confetti', intensity: 'moderate', duration: 2000 },
      }],
      entryFlowId: '',
      navigation: {
        type: 'minimal',
        items: [],
        primaryAction: {
          type: 'fab',
          position: 'bottom-right',
          label: 'Add',
          icon: 'plus',
          action: {
            id: generateId(),
            name: 'Add',
            type: 'tap',
            description: 'Add new item',
            effect: 'Open add form',
          },
        },
      },
    };
  }

  /**
   * Respond to another agent's contribution
   */
  async respondTo(
    contribution: AgentContribution,
    session: { userRequest: string; contributions: AgentContribution[] }
  ): Promise<{
    content: string;
    structuredOutput?: Partial<UserJourney>;
  }> {
    const prompt = `Another agent (${contribution.agentType}) said:

"${contribution.content}"

As the UX Designer, respond with:
1. Does this align with the user journey?
2. Any concerns about the user experience?
3. Suggestions for improvement?
4. Any updates to the journey based on this?`;

    const response = await this.callLLMJSON<{
      agrees: boolean;
      concerns: string[];
      suggestions: string[];
      journeyUpdates?: Partial<UserJourney>;
    }>(
      [
        { role: 'system', content: UX_DESIGNER_SYSTEM_PROMPT },
        { role: 'user', content: prompt },
      ],
      '{"agrees": true/false, "concerns": [...], ...}'
    );

    let content = '';
    if (response.agrees) {
      content = `I agree with the ${contribution.agentType}'s approach. `;
    } else {
      content = `I have some concerns about the ${contribution.agentType}'s proposal. `;
    }

    if (response.concerns?.length) {
      content += `\n\nConcerns:\n${response.concerns.map(c => `- ${c}`).join('\n')}`;
    }

    if (response.suggestions?.length) {
      content += `\n\nSuggestions:\n${response.suggestions.map(s => `- ${s}`).join('\n')}`;
    }

    return {
      content,
      structuredOutput: response.journeyUpdates,
    };
  }

  /**
   * Process method for AgentResponse interface
   */
  async process(
    message: string,
    state: ConversationState
  ): Promise<AgentResponse> {
    const result = await this.designJourney(message);
    
    return {
      success: true,
      message: result.content,
      data: result.structuredOutput,
      requiresUserInput: false,
    };
  }
}

// Export singleton instance
export const uxDesignerV3 = new UXDesignerV3();
