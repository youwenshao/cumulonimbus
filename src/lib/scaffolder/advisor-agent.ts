/**
 * Advisor Agent
 * Reviews the Architect's responses and provides feedback, suggestions, and confidence scores.
 * Works in tandem with the Architect in a dual-agent loop.
 */

import { completeJSON, type ChatMessage } from '@/lib/llm';
import type { UserLLMSettings } from '@/lib/llm';
import type { FreeformState, ArchitectAnalysis } from './freeform-architect';

/**
 * Advisor's review of the Architect's response
 */
export interface AdvisorReview {
  /** Critique of the Architect's current approach */
  critique: string;
  /** Specific suggestions for improvement */
  suggestions: string[];
  /** Confidence score 0-100 that the response is good enough */
  confidence: number;
  /** Decision to iterate (continue refining) or approve (ready to send) */
  decision: 'iterate' | 'approve';
  /** Optional refined approach for the Architect to consider */
  refinedApproach?: string;
  /** Key gaps or missing information identified */
  gaps?: string[];
  /** What's working well in the current approach */
  strengths?: string[];
}

// Schema for LLM JSON response
const ADVISOR_REVIEW_SCHEMA = `{
  "critique": "string - honest assessment of the Architect's response",
  "suggestions": ["string - specific improvement suggestions"],
  "confidence": 0-100,
  "decision": "iterate" | "approve",
  "refinedApproach": "string (optional - better approach for Architect)",
  "gaps": ["string (optional - missing information)"],
  "strengths": ["string (optional - what's working well)"]
}`;

const ADVISOR_SYSTEM_PROMPT = `You are an Advisor Agent reviewing an Architect's response in an app-building conversation.

## YOUR ROLE
You evaluate the Architect's proposed response before it's sent to the user. Your goal is to ensure high-quality, helpful responses that efficiently move toward building the app.

## EVALUATION CRITERIA
1. **Clarity**: Is the response clear and understandable?
2. **Relevance**: Does it address the user's actual request?
3. **Progress**: Does it move toward a buildable app specification?
4. **Inference Quality**: Are the Architect's assumptions reasonable?
5. **Question Quality**: If asking questions, are they specific and necessary?
6. **Completeness**: Is anything critical missing from the response?

## CONFIDENCE SCORING
- 0-30: Major issues - response is confusing, off-topic, or unhelpful
- 30-50: Needs work - some good points but significant gaps
- 50-70: Decent - acceptable but could be improved
- 70-85: Good - minor refinements possible
- 85-100: Excellent - ready to send to user

## DECISION CRITERIA
- **APPROVE** when:
  - Confidence >= 75 AND the response is helpful
  - The response clearly moves the conversation forward
  - Questions (if any) are specific and necessary
  
- **ITERATE** when:
  - Confidence < 75
  - Critical information is missing
  - The response might confuse the user
  - Better questions could be asked
  - The Architect made poor assumptions

## PROVIDING FEEDBACK
When iterating, give the Architect specific, actionable feedback:
- What's wrong with the current approach
- What specific changes would improve it
- What the refined approach should focus on

Be concise but thorough. Your feedback directly improves the final response.`;

/**
 * Review the Architect's response and provide feedback
 */
export async function reviewArchitectResponse(
  userMessage: string,
  architectResponse: string,
  architectAnalysis: ArchitectAnalysis | null,
  state: FreeformState,
  previousFeedback?: AdvisorReview[],
  userSettings?: UserLLMSettings
): Promise<AdvisorReview> {
  // Build context from conversation history
  const conversationContext = state.messages
    .slice(-6) // Last 6 messages for context
    .map(m => `${m.role.toUpperCase()}: ${m.content}`)
    .join('\n');

  // Build feedback history if iterating
  const feedbackHistory = previousFeedback && previousFeedback.length > 0
    ? `\n\nPREVIOUS FEEDBACK (iteration ${previousFeedback.length}):\n${previousFeedback.map((f, i) => 
        `[Round ${i + 1}] Confidence: ${f.confidence}%, Decision: ${f.decision}\nCritique: ${f.critique}`
      ).join('\n')}`
    : '';

  const analysisContext = architectAnalysis
    ? `\nARCHITECT'S ANALYSIS:
- Understanding: ${architectAnalysis.understanding}
- Readiness Score: ${architectAnalysis.readinessScore}/100
- Entities Identified: ${architectAnalysis.entities.length}
- Can Build: ${architectAnalysis.canBuild}`
    : '';

  const reviewPrompt = `Review the Architect's response to this user message.

CONVERSATION CONTEXT:
${conversationContext}

USER'S LATEST MESSAGE:
${userMessage}

ARCHITECT'S PROPOSED RESPONSE:
${architectResponse}
${analysisContext}
${feedbackHistory}

Evaluate this response and decide whether to:
1. APPROVE - Send to user (confidence >= 75, response is helpful)
2. ITERATE - Send back to Architect for refinement

Consider:
- Does this response help the user?
- Are any questions specific and necessary?
- Is progress being made toward a buildable spec?
- Would the user understand this response?

Respond with valid JSON only.`;

  const messages: ChatMessage[] = [
    { role: 'system', content: ADVISOR_SYSTEM_PROMPT },
    { role: 'user', content: reviewPrompt },
  ];

  try {
    const review = await completeJSON<AdvisorReview>({
      messages,
      schema: ADVISOR_REVIEW_SCHEMA,
      temperature: 0.3, // Lower temperature for more consistent evaluation
      userSettings,
    });

    // Ensure decision is based on confidence
    if (review.confidence >= 75 && review.decision === 'iterate') {
      // High confidence but marked iterate - likely approve
      review.decision = 'approve';
    } else if (review.confidence < 50 && review.decision === 'approve') {
      // Low confidence but marked approve - should iterate
      review.decision = 'iterate';
    }

    return review;
  } catch (error) {
    console.error('Advisor review failed:', error);
    // On error, approve with medium confidence to avoid infinite loops
    return {
      critique: 'Unable to fully evaluate - proceeding with current response.',
      suggestions: [],
      confidence: 65,
      decision: 'approve',
      gaps: ['Evaluation incomplete due to error'],
    };
  }
}

/**
 * Generate a summary of the review process for debugging
 */
export function formatReviewSummary(review: AdvisorReview, iteration: number): string {
  const decision = review.decision === 'approve' ? '✅ APPROVED' : '🔄 ITERATE';
  return `[Iteration ${iteration}] ${decision} (${review.confidence}% confidence)
Critique: ${review.critique}
${review.suggestions.length > 0 ? `Suggestions: ${review.suggestions.join(', ')}` : ''}
${review.gaps && review.gaps.length > 0 ? `Gaps: ${review.gaps.join(', ')}` : ''}`;
}
