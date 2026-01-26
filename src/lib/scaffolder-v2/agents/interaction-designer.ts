/**
 * Interaction Designer Agent
 * 
 * Designs gestures, animations, micro-interactions, and page transitions.
 * Makes apps feel polished and delightful through motion and feedback.
 */

import { BaseAgent } from './base-agent';
import { generateId } from '@/lib/utils';
import type { ConversationState, AgentResponse } from '../types';
import type {
  InteractionSpec,
  GestureSpec,
  AnimationSpec,
  MicroInteraction,
  PageTransitionSpec,
  LoadingStateSpec,
  TransitionAnimation,
  StaggerSpec,
  AgentContribution,
  UserJourney,
} from '../journey-types';

// ============================================================================
// Interaction Designer System Prompt
// ============================================================================

const INTERACTION_DESIGNER_SYSTEM_PROMPT = `You are an Interaction Designer who makes apps feel ALIVE through motion and feedback.

## Your Philosophy

- Motion should have PURPOSE, not just decoration
- Every action deserves FEEDBACK
- Animations should be SMOOTH (60fps)
- Transitions should feel NATURAL

## What You Design

1. **Gestures**: Physical interactions users make
   - Tap, long-press, double-tap
   - Swipe left/right/up/down
   - Drag and drop
   - Pinch and zoom

2. **Animations**: How elements move
   - Entry animations (elements appearing)
   - Exit animations (elements leaving)
   - State change animations (transformations)
   - Scroll-linked animations

3. **Micro-Interactions**: Small feedback moments
   - Button press feedback
   - Toggle animations
   - Loading indicators
   - Success/error states

4. **Page Transitions**: How views connect
   - Slide transitions
   - Fade transitions
   - Shared element transitions (morphing)

## Animation Principles

- **Anticipation**: Small wind-up before main action
- **Follow-through**: Motion continues slightly past end
- **Easing**: Use ease-out for entries, ease-in for exits
- **Stagger**: Children animate with slight delays
- **Duration**: 200-400ms for most animations

## Common Patterns

**Floating Action Button (FAB)**:
- On press: Scale down to 0.95
- On release: Bounce back with overshoot
- Ripple effect from touch point

**List Items**:
- Entry: Fade in + slide up with stagger
- On tap: Subtle scale feedback
- On swipe: Reveal action buttons

**Modals**:
- Entry: Fade background + scale up content
- Exit: Scale down + fade out
- Spring physics for natural feel

**Success Celebration**:
- Confetti particles
- Scale bounce
- Glow effect
- Optional haptic feedback

## Output Format

Return an InteractionSpec object:
{
  "gestures": [GestureSpec],
  "animations": [AnimationSpec],
  "microInteractions": [MicroInteraction],
  "pageTransitions": [PageTransitionSpec],
  "loadingStates": [LoadingStateSpec]
}

## Libraries to Consider

- **framer-motion**: Declarative animations for React
- **react-spring**: Physics-based animations
- **@dnd-kit**: Drag and drop
- **canvas-confetti**: Celebration effects
- **lottie-react**: Complex animations`;

// ============================================================================
// Interaction Designer Agent
// ============================================================================

export class InteractionDesigner extends BaseAgent {
  constructor() {
    super({
      name: 'InteractionDesigner',
      description: 'Designs gestures, animations, and micro-interactions',
      temperature: 0.6,
      maxTokens: 8192,
    });
  }

  protected buildSystemPrompt(): string {
    return INTERACTION_DESIGNER_SYSTEM_PROMPT;
  }

  /**
   * Design interactions based on the UX journey
   */
  async designInteractions(
    userRequest: string,
    journey?: UserJourney,
    previousContributions?: AgentContribution[]
  ): Promise<{
    content: string;
    structuredOutput: InteractionSpec;
  }> {
    this.log('Designing interactions', { 
      hasJourney: !!journey,
      previousContributions: previousContributions?.length || 0,
    });

    const prompt = this.buildDesignPrompt(userRequest, journey, previousContributions);
    
    try {
      const response = await this.callLLMJSON<{
        gestures: Array<{
          name: string;
          type: string;
          direction?: string;
          target: string;
          effect: string;
          feedbackDuring?: string;
          feedbackAfter?: string;
        }>;
        animations: Array<{
          name: string;
          trigger: string;
          target: string;
          keyframes: Array<{ offset: number; properties: Record<string, string | number> }>;
          duration: number;
          easing: string;
          delay?: number;
          stagger?: { delay: number; direction: string };
        }>;
        microInteractions: Array<{
          name: string;
          trigger: string;
          animation: string;
          sound?: string;
          haptic?: string;
        }>;
        pageTransitions: Array<{
          from: string;
          to: string;
          animationType: string;
          direction?: string;
          duration: number;
        }>;
        loadingStates: Array<{
          context: string;
          type: string;
        }>;
      }>(
        [
          { role: 'system', content: INTERACTION_DESIGNER_SYSTEM_PROMPT },
          { role: 'user', content: prompt },
        ],
        '{"gestures": [...], "animations": [...], ...}'
      );

      const spec = this.convertToInteractionSpec(response);
      const content = this.describeInteractions(spec);

      return { content, structuredOutput: spec };
    } catch (error) {
      this.log('Interaction design failed, generating fallback', { error });
      const fallbackSpec = this.generateFallbackSpec(journey);
      return {
        content: this.describeInteractions(fallbackSpec),
        structuredOutput: fallbackSpec,
      };
    }
  }

  /**
   * Build the design prompt
   */
  private buildDesignPrompt(
    userRequest: string,
    journey?: UserJourney,
    previousContributions?: AgentContribution[]
  ): string {
    let prompt = `Design the interaction layer for this app:

"${userRequest}"
`;

    if (journey) {
      prompt += `\n**User Journey Context**:
- App: ${journey.appName}
- Primary flow: ${journey.flows.find(f => f.isPrimary)?.name || 'Main'}
- Key moments: ${journey.keyMoments.map(m => m.name).join(', ') || 'None defined'}
- Navigation: ${journey.navigation.type}
`;

      if (journey.navigation.primaryAction) {
        prompt += `- Primary action: ${journey.navigation.primaryAction.label}
`;
      }
    }

    if (previousContributions?.length) {
      const uxContribution = previousContributions.find(c => c.agentType === 'ux-designer');
      if (uxContribution) {
        prompt += `\n**UX Designer's Journey**:
${uxContribution.content.substring(0, 500)}...
`;
      }
    }

    prompt += `
Design:
1. Gestures users will use
2. Entry/exit animations for elements
3. Micro-interactions for feedback
4. Page transitions
5. Loading states

Make it feel polished and delightful!`;

    return prompt;
  }

  /**
   * Convert LLM response to typed InteractionSpec
   */
  private convertToInteractionSpec(response: any): InteractionSpec {
    const gestures: GestureSpec[] = (response.gestures || []).map((g: any) => ({
      id: generateId(),
      name: g.name,
      type: g.type as GestureSpec['type'] || 'tap',
      direction: g.direction as GestureSpec['direction'],
      target: g.target,
      effect: g.effect,
      feedbackDuring: g.feedbackDuring,
      feedbackAfter: g.feedbackAfter,
    }));

    const animations: AnimationSpec[] = (response.animations || []).map((a: any) => ({
      id: generateId(),
      name: a.name,
      trigger: a.trigger as AnimationSpec['trigger'] || 'mount',
      target: a.target,
      keyframes: a.keyframes || [
        { offset: 0, properties: { opacity: 0, transform: 'translateY(20px)' } },
        { offset: 1, properties: { opacity: 1, transform: 'translateY(0)' } },
      ],
      duration: a.duration || 300,
      easing: a.easing || 'ease-out',
      delay: a.delay,
      stagger: a.stagger ? {
        delay: a.stagger.delay || 50,
        direction: a.stagger.direction as StaggerSpec['direction'] || 'forward',
      } : undefined,
    }));

    const microInteractions: MicroInteraction[] = (response.microInteractions || []).map((m: any) => ({
      id: generateId(),
      name: m.name,
      trigger: m.trigger,
      animation: m.animation,
      sound: m.sound,
      haptic: m.haptic,
    }));

    const pageTransitions: PageTransitionSpec[] = (response.pageTransitions || []).map((t: any) => ({
      id: generateId(),
      from: t.from,
      to: t.to,
      animation: {
        type: t.animationType as TransitionAnimation['type'] || 'fade',
        direction: t.direction as TransitionAnimation['direction'],
        duration: t.duration || 300,
        easing: 'ease-in-out',
      },
    }));

    const loadingStates: LoadingStateSpec[] = (response.loadingStates || []).map((l: any) => ({
      id: generateId(),
      context: l.context,
      type: l.type as LoadingStateSpec['type'] || 'skeleton',
    }));

    return {
      id: generateId(),
      gestures,
      animations,
      microInteractions,
      pageTransitions,
      loadingStates,
    };
  }

  /**
   * Generate natural language description
   */
  private describeInteractions(spec: InteractionSpec): string {
    let description = 'I\'ve designed the following interaction layer:\n\n';

    if (spec.gestures.length > 0) {
      description += '**Gestures**:\n';
      for (const g of spec.gestures) {
        description += `- ${g.name}: ${g.type}${g.direction ? ` ${g.direction}` : ''} on ${g.target} → ${g.effect}\n`;
      }
      description += '\n';
    }

    if (spec.animations.length > 0) {
      description += '**Animations**:\n';
      for (const a of spec.animations) {
        description += `- ${a.name}: ${a.trigger} on ${a.target} (${a.duration}ms, ${a.easing})\n`;
        if (a.stagger) {
          description += `  └ Stagger: ${a.stagger.delay}ms ${a.stagger.direction}\n`;
        }
      }
      description += '\n';
    }

    if (spec.microInteractions.length > 0) {
      description += '**Micro-Interactions**:\n';
      for (const m of spec.microInteractions) {
        description += `- ${m.name}: ${m.trigger} → ${m.animation}`;
        if (m.haptic) description += ` + ${m.haptic} haptic`;
        description += '\n';
      }
      description += '\n';
    }

    if (spec.pageTransitions.length > 0) {
      description += '**Page Transitions**:\n';
      for (const t of spec.pageTransitions) {
        description += `- ${t.from} → ${t.to}: ${t.animation.type}`;
        if (t.animation.direction) description += ` ${t.animation.direction}`;
        description += ` (${t.animation.duration}ms)\n`;
      }
      description += '\n';
    }

    if (spec.loadingStates.length > 0) {
      description += '**Loading States**:\n';
      for (const l of spec.loadingStates) {
        description += `- ${l.context}: ${l.type}\n`;
      }
    }

    return description;
  }

  /**
   * Generate fallback interaction spec
   */
  private generateFallbackSpec(journey?: UserJourney): InteractionSpec {
    return {
      id: generateId(),
      gestures: [
        {
          id: generateId(),
          name: 'Primary tap',
          type: 'tap',
          target: 'primary-action-button',
          effect: 'Execute primary action',
          feedbackDuring: 'scale(0.95)',
          feedbackAfter: 'ripple effect',
        },
      ],
      animations: [
        {
          id: generateId(),
          name: 'Content entry',
          trigger: 'mount',
          target: 'content-container',
          keyframes: [
            { offset: 0, properties: { opacity: 0, transform: 'translateY(20px)' } },
            { offset: 1, properties: { opacity: 1, transform: 'translateY(0)' } },
          ],
          duration: 400,
          easing: 'ease-out',
          stagger: { delay: 50, direction: 'forward' },
        },
        {
          id: generateId(),
          name: 'FAB press',
          trigger: 'interaction',
          target: 'fab',
          keyframes: [
            { offset: 0, properties: { transform: 'scale(1)' } },
            { offset: 0.5, properties: { transform: 'scale(0.9)' } },
            { offset: 1, properties: { transform: 'scale(1)' } },
          ],
          duration: 200,
          easing: 'ease-out',
        },
      ],
      microInteractions: [
        {
          id: generateId(),
          name: 'Button feedback',
          trigger: 'button-press',
          animation: 'scale(0.95) → scale(1)',
          haptic: 'light',
        },
        {
          id: generateId(),
          name: 'Success celebration',
          trigger: 'action-complete',
          animation: 'confetti burst + glow',
        },
      ],
      pageTransitions: [
        {
          id: generateId(),
          from: 'main',
          to: 'detail',
          animation: {
            type: 'slide',
            direction: 'left',
            duration: 300,
            easing: 'ease-in-out',
          },
        },
      ],
      loadingStates: [
        {
          id: generateId(),
          context: 'initial-load',
          type: 'skeleton',
        },
        {
          id: generateId(),
          context: 'action-pending',
          type: 'spinner',
        },
      ],
    };
  }

  /**
   * Respond to another agent's contribution
   */
  async respondTo(
    contribution: AgentContribution,
    context: { userRequest: string; journey?: UserJourney }
  ): Promise<{
    content: string;
    structuredOutput?: Partial<InteractionSpec>;
  }> {
    const prompt = `The ${contribution.agentType} proposed:

"${contribution.content}"

As the Interaction Designer, consider:
1. What animations/gestures does this need?
2. How should transitions work?
3. What micro-interactions would make it delightful?
4. Any concerns about the interaction model?`;

    const response = await this.callLLMJSON<{
      additionalAnimations: Array<{
        name: string;
        trigger: string;
        target: string;
        description: string;
        duration: number;
      }>;
      additionalGestures: Array<{
        name: string;
        type: string;
        target: string;
        effect: string;
      }>;
      concerns: string[];
      suggestions: string[];
    }>(
      [
        { role: 'system', content: INTERACTION_DESIGNER_SYSTEM_PROMPT },
        { role: 'user', content: prompt },
      ],
      '{"additionalAnimations": [...], ...}'
    );

    let content = 'Based on this proposal, I suggest:\n\n';

    if (response.additionalAnimations?.length) {
      content += '**Additional Animations**:\n';
      for (const a of response.additionalAnimations) {
        content += `- ${a.name}: ${a.description} (${a.duration}ms on ${a.trigger})\n`;
      }
      content += '\n';
    }

    if (response.additionalGestures?.length) {
      content += '**Gestures Needed**:\n';
      for (const g of response.additionalGestures) {
        content += `- ${g.name}: ${g.type} on ${g.target} → ${g.effect}\n`;
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
    const result = await this.designInteractions(message);
    
    return {
      success: true,
      message: result.content,
      data: result.structuredOutput,
      requiresUserInput: false,
    };
  }
}

// Export singleton instance
export const interactionDesigner = new InteractionDesigner();
