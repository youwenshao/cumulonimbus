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
const MAX_ITERATIONS = 3;
const MIN_CONFIDENCE_TO_APPROVE = 70;
const MIN_CONFIDENCE_WITH_ANSWERS = 60; // Lower threshold when Advisor answered questions

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
  | { type: 'thinking'; agent: 'architect' | 'advisor'; content: string; iteration: number; isStreaming?: boolean }
  | { type: 'internal'; agent: 'architect' | 'advisor'; content: string; confidence?: number; decision?: 'iterate' | 'approve'; iteration: number; answeredQuestions?: Array<{ question: string; answer: string }>; decisions?: Array<{ choice: string; rationale: string }> }
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
    .slice(-6) // Reduced from 10 for faster processing
    .map(m => `${m.role}: ${m.content}`)
    .join('\n');

  const currentEntities = state.entities.length > 0
    ? `\nEntities: ${state.entities.map(e => e.name).join(', ')}`
    : '';

  // For iterations > 1, Advisor feedback is the PRIMARY directive
  if (advisorFeedback && iteration && iteration > 1) {
    // Build concise instruction block from Advisor
    const instructions: string[] = [];
    
    // Advisor's answered questions become FACTS to use
    if (advisorFeedback.answeredQuestions && advisorFeedback.answeredQuestions.length > 0) {
      instructions.push('USE THESE ANSWERS (do not re-ask):');
      advisorFeedback.answeredQuestions.forEach(aq => {
        instructions.push(`• ${aq.question} → ${aq.answer}`);
      });
    }
    
    // Advisor's decisions become REQUIREMENTS
    if (advisorFeedback.decisions && advisorFeedback.decisions.length > 0) {
      instructions.push('APPLY THESE DECISIONS:');
      advisorFeedback.decisions.forEach(d => {
        instructions.push(`• ${d.choice}`);
      });
    }
    
    // Include refined approach if provided
    if (advisorFeedback.refinedApproach) {
      instructions.push(`APPROACH: ${advisorFeedback.refinedApproach}`);
    }
    
    // Include specific suggestions
    if (advisorFeedback.suggestions && advisorFeedback.suggestions.length > 0) {
      instructions.push('IMPLEMENT:');
      advisorFeedback.suggestions.forEach(s => {
        instructions.push(`• ${s}`);
      });
    }

    return `Revise your response based on Advisor instructions.

USER'S MESSAGE: ${userMessage}

ADVISOR INSTRUCTIONS (FOLLOW EXACTLY):
${instructions.join('\n')}

${advisorFeedback.critique ? `GUIDANCE: ${advisorFeedback.critique}` : ''}

Your task: Incorporate ALL Advisor instructions into a clear response. Do NOT ask questions the Advisor already answered.${currentEntities}`;
  }

  // First iteration - standard prompt
  return `Continue the conversation about building an app.

RECENT MESSAGES:
${conversationContext}

USER: ${userMessage}
${currentEntities}

Readiness: ${state.readinessScore}/100

Guidelines:
- Describe what you'll build if you understand
- Don't ask questions unless core purpose is unclear
- Be concise and specific

Respond as the architect.`;
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

    // Emit thinking start event for Architect
    yield {
      type: 'thinking',
      agent: 'architect',
      content: '',
      iteration,
      isStreaming: true,
    };

    // Stream the Architect's response with real-time thinking events
    currentResponse = '';
    let thinkingBuffer = '';
    try {
      for await (const chunk of streamComplete({
        messages: architectMessages,
        temperature: 0.7,
        userSettings,
      })) {
        currentResponse += chunk;
        thinkingBuffer += chunk;
        
        // Emit thinking updates periodically (every ~50 chars or on newlines)
        if (thinkingBuffer.length >= 50 || chunk.includes('\n')) {
          yield {
            type: 'thinking',
            agent: 'architect',
            content: thinkingBuffer,
            iteration,
            isStreaming: true,
          };
          thinkingBuffer = '';
        }
      }
      
      // Emit any remaining buffer
      if (thinkingBuffer.length > 0) {
        yield {
          type: 'thinking',
          agent: 'architect',
          content: thinkingBuffer,
          iteration,
          isStreaming: true,
        };
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

    // Emit internal event for Architect (complete)
    yield {
      type: 'internal',
      agent: 'architect',
      content: currentResponse,
      iteration,
    };

    console.log(`  │  Response length: ${currentResponse.length} chars`);

    // Emit thinking event for Advisor
    yield {
      type: 'thinking',
      agent: 'advisor',
      content: 'Reviewing response and making decisions...',
      iteration,
      isStreaming: true,
    };

    // Now have Advisor review the response (skip analysis during loop for speed)
    console.log(`  ├─ 🔍 Advisor (reviewing iteration ${iteration})`);
    
    const review = await reviewArchitectResponse(
      userMessage,
      currentResponse,
      null, // Skip analysis during loop - computed once at end
      state,
      advisorFeedbackHistory,
      userSettings
    );
    
    advisorFeedbackHistory.push(review);
    finalConfidence = review.confidence;

    // Build Advisor's thinking content with answered questions
    let advisorThinkingContent = review.critique;
    if (review.answeredQuestions && review.answeredQuestions.length > 0) {
      advisorThinkingContent += '\n\nAnswered Questions:\n' + 
        review.answeredQuestions.map(aq => `• ${aq.question} → ${aq.answer}`).join('\n');
    }
    if (review.decisions && review.decisions.length > 0) {
      advisorThinkingContent += '\n\nDecisions Made:\n' + 
        review.decisions.map(d => `• ${d.choice}`).join('\n');
    }

    // Log Advisor's turn
    const advisorTurn: DualAgentTurn = {
      id: generateId(),
      agent: 'advisor',
      content: advisorThinkingContent,
      timestamp: new Date(),
      metadata: {
        confidence: review.confidence,
        decision: review.decision,
        iteration,
      },
    };
    internalDialogue.push(advisorTurn);

    // Emit internal event for Advisor with full details
    yield {
      type: 'internal',
      agent: 'advisor',
      content: advisorThinkingContent,
      confidence: review.confidence,
      decision: review.decision,
      iteration,
      answeredQuestions: review.answeredQuestions?.map(aq => ({ question: aq.question, answer: aq.answer })),
      decisions: review.decisions,
    };

    console.log(`  │  ${formatReviewSummary(review, iteration)}`);
    if (review.answeredQuestions && review.answeredQuestions.length > 0) {
      console.log(`  │  📝 Advisor answered ${review.answeredQuestions.length} question(s)`);
    }
    if (review.decisions && review.decisions.length > 0) {
      console.log(`  │  ⚡ Advisor made ${review.decisions.length} decision(s)`);
    }

    // Check if approved with optimized conditions
    const advisorAnsweredQuestions = review.answeredQuestions && review.answeredQuestions.length > 0;
    const advisorMadeDecisions = review.decisions && review.decisions.length > 0;
    const hasAutonomousAction = advisorAnsweredQuestions || advisorMadeDecisions;
    
    // Approve if:
    // 1. Advisor explicitly approves, OR
    // 2. Confidence >= MIN_CONFIDENCE_TO_APPROVE, OR
    // 3. Advisor took autonomous action AND confidence >= MIN_CONFIDENCE_WITH_ANSWERS
    if (review.decision === 'approve' || review.confidence >= MIN_CONFIDENCE_TO_APPROVE) {
      approved = true;
      console.log(`  └─ ✅ Final response ready (${iteration} iteration${iteration > 1 ? 's' : ''}, ${finalConfidence}% confidence)`);
    } else if (hasAutonomousAction && review.confidence >= MIN_CONFIDENCE_WITH_ANSWERS) {
      // Advisor answered questions/made decisions AND confidence is reasonable - approve immediately
      approved = true;
      console.log(`  └─ ✅ Approved with Advisor's autonomous actions (${iteration} iteration${iteration > 1 ? 's' : ''}, ${finalConfidence}% confidence)`);
    } else if (hasAutonomousAction && !review.needsUserInput) {
      // Advisor answered questions but confidence is low - one more iteration to incorporate
      console.log(`  │  🔄 Quick iteration to incorporate Advisor's ${advisorAnsweredQuestions ? 'answers' : 'decisions'}...`);
    } else {
      console.log(`  │  🔄 Iterating (confidence: ${finalConfidence}%)...`);
    }
  }

  // If we hit max iterations without approval, use the last response anyway
  if (!approved) {
    console.log(`  └─ ⚠️ Max iterations reached, using last response (${finalConfidence}% confidence)`);
  }

  // Run final analysis ONCE after the loop (optimized - not run during iterations)
  console.log(`  ├─ 📊 Computing final analysis...`);
  try {
    currentAnalysis = await analyzeConversation(userMessage, state, userSettings);
    console.log(`  │  Readiness: ${currentAnalysis.readinessScore}%, Can Build: ${currentAnalysis.canBuild}`);
    
    // If Advisor approved but analysis doesn't have a spec, force spec generation
    if (approved && finalConfidence >= 70 && !currentAnalysis.spec && state.entities.length > 0) {
      console.log(`  │  🔧 Advisor approved but no spec - generating fallback spec from entities`);
      currentAnalysis.spec = {
        name: state.entities[0]?.name || 'My App',
        description: currentResponse.substring(0, 200),
        entities: state.entities,
        views: [
          {
            type: 'table',
            title: `All ${state.entities[0]?.name || 'Items'}`,
            entityName: state.entities[0]?.name || 'Item'
          }
        ],
        category: 'Productivity'
      };
      currentAnalysis.canBuild = true;
      currentAnalysis.readinessScore = Math.max(currentAnalysis.readinessScore, 70);
    }
  } catch (analysisError) {
    console.error(`  │  ❌ Analysis failed:`, analysisError);
    // Create a fallback analysis based on confidence and entities
    const shouldGenerateSpec = approved && finalConfidence >= 70 && state.entities.length > 0;
    
    currentAnalysis = {
      understanding: currentResponse.substring(0, 200),
      responseMessage: currentResponse,
      readinessScore: Math.min(finalConfidence, 80), // Use confidence as proxy
      entities: state.entities,
      canBuild: shouldGenerateSpec,
      shouldAskQuestion: false,
      spec: shouldGenerateSpec ? {
        name: state.entities[0]?.name || 'My App',
        description: currentResponse.substring(0, 200),
        entities: state.entities,
        views: [
          {
            type: 'table',
            title: `All ${state.entities[0]?.name || 'Items'}`,
            entityName: state.entities[0]?.name || 'Item'
          }
        ],
        category: 'Productivity'
      } : state.spec,
    };
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
