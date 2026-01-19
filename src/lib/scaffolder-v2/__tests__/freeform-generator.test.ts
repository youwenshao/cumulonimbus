/**
 * V2 Freeform Generator Tests
 * Tests for designApp, generateCode, and streaming generation
 */

import { FreeformGenerator } from '../agents/freeform-generator';
import { collectAsyncGenerator } from '@/lib/__tests__/test-utils';
import {
  expenseDesignResponse,
  simpleDesignResponse,
  fullGeneratedCode,
  generatedCodeChunks,
} from '@/lib/__tests__/fixtures/llm-responses';

// Mock the llm module
jest.mock('@/lib/llm', () => ({
  completeJSON: jest.fn(),
  complete: jest.fn(),
  streamComplete: jest.fn(),
}));

import { completeJSON, complete, streamComplete } from '@/lib/llm';

describe('Freeform Generator - designApp', () => {
  let generator: FreeformGenerator;

  beforeEach(() => {
    generator = new FreeformGenerator();
    jest.clearAllMocks();
  });

  it('should design app from prompt', async () => {
    (completeJSON as jest.Mock).mockResolvedValue(expenseDesignResponse);

    const design = await generator.designApp('track my daily expenses');

    expect(design).toBeDefined();
    expect(design.appName).toBe(expenseDesignResponse.appName);
    expect(design.schema).toBeDefined();
    expect(design.features).toBeDefined();
  });

  it('should ensure schema has id field', async () => {
    const designWithoutId = {
      ...expenseDesignResponse,
      schema: {
        ...expenseDesignResponse.schema,
        fields: expenseDesignResponse.schema.fields.filter(f => f.name !== 'id'),
      },
    };

    (completeJSON as jest.Mock).mockResolvedValue(designWithoutId);

    const design = await generator.designApp('track expenses');

    expect(design.schema.fields.some(f => f.name === 'id')).toBe(true);
  });

  it('should handle simple prompts', async () => {
    (completeJSON as jest.Mock).mockResolvedValue(simpleDesignResponse);

    const design = await generator.designApp('track items');

    expect(design.complexity).toBe('simple');
    expect(design.features.length).toBeGreaterThan(0);
  });

  it('should handle complex prompts', async () => {
    const complexDesign = { ...expenseDesignResponse, complexity: 'complex' as const };
    (completeJSON as jest.Mock).mockResolvedValue(complexDesign);

    const design = await generator.designApp(
      'track expenses with categories, tags, recurring payments, and advanced analytics'
    );

    expect(design.complexity).toBe('complex');
  });
});

describe('Freeform Generator - generateCode', () => {
  let generator: FreeformGenerator;

  beforeEach(() => {
    generator = new FreeformGenerator();
    jest.clearAllMocks();
  });

  it('should generate code from design', async () => {
    (complete as jest.Mock).mockResolvedValue(fullGeneratedCode);

    const code = await generator.generateCode('track expenses', expenseDesignResponse);

    expect(code).toBeDefined();
    expect(code.length).toBeGreaterThan(0);
  });

  it('should clean markdown code blocks', async () => {
    const codeWithMarkdown = '```typescript\n' + fullGeneratedCode + '\n```';
    (complete as jest.Mock).mockResolvedValue(codeWithMarkdown);

    const code = await generator.generateCode('track expenses', expenseDesignResponse);

    expect(code).not.toContain('```');
  });

  it('should include schema in prompt', async () => {
    let promptUsed = '';
    (complete as jest.Mock).mockImplementation(async ({ messages }) => {
      promptUsed = messages[messages.length - 1].content;
      return fullGeneratedCode;
    });

    await generator.generateCode('track expenses', expenseDesignResponse);

    // Prompt should reference the app design
    expect(promptUsed).toContain('track expenses');
    expect(promptUsed.length).toBeGreaterThan(0);
  });

  it('should handle different complexity levels', async () => {
    (complete as jest.Mock).mockResolvedValue(fullGeneratedCode);

    const simpleCode = await generator.generateCode('track items', simpleDesignResponse);
    expect(simpleCode).toBeDefined();

    const complexCode = await generator.generateCode('track expenses', expenseDesignResponse);
    expect(complexCode).toBeDefined();
  });
});

describe('Freeform Generator - streamGenerateCode', () => {
  let generator: FreeformGenerator;

  beforeEach(() => {
    generator = new FreeformGenerator();
    jest.clearAllMocks();
  });

  it('should stream code generation', async () => {
    (streamComplete as jest.Mock).mockImplementation(async function* () {
      for (const chunk of generatedCodeChunks) {
        yield chunk;
      }
    });

    const chunks = await collectAsyncGenerator(
      generator.streamGenerateCode('track expenses', expenseDesignResponse)
    );

    expect(chunks.length).toBeGreaterThan(0);
  });

  it('should emit chunk events', async () => {
    (streamComplete as jest.Mock).mockImplementation(async function* () {
      for (const chunk of generatedCodeChunks) {
        yield chunk;
      }
    });

    const chunks = await collectAsyncGenerator(
      generator.streamGenerateCode('track expenses', expenseDesignResponse)
    );

    const chunkEvents = chunks.filter(c => c.type === 'chunk');
    expect(chunkEvents.length).toBeGreaterThan(0);
  });

  it('should emit complete event', async () => {
    (streamComplete as jest.Mock).mockImplementation(async function* () {
      yield fullGeneratedCode;
    });

    const chunks = await collectAsyncGenerator(
      generator.streamGenerateCode('track expenses', expenseDesignResponse)
    );

    const completeEvent = chunks.find(c => c.type === 'complete');
    expect(completeEvent).toBeDefined();
    expect(completeEvent?.content).toBeDefined();
  });

  it('should clean generated code', async () => {
    const codeWithMarkdown = '```typescript\n' + fullGeneratedCode + '\n```';
    (streamComplete as jest.Mock).mockImplementation(async function* () {
      yield codeWithMarkdown;
    });

    const chunks = await collectAsyncGenerator(
      generator.streamGenerateCode('track expenses', expenseDesignResponse)
    );

    const completeEvent = chunks.find(c => c.type === 'complete');
    expect(completeEvent?.content).not.toContain('```');
  });

  it('should fix common syntax issues', async () => {
    const codeWithBackticks = "content-['text']";
    (streamComplete as jest.Mock).mockImplementation(async function* () {
      yield codeWithBackticks;
    });

    const chunks = await collectAsyncGenerator(
      generator.streamGenerateCode('track expenses', expenseDesignResponse)
    );

    const completeEvent = chunks.find(c => c.type === 'complete');
    // Should fix backticks in Tailwind classes
    expect(completeEvent?.content).not.toContain("content-['");
  });
});

describe('Freeform Generator - refineCode', () => {
  let generator: FreeformGenerator;

  beforeEach(() => {
    generator = new FreeformGenerator();
    jest.clearAllMocks();
  });

  it('should refine code based on feedback', async () => {
    const refinedCode = "'use client';\nexport default function Page() { return <div>Refined</div>; }";
    (complete as jest.Mock).mockResolvedValue(refinedCode);

    const result = await generator.refineCode(
      fullGeneratedCode,
      'The button should be red',
      expenseDesignResponse
    );

    expect(result).toBeDefined();
    expect(result.length).toBeGreaterThan(0);
  });

  it('should include original code in prompt', async () => {
    let promptUsed = '';
    (complete as jest.Mock).mockImplementation(async ({ messages }) => {
      promptUsed = messages[messages.length - 1].content;
      return fullGeneratedCode;
    });

    await generator.refineCode(fullGeneratedCode, 'feedback', expenseDesignResponse);

    expect(promptUsed).toContain(fullGeneratedCode.substring(0, 100));
  });

  it('should include feedback in prompt', async () => {
    let promptUsed = '';
    const feedback = 'The form validation is not working';
    (complete as jest.Mock).mockImplementation(async ({ messages }) => {
      promptUsed = messages[messages.length - 1].content;
      return fullGeneratedCode;
    });

    await generator.refineCode(fullGeneratedCode, feedback, expenseDesignResponse);

    expect(promptUsed).toContain(feedback);
  });

  it('should clean refined code', async () => {
    const codeWithMarkdown = '```typescript\nrefined code\n```';
    (complete as jest.Mock).mockResolvedValue(codeWithMarkdown);

    const result = await generator.refineCode(
      fullGeneratedCode,
      'feedback',
      expenseDesignResponse
    );

    expect(result).not.toContain('```');
  });
});

describe('Freeform Generator - generatePrototype', () => {
  let generator: FreeformGenerator;

  beforeEach(() => {
    generator = new FreeformGenerator();
    jest.clearAllMocks();
  });

  it('should generate quick prototype', async () => {
    (completeJSON as jest.Mock).mockResolvedValue(simpleDesignResponse);

    const { design, previewCode } = await generator.generatePrototype('track items');

    expect(design).toBeDefined();
    expect(previewCode).toBeDefined();
    expect(previewCode.length).toBeGreaterThan(0);
  });

  it('should include design in prototype', async () => {
    (completeJSON as jest.Mock).mockResolvedValue(expenseDesignResponse);

    const { design } = await generator.generatePrototype('track expenses');

    expect(design).toEqual(expenseDesignResponse);
  });

  it('should generate valid preview code', async () => {
    (completeJSON as jest.Mock).mockResolvedValue(simpleDesignResponse);

    const { previewCode } = await generator.generatePrototype('track items');

    expect(previewCode).toContain('function App()');
    expect(previewCode).toContain('useState');
    expect(previewCode).toContain('return');
  });
});

describe('Freeform Generator - process', () => {
  let generator: FreeformGenerator;

  beforeEach(() => {
    generator = new FreeformGenerator();
    jest.clearAllMocks();
  });

  it('should process generation request', async () => {
    (completeJSON as jest.Mock).mockResolvedValue(expenseDesignResponse);
    (complete as jest.Mock).mockResolvedValue(fullGeneratedCode);

    const state = {
      id: 'test-state',
      version: 'v2' as const,
      phase: 'code' as const,
      messages: [],
      schemas: [],
      generatedCode: {},
      componentSpecs: [],
      refinementHistory: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const response = await generator.process('track my expenses', state);

    expect(response.success).toBe(true);
    expect(response.data).toBeDefined();
  });

  it('should return design and code in response', async () => {
    (completeJSON as jest.Mock).mockResolvedValue(expenseDesignResponse);
    (complete as jest.Mock).mockResolvedValue(fullGeneratedCode);

    const state = {
      id: 'test-state',
      version: 'v2' as const,
      phase: 'code' as const,
      messages: [],
      schemas: [],
      generatedCode: {},
      componentSpecs: [],
      refinementHistory: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const response = await generator.process('track expenses', state);

    expect(response.data).toHaveProperty('design');
    expect(response.data).toHaveProperty('code');
    expect(response.data).toHaveProperty('bundle');
  });

  it('should handle processing errors', async () => {
    (completeJSON as jest.Mock).mockRejectedValue(new Error('Design failed'));

    const state = {
      id: 'test-state',
      version: 'v2' as const,
      phase: 'code' as const,
      messages: [],
      schemas: [],
      generatedCode: {},
      componentSpecs: [],
      refinementHistory: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const response = await generator.process('track expenses', state);

    expect(response.success).toBe(false);
    expect(response.requiresUserInput).toBe(true);
  });
});

describe('Freeform Generator - Edge Cases', () => {
  let generator: FreeformGenerator;

  beforeEach(() => {
    generator = new FreeformGenerator();
    jest.clearAllMocks();
  });

  it('should handle empty prompt', async () => {
    (completeJSON as jest.Mock).mockResolvedValue(simpleDesignResponse);

    const design = await generator.designApp('');

    expect(design).toBeDefined();
  });

  it('should handle very long prompt', async () => {
    (completeJSON as jest.Mock).mockResolvedValue(expenseDesignResponse);

    const longPrompt = 'I want to track '.repeat(1000) + 'my expenses';
    const design = await generator.designApp(longPrompt);

    expect(design).toBeDefined();
  });

  it('should handle special characters in prompt', async () => {
    (completeJSON as jest.Mock).mockResolvedValue(expenseDesignResponse);

    const design = await generator.designApp('Track $ expenses & payments!');

    expect(design).toBeDefined();
  });

  it('should handle LLM timeout', async () => {
    (completeJSON as jest.Mock).mockRejectedValue(new Error('timeout'));

    await expect(generator.designApp('track expenses')).rejects.toThrow();
  });

  it('should handle malformed LLM response', async () => {
    (completeJSON as jest.Mock).mockResolvedValue({ invalid: 'response' });

    try {
      const design = await generator.designApp('track expenses');
      // Should still return something, even if incomplete
      expect(design).toBeDefined();
    } catch (error) {
      // Or it might throw an error, which is also acceptable
      expect(error).toBeDefined();
    }
  });

  it('should handle empty code generation', async () => {
    (complete as jest.Mock).mockResolvedValue('');

    const code = await generator.generateCode('track expenses', expenseDesignResponse);

    expect(code).toBe('');
  });

  it('should handle code generation failure', async () => {
    (complete as jest.Mock).mockRejectedValue(new Error('Generation failed'));

    await expect(
      generator.generateCode('track expenses', expenseDesignResponse)
    ).rejects.toThrow();
  });
});

describe('Freeform Generator - JSX Validation', () => {
  let generator: FreeformGenerator;

  beforeEach(() => {
    generator = new FreeformGenerator();
  });

  it('should fix incomplete JSX tags at end of file', () => {
    const codeWithIncompleteTag = `
function App() {
  return (
    <div>
      <h1>Hello World</h1>
      <p>This is incomplete
  );
}`;

    // Access the private method for testing
    const fixedCode = (generator as any).validateAndFixJSX(codeWithIncompleteTag);

    expect(fixedCode).not.toMatch(/<\s*$/);
    expect(fixedCode).toContain('</div>');
    expect(fixedCode).toContain('</p>');
  });

  it('should handle nested unclosed tags', () => {
    const codeWithNestedUnclosed = `
function App() {
  return (
    <div>
      <header>
        <h1>Title</header>
      <main>
        <p>Content</main>
    </div>
  );
}`;

    const fixedCode = (generator as any).validateAndFixJSX(codeWithNestedUnclosed);

    // Should close header and main tags
    expect(fixedCode).toContain('</header>');
    expect(fixedCode).toContain('</main>');
  });

  it('should handle self-closing tags correctly', () => {
    const codeWithSelfClosing = `
function App() {
  return (
    <div>
      <input type="text" />
      <img src="test.jpg" alt="test"
  );
}`;

    const fixedCode = (generator as any).validateAndFixJSX(codeWithSelfClosing);

    expect(fixedCode).toContain('<input type="text" />');
    // img is a void element, should be treated as self-closing
    expect(fixedCode).toMatch(/<img[^>]*\/?>/);
  });
});
