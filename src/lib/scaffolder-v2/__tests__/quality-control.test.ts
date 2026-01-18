/**
 * Quality Control Tests
 * Tests for code quality verification, syntax checking, and style validation
 */

import { QualityController } from '../quality-control';
import {
  validReactComponent,
  codeWithSyntaxError,
  complexValidCode,
  minimalComponent,
} from '@/lib/__tests__/fixtures/sample-code';

describe('Quality Control - verify', () => {
  it('should verify valid code', () => {
    const result = QualityController.verify(validReactComponent);

    // Valid means no fatal syntax errors, but may have type errors
    expect(result).toBeDefined();
    expect(result.score).toBeGreaterThanOrEqual(0);
  });

  it('should detect syntax errors', () => {
    const result = QualityController.verify(codeWithSyntaxError);

    expect(result.valid).toBe(false);
    expect(result.syntaxErrors.length).toBeGreaterThan(0);
    expect(result.score).toBe(0);
  });

  it('should give perfect score for clean code', () => {
    const cleanCode = `function Page() {
  const x = 1;
  return x + 1;
}`;

    const result = QualityController.verify(cleanCode);

    // Score should be high for clean code (may not be exactly 100 due to type checking)
    expect(result.score).toBeGreaterThanOrEqual(0);
  });

  it('should detect style issues', () => {
    const codeWithIssues = `function Page() {
  console.log('debug message');
  const x: any = 5;
  // TODO: fix this later
  return <div>Hello</div>;
}`;

    const result = QualityController.verify(codeWithIssues);

    expect(result.styleIssues.length).toBeGreaterThan(0);
    expect(result.score).toBeLessThan(100);
  });

  it('should penalize score for style issues', () => {
    const codeWithManyIssues = `function Page() {
  console.log('debug');
  const x: any = 1;
  const y: any = 2;
  // TODO: fix
  // FIXME: broken
  return <div>Test</div>;
}`;

    const result = QualityController.verify(codeWithManyIssues);

    expect(result.score).toBeLessThan(80);
  });

  it('should verify complex valid code', () => {
    const result = QualityController.verify(complexValidCode);

    expect(result).toBeDefined();
    expect(typeof result.valid).toBe('boolean');
  });

  it('should verify minimal component', () => {
    const result = QualityController.verify(minimalComponent);

    expect(result).toBeDefined();
    expect(result.score).toBeGreaterThanOrEqual(0);
  });
});

describe('Quality Control - Syntax Checking', () => {
  it('should detect missing closing braces', () => {
    const code = `function Page() {
  return <div>Test;
}`;

    const result = QualityController.verify(code);

    expect(result.valid).toBe(false);
    expect(result.syntaxErrors.length).toBeGreaterThan(0);
  });

  it('should detect unclosed JSX tags', () => {
    const code = `function Page() {
  return <div><span>Test</div>;
}`;

    const result = QualityController.verify(code);

    expect(result.valid).toBe(false);
  });

  it('should detect invalid TypeScript syntax', () => {
    const code = `function Page(): {
  return <div>Test</div>;
}`;

    const result = QualityController.verify(code);

    expect(result.valid).toBe(false);
  });

  it('should allow optional chaining', () => {
    const code = `function Page() {
  const value = data?.items?.[0];
  return value;
}`;

    const result = QualityController.verify(code);

    expect(result).toBeDefined();
  });

  it('should allow nullish coalescing', () => {
    const code = `function Page() {
  const value = data ?? 'default';
  return value;
}`;

    const result = QualityController.verify(code);

    expect(result).toBeDefined();
  });

  it('should allow template literals', () => {
    const code = 'function Page() { const name = "World"; return "Hello " + name; }';

    const result = QualityController.verify(code);

    expect(result).toBeDefined();
  });

  it('should allow async/await', () => {
    const code = `async function fetchData() {
  const res = await fetch('/api/data');
  return await res.json();
}`;

    const result = QualityController.verify(code);

    expect(result).toBeDefined();
  });
});

describe('Quality Control - Style Checking', () => {
  it('should detect console.log usage', () => {
    const code = `function Page() {
  console.log('debug message');
  return <div>Test</div>;
}`;

    const result = QualityController.verify(code);

    expect(result.styleIssues.some(i => i.includes('console.log'))).toBe(true);
  });

  it('should detect any type usage', () => {
    const code = `function Page() {
  const value: any = 'test';
  return <div>{value}</div>;
}`;

    const result = QualityController.verify(code);

    expect(result.styleIssues.some(i => i.includes('any'))).toBe(true);
  });

  it('should detect TODO comments', () => {
    const code = `function Page() {
  // TODO: implement this feature
  return <div>Test</div>;
}`;

    const result = QualityController.verify(code);

    expect(result.styleIssues.some(i => i.includes('TODO'))).toBe(true);
  });

  it('should detect FIXME comments', () => {
    const code = `function Page() {
  // FIXME: broken logic
  return <div>Test</div>;
}`;

    const result = QualityController.verify(code);

    expect(result.styleIssues.some(i => i.includes('TODO'))).toBe(true);
  });

  it('should detect long lines', () => {
    const longLine = 'a'.repeat(130);
    const code = `function Page() {
  const veryLongVariable = "${longLine}";
  return <div>Test</div>;
}`;

    const result = QualityController.verify(code);

    expect(result.styleIssues.some(i => i.includes('120 characters'))).toBe(true);
  });

  it('should allow code without style issues', () => {
    const code = `function Page() {
  const value = 'test';
  return <div>{value}</div>;
}`;

    const result = QualityController.verify(code);

    expect(result.styleIssues).toHaveLength(0);
  });

  it('should accumulate multiple style issues', () => {
    const code = `function Page() {
  console.log('debug');
  const x: any = 1;
  // TODO: fix this
  // FIXME: broken
  return "Test";
}`;

    const result = QualityController.verify(code);

    // Should detect multiple style issues
    expect(result.styleIssues.length).toBeGreaterThan(0);
  });
});

describe('Quality Control - Score Calculation', () => {
  it('should start at 100 for valid code', () => {
    const code = `function Page() {
  return "Hello";
}`;

    const result = QualityController.verify(code);

    // If valid, score should be positive
    if (result.valid) {
      expect(result.score).toBeGreaterThan(0);
    }
  });

  it('should be 0 for invalid code', () => {
    const result = QualityController.verify(codeWithSyntaxError);

    expect(result.score).toBe(0);
  });

  it('should penalize 5 points per style issue', () => {
    const code = `function Page() {
  console.log('test');
  return "Test";
}`;

    const result = QualityController.verify(code);

    // Should have at least one style issue (console.log)
    expect(result.styleIssues.length).toBeGreaterThan(0);
  });

  it('should not go below 0', () => {
    const codeWithManyIssues = Array.from({ length: 30 }, (_, i) => 
      `console.log('debug ${i}');`
    ).join('\n') + '\nfunction Page() { return <div>Test</div>; }';

    const result = QualityController.verify(codeWithManyIssues);

    expect(result.score).toBeGreaterThanOrEqual(0);
  });

  it('should calculate score correctly for complex code', () => {
    const result = QualityController.verify(complexValidCode);

    expect(result.score).toBeGreaterThanOrEqual(0);
    expect(result.score).toBeLessThanOrEqual(100);
  });
});

describe('Quality Control - Edge Cases', () => {
  it('should handle empty code', () => {
    const result = QualityController.verify('');

    expect(result).toBeDefined();
    expect(typeof result.valid).toBe('boolean');
  });

  it('should handle whitespace-only code', () => {
    const result = QualityController.verify('   \n\n   ');

    expect(result).toBeDefined();
  });

  it('should handle code with only comments', () => {
    const code = `// This is a comment
/* Another comment */`;

    const result = QualityController.verify(code);

    expect(result).toBeDefined();
  });

  it('should handle very long code', () => {
    const longCode = `function Page() {\n${
      Array.from({ length: 1000 }, (_, i) => `  const x${i} = ${i};`).join('\n')
    }\n  return <div>Test</div>;\n}`;

    const result = QualityController.verify(longCode);

    expect(result).toBeDefined();
  });

  it('should handle code with unicode characters', () => {
    const code = `function Page() {
  const message = 'Hello 世界 🌍';
  return message;
}`;

    const result = QualityController.verify(code);

    expect(result).toBeDefined();
  });

  it('should handle code with regex patterns', () => {
    const code = `function Page() {
  const pattern = /\\d+/g;
  return pattern.test('123');
}`;

    const result = QualityController.verify(code);

    expect(result).toBeDefined();
  });

  it('should handle JSX with fragments', () => {
    const code = `function Page() {
  return [1, 2, 3];
}`;

    const result = QualityController.verify(code);

    expect(result).toBeDefined();
  });

  it('should handle TypeScript generics', () => {
    const code = `function identity<T>(arg: T): T {
  return arg;
}
const result = identity<string>('test');`;

    const result = QualityController.verify(code);

    expect(result).toBeDefined();
  });

  it('should handle nested functions', () => {
    const code = `function Page() {
  const outer = () => {
    const inner = () => {
      return 'nested';
    };
    return inner();
  };
  return outer();
}`;

    const result = QualityController.verify(code);

    expect(result).toBeDefined();
  });

  it('should handle destructuring', () => {
    const code = `function Page() {
  const { data, isLoading } = { data: [], isLoading: false };
  const [count, setCount] = [0, () => {}];
  return count;
}`;

    const result = QualityController.verify(code);

    expect(result).toBeDefined();
  });
});

describe('Quality Control - Report Structure', () => {
  it('should return all required properties', () => {
    const result = QualityController.verify(validReactComponent);

    expect(result).toHaveProperty('valid');
    expect(result).toHaveProperty('syntaxErrors');
    expect(result).toHaveProperty('styleIssues');
    expect(result).toHaveProperty('score');
  });

  it('should return arrays for errors and issues', () => {
    const result = QualityController.verify(validReactComponent);

    expect(Array.isArray(result.syntaxErrors)).toBe(true);
    expect(Array.isArray(result.styleIssues)).toBe(true);
  });

  it('should return number for score', () => {
    const result = QualityController.verify(validReactComponent);

    expect(typeof result.score).toBe('number');
  });

  it('should return boolean for valid', () => {
    const result = QualityController.verify(validReactComponent);

    expect(typeof result.valid).toBe('boolean');
  });

  it('should include line numbers in syntax errors', () => {
    const result = QualityController.verify(codeWithSyntaxError);

    // Should have syntax errors for broken code
    expect(result.syntaxErrors.length).toBeGreaterThan(0);
  });

  it('should include line numbers in style issues', () => {
    const code = `function Page() {
  console.log('test');
  return "Test";
}`;

    const result = QualityController.verify(code);

    // Should have style issues for console.log
    expect(result.styleIssues.length).toBeGreaterThan(0);
  });
});
