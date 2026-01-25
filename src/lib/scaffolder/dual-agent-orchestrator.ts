/**
 * Dual-Agent Orchestrator
 * Manages the Architect-Advisor conversation loop for refined responses.
 * Streams internal dialogue and final response to the caller.
 */

import { generateId } from '@/lib/utils';
import type { UserLLMSettings } from '@/lib/llm';
import {
  type FreeformState,
  type ArchitectAnalysis,
  analyzeConversation,
} from './freeform-architect';
import {
  reviewArchitectResponse,
  type AdvisorReview,
  formatReviewSummary,
} from './advisor-agent';
import { streamComplete, type ChatMessage } from '@/lib/llm';

// Configuration
const MAX_ITERATIONS = 5;
const MIN_CONFIDENCE_TO_APPROVE = 75;

/**
 * A single turn in the dual-agent dialogue
 */
export interface DualAgentTurn {
  id: string;
  agent: 'architect' | 'advisor';
  content: string;
  timestamp: Date;
  metadata?: {
    confidence?: number;
    decision?: 'iterate' | 'approve';
    readinessScore?: number;
    iteration?: number;
  };
}

/**
 * Result of the dual-agent orchestration
 */
export interface DualAgentResult {
  /** The final response to send to the user */
  finalResponse: string;
  /** All internal dialogue turns */
  internalDialogue: DualAgentTurn[];
  /** Number of iterations performed */
  iterations: number;
  /** Final confidence score from Advisor */
  finalConfidence: number;
  /** Final analysis from Architect */
  analysis: ArchitectAnalysis;
  /** Session ID for debugging */
  sessionId: string;
  /** Total time taken in ms */
  durationMs: number;
}

/**
 * Events emitted during orchestration
 */
export type OrchestratorEvent =
  | { type: 'internal'; agent: 'architect' | 'advisor'; content: string; confidence?: number; decision?: 'iterate' | 'approve'; iteration: number }
  | { type: 'chunk'; content: string }
  | { type: 'analysis'; analysis: ArchitectAnalysis }
  | { type: 'done'; result: DualAgentResult };

/**
 * Generate the Architect's system prompt, optionally incorporating Advisor feedback
 */
function getArchitectPrompt(
  state: FreeformState,
  userMessage: string,
  advisorFeedback?: AdvisorReview,
  iteration?: number
): string {
  const conversationContext = state.messages
    .slice(-10)
    .map(m => `${m.role}: ${m.content}`)
    .join('\n');

  const currentEntities = state.entities.length > 0
    ? `\n\nCurrently identified entities:\n${JSON.stringify(state.entities, null, 2)}`
    : '';

  let feedbackSection = '';
  if (advisorFeedback && iteration && iteration > 1) {
    feedbackSection = `

ADVISOR FEEDBACK (Iteration ${iteration - 1}):
Confidence: ${advisorFeedback.confidence}%
Critique: ${advisorFeedback.critique}
Suggestions: ${advisorFeedback.suggestions.join('; ') || 'None'}
${advisorFeedback.refinedApproach ? `Refined Approach: ${advisorFeedback.refinedApproach}` : ''}
${advisorFeedback.gaps ? `Gaps to Address: ${advisorFeedback.gaps.join(', ')}` : ''}

Please incorporate this feedback to improve your response.`;
  }

  return `You are having a conversation about building an app. Continue the conversation naturally.

CONVERSATION HISTORY:
${conversationContext}

USER'S NEW MESSAGE:
${userMessage}
${currentEntities}

Current readiness score: ${state.readinessScore}/100
${feedbackSection}

Guidelines:
- If you understand what they want, describe what you'll build
- If you need clarification, ask a specific question (not generic templates)
- If readiness is high (>70), indicate you're ready to build
- Be conversational, not robotic
- Show your reasoning briefly

Respond naturally as the architect.`;
}

/**
 * Run the dual-agent orchestration loop
 * Yields events as they occur for real-time streaming
 */
export async function* orchestrateDualAgent(
  userMessage: string,
  state: FreeformState,
  userSettings?: UserLLMSettings
): AsyncGenerator<OrchestratorEvent> {
  const sessionId = `session-${generateId().substring(0, 8)}`;
  const startTime = Date.now();
  
  console.log(`\n🔄 [${sessionId}] Dual-Agent Loop Started`);
  
  const internalDialogue: DualAgentTurn[] = [];
  const advisorFeedbackHistory: AdvisorReview[] = [];
  
  let currentResponse = '';
  let currentAnalysis: ArchitectAnalysis | null = null;
  let finalConfidence = 0;
  let iteration = 0;
  let approved = false;

  // System prompt for Architect
  const architectSystemPrompt = `You are an autonomous AI Architect that builds apps through natural conversation.

## CORE PRINCIPLES
1. Ask questions ONLY when truly necessary - most details can be inferred
2. Infer technical details (field types, validations, UI patterns) from context
3. Learn from conversation context - each message builds on the previous
4. Decide dynamically when you have enough information to build
5. Generate specs without rigid templates - be creative and adaptive

## CAPABILITIES
- Extract entities and relationships from natural language descriptions
- Detect reference apps ("like Trello", "similar to Excel") and apply their patterns
- Make smart assumptions about data types (dates, numbers, text) and validations
- Propose multiple UI patterns when appropriate (tables, charts, kanban, cards)
- Know when you're ready to build (readiness score 0-100)

## RESPONSE STYLE
- Be conversational and helpful
- When you understand enough, propose what you'll build
- When asking questions, make them specific and contextual (never generic templates)
- Show your thinking process briefly
- When ready, clearly indicate you can build now`;

  while (!approved && iteration < MAX_ITERATIONS) {
    iteration++;
    console.log(`  ├─ 🏗️ Architect (iteration ${iteration})`);
    
    // Get the last Advisor feedback if iterating
    const lastFeedback = advisorFeedbackHistory.length > 0 
      ? advisorFeedbackHistory[advisorFeedbackHistory.length - 1]
      : undefined;

    // Generate Architect's response
    const architectPrompt = getArchitectPrompt(state, userMessage, lastFeedback, iteration);
    const architectMessages: ChatMessage[] = [
      { role: 'system', content: architectSystemPrompt },
      { role: 'user', content: architectPrompt },
    ];

    // Stream the Architect's response
    currentResponse = '';
    try {
      for await (const chunk of streamComplete({
        messages: architectMessages,
        temperature: 0.7,
        userSettings,
      })) {
        currentResponse += chunk;
      }
    } catch (error) {
      console.error(`  │  ❌ Architect stream failed:`, error);
      currentResponse = "I'm having trouble formulating a response. Let me try a simpler approach...";
    }

    // Log Architect's turn
    const architectTurn: DualAgentTurn = {
      id: generateId(),
      agent: 'architect',
      content: currentResponse,
      timestamp: new Date(),
      metadata: { iteration },
    };
    internalDialogue.push(architectTurn);

    // Emit internal event for Architect
    yield {
      type: 'internal',
      agent: 'architect',
      content: currentResponse,
      iteration,
    };

    console.log(`  │  Response length: ${currentResponse.length} chars`);

    // Get structured analysis
    currentAnalysis = await analyzeConversation(userMessage, state, userSettings);
    architectTurn.metadata!.readinessScore = currentAnalysis.readinessScore;

    // Now have Advisor review the response
    console.log(`  ├─ 🔍 Advisor (reviewing iteration ${iteration})`);
    
    const review = await reviewArchitectResponse(
      userMessage,
      currentResponse,
      currentAnalysis,
      state,
      advisorFeedbackHistory,
      userSettings
    );
    
    advisorFeedbackHistory.push(review);
    finalConfidence = review.confidence;

    // Log Advisor's turn
    const advisorTurn: DualAgentTurn = {
      id: generateId(),
      agent: 'advisor',
      content: review.critique,
      timestamp: new Date(),
      metadata: {
        confidence: review.confidence,
        decision: review.decision,
        iteration,
      },
    };
    internalDialogue.push(advisorTurn);

    // Emit internal event for Advisor
    yield {
      type: 'internal',
      agent: 'advisor',
      content: review.critique,
      confidence: review.confidence,
      decision: review.decision,
      iteration,
    };

    console.log(`  │  ${formatReviewSummary(review, iteration)}`);

    // Check if approved
    if (review.decision === 'approve' || review.confidence >= MIN_CONFIDENCE_TO_APPROVE) {
      approved = true;
      console.log(`  └─ ✅ Final response ready (${iteration} iteration${iteration > 1 ? 's' : ''}, ${finalConfidence}% confidence)`);
    } else {
      console.log(`  │  🔄 Iterating...`);
    }
  }

  // If we hit max iterations without approval, use the last response anyway
  if (!approved) {
    console.log(`  └─ ⚠️ Max iterations reached, using last response (${finalConfidence}% confidence)`);
  }

  // Stream the final response as chunks for typewriter effect
  const words = currentResponse.split(' ');
  for (let i = 0; i < words.length; i++) {
    const word = words[i] + (i < words.length - 1 ? ' ' : '');
    yield { type: 'chunk', content: word };
    // Small delay for typewriter effect - can be removed if streaming is fast enough
    // await new Promise(resolve => setTimeout(resolve, 10));
  }

  // Yield the analysis
  if (currentAnalysis) {
    yield { type: 'analysis', analysis: currentAnalysis };
  }

  // Build final result
  const result: DualAgentResult = {
    finalResponse: currentResponse,
    internalDialogue,
    iterations: iteration,
    finalConfidence,
    analysis: currentAnalysis!,
    sessionId,
    durationMs: Date.now() - startTime,
  };

  console.log(`\n📊 [${sessionId}] Session Summary:`);
  console.log(`   Iterations: ${result.iterations}`);
  console.log(`   Final Confidence: ${result.finalConfidence}%`);
  console.log(`   Duration: ${result.durationMs}ms`);
  console.log(`   Readiness: ${result.analysis?.readinessScore || 0}%`);

  yield { type: 'done', result };
}

/**
 * Run orchestration without streaming (for simpler use cases)
 */
export async function runDualAgentSync(
  userMessage: string,
  state: FreeformState,
  userSettings?: UserLLMSettings
): Promise<DualAgentResult> {
  let result: DualAgentResult | null = null;
  
  for await (const event of orchestrateDualAgent(userMessage, state, userSettings)) {
    if (event.type === 'done') {
      result = event.result;
    }
  }
  
  if (!result) {
    throw new Error('Orchestration completed without result');
  }
  
  return result;
}
