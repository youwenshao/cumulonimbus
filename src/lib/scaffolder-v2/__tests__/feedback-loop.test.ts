/**
 * Feedback Loop Tests
 * Tests for error detection, smart context extraction, and feedback loop management
 */

import { ErrorAnalyzer, type ErrorCategory } from '../error-analyzer';
import { ErrorDetectionService, errorDetectionService, type DetectedError } from '../error-detection-service';
import { SmartContextExtractor, smartContextExtractor } from '../smart-context-extractor';
import { FeedbackLoop, type FeedbackSession } from '../feedback-loop';
import { FEEDBACK_CONFIG, getRetryStrategy, getContextWindowSize, shouldRetry } from '../feedback-config';
import type { ServerBundleResult, BundleError } from '@/lib/runtime/server-bundler';

// Sample code fixtures for testing
const sampleCodeWithSyntaxError = `
function App() {
  const [count, setCount] = useState(0);
  
  const handleClick = () => {
    setCount(count + 1;  // Missing closing parenthesis
  };

  return (
    <div className="p-4">
      <button onClick={handleClick}>
        Count: {count}
      </button>
    </div>
  );
}
`;

const sampleValidCode = `
function App() {
  const [count, setCount] = useState(0);
  
  const handleClick = () => {
    setCount(count + 1);
  };

  return (
    <div className="p-4">
      <button onClick={handleClick}>
        Count: {count}
      </button>
    </div>
  );
}
`;

const sampleCodeWithImports = `
import { useState, useEffect } from 'react';
import { Heart, Star, Plus } from 'lucide-react';
import { format } from 'date-fns';

function App() {
  const [count, setCount] = useState(0);
  const [date, setDate] = useState(new Date());
  
  useEffect(() => {
    console.log('Count changed:', count);
  }, [count]);

  const handleClick = () => {
    setCount(count + 1;  // Missing closing parenthesis - line 14
  };

  return (
    <div className="p-4">
      <Heart className="text-red-500" />
      <span>{format(date, 'yyyy-MM-dd')}</span>
      <button onClick={handleClick}>
        Count: {count}
      </button>
    </div>
  );
}
`;

// ====================
// Error Analyzer Tests
// ====================

describe('ErrorAnalyzer', () => {
  describe('analyze', () => {
    it('should detect syntax errors', () => {
      const error = "SyntaxError: Unexpected token ')'";
      const result = ErrorAnalyzer.analyze(error);

      expect(result.category).toBe('syntax');
      expect(result.rootCause).toBe('Code structure violation or invalid syntax');
    });

    it('should detect semantic errors', () => {
      const error = "TypeError: Cannot read property 'map' of undefined";
      const result = ErrorAnalyzer.analyze(error);

      expect(result.category).toBe('semantic');
    });

    it('should detect environment errors', () => {
      const error = "Module not found: 'axios'";
      const result = ErrorAnalyzer.analyze(error);

      expect(result.category).toBe('environment');
    });

    it('should extract line numbers from error messages', () => {
      const error = "Error at line 42:10: Unexpected token";
      const result = ErrorAnalyzer.analyze(error);

      expect(result.line).toBe(42);
      expect(result.column).toBe(10);
    });

    it('should handle unknown error patterns', () => {
      const error = "Some random error message";
      const result = ErrorAnalyzer.analyze(error);

      expect(result.category).toBe('unknown');
    });
  });
});

// ====================
// Error Detection Service Tests
// ====================

describe('ErrorDetectionService', () => {
  let service: ErrorDetectionService;

  beforeEach(() => {
    service = new ErrorDetectionService();
  });

  describe('detectServerBundlingErrors', () => {
    it('should detect no errors for successful bundle', () => {
      const result: ServerBundleResult = {
        success: true,
        code: 'bundled code',
        errors: [],
        warnings: [],
        requiredBundles: ['utils'],
        stats: {
          inputSize: 100,
          outputSize: 200,
          buildTimeMs: 50,
        },
      };

      const detection = service.detectServerBundlingErrors(result);

      expect(detection.hasErrors).toBe(false);
      expect(detection.errors).toHaveLength(0);
    });

    it('should detect errors from failed bundle', () => {
      const bundleErrors: BundleError[] = [
        {
          message: "Unexpected token ')'",
          line: 10,
          column: 5,
          source: 'setCount(count + 1;',
        },
      ];

      const result: ServerBundleResult = {
        success: false,
        code: '',
        errors: bundleErrors,
        warnings: [],
        requiredBundles: [],
        stats: {
          inputSize: 100,
          outputSize: 0,
          buildTimeMs: 50,
        },
      };

      const detection = service.detectServerBundlingErrors(result);

      expect(detection.hasErrors).toBe(true);
      expect(detection.errors.length).toBeGreaterThan(0);
      expect(detection.primaryError).toBeDefined();
      expect(detection.primaryError?.line).toBe(10);
    });

    it('should prioritize syntax errors over other types', () => {
      const bundleErrors: BundleError[] = [
        { message: "Module 'axios' not found", line: 1 },
        { message: "SyntaxError: Unexpected token", line: 5 },
      ];

      const result: ServerBundleResult = {
        success: false,
        code: '',
        errors: bundleErrors,
        warnings: [],
        requiredBundles: [],
        stats: {
          inputSize: 100,
          outputSize: 0,
          buildTimeMs: 50,
        },
      };

      const detection = service.detectServerBundlingErrors(result);

      // Syntax error should be primary (highest priority)
      expect(detection.primaryError?.analysis.category).toBe('syntax');
    });
  });

  describe('detectRuntimeErrors', () => {
    it('should detect runtime errors', () => {
      const errorData = {
        message: "TypeError: Cannot read property 'length' of undefined",
        line: 25,
        column: 10,
        stack: 'at App (index.js:25:10)',
      };

      const detection = service.detectRuntimeErrors(errorData);

      expect(detection.hasErrors).toBe(true);
      expect(detection.primaryError?.stage).toBe('runtime');
      expect(detection.primaryError?.analysis.category).toBe('semantic');
    });
  });

  describe('isFixableByLLM', () => {
    it('should consider syntax errors fixable', () => {
      const error: DetectedError = {
        id: 'test',
        stage: 'server_bundling',
        message: 'SyntaxError: Unexpected token',
        analysis: {
          originalMessage: 'SyntaxError: Unexpected token',
          category: 'syntax',
          rootCause: 'Invalid syntax',
          suggestion: 'Check brackets',
        },
        timestamp: new Date(),
      };

      expect(service.isFixableByLLM(error)).toBe(true);
    });

    it('should consider capability errors not fixable', () => {
      const error: DetectedError = {
        id: 'test',
        stage: 'server_bundling',
        message: 'WebSocket is not allowed',
        analysis: {
          originalMessage: 'WebSocket is not allowed',
          category: 'capability',
          rootCause: 'Feature not available',
          suggestion: 'Use alternative',
        },
        timestamp: new Date(),
      };

      expect(service.isFixableByLLM(error)).toBe(false);
    });
  });
});

// ====================
// Smart Context Extractor Tests
// ====================

describe('SmartContextExtractor', () => {
  describe('extract', () => {
    it('should extract surrounding code around error', () => {
      const error: DetectedError = {
        id: 'test',
        stage: 'server_bundling',
        message: 'Syntax error',
        analysis: {
          originalMessage: 'Syntax error',
          category: 'syntax',
          rootCause: 'Invalid syntax',
          suggestion: 'Fix it',
        },
        line: 6,
        timestamp: new Date(),
      };

      const context = smartContextExtractor.extract(sampleCodeWithSyntaxError, error);

      expect(context.errorLocation.line).toBe(6);
      expect(context.surroundingCode).toContain('setCount');
      expect(context.surroundingRange).toBeDefined();
    });

    it('should extract relevant imports only', () => {
      const error: DetectedError = {
        id: 'test',
        stage: 'server_bundling',
        message: 'Syntax error at line 14',
        analysis: {
          originalMessage: 'Syntax error',
          category: 'syntax',
          rootCause: 'Invalid syntax',
          suggestion: 'Fix it',
        },
        line: 14,
        timestamp: new Date(),
      };

      const context = smartContextExtractor.extract(sampleCodeWithImports, error);

      // Should include useState but might not include unused imports in surrounding code
      expect(context.relevantImports).toBeDefined();
      expect(Array.isArray(context.relevantImports)).toBe(true);
    });

    it('should find affected function', () => {
      const error: DetectedError = {
        id: 'test',
        stage: 'server_bundling',
        message: 'Error on line 6',
        analysis: {
          originalMessage: 'Error',
          category: 'syntax',
          rootCause: 'Invalid syntax',
          suggestion: 'Fix it',
        },
        line: 6,
        timestamp: new Date(),
      };

      const context = smartContextExtractor.extract(sampleValidCode, error);

      // Should find the handleClick function or App function
      expect(context.affectedFunctionName).toBeTruthy();
    });

    it('should estimate tokens correctly', () => {
      const error: DetectedError = {
        id: 'test',
        stage: 'server_bundling',
        message: 'Error',
        analysis: {
          originalMessage: 'Error',
          category: 'syntax',
          rootCause: 'Invalid syntax',
          suggestion: 'Fix it',
        },
        line: 5,
        timestamp: new Date(),
      };

      const context = smartContextExtractor.extract(sampleValidCode, error);

      expect(context.estimatedTokens).toBeGreaterThan(0);
      expect(context.estimatedTokens).toBeLessThan(5000); // Should be reasonable
    });

    it('should increase context window for later attempts', () => {
      const error: DetectedError = {
        id: 'test',
        stage: 'server_bundling',
        message: 'Error',
        analysis: {
          originalMessage: 'Error',
          category: 'syntax',
          rootCause: 'Invalid syntax',
          suggestion: 'Fix it',
        },
        line: 5,
        timestamp: new Date(),
      };

      const context1 = smartContextExtractor.extract(sampleValidCode, error, 1);
      const context5 = smartContextExtractor.extract(sampleValidCode, error, 5);

      // Later attempts should have more context
      expect(context5.surroundingCode.length).toBeGreaterThanOrEqual(
        context1.surroundingCode.length
      );
    });
  });

  describe('formatForPrompt', () => {
    it('should format context for LLM prompt', () => {
      const error: DetectedError = {
        id: 'test',
        stage: 'server_bundling',
        message: 'Error',
        analysis: {
          originalMessage: 'Error',
          category: 'syntax',
          rootCause: 'Invalid syntax',
          suggestion: 'Fix it',
        },
        line: 5,
        timestamp: new Date(),
      };

      const context = smartContextExtractor.extract(sampleValidCode, error);
      const formatted = smartContextExtractor.formatForPrompt(context);

      expect(formatted).toContain('ERROR LOCATION');
      expect(formatted).toContain('CODE AROUND ERROR');
      expect(typeof formatted).toBe('string');
    });
  });
});

// ====================
// Feedback Config Tests
// ====================

describe('FeedbackConfig', () => {
  describe('getRetryStrategy', () => {
    it('should return targeted_fix for early attempts', () => {
      const strategy = getRetryStrategy(1, 0, 500);

      expect(strategy).toBe('targeted_fix');
    });

    it('should return incremental for middle attempts', () => {
      const strategy = getRetryStrategy(4, 0, 500);

      expect(strategy).toBe('incremental');
    });

    it('should return full_regeneration when same error repeats', () => {
      const strategy = getRetryStrategy(2, 3, 500);

      expect(strategy).toBe('full_regeneration');
    });

    it('should return full_regeneration for very short code', () => {
      const strategy = getRetryStrategy(1, 0, 20);

      expect(strategy).toBe('full_regeneration');
    });
  });

  describe('getContextWindowSize', () => {
    it('should return smaller window for early attempts', () => {
      const window1 = getContextWindowSize(1);
      const window5 = getContextWindowSize(5);

      expect(window1).toBeLessThanOrEqual(window5);
    });
  });

  describe('shouldRetry', () => {
    it('should allow retries for syntax errors', () => {
      expect(shouldRetry(1, 'syntax')).toBe(true);
      expect(shouldRetry(3, 'syntax')).toBe(true);
    });

    it('should limit retries for capability errors', () => {
      expect(shouldRetry(1, 'capability')).toBe(true);
      expect(shouldRetry(3, 'capability')).toBe(false);
    });

    it('should respect max retry limit', () => {
      expect(shouldRetry(FEEDBACK_CONFIG.MAX_RETRIES, 'syntax')).toBe(false);
      expect(shouldRetry(FEEDBACK_CONFIG.MAX_RETRIES + 1, 'syntax')).toBe(false);
    });
  });
});

// ====================
// Feedback Loop Tests
// ====================

describe('FeedbackLoop', () => {
  describe('constructor', () => {
    it('should initialize with default values', () => {
      const loop = new FeedbackLoop('test-id', 'Create a todo app');

      const session = loop.getSession();
      expect(session.id).toBe('test-id');
      expect(session.originalPrompt).toBe('Create a todo app');
      expect(session.iterations).toHaveLength(0);
      expect(session.status).toBe('active');
    });

    it('should accept custom max iterations', () => {
      const loop = new FeedbackLoop('test-id', 'Test', 3);

      expect(loop.getSession().maxIterations).toBe(3);
    });
  });

  describe('addFeedback', () => {
    it('should add iteration to session', () => {
      const loop = new FeedbackLoop('test-id', 'Test');

      loop.addFeedback(sampleCodeWithSyntaxError, "SyntaxError: Unexpected token ')'");

      const session = loop.getSession();
      expect(session.iterations).toHaveLength(1);
      expect(session.iterations[0].iteration).toBe(1);
      expect(session.iterations[0].code).toBe(sampleCodeWithSyntaxError);
    });

    it('should analyze error automatically', () => {
      const loop = new FeedbackLoop('test-id', 'Test');

      const iteration = loop.addFeedback(sampleCodeWithSyntaxError, "SyntaxError: Unexpected token");

      expect(iteration.analysis).toBeDefined();
      expect(iteration.analysis.category).toBe('syntax');
    });

    it('should mark session as failed after max iterations', () => {
      const loop = new FeedbackLoop('test-id', 'Test', 2);

      loop.addFeedback('code1', 'error1');
      expect(loop.getSession().status).toBe('active');

      loop.addFeedback('code2', 'error2');
      expect(loop.getSession().status).toBe('failed');
    });
  });

  describe('addDetectedError', () => {
    it('should add detected error with smart context', () => {
      const loop = new FeedbackLoop('test-id', 'Test');
      loop.setCurrentCode(sampleCodeWithSyntaxError);

      const error: DetectedError = {
        id: 'err-1',
        stage: 'server_bundling',
        message: 'SyntaxError: Unexpected token',
        analysis: {
          originalMessage: 'SyntaxError',
          category: 'syntax',
          rootCause: 'Invalid syntax',
          suggestion: 'Fix brackets',
        },
        line: 6,
        timestamp: new Date(),
      };

      const iteration = loop.addDetectedError(sampleCodeWithSyntaxError, error, 'server_bundling');

      expect(iteration.stage).toBe('server_bundling');
      expect(iteration.context).toBeDefined();
      expect(iteration.strategy).toBeDefined();
    });
  });

  describe('generateCorrectionPrompt', () => {
    it('should generate correction prompt after feedback', () => {
      const loop = new FeedbackLoop('test-id', 'Create a counter app');

      loop.addFeedback(sampleCodeWithSyntaxError, "SyntaxError: Missing )");

      const prompt = loop.generateCorrectionPrompt();

      expect(prompt).toContain('CRITICAL');
      expect(prompt).toContain('Create a counter app');
      expect(prompt).toContain('SyntaxError');
    });

    it('should return empty string without iterations', () => {
      const loop = new FeedbackLoop('test-id', 'Test');

      expect(loop.generateCorrectionPrompt()).toBe('');
    });
  });

  describe('shouldUseIncrementalFix', () => {
    it('should return true for early attempts', () => {
      const loop = new FeedbackLoop('test-id', 'Test');

      loop.addFeedback('code', 'SyntaxError');

      expect(loop.shouldUseIncrementalFix()).toBe(true);
    });
  });

  describe('shouldRetry', () => {
    it('should allow retries when under limit', () => {
      const loop = new FeedbackLoop('test-id', 'Test');

      loop.addFeedback('code', 'error');

      expect(loop.shouldRetry()).toBe(true);
    });

    it('should disallow retries at max', () => {
      const loop = new FeedbackLoop('test-id', 'Test', 2);

      loop.addFeedback('code1', 'error1');
      loop.addFeedback('code2', 'error2');

      expect(loop.shouldRetry()).toBe(false);
    });
  });

  describe('getTokenUsageStats', () => {
    it('should track token usage', () => {
      const loop = new FeedbackLoop('test-id', 'Test');
      loop.setCurrentCode(sampleCodeWithSyntaxError);

      const error: DetectedError = {
        id: 'err-1',
        stage: 'server_bundling',
        message: 'Error',
        analysis: {
          originalMessage: 'Error',
          category: 'syntax',
          rootCause: 'Syntax error',
          suggestion: 'Fix it',
        },
        line: 6,
        timestamp: new Date(),
      };

      loop.addDetectedError(sampleCodeWithSyntaxError, error, 'server_bundling');

      const stats = loop.getTokenUsageStats();

      expect(stats.totalTokens).toBeGreaterThan(0);
      expect(stats.iterationCount).toBe(1);
      expect(stats.avgTokensPerIteration).toBeGreaterThan(0);
    });
  });

  describe('fromSession', () => {
    it('should restore from serialized session', () => {
      const originalLoop = new FeedbackLoop('test-id', 'Test');
      originalLoop.addFeedback('code', 'error');

      const session = originalLoop.getSession();
      const restoredLoop = FeedbackLoop.fromSession(session);

      expect(restoredLoop.getSession().iterations).toHaveLength(1);
      expect(restoredLoop.getCurrentAttempt()).toBe(1);
    });
  });

  describe('getSummary', () => {
    it('should return summary of session', () => {
      const loop = new FeedbackLoop('test-id', 'Test');
      loop.addFeedback('code', 'SyntaxError');

      const summary = loop.getSummary();

      expect(summary.status).toBe('active');
      expect(summary.attempts).toBe(1);
      expect(summary.lastError).toBeDefined();
    });
  });
});

// ====================
// Integration Tests
// ====================

describe('Feedback Loop Integration', () => {
  it('should flow from error detection to context extraction to prompt generation', () => {
    // 1. Detect error from bundle result
    const bundleResult: ServerBundleResult = {
      success: false,
      code: '',
      errors: [{
        message: "Unexpected token ')'",
        line: 6,
        column: 20,
        source: 'setCount(count + 1;',
      }],
      warnings: [],
      requiredBundles: [],
      stats: { inputSize: 100, outputSize: 0, buildTimeMs: 50 },
    };

    const detection = errorDetectionService.detectServerBundlingErrors(bundleResult);
    expect(detection.hasErrors).toBe(true);

    // 2. Create feedback loop and add error
    const loop = new FeedbackLoop('test-id', 'Create a counter app');
    loop.setCurrentCode(sampleCodeWithSyntaxError);

    if (detection.primaryError) {
      loop.addDetectedError(
        sampleCodeWithSyntaxError,
        detection.primaryError,
        'server_bundling'
      );
    }

    // 3. Generate correction prompt
    const prompt = loop.generateCorrectionPrompt();

    expect(prompt).toContain('ERROR LOCATION');
    expect(prompt).toContain('syntax');
    expect(loop.shouldRetry()).toBe(true);
  });

  it('should track multiple iterations correctly', () => {
    const loop = new FeedbackLoop('test-id', 'Test', 5);

    // Simulate multiple fix attempts
    for (let i = 0; i < 4; i++) {
      loop.addFeedback(`code_v${i}`, `Error iteration ${i}`);
    }

    expect(loop.getCurrentAttempt()).toBe(4);
    expect(loop.getRemainingAttempts()).toBe(1);
    expect(loop.isActive()).toBe(true);

    // Add one more to reach limit
    loop.addFeedback('code_v4', 'Error iteration 4');

    expect(loop.isActive()).toBe(false);
    expect(loop.getSession().status).toBe('failed');
  });
});
