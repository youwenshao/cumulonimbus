/**
 * Design Session Management
 * 
 * Orchestrates multi-turn dialogue between agents to design apps.
 * This is the core of the journey-first architecture - agents
 * collaborate through multiple turns until they reach consensus.
 */

import { generateId } from '@/lib/utils';
import {
  JourneyArchitect,
  journeyArchitect,
  UXDesignerV3,
  uxDesignerV3,
  InteractionDesigner,
  interactionDesigner,
  ComponentArchitect,
  componentArchitect,
  DataArchitect,
  dataArchitect,
  ImplementationEngineer,
  implementationEngineer,
} from './agents';
import type {
  DesignSession,
  DesignConsensus,
  AgentContribution,
  JourneyAgentType,
  UserJourney,
  InteractionSpec,
  ComponentSystem,
  DataLayer,
  GeneratedCode,
  JourneyConversationState,
  JourneyMessage,
} from './journey-types';

// ============================================================================
// Design Session Manager
// ============================================================================

export interface DesignSessionConfig {
  /** Maximum turns before forcing consensus */
  maxTurns: number;
  /** Minimum turns before checking consensus */
  minTurns: number;
  /** Confidence threshold for consensus */
  confidenceThreshold: number;
}

const DEFAULT_CONFIG: DesignSessionConfig = {
  maxTurns: 10,
  minTurns: 4,
  confidenceThreshold: 0.7,
};

/**
 * Manages a complete design session from user request to generated code
 */
export class DesignSessionManager {
  private config: DesignSessionConfig;

  constructor(config: Partial<DesignSessionConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Run a complete design session
   */
  async runSession(userRequest: string): Promise<{
    session: DesignSession;
    consensus: DesignConsensus;
    code: GeneratedCode;
    messages: JourneyMessage[];
  }> {
    console.log('\n🎨 === Starting Design Session ===');
    console.log(`📝 User Request: "${userRequest.substring(0, 100)}..."`);

    // Create session
    const session = this.createSession(userRequest);
    const messages: JourneyMessage[] = [];

    // Add user message
    messages.push({
      id: generateId(),
      role: 'user',
      content: userRequest,
      timestamp: new Date(),
    });

    // Phase 1: Multi-turn design dialogue
    console.log('\n🗣️ Phase 1: Design Dialogue');
    
    let journey: UserJourney | undefined;
    let interactions: InteractionSpec | undefined;
    let components: ComponentSystem | undefined;
    let dataLayer: DataLayer | undefined;

    while (session.turn < this.config.maxTurns && !session.hasConsensus) {
      session.turn++;
      console.log(`\n📍 Turn ${session.turn}`);

      // Determine which agent should speak
      const { nextAgent, prompt, context } = await journeyArchitect.facilitateNextTurn(session);
      console.log(`🎯 Next agent: ${nextAgent}`);

      // Get agent contribution
      const contribution = await this.getAgentContribution(
        nextAgent,
        prompt,
        userRequest,
        session.contributions,
        { journey, interactions, components, dataLayer }
      );

      // Add contribution to session
      session.contributions.push(contribution);

      // Extract structured output
      if (nextAgent === 'ux-designer' && contribution.structuredOutput) {
        journey = contribution.structuredOutput as UserJourney;
      } else if (nextAgent === 'interaction-designer' && contribution.structuredOutput) {
        interactions = contribution.structuredOutput as InteractionSpec;
      } else if (nextAgent === 'component-architect' && contribution.structuredOutput) {
        components = contribution.structuredOutput as ComponentSystem;
      } else if (nextAgent === 'data-architect' && contribution.structuredOutput) {
        dataLayer = contribution.structuredOutput as DataLayer;
      }

      // Add agent message to chat
      messages.push({
        id: generateId(),
        role: 'agent',
        agentType: nextAgent,
        content: contribution.content,
        timestamp: new Date(),
        metadata: { structuredOutput: contribution.structuredOutput },
      });

      console.log(`✅ ${nextAgent}: ${contribution.content.substring(0, 100)}...`);

      // Check for consensus after minimum turns
      if (session.turn >= this.config.minTurns) {
        session.hasConsensus = this.checkConsensus(session, {
          journey,
          interactions,
          components,
          dataLayer,
        });
      }
    }

    // Phase 2: Synthesize final design
    console.log('\n✨ Phase 2: Synthesizing Design');
    
    const consensus = this.synthesizeConsensus(
      session,
      userRequest,
      journey,
      interactions,
      components,
      dataLayer
    );

    session.consensus = consensus;
    session.status = 'consensus-reached';

    // Add synthesis message
    messages.push({
      id: generateId(),
      role: 'assistant',
      content: `Design consensus reached after ${session.turn} turns.\n\n${consensus.summary}`,
      timestamp: new Date(),
    });

    console.log(`✅ Consensus reached: ${consensus.summary.substring(0, 100)}...`);

    // Phase 3: Generate implementation
    console.log('\n🔧 Phase 3: Generating Implementation');
    
    const code = await implementationEngineer.implement(consensus);
    session.status = 'complete';

    console.log(`✅ Generated ${code.files.length} files`);

    // Add implementation message
    messages.push({
      id: generateId(),
      role: 'assistant',
      content: `Generated ${code.files.length} files:\n${code.files.map(f => `- ${f.path}`).join('\n')}`,
      timestamp: new Date(),
    });

    return { session, consensus, code, messages };
  }

  /**
   * Create a new design session
   */
  private createSession(userRequest: string): DesignSession {
    return {
      id: generateId(),
      userRequest,
      status: 'active',
      contributions: [],
      turn: 0,
      maxTurns: this.config.maxTurns,
      hasConsensus: false,
      startedAt: new Date(),
    };
  }

  /**
   * Get a contribution from a specific agent
   */
  private async getAgentContribution(
    agentType: JourneyAgentType,
    prompt: string,
    userRequest: string,
    previousContributions: AgentContribution[],
    designArtifacts: {
      journey?: UserJourney;
      interactions?: InteractionSpec;
      components?: ComponentSystem;
      dataLayer?: DataLayer;
    }
  ): Promise<AgentContribution> {
    let content = '';
    let structuredOutput: unknown;
    let confidence = 0.8;

    switch (agentType) {
      case 'ux-designer': {
        const result = await uxDesignerV3.designJourney(userRequest, previousContributions);
        content = result.content;
        structuredOutput = result.structuredOutput;
        break;
      }

      case 'interaction-designer': {
        const result = await interactionDesigner.designInteractions(
          userRequest,
          designArtifacts.journey,
          previousContributions
        );
        content = result.content;
        structuredOutput = result.structuredOutput;
        break;
      }

      case 'component-architect': {
        const result = await componentArchitect.designComponents(
          userRequest,
          designArtifacts.journey,
          designArtifacts.interactions,
          previousContributions
        );
        content = result.content;
        structuredOutput = result.structuredOutput;
        break;
      }

      case 'data-architect': {
        const result = await dataArchitect.designDataLayer(
          userRequest,
          designArtifacts.journey,
          designArtifacts.interactions,
          designArtifacts.components,
          previousContributions
        );
        content = result.content;
        structuredOutput = result.structuredOutput;
        break;
      }

      default:
        content = 'Acknowledging the design discussion.';
    }

    return {
      id: generateId(),
      agentType,
      turn: previousContributions.length,
      content,
      structuredOutput,
      confidence,
      timestamp: new Date(),
    };
  }

  /**
   * Check if agents have reached consensus
   */
  private checkConsensus(
    session: DesignSession,
    artifacts: {
      journey?: UserJourney;
      interactions?: InteractionSpec;
      components?: ComponentSystem;
      dataLayer?: DataLayer;
    }
  ): boolean {
    // Need all four design artifacts
    if (!artifacts.journey || !artifacts.interactions || 
        !artifacts.components || !artifacts.dataLayer) {
      return false;
    }

    // Need contributions from all agents
    const agentTypes = new Set(session.contributions.map(c => c.agentType));
    const requiredAgents: JourneyAgentType[] = [
      'ux-designer',
      'interaction-designer',
      'component-architect',
      'data-architect',
    ];
    
    if (!requiredAgents.every(a => agentTypes.has(a))) {
      return false;
    }

    // Check average confidence of recent contributions
    const recentContributions = session.contributions.slice(-4);
    const avgConfidence = recentContributions.reduce((sum, c) => sum + c.confidence, 0) / 
                          recentContributions.length;

    return avgConfidence >= this.config.confidenceThreshold;
  }

  /**
   * Synthesize final design consensus
   */
  private synthesizeConsensus(
    session: DesignSession,
    userRequest: string,
    journey?: UserJourney,
    interactions?: InteractionSpec,
    components?: ComponentSystem,
    dataLayer?: DataLayer
  ): DesignConsensus {
    // Use provided artifacts or create defaults
    const finalJourney = journey || this.createDefaultJourney(userRequest);
    const finalInteractions = interactions || this.createDefaultInteractions();
    const finalComponents = components || this.createDefaultComponents(userRequest);
    const finalDataLayer = dataLayer || this.createDefaultDataLayer();

    // Generate summary
    const summary = this.generateSummary(session, {
      journey: finalJourney,
      interactions: finalInteractions,
      components: finalComponents,
      dataLayer: finalDataLayer,
    });

    return {
      journey: finalJourney,
      interactions: finalInteractions,
      components: finalComponents,
      dataLayer: finalDataLayer,
      summary,
      agreedBy: ['ux-designer', 'interaction-designer', 'component-architect', 'data-architect'],
    };
  }

  /**
   * Generate summary of the design
   */
  private generateSummary(
    session: DesignSession,
    artifacts: {
      journey: UserJourney;
      interactions: InteractionSpec;
      components: ComponentSystem;
      dataLayer: DataLayer;
    }
  ): string {
    const lines: string[] = [];
    
    lines.push(`Design for "${artifacts.journey.appName}" completed in ${session.turn} turns.`);
    lines.push('');
    lines.push('**Journey:**');
    lines.push(`- Primary flow: ${artifacts.journey.flows.find(f => f.isPrimary)?.name || 'Main'}`);
    lines.push(`- Navigation: ${artifacts.journey.navigation.type}`);
    if (artifacts.journey.keyMoments.length > 0) {
      lines.push(`- Key moments: ${artifacts.journey.keyMoments.map(m => m.name).join(', ')}`);
    }
    lines.push('');
    lines.push('**Components:**');
    for (const c of artifacts.components.components) {
      lines.push(`- ${c.name}${c.isPrimary ? ' (primary)' : ''}: ${c.purpose}`);
    }
    lines.push('');
    lines.push('**Data Operations:**');
    for (const op of artifacts.dataLayer.operations) {
      lines.push(`- ${op.name}: ${op.description}`);
    }

    return lines.join('\n');
  }

  /**
   * Create default journey if not provided
   */
  private createDefaultJourney(userRequest: string): UserJourney {
    return {
      id: generateId(),
      appName: 'App',
      appPurpose: userRequest,
      flows: [{
        id: generateId(),
        name: 'Main',
        description: 'Main flow',
        isPrimary: true,
        steps: [],
        entryPoints: [],
        exitPoints: [],
      }],
      states: [],
      keyMoments: [],
      entryFlowId: '',
      navigation: { type: 'minimal', items: [] },
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
      loadingStates: [{ id: generateId(), context: 'loading', type: 'skeleton' }],
    };
  }

  /**
   * Create default components if not provided
   */
  private createDefaultComponents(userRequest: string): ComponentSystem {
    return {
      id: generateId(),
      components: [{
        id: generateId(),
        name: 'MainView',
        purpose: 'Primary view',
        description: 'The main view of the app',
        interactions: [],
        visual: {
          sizing: { width: '100%', height: '100%' },
          spacing: { padding: '1rem', margin: '0' },
          style: 'Modern, clean',
          colors: { background: '#0a0a0a', foreground: '#fff' },
        },
        dataNeeds: [],
        propsSpec: [],
        stateNeeds: [],
        suggestedLibraries: ['framer-motion'],
        isPrimary: true,
        layoutRole: 'hero',
      }],
      designTokens: {
        colors: { primary: '#3b82f6', background: '#0a0a0a', text: '#fff' },
        fonts: { body: 'system-ui' },
        spacing: { md: '1rem' },
        radii: { md: '0.5rem' },
        shadows: {},
        transitions: { default: '0.2s ease' },
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
      structures: [{
        id: generateId(),
        name: 'items',
        purpose: 'Main data',
        fields: [
          { name: 'id', type: 'string', description: 'ID', required: true },
        ],
      }],
      operations: [{
        id: generateId(),
        name: 'getItems',
        description: 'Get all items',
        triggeredBy: 'Load',
        inputs: [],
        output: 'Item[]',
      }],
      storage: { type: 'local' },
    };
  }
}

// ============================================================================
// Conversation State Management
// ============================================================================

/**
 * Create a new journey conversation state
 */
export function createJourneyConversationState(): JourneyConversationState {
  return {
    id: generateId(),
    version: 'v3-journey',
    messages: [],
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

/**
 * Add a message to the conversation
 */
export function addJourneyMessage(
  state: JourneyConversationState,
  role: JourneyMessage['role'],
  content: string,
  agentType?: JourneyAgentType
): JourneyConversationState {
  const message: JourneyMessage = {
    id: generateId(),
    role,
    content,
    agentType,
    timestamp: new Date(),
  };

  return {
    ...state,
    messages: [...state.messages, message],
    updatedAt: new Date(),
  };
}

/**
 * Update conversation with design session results
 */
export function updateWithDesignResults(
  state: JourneyConversationState,
  session: DesignSession,
  consensus: DesignConsensus,
  code: GeneratedCode
): JourneyConversationState {
  return {
    ...state,
    designSession: session,
    finalDesign: consensus,
    generatedCode: code,
    updatedAt: new Date(),
  };
}

// Export singleton manager
export const designSessionManager = new DesignSessionManager();
