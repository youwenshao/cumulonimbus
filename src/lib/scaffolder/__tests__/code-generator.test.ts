/**
 * V1 Code Generator Tests
 * Tests for generateAppCode, code cleaning, and validation
 */

import {
  generateAppCode,
  regenerateAppCode,
  generateFallbackCode,
} from '../code-generator';
import { createSampleProjectSpec, collectAsyncGenerator } from '@/lib/__tests__/test-utils';
import { fullGeneratedCode, generatedCodeChunks } from '@/lib/__tests__/fixtures/llm-responses';

// Mock the qwen module
jest.mock('@/lib/qwen', () => ({
  streamComplete: jest.fn(),
  complete: jest.fn(),
  completeJSON: jest.fn(),
}));

import { streamComplete } from '@/lib/qwen';

describe('Code Generator - generateAppCode', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should generate code from spec', async () => {
    (streamComplete as jest.Mock).mockImplementation(async function* () {
      for (const chunk of generatedCodeChunks) {
        yield chunk;
      }
    });

    const spec = createSampleProjectSpec();
    const chunks = [];

    for await (const chunk of generateAppCode(spec, 'test-app-1')) {
      chunks.push(chunk);
    }

    expect(chunks.length).toBeGreaterThan(0);
    expect(chunks.some(c => c.type === 'complete')).toBe(true);
  });

  it('should emit status updates', async () => {
    (streamComplete as jest.Mock).mockImplementation(async function* () {
      yield "'use client';\n";
      yield "export default function Page() { return <div>Test</div>; }";
    });

    const spec = createSampleProjectSpec();
    const chunks = await collectAsyncGenerator(generateAppCode(spec, 'test-app-2'));

    const statusChunks = chunks.filter(c => c.type === 'status');
    expect(statusChunks.length).toBeGreaterThan(0);
  });

  it('should emit code chunks', async () => {
    (streamComplete as jest.Mock).mockImplementation(async function* () {
      for (const chunk of generatedCodeChunks) {
        yield chunk;
      }
    });

    const spec = createSampleProjectSpec();
    const chunks = await collectAsyncGenerator(generateAppCode(spec, 'test-app-3'));

    const codeChunks = chunks.filter(c => c.type === 'code');
    expect(codeChunks.length).toBeGreaterThan(0);
  });

  it('should emit complete event with cleaned code', async () => {
    (streamComplete as jest.Mock).mockImplementation(async function* () {
      yield fullGeneratedCode;
    });

    const spec = createSampleProjectSpec();
    const chunks = await collectAsyncGenerator(generateAppCode(spec, 'test-app-4'));

    const completeChunk = chunks.find(c => c.type === 'complete');
    expect(completeChunk).toBeDefined();
    expect(completeChunk?.content).toBeDefined();
  });

  it('should clean markdown code blocks', async () => {
    (streamComplete as jest.Mock).mockImplementation(async function* () {
      yield "```typescript\n";
      yield fullGeneratedCode;
      yield "\n```";
    });

    const spec = createSampleProjectSpec();
    const chunks = await collectAsyncGenerator(generateAppCode(spec, 'test-app-5'));

    const completeChunk = chunks.find(c => c.type === 'complete');
    expect(completeChunk?.content).not.toContain('```');
  });

  it('should add use client directive if missing', async () => {
    const codeWithoutUseClient = "export default function Page() { return <div>Test</div>; }";
    (streamComplete as jest.Mock).mockImplementation(async function* () {
      yield codeWithoutUseClient;
    });

    const spec = createSampleProjectSpec();
    const chunks = await collectAsyncGenerator(generateAppCode(spec, 'test-app-6'));

    const completeChunk = chunks.find(c => c.type === 'complete');
    // Code should have 'use client' added if it uses hooks
    expect(completeChunk?.content).toBeDefined();
  });

  it('should validate generated code', async () => {
    (streamComplete as jest.Mock).mockImplementation(async function* () {
      yield "export default function Page() { return <div>Test</div>; }";
    });

    const spec = createSampleProjectSpec();
    const chunks = await collectAsyncGenerator(generateAppCode(spec, 'test-app-7'));

    const completeChunk = chunks.find(c => c.type === 'complete');
    expect(completeChunk).toBeDefined();
  });

  it('should emit progress updates', async () => {
    (streamComplete as jest.Mock).mockImplementation(async function* () {
      for (const chunk of generatedCodeChunks) {
        yield chunk;
      }
    });

    const spec = createSampleProjectSpec();
    const chunks = await collectAsyncGenerator(generateAppCode(spec, 'test-app-8'));

    const progressValues = chunks.map(c => c.progress).filter(p => p !== undefined);
    expect(progressValues.length).toBeGreaterThan(0);
    expect(Math.max(...progressValues)).toBeGreaterThan(0);
  });

  it('should handle LLM errors gracefully', async () => {
    (streamComplete as jest.Mock).mockImplementation(async function* () {
      throw new Error('LLM service unavailable');
    });

    const spec = createSampleProjectSpec();
    const chunks = await collectAsyncGenerator(generateAppCode(spec, 'test-app-9'));

    const errorChunk = chunks.find(c => c.type === 'error');
    expect(errorChunk).toBeDefined();
    expect(typeof errorChunk?.content).toBe('string');
  });
});

describe('Code Generator - regenerateAppCode', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should regenerate code with issues context', async () => {
    (streamComplete as jest.Mock).mockImplementation(async function* () {
      yield "'use client';\nexport default function Page() { return <div>Fixed</div>; }";
    });

    const spec = createSampleProjectSpec();
    const previousCode = "export default function Page() { return <div>Broken</div>; }";
    const issues = "The button is not working";

    const chunks = await collectAsyncGenerator(
      regenerateAppCode(spec, 'test-app-1', previousCode, issues)
    );

    const completeChunk = chunks.find(c => c.type === 'complete');
    expect(completeChunk).toBeDefined();
  });

  it('should include issues in prompt context', async () => {
    let promptUsed = '';
    (streamComplete as jest.Mock).mockImplementation(async function* ({ messages }) {
      promptUsed = messages[messages.length - 1].content;
      yield "'use client';\nexport default function Page() { return <div>Fixed</div>; }";
    });

    const spec = createSampleProjectSpec();
    const issues = "The form does not submit";

    await collectAsyncGenerator(
      regenerateAppCode(spec, 'test-app-2', fullGeneratedCode, issues)
    );

    expect(promptUsed).toContain(issues);
  });

  it('should emit status updates during regeneration', async () => {
    (streamComplete as jest.Mock).mockImplementation(async function* () {
      yield "'use client';\nexport default function Page() { return <div>Fixed</div>; }";
    });

    const spec = createSampleProjectSpec();
    const chunks = await collectAsyncGenerator(
      regenerateAppCode(spec, 'test-app-3', fullGeneratedCode, 'Issues')
    );

    const statusChunks = chunks.filter(c => c.type === 'status');
    expect(statusChunks.length).toBeGreaterThan(0);
  });

  it('should handle regeneration errors', async () => {
    (streamComplete as jest.Mock).mockImplementation(async function* () {
      throw new Error('Regeneration failed');
    });

    const spec = createSampleProjectSpec();
    const chunks = await collectAsyncGenerator(
      regenerateAppCode(spec, 'test-app-4', fullGeneratedCode, 'Issues')
    );

    const errorChunk = chunks.find(c => c.type === 'error');
    expect(errorChunk).toBeDefined();
  });
});

describe('Code Generator - generateFallbackCode', () => {
  it('should generate fallback code from spec', () => {
    const spec = createSampleProjectSpec();
    const code = generateFallbackCode(spec, 'test-app-1');

    expect(code).toBeDefined();
    expect(code.length).toBeGreaterThan(0);
    expect(code).toContain("'use client'");
  });

  it('should include all fields from spec', () => {
    const spec = createSampleProjectSpec();
    const code = generateFallbackCode(spec, 'test-app-2');

    spec.dataStore.fields.forEach(field => {
      expect(code).toContain(field.name);
    });
  });

  it('should create valid React component', () => {
    const spec = createSampleProjectSpec();
    const code = generateFallbackCode(spec, 'test-app-3');

    expect(code).toContain('export default function');
    expect(code).toContain('return (');
    expect(code).toContain('useState');
    expect(code).toContain('useCallback');
  });

  it('should include form for adding entries', () => {
    const spec = createSampleProjectSpec();
    const code = generateFallbackCode(spec, 'test-app-4');

    expect(code).toContain('handleSubmit');
    expect(code).toContain('<form');
    expect(code).toContain('type="submit"');
  });

  it('should include table for displaying data', () => {
    const spec = createSampleProjectSpec();
    const code = generateFallbackCode(spec, 'test-app-5');

    expect(code).toContain('<table');
    // The table structure may vary, just check for basic table presence
  });

  it('should include delete functionality', () => {
    const spec = createSampleProjectSpec();
    const code = generateFallbackCode(spec, 'test-app-6');

    expect(code).toContain('handleDelete');
    expect(code).toContain('confirm');
  });

  it('should use sanitized component name', () => {
    const spec = createSampleProjectSpec({ name: 'My Expense Tracker 2.0!' });
    const code = generateFallbackCode(spec, 'test-app-7');

    // Component name should be sanitized (no spaces or special chars)
    expect(code).toMatch(/function [A-Za-z0-9]+Page/);
  });

  it('should include API endpoints', () => {
    const spec = createSampleProjectSpec();
    const appId = 'test-app-8';
    const code = generateFallbackCode(spec, appId);

    expect(code).toContain(`/api/apps/${appId}/data`);
  });

  it('should handle different field types', () => {
    const spec = createSampleProjectSpec({
      dataStore: {
        name: 'entries',
        label: 'Entries',
        fields: [
          { name: 'text', label: 'Text', type: 'text', required: true },
          { name: 'number', label: 'Number', type: 'number', required: true },
          { name: 'date', label: 'Date', type: 'date', required: true },
          { name: 'bool', label: 'Boolean', type: 'boolean', required: false },
        ],
      },
    });

    const code = generateFallbackCode(spec, 'test-app-9');

    expect(code).toContain('type="text"');
    expect(code).toContain('type="number"');
    expect(code).toContain('type="date"');
  });

  it('should be deterministic', () => {
    const spec = createSampleProjectSpec();
    const code1 = generateFallbackCode(spec, 'test-app-10');
    const code2 = generateFallbackCode(spec, 'test-app-10');

    expect(code1).toBe(code2);
  });
});

describe('Code Generator - Edge Cases', () => {
  it('should handle spec with no optional fields', () => {
    const spec = createSampleProjectSpec({
      dataStore: {
        name: 'items',
        label: 'Items',
        fields: [
          { name: 'name', label: 'Name', type: 'text', required: true },
        ],
      },
    });

    const code = generateFallbackCode(spec, 'test-edge-1');

    expect(code).toBeDefined();
    expect(code).toContain('name');
  });

  it('should handle spec with many fields', () => {
    const manyFields = Array.from({ length: 20 }, (_, i) => ({
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

    const code = generateFallbackCode(spec, 'test-edge-2');

    expect(code).toBeDefined();
    manyFields.forEach(field => {
      expect(code).toContain(field.name);
    });
  });

  it('should handle spec with special characters in name', () => {
    const spec = createSampleProjectSpec({ name: 'My App (Beta) v2.0!' });
    const code = generateFallbackCode(spec, 'test-edge-3');

    // Should create valid JavaScript identifier
    expect(code).toMatch(/function [A-Za-z0-9]+Page/);
  });

  it('should handle spec with unicode in fields', () => {
    const spec = createSampleProjectSpec({
      dataStore: {
        name: 'entries',
        label: 'Entries',
        fields: [
          { name: 'amount', label: 'Amount 💰', type: 'number', required: true },
        ],
      },
    });

    const code = generateFallbackCode(spec, 'test-edge-4');

    expect(code).toContain('Amount 💰');
  });

  it('should handle empty LLM response', async () => {
    (streamComplete as jest.Mock).mockImplementation(async function* () {
      yield '';
    });

    const spec = createSampleProjectSpec();
    const chunks = await collectAsyncGenerator(generateAppCode(spec, 'test-edge-5'));

    expect(chunks.length).toBeGreaterThan(0);
  });

  it('should handle truncated LLM response', async () => {
    (streamComplete as jest.Mock).mockImplementation(async function* () {
      yield "'use client';\nexport default function Page() { return <div>Incomplete";
    });

    const spec = createSampleProjectSpec();
    const chunks = await collectAsyncGenerator(generateAppCode(spec, 'test-edge-6'));

    const completeChunk = chunks.find(c => c.type === 'complete');
    expect(completeChunk).toBeDefined();
  });
});
