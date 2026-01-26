/**
 * Journey Architect Agent
 * 
 * Orchestrates multi-turn design dialogue between specialized agents.
 * This is the conductor of the journey-first architecture - it doesn't
 * design anything itself, but facilitates discussion between agents
 * until they reach consensus on the design.
 */

import { BaseAgent } from './base-agent';
import { generateId } from '@/lib/utils';
import type { ConversationState, AgentResponse } from '../types';
import type {
  DesignSession,
  DesignConsensus,
  AgentContribution,
  JourneyAgentType,
  UserJourney,
  InteractionSpec,
  ComponentSystem,
  DataLayer,
  createDesignSession,
  addContribution,
  checkConsensus,
} from '../journey-types';

// ============================================================================
// Journey Architect System Prompt
// ============================================================================

const JOURNEY_ARCHITECT_SYSTEM_PROMPT = `You are the Journey Architect - the orchestrator of a collaborative design process.

## Your Role

You do NOT design anything yourself. Instead, you:
1. Facilitate multi-turn dialogue between specialized design agents
2. Ensure each agent contributes their expertise
3. Identify when consensus has been reached
4. Synthesize final design from all contributions

## The Design Agents You Coordinate

1. **UX Designer**: Designs user journeys, flows, and key moments
2. **Interaction Designer**: Specifies gestures, animations, micro-interactions
3. **Component Architect**: Designs custom components for THIS specific app
4. **Data Architect**: Designs data layer AFTER UX is defined

## Design Session Flow

Turn 1: UX Designer proposes user journey
Turn 2: Interaction Designer responds with interaction specs
Turn 3: Component Architect designs custom components
Turn 4: Data Architect designs data layer based on component needs
Turn 5+: Agents refine based on each other's feedback

## Your Tasks

1. **Initiate**: Start the design session with the user's request
2. **Facilitate**: Decide which agent should speak next
3. **Evaluate**: Check if consensus has been reached
4. **Synthesize**: Combine all contributions into final design

## Consensus Criteria

Consensus is reached when:
- All 4 agents have contributed at least once
- No agent has major concerns about the design
- At least 3 turns of refinement have occurred
- Recent contributions show high confidence (>70%)

## Output Format

When facilitating, output:
{
  "nextAgent": "ux-designer" | "interaction-designer" | "component-architect" | "data-architect",
  "prompt": "What the agent should address",
  "context": { relevant context for the agent }
}

When synthesizing final design, output the complete DesignConsensus.`;

// ============================================================================
// Journey Architect Agent
// ============================================================================

export class JourneyArchitect extends BaseAgent {
  constructor() {
    super({
      name: 'JourneyArchitect',
      description: 'Orchestrates multi-turn design dialogue between agents',
      temperature: 0.3,
      maxTokens: 4096,
    });
  }

  protected buildSystemPrompt(): string {
    return JOURNEY_ARCHITECT_SYSTEM_PROMPT;
  }

  /**
   * Initiate a new design session
   */
  async initiateDesignSession(userRequest: string): Promise<DesignSession> {
    this.log('Initiating design session', { request: userRequest.substring(0, 100) });

    const session: DesignSession = {
      id: generateId(),
      userRequest,
      status: 'active',
      contributions: [],
      turn: 0,
      maxTurns: 10,
      hasConsensus: false,
      startedAt: new Date(),
    };

    return session;
  }

  /**
   * Facilitate the next turn of discussion
   * Returns which agent should speak and what they should address
   */
  async facilitateNextTurn(session: DesignSession): Promise<{
    nextAgent: JourneyAgentType;
    prompt: string;
    context: Record<string, unknown>;
  }> {
    const agentOrder: JourneyAgentType[] = [
      'ux-designer',
      'interaction-designer',
      'component-architect',
      'data-architect',
    ];

    // Determine which agent should speak next
    const contributedAgents = new Set(session.contributions.map(c => c.agentType));
    
    // First pass: Each agent speaks in order
    if (session.turn < 4) {
      const nextAgent = agentOrder[session.turn];
      const prompt = this.buildAgentPrompt(nextAgent, session);
      const context = this.buildAgentContext(nextAgent, session);
      
      return { nextAgent, prompt, context };
    }

    // Refinement phase: Agents respond to each other
    const lastContribution = session.contributions[session.contributions.length - 1];
    const nextAgent = this.determineRespondingAgent(lastContribution, session);
    const prompt = this.buildRefinementPrompt(nextAgent, lastContribution, session);
    const context = this.buildAgentContext(nextAgent, session);

    return { nextAgent, prompt, context };
  }

  /**
   * Build the prompt for a specific agent based on their role
   */
  private buildAgentPrompt(agent: JourneyAgentType, session: DesignSession): string {
    const userRequest = session.userRequest;

    switch (agent) {
      case 'ux-designer':
        return `Design the complete user journey for this app:

"${userRequest}"

Propose:
1. The core user flows (what journeys will users take?)
2. The primary view (what do users see first?)
3. Key moments (what should feel special/memorable?)
4. Navigation structure

Think about what users will DO, not what data they'll store.`;

      case 'interaction-designer':
        const uxContribution = session.contributions.find(c => c.agentType === 'ux-designer');
        return `Based on the UX designer's journey:

${uxContribution?.content || 'No UX design yet'}

Design the interaction layer:
1. Gestures (how do users interact physically?)
2. Animations (how do things move and transform?)
3. Micro-interactions (what feedback do actions have?)
4. Page transitions (how do views connect?)

Make it feel polished and delightful.`;

      case 'component-architect':
        const interactionContribution = session.contributions.find(c => c.agentType === 'interaction-designer');
        return `Based on the journey and interactions:

${session.contributions.map(c => `${c.agentType}: ${c.content.substring(0, 200)}...`).join('\n\n')}

Design CUSTOM components for this specific app:
1. What unique components does this app need?
2. What does each component do?
3. What interactions does it handle?
4. What libraries would help implement it?

DO NOT use generic component types. Design components specific to THIS app.`;

      case 'data-architect':
        const componentContribution = session.contributions.find(c => c.agentType === 'component-architect');
        return `Based on the components and interactions needed:

${session.contributions.map(c => `${c.agentType}: ${c.content.substring(0, 200)}...`).join('\n\n')}

Design the data layer:
1. What data structures do the components need?
2. What operations (NOT CRUD) are required?
3. How should data be stored?
4. What's the minimal data footprint?

Design for the UX needs, NOT for a database schema.`;

      default:
        return 'Contribute your expertise to the design discussion.';
    }
  }

  /**
   * Build context for an agent based on previous contributions
   */
  private buildAgentContext(agent: JourneyAgentType, session: DesignSession): Record<string, unknown> {
    return {
      userRequest: session.userRequest,
      turn: session.turn,
      previousContributions: session.contributions.map(c => ({
        agent: c.agentType,
        summary: c.content.substring(0, 300),
        structuredOutput: c.structuredOutput,
      })),
    };
  }

  /**
   * Determine which agent should respond to a contribution
   */
  private determineRespondingAgent(
    lastContribution: AgentContribution,
    session: DesignSession
  ): JourneyAgentType {
    // If component architect just spoke, data architect should respond
    if (lastContribution.agentType === 'component-architect') {
      return 'data-architect';
    }
    
    // If data architect just spoke, UX designer might want to refine
    if (lastContribution.agentType === 'data-architect') {
      return 'ux-designer';
    }
    
    // If UX designer just spoke, interaction designer should respond
    if (lastContribution.agentType === 'ux-designer') {
      return 'interaction-designer';
    }
    
    // Default: component architect to synthesize
    return 'component-architect';
  }

  /**
   * Build refinement prompt for responding to another agent
   */
  private buildRefinementPrompt(
    respondingAgent: JourneyAgentType,
    lastContribution: AgentContribution,
    session: DesignSession
  ): string {
    return `The ${lastContribution.agentType} just proposed:

"${lastContribution.content}"

As the ${respondingAgent}, respond with:
1. Do you agree with this approach?
2. Any concerns or suggestions?
3. How does this affect your part of the design?
4. Updated design based on this input (if needed)`;
  }

  /**
   * Add a contribution to the session
   */
  addContribution(
    session: DesignSession,
    agentType: JourneyAgentType,
    content: string,
    structuredOutput?: unknown,
    confidence: number = 0.8
  ): DesignSession {
    const contribution: AgentContribution = {
      id: generateId(),
      agentType,
      turn: session.turn,
      content,
      structuredOutput,
      confidence,
      timestamp: new Date(),
    };

    return {
      ...session,
      contributions: [...session.contributions, contribution],
    };
  }

  /**
   * Advance to next turn
   */
  advanceTurn(session: DesignSession): DesignSession {
    return {
      ...session,
      turn: session.turn + 1,
    };
  }

  /**
   * Check if consensus has been reached
   */
  evaluateConsensus(session: DesignSession): boolean {
    // Need contributions from all design agents
    const agentTypes = new Set(session.contributions.map(c => c.agentType));
    const requiredAgents: JourneyAgentType[] = [
      'ux-designer',
      'interaction-designer',
      'component-architect',
      'data-architect',
    ];
    
    const hasAllAgents = requiredAgents.every(a => agentTypes.has(a));
    if (!hasAllAgents) return false;

    // Need at least 3 turns
    if (session.turn < 3) return false;

    // Recent contributions should have high confidence
    const recentContributions = session.contributions.slice(-4);
    const averageConfidence = recentContributions.reduce((sum, c) => sum + c.confidence, 0) / recentContributions.length;
    
    return averageConfidence >= 0.7;
  }

  /**
   * Synthesize final design from all contributions
   */
  async synthesizeDesign(session: DesignSession): Promise<DesignConsensus> {
    this.log('Synthesizing final design', { 
      contributions: session.contributions.length,
      turns: session.turn,
    });

    // Extract structured outputs from each agent
    const uxOutput = session.contributions
      .filter(c => c.agentType === 'ux-designer')
      .pop()?.structuredOutput as UserJourney | undefined;
    
    const interactionOutput = session.contributions
      .filter(c => c.agentType === 'interaction-designer')
      .pop()?.structuredOutput as InteractionSpec | undefined;
    
    const componentOutput = session.contributions
      .filter(c => c.agentType === 'component-architect')
      .pop()?.structuredOutput as ComponentSystem | undefined;
    
    const dataOutput = session.contributions
      .filter(c => c.agentType === 'data-architect')
      .pop()?.structuredOutput as DataLayer | undefined;

    // Build consensus object
    const consensus: DesignConsensus = {
      journey: uxOutput || this.createDefaultJourney(session.userRequest),
      interactions: interactionOutput || this.createDefaultInteractions(),
      components: componentOutput || this.createDefaultComponents(),
      dataLayer: dataOutput || this.createDefaultDataLayer(),
      summary: this.generateSummary(session),
      agreedBy: ['ux-designer', 'interaction-designer', 'component-architect', 'data-architect'],
    };

    return consensus;
  }

  /**
   * Generate summary of the design
   */
  private generateSummary(session: DesignSession): string {
    const contributions = session.contributions.map(c => 
      `${c.agentType}: ${c.content.substring(0, 100)}...`
    ).join('\n');

    return `Design consensus reached after ${session.turn} turns.\n\nKey decisions:\n${contributions}`;
  }

  /**
   * Create default journey if UX designer didn't provide structured output
   */
  private createDefaultJourney(userRequest: string): UserJourney {
    return {
      id: generateId(),
      appName: 'App',
      appPurpose: userRequest,
      flows: [{
        id: generateId(),
        name: 'Main Flow',
        description: 'Primary user journey',
        isPrimary: true,
        steps: [{
          id: generateId(),
          name: 'Main View',
          description: 'The main view of the app',
          view: 'main',
          possibleActions: [],
          transitions: [],
        }],
        entryPoints: ['app-open'],
        exitPoints: [],
      }],
      states: [
        { name: 'empty', description: 'No data yet', view: 'empty-state', conditions: ['data.length === 0'] },
        { name: 'loaded', description: 'Data loaded', view: 'main', conditions: ['data.length > 0'] },
        { name: 'loading', description: 'Loading data', view: 'loading', conditions: ['isLoading'] },
      ],
      keyMoments: [],
      entryFlowId: '',
      navigation: {
        type: 'minimal',
        items: [],
      },
    };
  }

  /**
   * Create default interactions if not provided
   */
  private createDefaultInteractions(): InteractionSpec {
    return {
      id: generateId(),
      gestures: [],
      animations: [],
      microInteractions: [],
      pageTransitions: [],
      loadingStates: [{
        id: generateId(),
        context: 'initial-load',
        type: 'skeleton',
      }],
    };
  }

  /**
   * Create default component system if not provided
   */
  private createDefaultComponents(): ComponentSystem {
    return {
      id: generateId(),
      components: [],
      designTokens: {
        colors: {
          primary: '#3b82f6',
          background: '#0a0a0a',
          text: '#ffffff',
        },
        fonts: {
          heading: 'system-ui',
          body: 'system-ui',
        },
        spacing: {
          sm: '0.5rem',
          md: '1rem',
          lg: '2rem',
        },
        radii: {
          sm: '0.25rem',
          md: '0.5rem',
          lg: '1rem',
        },
        shadows: {},
        transitions: {
          default: '0.2s ease',
        },
      },
      relationships: [],
    };
  }

  /**
   * Create default data layer if not provided
   */
  private createDefaultDataLayer(): DataLayer {
    return {
      id: generateId(),
      structures: [],
      operations: [],
      storage: {
        type: 'local',
        syncStrategy: 'immediate',
      },
    };
  }

  /**
   * Process method for AgentResponse interface
   */
  async process(
    message: string,
    state: ConversationState
  ): Promise<AgentResponse> {
    // This agent is primarily used programmatically via the other methods
    return {
      success: true,
      message: 'Journey Architect ready to orchestrate design session',
      requiresUserInput: false,
    };
  }
}

// Export singleton instance
export const journeyArchitect = new JourneyArchitect();
