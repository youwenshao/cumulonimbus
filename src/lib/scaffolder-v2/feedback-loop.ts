
import { AnalyzedError, ErrorAnalyzer } from './error-analyzer';

export interface FeedbackIteration {
  iteration: number;
  code: string;
  errorLog: string;
  analysis: AnalyzedError;
  timestamp: Date;
}

export interface FeedbackSession {
  id: string;
  originalPrompt: string;
  iterations: FeedbackIteration[];
  maxIterations: number;
  status: 'active' | 'resolved' | 'failed';
}

export class FeedbackLoop {
  private session: FeedbackSession;

  constructor(id: string, originalPrompt: string, maxIterations: number = 3) {
    this.session = {
      id,
      originalPrompt,
      iterations: [],
      maxIterations,
      status: 'active'
    };
  }

  static fromSession(session: FeedbackSession): FeedbackLoop {
    const loop = new FeedbackLoop(session.id, session.originalPrompt, session.maxIterations);
    loop.session = JSON.parse(JSON.stringify(session)); // Deep copy to be safe
    return loop;
  }

  /**
   * Add a new feedback iteration
   */
  addFeedback(code: string, errorLog: string): FeedbackIteration {
    const analysis = ErrorAnalyzer.analyze(errorLog);
    const iteration: FeedbackIteration = {
      iteration: this.session.iterations.length + 1,
      code,
      errorLog,
      analysis,
      timestamp: new Date()
    };
    
    this.session.iterations.push(iteration);
    
    // Check if we reached max iterations
    if (this.session.iterations.length >= this.session.maxIterations) {
      this.session.status = 'failed';
    }

    return iteration;
  }

  /**
   * Generate a prompt for the LLM to fix the code
   */
  generateCorrectionPrompt(): string {
    const lastIteration = this.getLastIteration();
    if (!lastIteration) return '';

    return `
CRITICAL: The previous code generation failed with compilation/runtime errors.
Please analyze the error and regenerate the code with strict TypeScript fixes.

ORIGINAL REQUEST:
${this.session.originalPrompt}

GENERATED CODE (WITH ERRORS):
\`\`\`typescript
${lastIteration.code}
\`\`\`

ERROR LOG:
${lastIteration.errorLog}

ERROR ANALYSIS:
Category: ${lastIteration.analysis.category}
Cause: ${lastIteration.analysis.rootCause}
Suggestion: ${lastIteration.analysis.suggestion}

CORRECTION REQUIREMENTS:
1. Fix the specific error described above.
2. Ensure strict TypeScript compliance:
   - No implicit 'any' types
   - All function parameters must have explicit types
   - All event handlers must use proper React event types (e.g., React.ChangeEvent<HTMLInputElement>)
   - All useState hooks must have explicit type arguments (e.g., useState<string>(''))
3. Ensure the code still meets the original requirements.
4. Return ONLY the corrected code.
`.trim();
  }

  getLastIteration(): FeedbackIteration | undefined {
    return this.session.iterations[this.session.iterations.length - 1];
  }

  getSession(): FeedbackSession {
    return this.session;
  }

  markResolved() {
    this.session.status = 'resolved';
  }
}
