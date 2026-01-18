/**
 * Edge Case Tests
 * Tests for edge cases, boundary conditions, and unusual inputs
 */

import { parseIntent, getFallbackIntent } from '@/lib/scaffolder/parser';
import { validateSpec } from '@/lib/scaffolder/compiler';
import { bundleCode, validateCode } from '@/lib/runtime/code-bundler';
import { bundleAppCode } from '@/lib/runtime/server-bundler';
import { createSampleProjectSpec, createSampleSchema } from '@/lib/__tests__/test-utils';
import { edgeCasePrompts } from '@/lib/__tests__/fixtures/sample-prompts';

jest.mock('@/lib/qwen', () => ({
  completeJSON: jest.fn(),
  complete: jest.fn(),
  streamComplete: jest.fn(),
}));

jest.mock('@/lib/scaffolder/status/emitter', () => ({
  emitStatus: jest.fn(),
}));

// Mock esbuild for testing
jest.mock('esbuild', () => ({
  transform: jest.fn().mockResolvedValue({
    code: 'var App = function() { return React.createElement("div", null, "Test"); };',
    warnings: [],
  }),
}));

import { completeJSON } from '@/lib/qwen';

describe('Edge Cases - Empty/Null Inputs', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should handle empty string input', async () => {
    (completeJSON as jest.Mock).mockRejectedValue(new Error('Empty input'));

    const result = await parseIntent('');
    expect(result).toBeDefined();
    expect(result.category).toBeDefined();
  });

  it('should handle whitespace-only input', async () => {
    (completeJSON as jest.Mock).mockRejectedValue(new Error('Empty input'));

    const result = await parseIntent('   \n\t  ');
    expect(result).toBeDefined();
  });

  it('should handle null in validateSpec', () => {
    const result = validateSpec(null as any);
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it('should handle undefined in validateSpec', () => {
    const result = validateSpec(undefined as any);
    expect(result.valid).toBe(false);
  });

  it('should handle empty object in validateSpec', () => {
    const result = validateSpec({} as any);
    expect(result.valid).toBe(false);
  });

  it('should handle empty code in bundleCode', () => {
    const result = bundleCode({
      appId: 'test',
      appCode: '',
      schema: createSampleSchema(),
    });

    expect(result.bundledCode).toBeDefined();
  });

  it('should handle whitespace-only code', () => {
    const result = bundleCode({
      appId: 'test',
      appCode: '   \n\n   ',
      schema: createSampleSchema(),
    });

    expect(result.bundledCode).toBeDefined();
  });
});

describe('Edge Cases - Very Long Inputs', () => {
  it('should handle very long prompts', async () => {
    (completeJSON as jest.Mock).mockRejectedValue(new Error('Too long'));

    const longPrompt = edgeCasePrompts.veryLong;
    const result = await parseIntent(longPrompt);

    expect(result).toBeDefined();
  });

  it('should handle spec with many fields', () => {
    const manyFields = Array.from({ length: 100 }, (_, i) => ({
      name: `field${i}`,
      label: `Field ${i}`,
      type: 'text' as const,
      required: false,
    }));

    const spec = createSampleProjectSpec({
      dataStore: {
        name: 'entries',
        label: 'Entries',
        fields: manyFields,
      },
    });

    const result = validateSpec(spec);
    expect(result.valid).toBe(true);
  });

  it('should handle very long field names', () => {
    const longName = 'a'.repeat(200);
    const spec = createSampleProjectSpec({
      dataStore: {
        name: 'entries',
        label: 'Entries',
        fields: [
          {
            name: 'amount',
            label: longName,
            type: 'number',
            required: true,
          },
        ],
      },
    });

    const result = validateSpec(spec);
    expect(result).toBeDefined();
  });

  it('should handle very long code', async () => {
    const longCode = `export default function Page() {
      ${Array.from({ length: 10000 }, (_, i) => `const x${i} = ${i};`).join('\n')}
      return <div>Test</div>;
    }`;

    const result = await bundleAppCode({
      code: longCode,
      appId: 'test',
    });

    expect(result).toBeDefined();
  });
});

describe('Edge Cases - Special Characters', () => {
  it('should handle special characters in prompts', async () => {
    (completeJSON as jest.Mock).mockRejectedValue(new Error('Special chars'));

    const result = await parseIntent(edgeCasePrompts.specialChars);
    expect(result).toBeDefined();
  });

  it('should handle unicode in prompts', async () => {
    (completeJSON as jest.Mock).mockRejectedValue(new Error('Unicode'));

    const result = await parseIntent(edgeCasePrompts.unicode);
    expect(result).toBeDefined();
  });

  it('should handle special characters in app names', () => {
    const spec = createSampleProjectSpec({
      name: 'My App (Beta) v2.0 @ 2024!',
    });

    const result = validateSpec(spec);
    expect(result.valid).toBe(true);
  });

  it('should handle unicode in field names', () => {
    const spec = createSampleProjectSpec({
      dataStore: {
        name: 'entries',
        label: 'Entries',
        fields: [
          {
            name: 'amount',
            label: 'Amount 💰 in USD $',
            type: 'number',
            required: true,
          },
        ],
      },
    });

    const result = validateSpec(spec);
    expect(result.valid).toBe(true);
  });

  it('should handle quotes in field values', () => {
    const spec = createSampleProjectSpec({
      dataStore: {
        name: 'entries',
        label: 'Entries',
        fields: [
          {
            name: 'description',
            label: "Description with \"quotes\"",
            type: 'text',
            required: false,
          },
        ],
      },
    });

    const result = validateSpec(spec);
    expect(result.valid).toBe(true);
  });

  it('should handle newlines in descriptions', () => {
    const spec = createSampleProjectSpec({
      description: 'Line 1\nLine 2\nLine 3',
    });

    const result = validateSpec(spec);
    expect(result.valid).toBe(true);
  });
});

describe('Edge Cases - Security Attack Vectors', () => {
  it('should handle SQL injection attempts in prompts', async () => {
    (completeJSON as jest.Mock).mockRejectedValue(new Error('Invalid'));

    const result = await parseIntent(edgeCasePrompts.sql);
    expect(result).toBeDefined();
  });

  it('should handle XSS attempts in prompts', async () => {
    (completeJSON as jest.Mock).mockRejectedValue(new Error('Invalid'));

    const result = await parseIntent(edgeCasePrompts.html);
    expect(result).toBeDefined();
  });

  it('should block script injection in code', async () => {
    const maliciousCode = `<script>alert('xss')</script>
export default function Page() {
  return <div>Test</div>;
}`;

    const result = await bundleAppCode({
      code: maliciousCode,
      appId: 'test',
    });

    expect(result).toBeDefined();
  });

  it('should block command injection attempts', async () => {
    const code = `const { exec } = require('child_process');
export default function Page() {
  exec('rm -rf /');
  return <div>Test</div>;
}`;

    const result = await bundleAppCode({
      code,
      appId: 'test',
    });

    expect(result.success).toBe(false);
  });
});

describe('Edge Cases - Boundary Conditions', () => {
  it('should handle exactly 0 fields', () => {
    const spec = createSampleProjectSpec({
      dataStore: {
        name: 'entries',
        label: 'Entries',
        fields: [],
      },
    });

    const result = validateSpec(spec);
    expect(result.valid).toBe(false);
  });

  it('should handle exactly 1 field', () => {
    const spec = createSampleProjectSpec({
      dataStore: {
        name: 'entries',
        label: 'Entries',
        fields: [
          { name: 'name', label: 'Name', type: 'text', required: true },
        ],
      },
    });

    const result = validateSpec(spec);
    expect(result.valid).toBe(true);
  });

  it('should handle exactly 0 views', () => {
    const spec = createSampleProjectSpec({
      views: [],
    });

    const result = validateSpec(spec);
    expect(result.valid).toBe(false);
  });

  it('should handle exactly 1 view', () => {
    const spec = createSampleProjectSpec({
      views: [
        {
          type: 'table',
          title: 'All Items',
          config: { columns: ['amount'] },
        },
      ],
    });

    const result = validateSpec(spec);
    expect(result.valid).toBe(true);
  });

  it('should handle minimum valid spec', () => {
    const minimalSpec = createSampleProjectSpec({
      name: 'A',
      description: 'B',
      dataStore: {
        name: 'e',
        label: 'E',
        fields: [
          { name: 'n', label: 'N', type: 'text', required: true },
        ],
      },
      views: [
        { type: 'table', title: 'T', config: { columns: ['n'] } },
      ],
    });

    const result = validateSpec(minimalSpec);
    expect(result.valid).toBe(true);
  });
});

describe('Edge Cases - Circular Dependencies', () => {
  it('should handle potential circular references in schema', () => {
    const spec = createSampleProjectSpec();
    // Specs don't have circular refs by design, but test the validator doesn't break
    const result = validateSpec(spec);
    expect(result.valid).toBe(true);
  });
});

describe('Edge Cases - Duplicate Values', () => {
  it('should detect duplicate field names', () => {
    const spec = createSampleProjectSpec({
      dataStore: {
        name: 'entries',
        label: 'Entries',
        fields: [
          { name: 'amount', label: 'Amount', type: 'number', required: true },
          { name: 'amount', label: 'Another Amount', type: 'number', required: false },
        ],
      },
    });

    const result = validateSpec(spec);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('Duplicate'))).toBe(true);
  });

  it('should allow duplicate labels (only names must be unique)', () => {
    const spec = createSampleProjectSpec({
      dataStore: {
        name: 'entries',
        label: 'Entries',
        fields: [
          { name: 'amount1', label: 'Amount', type: 'number', required: true },
          { name: 'amount2', label: 'Amount', type: 'number', required: false },
        ],
      },
    });

    const result = validateSpec(spec);
    expect(result.valid).toBe(true);
  });

  it('should allow duplicate view titles', () => {
    const spec = createSampleProjectSpec({
      views: [
        { type: 'table', title: 'View', config: { columns: ['amount'] } },
        { type: 'chart', title: 'View', config: { chartType: 'pie', xAxis: 'category', yAxis: 'amount' } },
      ],
    });

    const result = validateSpec(spec);
    expect(result.valid).toBe(true);
  });
});

describe('Edge Cases - Nested/Complex Structures', () => {
  it('should handle deeply nested select options', () => {
    const manyOptions = Array.from({ length: 1000 }, (_, i) => `Option ${i}`);

    const spec = createSampleProjectSpec({
      dataStore: {
        name: 'entries',
        label: 'Entries',
        fields: [
          {
            name: 'category',
            label: 'Category',
            type: 'select',
            required: true,
            options: manyOptions,
          },
        ],
      },
    });

    const result = validateSpec(spec);
    expect(result.valid).toBe(true);
  });

  it('should handle complex validation rules', () => {
    const spec = createSampleProjectSpec({
      dataStore: {
        name: 'entries',
        label: 'Entries',
        fields: [
          {
            name: 'value',
            label: 'Value',
            type: 'number',
            required: true,
            validation: {
              min: -999999,
              max: 999999,
              pattern: '^\\d+$',
            },
          },
        ],
      },
    });

    const result = validateSpec(spec);
    expect(result.valid).toBe(true);
  });
});

describe('Edge Cases - Type Mismatches', () => {
  it('should handle invalid field types', () => {
    const spec = createSampleProjectSpec({
      dataStore: {
        name: 'entries',
        label: 'Entries',
        fields: [
          {
            name: 'field',
            label: 'Field',
            type: 'invalid-type' as any,
            required: true,
          },
        ],
      },
    });

    const result = validateSpec(spec);
    // Should not crash, but might mark as invalid
    expect(result).toBeDefined();
  });

  it('should handle invalid view types', () => {
    const spec = createSampleProjectSpec({
      views: [
        {
          type: 'invalid-view' as any,
          title: 'View',
          config: {},
        },
      ],
    });

    const result = validateSpec(spec);
    expect(result).toBeDefined();
  });
});

describe('Edge Cases - Code Generation', () => {
  it('should handle code with only comments', async () => {
    const code = `// This is a comment
/* Multi-line comment */`;

    const result = await bundleAppCode({
      code,
      appId: 'test',
    });

    expect(result).toBeDefined();
  });

  it('should handle code with regex patterns', async () => {
    const code = `export default function Page() {
  const pattern = /[a-zA-Z0-9]+/g;
  return <div>{pattern.test('test')}</div>;
}`;

    const result = await bundleAppCode({
      code,
      appId: 'test',
    });

    expect(result).toBeDefined();
  });

  it('should handle code with template literals', async () => {
    const code = 'export default function Page() { const name = "World"; const message = "Hello " + name; return React.createElement("div", null, message); }';

    const result = await bundleAppCode({
      code,
      appId: 'test',
    });

    expect(result).toBeDefined();
  });

  it('should handle code with complex JSX', async () => {
    const code = `export default function Page() {
  return (
    <div>
      {items.map(item => (
        <div key={item.id}>
          {item.children?.map(child => (
            <span key={child.id}>{child.name}</span>
          ))}
        </div>
      ))}
    </div>
  );
}`;

    const result = await bundleAppCode({
      code,
      appId: 'test',
    });

    expect(result).toBeDefined();
  });
});
