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
  /** Questions the Advisor answered on behalf of the user */
  answeredQuestions?: Array<{
    question: string;
    answer: string;
    reasoning: string;
  }>;
  /** Autonomous decisions made by the Advisor */
  decisions?: Array<{
    choice: string;
    rationale: string;
  }>;
  /** Whether the response truly needs user input (only for core purpose questions) */
  needsUserInput?: boolean;
}

// Schema for LLM JSON response
const ADVISOR_REVIEW_SCHEMA = `{
  "critique": "string - honest assessment of the Architect's response",
  "suggestions": ["string - specific improvement suggestions"],
  "confidence": 0-100,
  "decision": "iterate" | "approve",
  "refinedApproach": "string (optional - better approach for Architect)",
  "gaps": ["string (optional - missing information)"],
  "strengths": ["string (optional - what's working well)"],
  "answeredQuestions": [{ "question": "string", "answer": "string", "reasoning": "string" }] (optional - questions you answered for the user),
  "decisions": [{ "choice": "string", "rationale": "string" }] (optional - autonomous choices you made),
  "needsUserInput": true|false (optional - ONLY true if core purpose is unclear)
}`;

const ADVISOR_SYSTEM_PROMPT = `You are an Advisor Agent - the USER'S ADVOCATE and DECISION-MAKER, not a passive reviewer.

## YOUR ROLE: INSTRUCTIVE DECISION-MAKER
You are NOT a validator giving vague feedback. You are an INSTRUCTOR who:
1. ANSWERS questions the Architect poses (don't forward to user)
2. DECIDES technical and design choices definitively
3. INSTRUCTS the Architect with SPECIFIC, ACTIONABLE guidance
4. APPROVES quickly when the response is good enough (don't nitpick)

## CRITICAL: BE SPECIFIC, NOT VAGUE
BAD feedback: "The response could be clearer about data structure"
GOOD feedback: "Use this schema: { id: string, name: string, date: Date, status: 'pending'|'done' }"

BAD feedback: "Consider what UI pattern works best"
GOOD feedback: "Use a card-based grid layout with 3 columns, each card showing name and status"

## PLATFORM CONTEXT
Apps run on Cumulonimbus:
- React + Tailwind CSS (dark theme default)
- Data API at /api/apps/{appId}/data (JSON storage)
- No external services (AWS, Firebase, etc.)

## WHEN TO APPROVE (be VERY liberal - default to approval)

APPROVE if the response:
- Communicates the core purpose clearly (even if details are light)
- Has enough to start building an MVP (perfection NOT required)
- Doesn't ask questions about obvious things
- Identifies at least the primary entity/entities

APPROVE EVEN IF:
- Some details could be better (minor improvements don't require iteration)
- Response isn't perfect (good enough is good enough)
- Minor gaps exist (V2 agents will infer during build)
- UI/visualization details are missing (UI Designer handles this)

DO NOT iterate just because:
- Something "could be better" or "could use more detail"
- You think of additional nice-to-have features
- Minor wording improvements would help
- You're being perfectionistic

## WHEN TO ITERATE (be VERY conservative - rare)

ITERATE ONLY if:
- Response is confusing, contradictory, or nonsensical (not just improvable)
- Core purpose is completely unclear (not just missing details)
- Response asks questions about things that are obviously common patterns
- Architect fundamentally misunderstood the request

CRITICAL: The V2 specialized agents (Schema Designer, UI Designer, Workflow Agent) are designed to handle ambiguity and fill gaps. Your job is NOT to ensure perfection, but to ensure the Architect understood the basic intent. Trust the pipeline.

## DECISION-MAKING (be definitive)
When the Architect is uncertain or asks questions:
- Data structure → Define the exact schema
- UI pattern → Specify the exact layout (cards, table, list, etc.)
- Field types → State exactly: string, number, date, enum with values
- Features → List the exact MVP features, nothing more

## AESTHETIC DEFAULTS (use these)
- Dark theme, generous whitespace
- Card-based or table layouts
- Single accent color (yellow #facc15)
- Clean typography hierarchy

## CONFIDENCE SCORING (be VERY generous)
- 50-60: Approve if the core purpose is clear, even if response is basic
- 60-70: Approve for decent responses that capture the main idea
- 70+: Solid response, definitely approve
- 80+: Excellent response

IMPORTANT: Give 60+ confidence for ANY response where the Architect understood the core purpose and identified primary entities. The specialized V2 agents will handle the rest. Only give <60 for truly confused or nonsensical responses.

## OUTPUT FORMAT
Your "critique" should be INSTRUCTIONS, not observations:
- Instead of "The data model is unclear" → "Use this data model: {...}"
- Instead of "Consider adding validation" → "Add validation: name required, date must be future"

"suggestions" should be SPECIFIC CHANGES, not vague ideas.
"refinedApproach" should be a CONCRETE ALTERNATIVE if needed.

Be decisive and instructive. The Architect needs clear direction, not open-ended feedback.`;

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

  const reviewPrompt = `Review and INSTRUCT. Be decisive, not vague.

CONVERSATION:
${conversationContext}

USER'S MESSAGE:
${userMessage}

ARCHITECT'S RESPONSE:
${architectResponse}
${analysisContext}
${feedbackHistory}

## YOUR TASK (in order)
1. Is the response GOOD ENOUGH to send? (Don't nitpick - approve if it works)
2. If Architect asks questions → ANSWER them with SPECIFIC values
3. If decisions needed → MAKE them definitively
4. Only iterate if something is WRONG, not just improvable

## DECISION DEFAULTS (use these exact values)
- Data schema: { id: string, ...fields, createdAt: Date }
- UI: Card grid or table, dark theme, yellow accent
- Validation: Required fields only, no complex rules
- Features: MVP only - add/view/edit/delete

## APPROVAL BIAS
- APPROVE if response communicates the plan clearly
- APPROVE if you answered questions (confidence 60+ is fine)
- APPROVE if minor issues only (don't iterate for polish)
- ITERATE only if confused, contradictory, or missing critical info

## CRITIQUE FORMAT (be INSTRUCTIVE)
Your critique must be ACTIONABLE INSTRUCTIONS:
✗ "The data model could be clearer" 
✓ "Data model: { id, title: string, dueDate: Date, priority: 'low'|'medium'|'high' }"

✗ "Consider the UI layout"
✓ "Layout: 2-column grid of cards, each showing title and priority badge"

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

    // Ensure decision is based on confidence with approval bias
    const hasAutonomousActions = (review.answeredQuestions && review.answeredQuestions.length > 0) ||
                                  (review.decisions && review.decisions.length > 0);
    
    if (review.confidence >= 70 && review.decision === 'iterate') {
      // High confidence but marked iterate - approve instead
      review.decision = 'approve';
    } else if (hasAutonomousActions && review.confidence >= 60 && review.decision === 'iterate') {
      // Advisor took action and confidence is reasonable - approve
      review.decision = 'approve';
    } else if (review.confidence < 40 && review.decision === 'approve') {
      // Very low confidence but marked approve - should iterate
      review.decision = 'iterate';
    }
    // Note: Allow approval at confidence 40-60 if Advisor explicitly chose to approve

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
