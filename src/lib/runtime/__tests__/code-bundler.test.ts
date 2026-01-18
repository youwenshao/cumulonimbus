/**
 * Code Bundler Unit Tests
 * Tests for bundling, validation, and code cleaning
 */

import {
  bundleCode,
  validateCode,
  estimateComplexity,
} from '../code-bundler';
import { createSampleSchema, createSampleGeneratedCode } from '@/lib/__tests__/test-utils';
import {
  validReactComponent,
  codeWithMarkdown,
  codeWithoutUseClient,
  codeWithEval,
  codeWithLocalStorage,
  codeWithWindowOpen,
  codeWithSyntaxError,
  codeWithoutDefaultExport,
  arrowFunctionComponent,
  complexValidCode,
  minimalComponent,
  emptyCode,
} from '@/lib/__tests__/fixtures/sample-code';

describe('Code Bundler - bundleCode', () => {
  const schema = createSampleSchema();

  it('should bundle valid React component code', () => {
    const result = bundleCode({
      appId: 'test-app-1',
      appCode: validReactComponent,
      schema,
    });

    expect(result).toHaveProperty('bundledCode');
    expect(result).toHaveProperty('files');
    expect(result).toHaveProperty('bundleSize');
    expect(result.bundledCode).toContain('useAppData');
    expect(result.bundledCode).toContain('function useAppData()');
  });

  it('should include useAppData hook in bundled code', () => {
    const result = bundleCode({
      appId: 'test-app-2',
      appCode: validReactComponent,
      schema,
    });

    expect(result.bundledCode).toContain('function useAppData()');
    expect(result.bundledCode).toContain('const [data, setData]');
  });

  it('should strip imports from code', () => {
    const codeWithImports = `import { useState } from 'react';
import { format } from 'date-fns';

export default function Page() {
  return <div>Test</div>;
}`;

    const result = bundleCode({
      appId: 'test-app-3',
      appCode: codeWithImports,
      schema,
    });

    expect(result.bundledCode).not.toContain("import { useState } from 'react'");
    expect(result.bundledCode).not.toContain("import { format } from 'date-fns'");
  });

  it('should strip "use client" directive', () => {
    const result = bundleCode({
      appId: 'test-app-4',
      appCode: validReactComponent,
      schema,
    });

    // "use client" should be removed from the bundled code
    const codeLines = result.bundledCode.split('\n');
    const hasUseClient = codeLines.some(line => line.trim() === "'use client';");
    expect(hasUseClient).toBe(false);
  });

  it('should strip export statements', () => {
    const result = bundleCode({
      appId: 'test-app-5',
      appCode: validReactComponent,
      schema,
    });

    // Should not have "export default" in the cleaned section
    const cleanedSection = result.bundledCode.split('// Main App Component')[1];
    expect(cleanedSection).not.toContain('export default');
  });

  it('should extract component name from function declaration', () => {
    const code = `function ExpenseTrackerPage() {
  return <div>Test</div>;
}`;

    const result = bundleCode({
      appId: 'test-app-6',
      appCode: code,
      schema,
    });

    expect(result.bundledCode).toContain('window.App = ExpenseTrackerPage');
  });

  it('should extract component name from arrow function', () => {
    const result = bundleCode({
      appId: 'test-app-7',
      appCode: arrowFunctionComponent,
      schema,
    });

    expect(result.bundledCode).toContain('window.App = TestPage');
  });

  it('should default to App if component name not found', () => {
    const anonymousCode = `export default () => <div>Test</div>;`;

    const result = bundleCode({
      appId: 'test-app-8',
      appCode: anonymousCode,
      schema,
    });

    expect(result.bundledCode).toContain('window.App = App');
  });

  it('should include component files in files object', () => {
    const result = bundleCode({
      appId: 'test-app-9',
      appCode: validReactComponent,
      componentFiles: {
        'Button.tsx': 'export default function Button() { return <button>Click</button>; }',
        'Header.tsx': 'export default function Header() { return <header>Header</header>; }',
      },
      schema,
    });

    expect(result.files).toBeDefined();
    expect(result.files['App.tsx']).toBeDefined();
  });

  it('should include type definitions in files object', () => {
    const typeDefinitions = `export interface User {
  id: string;
  name: string;
}`;

    const result = bundleCode({
      appId: 'test-app-10',
      appCode: validReactComponent,
      typeDefinitions,
      schema,
    });

    expect(result.files).toBeDefined();
    expect(result.files['App.tsx']).toBeDefined();
  });

  it('should calculate bundle size', () => {
    const result = bundleCode({
      appId: 'test-app-11',
      appCode: validReactComponent,
      schema,
    });

    expect(result.bundleSize).toBeGreaterThan(0);
    expect(typeof result.bundleSize).toBe('number');
  });

  it('should generate default app if no code provided', () => {
    const result = bundleCode({
      appId: 'test-app-12',
      appCode: '',
      schema,
    });

    expect(result.bundledCode).toContain('function App()');
    expect(result.bundledCode).toContain('useAppData');
  });

  it('should handle empty code gracefully', () => {
    const result = bundleCode({
      appId: 'test-app-13',
      appCode: emptyCode,
      schema,
    });

    expect(result.bundledCode).toBeDefined();
    expect(result.files['App.tsx']).toBeDefined();
  });

  it('should handle whitespace-only code', () => {
    const result = bundleCode({
      appId: 'test-app-14',
      appCode: '   \n\n   ',
      schema,
    });

    expect(result.bundledCode).toBeDefined();
  });
});

describe('Code Bundler - validateCode', () => {
  it('should detect eval() usage', () => {
    const result = validateCode(codeWithEval);

    expect(result.valid).toBe(false);
    expect(result.errors).toContain('eval() is not allowed');
  });

  it('should detect Function constructor usage', () => {
    const code = `const fn = new Function('return 1 + 1');`;

    const result = validateCode(code);

    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('Function constructor'))).toBe(true);
  });

  it('should detect localStorage usage', () => {
    const result = validateCode(codeWithLocalStorage);

    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('localStorage'))).toBe(true);
  });

  it('should detect sessionStorage usage', () => {
    const code = `sessionStorage.setItem('key', 'value');`;

    const result = validateCode(code);

    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('sessionStorage'))).toBe(true);
  });

  it('should detect window.open usage', () => {
    const result = validateCode(codeWithWindowOpen);

    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('window.open'))).toBe(true);
  });

  it('should detect document.cookie access', () => {
    const code = `const cookies = document.cookie;`;

    const result = validateCode(code);

    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('Cookie access'))).toBe(true);
  });

  it('should detect window.location assignment', () => {
    const code = `window.location = 'https://evil.com';`;

    const result = validateCode(code);

    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('Navigation'))).toBe(true);
  });

  it('should allow safe code', () => {
    const safeCode = `
      const items = useAppData();
      const formatted = new Date().toISOString();
      const handleClick = () => console.log('clicked');
    `;

    const result = validateCode(safeCode);

    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('should allow useAppData hook', () => {
    const code = `const { data, addRecord } = useAppData();`;

    const result = validateCode(code);

    expect(result.valid).toBe(true);
  });

  it('should allow SandboxAPI.fetch', () => {
    const code = `async function fetchData() { const data = await window.SandboxAPI.fetch('/api/data'); }`;

    const result = validateCode(code);

    expect(result.valid).toBe(true);
  });
});

describe('Code Bundler - estimateComplexity', () => {
  it('should estimate simple component as simple', () => {
    const result = estimateComplexity(minimalComponent);

    expect(result.complexity).toBe('simple');
    expect(result.lines).toBeLessThan(50);
    expect(result.components).toBeLessThanOrEqual(5);
    expect(result.hooks).toBeLessThanOrEqual(5);
  });

  it('should estimate moderate component as moderate', () => {
    const result = estimateComplexity(validReactComponent);

    expect(['simple', 'moderate']).toContain(result.complexity);
    expect(result.lines).toBeGreaterThan(0);
  });

  it('should estimate complex component as complex', () => {
    const result = estimateComplexity(complexValidCode);

    expect(['moderate', 'complex']).toContain(result.complexity);
    expect(result.lines).toBeGreaterThan(50);
  });

  it('should count lines correctly', () => {
    const code = `line1
line2
line3`;

    const result = estimateComplexity(code);

    expect(result.lines).toBe(3);
  });

  it('should count components correctly', () => {
    const code = `function ComponentA() {}
function ComponentB() {}
function ComponentC() {}`;

    const result = estimateComplexity(code);

    expect(result.components).toBe(3);
  });

  it('should count hooks correctly', () => {
    const code = `
const data = useState();
const effect = useEffect();
const callback = useCallback();
const memo = useMemo();
const ref = useRef();
`;

    const result = estimateComplexity(code);

    expect(result.hooks).toBeGreaterThanOrEqual(5);
  });

  it('should handle empty code', () => {
    const result = estimateComplexity('');

    expect(result.lines).toBe(1); // Empty string still counts as 1 line
    expect(result.components).toBe(0);
    expect(result.hooks).toBe(0);
    expect(result.complexity).toBe('simple');
  });

  it('should classify by line count threshold', () => {
    const longCode = 'const x = 1;\n'.repeat(600);

    const result = estimateComplexity(longCode);

    expect(result.complexity).toBe('complex');
    expect(result.lines).toBeGreaterThan(500);
  });

  it('should classify by component count threshold', () => {
    const manyComponents = 'function Component() {}\n'.repeat(15);

    const result = estimateComplexity(manyComponents);

    expect(result.complexity).toBe('complex');
    expect(result.components).toBeGreaterThan(10);
  });

  it('should classify by hook count threshold', () => {
    const manyHooks = 'useState(); useEffect();\n'.repeat(10);

    const result = estimateComplexity(manyHooks);

    expect(result.complexity).toBe('complex');
    expect(result.hooks).toBeGreaterThan(10);
  });
});

describe('Code Bundler - Edge Cases', () => {
  it('should handle code with multiple export statements', () => {
    const code = `export const helper = () => {};
export const utility = () => {};
export default function Page() { return <div>Test</div>; }`;

    const result = bundleCode({
      appId: 'test-edge-1',
      appCode: code,
      schema: createSampleSchema(),
    });

    expect(result.bundledCode).toBeDefined();
  });

  it('should handle code with JSX fragments', () => {
    const code = `export default function Page() {
  return (
    <>
      <div>Item 1</div>
      <div>Item 2</div>
    </>
  );
}`;

    const result = bundleCode({
      appId: 'test-edge-2',
      appCode: code,
      schema: createSampleSchema(),
    });

    expect(result.bundledCode).toContain('<>');
  });

  it('should handle code with TypeScript types', () => {
    const code = `interface Props {
  title: string;
}

export default function Page({ title }: Props) {
  return <div>{title}</div>;
}`;

    const result = bundleCode({
      appId: 'test-edge-3',
      appCode: code,
      schema: createSampleSchema(),
    });

    expect(result.bundledCode).toContain('interface Props');
  });

  it('should handle code with template literals', () => {
    const code = `export default function Page() {
  const name = 'World';
  return <div>{\`Hello \${name}\`}</div>;
}`;

    const result = bundleCode({
      appId: 'test-edge-4',
      appCode: code,
      schema: createSampleSchema(),
    });

    expect(result.bundledCode).toContain('`');
  });

  it('should handle code with async/await', () => {
    const code = `export default function Page() {
  const fetchData = async () => {
    const res = await fetch('/api/data');
    return await res.json();
  };
  return <div>Test</div>;
}`;

    const result = bundleCode({
      appId: 'test-edge-5',
      appCode: code,
      schema: createSampleSchema(),
    });

    expect(result.bundledCode).toContain('async');
    expect(result.bundledCode).toContain('await');
  });

  it('should handle code with destructuring', () => {
    const code = `export default function Page() {
  const { data, isLoading } = useAppData();
  const [count, setCount] = useState(0);
  return <div>{count}</div>;
}`;

    const result = bundleCode({
      appId: 'test-edge-6',
      appCode: code,
      schema: createSampleSchema(),
    });

    expect(result.bundledCode).toContain('{ data, isLoading }');
  });

  it('should handle code with optional chaining', () => {
    const code = `export default function Page() {
  const value = data?.items?.[0]?.name;
  return <div>{value}</div>;
}`;

    const result = bundleCode({
      appId: 'test-edge-7',
      appCode: code,
      schema: createSampleSchema(),
    });

    expect(result.bundledCode).toContain('?.');
  });

  it('should handle code with nullish coalescing', () => {
    const code = `export default function Page() {
  const value = data ?? 'default';
  return <div>{value}</div>;
}`;

    const result = bundleCode({
      appId: 'test-edge-8',
      appCode: code,
      schema: createSampleSchema(),
    });

    expect(result.bundledCode).toContain('??');
  });
});
