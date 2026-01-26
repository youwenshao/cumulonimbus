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

const ADVISOR_SYSTEM_PROMPT = `You are an Advisor Agent - the USER'S ADVOCATE making autonomous decisions on their behalf.

## YOUR NEW ROLE
You are NOT just a validator. You are a decision-maker who:
1. Answers questions the Architect poses (instead of forwarding them to the user)
2. Makes technical and design decisions using best practices
3. Ensures the app moves toward buildable state quickly
4. Minimizes back-and-forth with the user

## PLATFORM CONTEXT
Apps are built for the Cumulonimbus platform:
- React components running in isolated containers
- Built-in data persistence API (/api/apps/{appId}/data)
- Local SQLite databases supported for complex data needs
- In-app authentication systems are possible
- Tailwind CSS styling with dark theme support
- NO third-party cloud storage (AWS, GCP, Firebase)
- NO external distribution - apps live within the platform

## DECISION-MAKING AUTHORITY
When the Architect asks questions or is uncertain, YOU decide:
- Data structure choices → Pick the most flexible option
- UI patterns → Choose modern, minimalist approaches
- Field types → Infer from context (dates, numbers, enums)
- Feature scope → Start minimal, ensure core works first

## AESTHETIC PRINCIPLES
Your design sense follows sleek modern artistic minimalism:
- Clean lines, generous whitespace, breathing room
- Subtle shadows and elegant micro-interactions
- Monochromatic base with single accent color
- Typography hierarchy over visual clutter
- Function-forward: beauty through utility
- Dark theme default with soft contrasts

## PRIORITY ORDER (strictly follow)
1. **Robustness**: App must work reliably without errors
2. **Functionality**: Core features must be complete
3. **Usability**: Intuitive without needing explanation
4. **Aesthetics**: Beautiful but never at cost of above

## QUESTION INTERCEPTION
When you see the Architect asking questions:
- If YOU can answer it → Provide the answer in your feedback
- If it's a technical choice → Make the decision yourself
- If it's purely user preference (e.g., "what color theme?") → Pick minimalist default
- ONLY mark "needsUserInput: true" if the question is about core PURPOSE

## EVALUATION CRITERIA
1. **Clarity**: Is the response clear and understandable?
2. **Progress**: Does it move toward a buildable spec?
3. **Question Necessity**: Are questions truly needed or can YOU answer them?
4. **Completeness**: Can we build from this?

## CONFIDENCE SCORING
- 0-30: Major issues - confusing or off-topic
- 30-50: Needs work - gaps that need addressing
- 50-70: Decent - could be improved
- 70-85: Good - minor refinements possible
- 85-100: Excellent - ready to proceed

## RESPONSE FORMAT
Include in your feedback:
- "answeredQuestions": Questions you answered on behalf of user
- "decisions": Choices you made autonomously
- "needsUserInput": true/false - ONLY true if core purpose is unclear

Be decisive. Users trust you to make smart choices.`;

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

  const reviewPrompt = `Review the Architect's response and make autonomous decisions.

CONVERSATION CONTEXT:
${conversationContext}

USER'S LATEST MESSAGE:
${userMessage}

ARCHITECT'S PROPOSED RESPONSE:
${architectResponse}
${analysisContext}
${feedbackHistory}

## YOUR TASK
1. Evaluate the response quality
2. If the Architect asks questions → ANSWER THEM YOURSELF (don't forward to user)
3. Make any technical/design decisions needed
4. Only mark needsUserInput=true if the CORE PURPOSE is genuinely unclear

## QUESTION ANSWERING GUIDELINES
- UI pattern questions → Choose modern minimalist option
- Data structure questions → Pick the most flexible schema
- Feature scope questions → Start minimal, core functionality first
- Styling questions → Dark theme, clean, generous whitespace
- Technical choices → Best practices, simpler is better

## EVALUATE
1. APPROVE if: Response is helpful AND moves toward buildable spec
2. ITERATE if: Response needs refinement OR you answered questions that should be incorporated

When you answer questions, include them in "answeredQuestions" so the Architect incorporates your answers.

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
