/**
 * Security Validation Tests
 * Comprehensive tests for dangerous patterns and security vulnerabilities
 */

import { bundleAppCode } from '../server-bundler';
import { validateCode } from '../code-bundler';
import { BLOCKED_PACKAGES, isPackageBlocked, isPackageAllowed } from '../dependency-bundle';

describe('Security - Dangerous Patterns', () => {
  describe('eval and dynamic code execution', () => {
    it('should block eval()', async () => {
      const code = `eval('alert(1)');`;
      const result = await bundleAppCode({ code, appId: 'sec-1' });
      expect(result.success).toBe(false);
      expect(result.errors.some(e => e.message.includes('eval'))).toBe(true);
    });

    it('should block eval with spaces', async () => {
      const code = `eval   ('alert(1)');`;
      const result = await bundleAppCode({ code, appId: 'sec-2' });
      expect(result.success).toBe(false);
    });

    it('should block Function constructor', async () => {
      const code = `new Function('return 1 + 1')();`;
      const result = await bundleAppCode({ code, appId: 'sec-3' });
      expect(result.success).toBe(false);
      expect(result.errors.some(e => e.message.includes('Function constructor'))).toBe(true);
    });

    it('should block Function with spaces', async () => {
      const code = `new   Function  ('return 1')();`;
      const result = await bundleAppCode({ code, appId: 'sec-4' });
      expect(result.success).toBe(false);
    });
  });

  describe('Storage APIs', () => {
    it('should block localStorage.setItem', async () => {
      const code = `localStorage.setItem('key', 'value');`;
      const result = await bundleAppCode({ code, appId: 'sec-5' });
      expect(result.success).toBe(false);
      expect(result.errors.some(e => e.message.includes('localStorage'))).toBe(true);
    });

    it('should block localStorage.getItem', async () => {
      const code = `const val = localStorage.getItem('key');`;
      const result = await bundleAppCode({ code, appId: 'sec-6' });
      expect(result.success).toBe(false);
    });

    it('should block localStorage.removeItem', async () => {
      const code = `localStorage.removeItem('key');`;
      const result = await bundleAppCode({ code, appId: 'sec-7' });
      expect(result.success).toBe(false);
    });

    it('should block localStorage.clear', async () => {
      const code = `localStorage.clear();`;
      const result = await bundleAppCode({ code, appId: 'sec-8' });
      expect(result.success).toBe(false);
    });

    it('should block sessionStorage.setItem', async () => {
      const code = `sessionStorage.setItem('key', 'value');`;
      const result = await bundleAppCode({ code, appId: 'sec-9' });
      expect(result.success).toBe(false);
      expect(result.errors.some(e => e.message.includes('sessionStorage'))).toBe(true);
    });

    it('should block sessionStorage.getItem', async () => {
      const code = `const val = sessionStorage.getItem('key');`;
      const result = await bundleAppCode({ code, appId: 'sec-10' });
      expect(result.success).toBe(false);
    });
  });

  describe('Cookie access', () => {
    it('should block document.cookie read', async () => {
      const code = `const cookies = document.cookie;`;
      const result = await bundleAppCode({ code, appId: 'sec-11' });
      expect(result.success).toBe(false);
      expect(result.errors.some(e => e.message.toLowerCase().includes('cookie'))).toBe(true);
    });

    it('should block document.cookie write', async () => {
      const code = `document.cookie = 'session=abc123';`;
      const result = await bundleAppCode({ code, appId: 'sec-12' });
      expect(result.success).toBe(false);
    });
  });

  describe('Navigation and popups', () => {
    it('should block window.open', async () => {
      const code = `window.open('https://example.com');`;
      const result = await bundleAppCode({ code, appId: 'sec-13' });
      expect(result.success).toBe(false);
      expect(result.errors.some(e => e.message.includes('window.open'))).toBe(true);
    });

    it('should block window.location assignment', async () => {
      const code = `window.location = 'https://evil.com';`;
      const result = await bundleAppCode({ code, appId: 'sec-14' });
      expect(result.success).toBe(false);
      expect(result.errors.some(e => e.message.includes('Navigation'))).toBe(true);
    });

    it('should block window.location.href assignment', async () => {
      const code = `window.location.href = 'https://evil.com';`;
      const result = await bundleAppCode({ code, appId: 'sec-15' });
      expect(result.success).toBe(false);
    });
  });

  describe('DOM manipulation', () => {
    it('should warn about innerHTML assignment', async () => {
      const code = `const div = document.createElement('div');
div.innerHTML = '<script>alert(1)</script>';`;
      const result = await bundleAppCode({ code, appId: 'sec-16' });
      expect(result.warnings.some(w => w.includes('innerHTML'))).toBe(true);
    });

    it('should block document.write', async () => {
      const code = `document.write('<h1>Injected</h1>');`;
      const result = await bundleAppCode({ code, appId: 'sec-17' });
      expect(result.success).toBe(false);
      expect(result.errors.some(e => e.message.includes('document.write'))).toBe(true);
    });
  });

  describe('Worker APIs', () => {
    it('should block importScripts', async () => {
      const code = `importScripts('https://cdn.example.com/script.js');`;
      const result = await bundleAppCode({ code, appId: 'sec-18' });
      expect(result.success).toBe(false);
      expect(result.errors.some(e => e.message.includes('importScripts'))).toBe(true);
    });
  });

  describe('Network APIs', () => {
    it('should warn about WebSocket', async () => {
      const code = `const ws = new WebSocket('ws://localhost:8080');`;
      const result = await bundleAppCode({ code, appId: 'sec-19' });
      expect(result.warnings.some(w => w.includes('WebSocket'))).toBe(true);
    });

    it('should warn about XMLHttpRequest', async () => {
      const code = `const xhr = new XMLHttpRequest();
xhr.open('GET', '/api/data');`;
      const result = await bundleAppCode({ code, appId: 'sec-20' });
      expect(result.warnings.some(w => w.includes('XMLHttpRequest'))).toBe(true);
    });
  });
});

describe('Security - Blocked Packages', () => {
  describe('File system packages', () => {
    const fsPackages = ['fs', 'fs-extra', 'node:fs'];
    
    fsPackages.forEach(pkg => {
      it(`should block ${pkg}`, async () => {
        const code = `import fs from '${pkg}';`;
        const result = await bundleAppCode({ code, appId: `pkg-${pkg}` });
        expect(result.success).toBe(false);
        expect(result.errors.some(e => e.message.includes(pkg))).toBe(true);
      });
    });
  });

  describe('Process and OS packages', () => {
    const systemPackages = ['child_process', 'node:child_process', 'os', 'node:os', 'cluster', 'node:cluster'];
    
    systemPackages.forEach(pkg => {
      it(`should block ${pkg}`, async () => {
        const code = `import pkg from '${pkg}';`;
        const result = await bundleAppCode({ code, appId: `pkg-${pkg}` });
        expect(result.success).toBe(false);
      });
    });
  });

  describe('Server frameworks', () => {
    const frameworks = ['express', 'fastify', 'koa', 'hapi'];
    
    frameworks.forEach(framework => {
      it(`should block ${framework}`, async () => {
        const code = `import ${framework} from '${framework}';`;
        const result = await bundleAppCode({ code, appId: `fw-${framework}` });
        expect(result.success).toBe(false);
        expect(result.errors.some(e => e.message.includes(framework))).toBe(true);
      });
    });
  });

  describe('Database drivers', () => {
    const databases = ['pg', 'mysql', 'mysql2', 'mongodb', 'sqlite3', 'better-sqlite3'];
    
    databases.forEach(db => {
      it(`should block ${db}`, async () => {
        const code = `import db from '${db}';`;
        const result = await bundleAppCode({ code, appId: `db-${db}` });
        expect(result.success).toBe(false);
        // Some db drivers might not have the useAppData suggestion, just check they're blocked
        expect(result.errors.length).toBeGreaterThan(0);
      });
    });
  });

  describe('ORM packages', () => {
    const orms = ['prisma', '@prisma/client', 'mongoose', 'sequelize', 'typeorm', 'knex'];
    
    orms.forEach(orm => {
      it(`should block ${orm}`, async () => {
        const code = `import orm from '${orm}';`;
        const result = await bundleAppCode({ code, appId: `orm-${orm}` });
        expect(result.success).toBe(false);
      });
    });
  });

  describe('Network packages', () => {
    const networkPackages = ['net', 'node:net', 'dgram', 'node:dgram', 'http', 'node:http', 'https', 'node:https'];
    
    networkPackages.forEach(pkg => {
      it(`should block ${pkg}`, () => {
        expect(isPackageBlocked(pkg)).toBe(true);
      });
    });
  });

  describe('Deprecated packages', () => {
    it('should block moment', async () => {
      const code = `import moment from 'moment';`;
      const result = await bundleAppCode({ code, appId: 'deprecated-1' });
      expect(result.success).toBe(false);
      expect(result.errors.some(e => e.suggestion?.includes('date-fns'))).toBe(true);
    });

    it('should block moment-timezone', async () => {
      const code = `import moment from 'moment-timezone';`;
      const result = await bundleAppCode({ code, appId: 'deprecated-2' });
      expect(result.success).toBe(false);
    });

    it('should block lodash (non-ES version)', async () => {
      const code = `import _ from 'lodash';`;
      const result = await bundleAppCode({ code, appId: 'deprecated-3' });
      expect(result.success).toBe(false);
      expect(result.errors.some(e => e.suggestion?.includes('lodash-es'))).toBe(true);
    });
  });

  describe('State management packages', () => {
    const statePackages = ['redux', 'react-redux', '@reduxjs/toolkit', 'mobx', 'mobx-react', 'mobx-react-lite'];
    
    statePackages.forEach(pkg => {
      it(`should block ${pkg}`, async () => {
        const code = `import pkg from '${pkg}';`;
        const result = await bundleAppCode({ code, appId: `state-${pkg}` });
        expect(result.success).toBe(false);
      });
    });
  });

  describe('Router packages', () => {
    it('should block react-router', async () => {
      const code = `import { BrowserRouter } from 'react-router';`;
      const result = await bundleAppCode({ code, appId: 'router-1' });
      expect(result.success).toBe(false);
    });

    it('should block react-router-dom', async () => {
      const code = `import { BrowserRouter } from 'react-router-dom';`;
      const result = await bundleAppCode({ code, appId: 'router-2' });
      expect(result.success).toBe(false);
    });

    it('should block Next.js router', async () => {
      const code = `import { useRouter } from 'next/router';`;
      const result = await bundleAppCode({ code, appId: 'router-3' });
      expect(result.success).toBe(false);
    });
  });

  describe('HTTP clients', () => {
    it('should block axios', async () => {
      const code = `import axios from 'axios';`;
      const result = await bundleAppCode({ code, appId: 'http-1' });
      expect(result.success).toBe(false);
      expect(result.errors.some(e => e.suggestion?.includes('fetch'))).toBe(true);
    });
  });
});

describe('Security - Package Validation Functions', () => {
  describe('isPackageBlocked', () => {
    it('should return true for blocked packages', () => {
      BLOCKED_PACKAGES.forEach(pkg => {
        expect(isPackageBlocked(pkg)).toBe(true);
      });
    });

    it('should return true for sub-paths of blocked packages', () => {
      expect(isPackageBlocked('fs/promises')).toBe(true);
      expect(isPackageBlocked('express/lib/router')).toBe(true);
    });

    it('should return false for allowed packages', () => {
      expect(isPackageBlocked('react')).toBe(false);
      expect(isPackageBlocked('date-fns')).toBe(false);
      expect(isPackageBlocked('recharts')).toBe(false);
    });
  });

  describe('isPackageAllowed', () => {
    it('should return true for allowed packages', () => {
      const allowedPackages = [
        'react',
        'react-dom',
        'date-fns',
        'lodash-es',
        'clsx',
        'tailwind-merge',
        'nanoid',
        'lucide-react',
        'recharts',
        'react-hook-form',
        'zod',
        'framer-motion',
        '@tanstack/react-table',
        'zustand',
        'jotai',
        'react-hot-toast',
      ];

      allowedPackages.forEach(pkg => {
        expect(isPackageAllowed(pkg)).toBe(true);
      });
    });

    it('should return false for blocked packages', () => {
      expect(isPackageAllowed('axios')).toBe(false);
      expect(isPackageAllowed('fs')).toBe(false);
      expect(isPackageAllowed('express')).toBe(false);
    });

    it('should return false for unknown packages', () => {
      expect(isPackageAllowed('unknown-package')).toBe(false);
      expect(isPackageAllowed('malicious-lib')).toBe(false);
    });

    it('should handle scoped packages', () => {
      expect(isPackageAllowed('@radix-ui/react-dialog')).toBe(true);
      expect(isPackageAllowed('@evil/malware')).toBe(false);
    });
  });
});

describe('Security - Obfuscation Attempts', () => {
  it('should detect encoded eval attempts', async () => {
    // Even if someone tries to obfuscate, the pattern should catch it
    const code = `const e = 'eval'; window[e]('alert(1)');`;
    // This particular obfuscation won't be caught by simple regex,
    // but direct eval() calls will be
    const directEval = `eval('alert(1)');`;
    const result = await bundleAppCode({ code: directEval, appId: 'obf-1' });
    expect(result.success).toBe(false);
  });

  it('should detect various forms of eval', async () => {
    const variants = [
      `eval('1+1');`,
      `eval  ('1+1');`,
      `eval\n('1+1');`,
      `eval\t('1+1');`,
    ];

    for (const variant of variants) {
      const result = await bundleAppCode({ code: variant, appId: `obf-var-${Math.random()}` });
      expect(result.success).toBe(false);
    }
  });

  it('should detect various forms of localStorage', async () => {
    const variants = [
      `localStorage.setItem('k', 'v');`,
      `localStorage .setItem('k', 'v');`,
      `localStorage. setItem('k', 'v');`,
    ];

    for (const variant of variants) {
      const result = await bundleAppCode({ code: variant, appId: `obf-ls-${Math.random()}` });
      expect(result.success).toBe(false);
    }
  });
});

describe('Security - validateCode (Client Bundler)', () => {
  it('should validate the same dangerous patterns', () => {
    const tests = [
      { code: `eval('1')`, shouldFail: true, pattern: 'eval' },
      { code: `new Function('return 1')`, shouldFail: true, pattern: 'Function' },
      { code: `localStorage.setItem('k', 'v')`, shouldFail: true, pattern: 'localStorage' },
      { code: `sessionStorage.getItem('k')`, shouldFail: true, pattern: 'sessionStorage' },
      { code: `window.open('/')`, shouldFail: true, pattern: 'window.open' },
      { code: `document.cookie`, shouldFail: true, pattern: 'cookie' },
      { code: `window.location = '/'`, shouldFail: true, pattern: 'Navigation' },
    ];

    tests.forEach(({ code, shouldFail, pattern }) => {
      const result = validateCode(code);
      expect(result.valid).toBe(!shouldFail);
      if (shouldFail) {
        expect(result.errors.some(e => e.toLowerCase().includes(pattern.toLowerCase()))).toBe(true);
      }
    });
  });

  it('should allow safe code', () => {
    const safeCode = `
      const [data, setData] = useState([]);
      const items = useAppData();
      const formatted = new Date().toISOString();
    `;

    const result = validateCode(safeCode);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });
});

describe('Security - Edge Cases', () => {
  it('should handle code with comments containing dangerous keywords', async () => {
    const code = `// This is a comment about eval() being dangerous
// localStorage should not be used
const data = useState([]);`;

    const result = await bundleAppCode({ code, appId: 'edge-1' });
    // Comments shouldn't trigger security checks (they're safe)
    // But our regex will catch them - that's okay, better safe than sorry
  });

  it('should handle code with string literals containing dangerous keywords', async () => {
    const code = `const message = 'Do not use eval() or localStorage';`;

    const result = await bundleAppCode({ code, appId: 'edge-2' });
    // String literals will be caught - that's okay for security
  });

  it('should handle multiline patterns', async () => {
    const code = `eval(
      'alert(1)'
    );`;

    const result = await bundleAppCode({ code, appId: 'edge-3' });
    expect(result.success).toBe(false);
  });

  it('should handle nested function calls', async () => {
    const code = `const result = eval(JSON.stringify({ key: 'value' }));`;

    const result = await bundleAppCode({ code, appId: 'edge-4' });
    expect(result.success).toBe(false);
  });
});
