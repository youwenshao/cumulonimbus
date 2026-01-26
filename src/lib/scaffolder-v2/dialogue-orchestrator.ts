/**
 * Dialogue Orchestrator
 * Facilitates agent-to-agent communication for collaborative design refinement
 * Enables agents to ask questions, share context, and build on each other's work
 */

import { BaseAgent } from './agents/base-agent';
import { generateId } from '@/lib/utils';
import type { 
  ConversationState, 
  DynamicConversationState,
  Schema,
  LayoutNode,
  AestheticSpec,
  AppCapabilities,
} from './types';

// ============================================================================
// Dialogue Types
// ============================================================================

export interface DialogueMessage {
  id: string;
  timestamp: Date;
  from: string;  // Agent name
  to: string;    // Agent name or 'all'
  type: 'question' | 'answer' | 'suggestion' | 'confirmation' | 'clarification';
  content: string;
  context?: Record<string, unknown>;
}

export interface DialogueTurn {
  id: string;
  initiator: string;
  responder: string;
  topic: string;
  messages: DialogueMessage[];
  resolution?: string;
  outcome?: 'resolved' | 'needs_more' | 'disagreement';
}

export interface DialogueSession {
  id: string;
  topic: string;
  participants: string[];
  turns: DialogueTurn[];
  startedAt: Date;
  endedAt?: Date;
  status: 'active' | 'completed' | 'stalled';
  summary?: string;
  decisions: DialogueDecision[];
}

export interface DialogueDecision {
  id: string;
  topic: string;
  decision: string;
  madeBy: string;
  agreedBy: string[];
  context?: Record<string, unknown>;
}

export interface DialogueResult {
  session: DialogueSession;
  decisions: DialogueDecision[];
  stateUpdates: Partial<DynamicConversationState>;
  finalMessage: string;
}

// ============================================================================
// Dialogue Topics
// ============================================================================

export type DialogueTopic = 
  | 'component_selection'    // Which components to use
  | 'library_choice'         // Which libraries for implementation
  | 'layout_structure'       // How to arrange components
  | 'aesthetic_direction'    // Visual design decisions
  | 'interaction_model'      // How users will interact
  | 'data_requirements'      // What data is needed
  | 'capability_scope'       // What features to include
  | 'custom_component';      // Designing a custom component

export interface TopicContext {
  topic: DialogueTopic;
  question: string;
  context: Record<string, unknown>;
  preferredResponder?: string;
}

// ============================================================================
// Dialogue Orchestrator Class
// ============================================================================

export class DialogueOrchestrator {
  private maxTurnsPerSession = 5;
  private maxMessagesPerTurn = 4;

  /**
   * Facilitate a dialogue between agents on a specific topic
   */
  async facilitateDialogue(
    topic: TopicContext,
    participants: BaseAgent[],
    state: DynamicConversationState
  ): Promise<DialogueResult> {
    const session: DialogueSession = {
      id: generateId(),
      topic: topic.question,
      participants: participants.map(p => p.name),
      turns: [],
      startedAt: new Date(),
      status: 'active',
      decisions: [],
    };

    const decisions: DialogueDecision[] = [];
    const stateUpdates: Partial<DynamicConversationState> = {};

    // Determine initiator and responder
    const initiator = participants[0];
    const responder = topic.preferredResponder 
      ? participants.find(p => p.name.toLowerCase().includes(topic.preferredResponder!.toLowerCase())) || participants[1]
      : participants[1];

    // Run dialogue turns
    let turnCount = 0;
    let resolved = false;

    while (turnCount < this.maxTurnsPerSession && !resolved) {
      turnCount++;
      
      const turn = await this.runDialogueTurn(
        session,
        topic,
        initiator,
        responder,
        state,
        turnCount
      );

      session.turns.push(turn);

      // Check if resolved
      if (turn.outcome === 'resolved') {
        resolved = true;
        
        // Extract decision
        if (turn.resolution) {
          const decision: DialogueDecision = {
            id: generateId(),
            topic: topic.topic,
            decision: turn.resolution,
            madeBy: responder.name,
            agreedBy: [initiator.name, responder.name],
            context: topic.context,
          };
          decisions.push(decision);
          session.decisions.push(decision);
        }
      }

      // Apply any state updates from the turn
      this.applyTurnUpdates(turn, stateUpdates, topic);
    }

    // Complete session
    session.endedAt = new Date();
    session.status = resolved ? 'completed' : 'stalled';
    session.summary = this.generateSessionSummary(session);

    return {
      session,
      decisions,
      stateUpdates,
      finalMessage: session.summary || 'Dialogue completed',
    };
  }

  /**
   * Quick question-answer between two agents
   */
  async askAndAnswer(
    question: string,
    asker: BaseAgent,
    answerer: BaseAgent,
    context: Record<string, unknown> = {}
  ): Promise<DialogueMessage[]> {
    const messages: DialogueMessage[] = [];

    // Create question message
    const questionMsg: DialogueMessage = {
      id: generateId(),
      timestamp: new Date(),
      from: asker.name,
      to: answerer.name,
      type: 'question',
      content: question,
      context,
    };
    messages.push(questionMsg);

    // Get answer (in real implementation, this would call the agent)
    // For now, we simulate with structured responses
    const answer = await this.getAgentResponse(answerer, question, context);
    
    const answerMsg: DialogueMessage = {
      id: generateId(),
      timestamp: new Date(),
      from: answerer.name,
      to: asker.name,
      type: 'answer',
      content: answer,
      context,
    };
    messages.push(answerMsg);

    return messages;
  }

  /**
   * Broadcast a message to all participants
   */
  broadcastToAll(
    sender: BaseAgent,
    message: string,
    participants: BaseAgent[],
    type: DialogueMessage['type'] = 'suggestion'
  ): DialogueMessage {
    return {
      id: generateId(),
      timestamp: new Date(),
      from: sender.name,
      to: 'all',
      type,
      content: message,
    };
  }

  // ============================================================================
  // Private Methods
  // ============================================================================

  private async runDialogueTurn(
    session: DialogueSession,
    topic: TopicContext,
    initiator: BaseAgent,
    responder: BaseAgent,
    state: DynamicConversationState,
    turnNumber: number
  ): Promise<DialogueTurn> {
    const turn: DialogueTurn = {
      id: generateId(),
      initiator: initiator.name,
      responder: responder.name,
      topic: topic.topic,
      messages: [],
    };

    // Build the question based on topic and context
    const question = this.buildTopicQuestion(topic, state, turnNumber);
    
    // Initiator asks
    const questionMsg: DialogueMessage = {
      id: generateId(),
      timestamp: new Date(),
      from: initiator.name,
      to: responder.name,
      type: 'question',
      content: question,
      context: topic.context,
    };
    turn.messages.push(questionMsg);

    // Responder answers
    const answer = await this.getAgentResponse(responder, question, {
      ...topic.context,
      state,
      turnNumber,
    });

    const answerMsg: DialogueMessage = {
      id: generateId(),
      timestamp: new Date(),
      from: responder.name,
      to: initiator.name,
      type: 'answer',
      content: answer,
      context: topic.context,
    };
    turn.messages.push(answerMsg);

    // Determine outcome
    turn.outcome = this.evaluateTurnOutcome(turn);
    turn.resolution = turn.outcome === 'resolved' ? answer : undefined;

    return turn;
  }

  private buildTopicQuestion(
    topic: TopicContext,
    state: DynamicConversationState,
    turnNumber: number
  ): string {
    const baseQuestion = topic.question;
    
    // Add context based on topic type
    switch (topic.topic) {
      case 'component_selection':
        return `${baseQuestion}\n\nAvailable component types: heatmap, timeline, gallery, calendar, kanban, cards, list, chart, stats.\nSchema: ${state.schemas[0]?.name || 'Unknown'}`;
      
      case 'library_choice':
        return `${baseQuestion}\n\nAvailable libraries: recharts, framer-motion, @dnd-kit, react-activity-calendar, date-fns, zustand, jotai.`;
      
      case 'layout_structure':
        return `${baseQuestion}\n\nLayout options: primary-focus (one main component), split-view, floating-actions, progressive-disclosure, hub-and-spoke.`;
      
      case 'aesthetic_direction':
        return `${baseQuestion}\n\nTheme options: cyberpunk, brutalist, neo-tokyo, pastel-dream, terminal, glassmorphic, midnight, forest, sunset.`;
      
      case 'interaction_model':
        return `${baseQuestion}\n\nInteraction patterns: track (daily completion), create (add entries), view (browse/read), visualize (see patterns), manage (full control).`;
      
      default:
        return baseQuestion;
    }
  }

  private async getAgentResponse(
    agent: BaseAgent,
    question: string,
    context: Record<string, unknown>
  ): Promise<string> {
    // In a full implementation, this would call the agent's LLM
    // For now, we provide structured responses based on agent type
    
    const agentName = agent.name.toLowerCase();
    
    // Simulate agent-specific responses
    if (agentName.includes('designer') || agentName.includes('ui')) {
      return this.getDesignerResponse(question, context);
    }
    
    if (agentName.includes('coder') || agentName.includes('generator')) {
      return this.getCoderResponse(question, context);
    }
    
    if (agentName.includes('architect')) {
      return this.getArchitectResponse(question, context);
    }
    
    return 'Acknowledged. I will consider this in my design decisions.';
  }

  private getDesignerResponse(question: string, context: Record<string, unknown>): string {
    const questionLower = question.toLowerCase();
    
    if (questionLower.includes('heatmap') || questionLower.includes('heat map')) {
      return 'For a GitHub-style heatmap, I recommend using react-activity-calendar. It provides a beautiful contribution graph visualization with customizable colors and tooltips. Position it as the primary view with a floating action button for daily entries.';
    }
    
    if (questionLower.includes('library') || questionLower.includes('component')) {
      return 'I suggest using framer-motion for animations and recharts for any data visualizations. For the primary interaction, consider a floating action button (FAB) style for quick daily actions.';
    }
    
    if (questionLower.includes('layout') || questionLower.includes('structure')) {
      return 'I recommend a primary-focus layout where the main visualization (heatmap/calendar/timeline) takes 80% of the viewport. Secondary actions should be accessible via a floating menu or bottom sheet.';
    }
    
    if (questionLower.includes('theme') || questionLower.includes('aesthetic')) {
      return 'Based on the app purpose, I suggest a modern dark theme with vibrant accent colors. The midnight theme with gold accents would work well for a productivity-focused app, or neo-tokyo for something more energetic.';
    }
    
    return 'I will design this with user delight as the primary goal, avoiding generic CRUD patterns.';
  }

  private getCoderResponse(question: string, context: Record<string, unknown>): string {
    const questionLower = question.toLowerCase();
    
    if (questionLower.includes('implement') || questionLower.includes('generate')) {
      return 'I will implement this using the specified libraries with full TypeScript types. I\'ll ensure framer-motion animations are properly configured and the component follows the aesthetic specifications.';
    }
    
    if (questionLower.includes('library')) {
      return 'For this component, I recommend:\n- react-activity-calendar for heatmaps\n- recharts for charts\n- framer-motion for animations\n- @dnd-kit for drag-and-drop if needed';
    }
    
    if (questionLower.includes('api') || questionLower.includes('data')) {
      return 'I will generate only the necessary data operations based on the app\'s actual needs, not full CRUD. For a tracker, this typically means read and create operations only.';
    }
    
    return 'Understood. I will implement this faithfully following the design specifications.';
  }

  private getArchitectResponse(question: string, context: Record<string, unknown>): string {
    const questionLower = question.toLowerCase();
    
    if (questionLower.includes('approach') || questionLower.includes('strategy')) {
      return 'I recommend we focus on the primary user interaction first. For trackers, this is usually viewing progress (heatmap/calendar) and completing daily actions. Data entry should be minimal and contextual.';
    }
    
    if (questionLower.includes('coordinate') || questionLower.includes('parallel')) {
      return 'I will coordinate the Designer and Coder to work in parallel once we have agreement on the component selection. The Designer will specify aesthetics while the Coder prepares the technical implementation.';
    }
    
    return 'I will ensure this design meets our quality threshold before proceeding to code generation.';
  }

  private evaluateTurnOutcome(turn: DialogueTurn): DialogueTurn['outcome'] {
    // Check if the answer provides a clear resolution
    const lastMessage = turn.messages[turn.messages.length - 1];
    
    if (!lastMessage || lastMessage.type !== 'answer') {
      return 'needs_more';
    }
    
    const answer = lastMessage.content.toLowerCase();
    
    // Check for positive resolution indicators
    if (
      answer.includes('i recommend') ||
      answer.includes('i suggest') ||
      answer.includes('i will') ||
      answer.includes('understood') ||
      answer.includes('confirmed')
    ) {
      return 'resolved';
    }
    
    // Check for uncertainty indicators
    if (
      answer.includes('need more') ||
      answer.includes('clarify') ||
      answer.includes('not sure') ||
      answer.includes('depends on')
    ) {
      return 'needs_more';
    }
    
    return 'resolved'; // Default to resolved if answer is substantive
  }

  private applyTurnUpdates(
    turn: DialogueTurn,
    stateUpdates: Partial<DynamicConversationState>,
    topic: TopicContext
  ): void {
    if (turn.outcome !== 'resolved' || !turn.resolution) {
      return;
    }

    // Extract decisions based on topic
    switch (topic.topic) {
      case 'library_choice':
        // Store library recommendations for code generation
        if (!stateUpdates.componentSpecs) {
          (stateUpdates as any).libraryRecommendations = [];
        }
        (stateUpdates as any).libraryRecommendations?.push({
          component: topic.context.componentName,
          libraries: this.extractLibraries(turn.resolution),
        });
        break;
      
      case 'layout_structure':
        // Layout decisions are handled by the design explorer
        break;
      
      case 'aesthetic_direction':
        // Aesthetic decisions are stored for code generation
        (stateUpdates as any).aestheticDecisions = {
          theme: this.extractTheme(turn.resolution),
          notes: turn.resolution,
        };
        break;
    }
  }

  private extractLibraries(response: string): string[] {
    const libraries: string[] = [];
    const knownLibraries = [
      'react-activity-calendar',
      'recharts',
      'framer-motion',
      '@dnd-kit',
      'date-fns',
      'zustand',
      'jotai',
    ];
    
    const responseLower = response.toLowerCase();
    for (const lib of knownLibraries) {
      if (responseLower.includes(lib.toLowerCase())) {
        libraries.push(lib);
      }
    }
    
    return libraries;
  }

  private extractTheme(response: string): string {
    const themes = [
      'cyberpunk', 'brutalist', 'neo-tokyo', 'pastel-dream',
      'terminal', 'glassmorphic', 'midnight', 'forest', 'sunset',
    ];
    
    const responseLower = response.toLowerCase();
    for (const theme of themes) {
      if (responseLower.includes(theme)) {
        return theme;
      }
    }
    
    return 'midnight'; // Default theme
  }

  private generateSessionSummary(session: DialogueSession): string {
    const decisionCount = session.decisions.length;
    const turnCount = session.turns.length;
    
    if (session.status === 'completed' && decisionCount > 0) {
      const decisions = session.decisions.map(d => d.decision).join('; ');
      return `Dialogue completed in ${turnCount} turn(s). Decisions: ${decisions}`;
    }
    
    if (session.status === 'stalled') {
      return `Dialogue stalled after ${turnCount} turn(s). Some questions remain unresolved.`;
    }
    
    return `Dialogue session ${session.id} - ${turnCount} turns, ${decisionCount} decisions`;
  }
}

// Export singleton instance
export const dialogueOrchestrator = new DialogueOrchestrator();
