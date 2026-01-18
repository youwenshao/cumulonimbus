/**
 * Dependency Bundle Tests
 * Tests for bundle detection, package validation, and dependency analysis
 */

import {
  analyzeImports,
  isPackageBlocked,
  isPackageAllowed,
  getAlwaysLoadedBundles,
  getLazyLoadedBundles,
  getAllPackages,
  getBundleUrl,
  getGlobalNamespace,
  BUNDLE_CONFIG,
  BLOCKED_PACKAGES,
} from '../dependency-bundle';

describe('Dependency Bundle - analyzeImports', () => {
  it('should always include core and utils bundles', () => {
    const code = `export default function Page() { return <div>Test</div>; }`;
    const bundles = analyzeImports(code);

    expect(bundles).toContain('core');
    expect(bundles).toContain('utils');
  });

  it('should detect icons bundle from lucide-react import', () => {
    const code = `import { Heart, Star } from 'lucide-react';`;
    const bundles = analyzeImports(code);

    expect(bundles).toContain('icons');
  });

  it('should detect charts bundle from recharts import', () => {
    const code = `import { LineChart, Line } from 'recharts';`;
    const bundles = analyzeImports(code);

    expect(bundles).toContain('charts');
  });

  it('should detect forms bundle from react-hook-form', () => {
    const code = `import { useForm } from 'react-hook-form';`;
    const bundles = analyzeImports(code);

    expect(bundles).toContain('forms');
  });

  it('should detect forms bundle from zod', () => {
    const code = `import { z } from 'zod';`;
    const bundles = analyzeImports(code);

    expect(bundles).toContain('forms');
  });

  it('should detect animations bundle from framer-motion', () => {
    const code = `import { motion, AnimatePresence } from 'framer-motion';`;
    const bundles = analyzeImports(code);

    expect(bundles).toContain('animations');
  });

  it('should detect tables bundle from @tanstack/react-table', () => {
    const code = `import { useReactTable } from '@tanstack/react-table';`;
    const bundles = analyzeImports(code);

    expect(bundles).toContain('tables');
  });

  it('should detect state bundle from zustand', () => {
    const code = `import { create } from 'zustand';`;
    const bundles = analyzeImports(code);

    expect(bundles).toContain('state');
  });

  it('should detect state bundle from jotai', () => {
    const code = `import { atom, useAtom } from 'jotai';`;
    const bundles = analyzeImports(code);

    expect(bundles).toContain('state');
  });

  it('should detect misc bundle from toast', () => {
    const code = `import { toast } from 'react-hot-toast';`;
    const bundles = analyzeImports(code);

    expect(bundles).toContain('misc');
  });

  it('should detect multiple bundles', () => {
    const code = `
      import { Heart } from 'lucide-react';
      import { LineChart } from 'recharts';
      import { useForm } from 'react-hook-form';
    `;
    const bundles = analyzeImports(code);

    expect(bundles).toContain('icons');
    expect(bundles).toContain('charts');
    expect(bundles).toContain('forms');
  });

  it('should detect bundles from usage patterns without imports', () => {
    const code = `
      const chart = <LineChart><Line /></LineChart>;
      const form = useForm();
      const animated = <motion.div />;
    `;
    const bundles = analyzeImports(code);

    expect(bundles).toContain('charts');
    expect(bundles).toContain('forms');
    expect(bundles).toContain('animations');
  });

  it('should not duplicate bundles', () => {
    const code = `
      import { Heart } from 'lucide-react';
      const icon = <Heart />;
    `;
    const bundles = analyzeImports(code);

    const iconCount = bundles.filter(b => b === 'icons').length;
    expect(iconCount).toBe(1);
  });

  it('should handle code with no special imports', () => {
    const code = `export default function Page() { return <div>Simple</div>; }`;
    const bundles = analyzeImports(code);

    expect(bundles).toEqual(['core', 'utils']);
  });
});

describe('Dependency Bundle - isPackageBlocked', () => {
  it('should return true for all blocked packages', () => {
    BLOCKED_PACKAGES.forEach(pkg => {
      expect(isPackageBlocked(pkg)).toBe(true);
    });
  });

  it('should return true for sub-paths of blocked packages', () => {
    expect(isPackageBlocked('fs/promises')).toBe(true);
    expect(isPackageBlocked('express/lib')).toBe(true);
    expect(isPackageBlocked('node:fs/promises')).toBe(true);
  });

  it('should return false for allowed packages', () => {
    expect(isPackageBlocked('react')).toBe(false);
    expect(isPackageBlocked('date-fns')).toBe(false);
    expect(isPackageBlocked('recharts')).toBe(false);
    expect(isPackageBlocked('lodash-es')).toBe(false);
  });

  it('should block file system packages', () => {
    expect(isPackageBlocked('fs')).toBe(true);
    expect(isPackageBlocked('fs-extra')).toBe(true);
    expect(isPackageBlocked('node:fs')).toBe(true);
  });

  it('should block server frameworks', () => {
    expect(isPackageBlocked('express')).toBe(true);
    expect(isPackageBlocked('fastify')).toBe(true);
    expect(isPackageBlocked('koa')).toBe(true);
  });

  it('should block database drivers', () => {
    expect(isPackageBlocked('pg')).toBe(true);
    expect(isPackageBlocked('mysql')).toBe(true);
    expect(isPackageBlocked('mongodb')).toBe(true);
    expect(isPackageBlocked('prisma')).toBe(true);
  });

  it('should block deprecated packages', () => {
    expect(isPackageBlocked('moment')).toBe(true);
    expect(isPackageBlocked('lodash')).toBe(true);
  });

  it('should block heavy packages', () => {
    expect(isPackageBlocked('three')).toBe(true);
    expect(isPackageBlocked('rxjs')).toBe(true);
  });

  it('should block routing packages', () => {
    expect(isPackageBlocked('react-router')).toBe(true);
    expect(isPackageBlocked('react-router-dom')).toBe(true);
    expect(isPackageBlocked('next')).toBe(true);
  });

  it('should block axios', () => {
    expect(isPackageBlocked('axios')).toBe(true);
  });
});

describe('Dependency Bundle - isPackageAllowed', () => {
  it('should return true for React', () => {
    expect(isPackageAllowed('react')).toBe(true);
    expect(isPackageAllowed('react-dom')).toBe(true);
  });

  it('should return true for utils packages', () => {
    expect(isPackageAllowed('date-fns')).toBe(true);
    expect(isPackageAllowed('lodash-es')).toBe(true);
    expect(isPackageAllowed('clsx')).toBe(true);
    expect(isPackageAllowed('tailwind-merge')).toBe(true);
    expect(isPackageAllowed('nanoid')).toBe(true);
    expect(isPackageAllowed('dayjs')).toBe(true);
  });

  it('should return true for icons packages', () => {
    expect(isPackageAllowed('lucide-react')).toBe(true);
  });

  it('should return true for forms packages', () => {
    expect(isPackageAllowed('react-hook-form')).toBe(true);
    expect(isPackageAllowed('zod')).toBe(true);
  });

  it('should return true for charts packages', () => {
    expect(isPackageAllowed('recharts')).toBe(true);
  });

  it('should return true for animations packages', () => {
    expect(isPackageAllowed('framer-motion')).toBe(true);
  });

  it('should return true for UI packages', () => {
    expect(isPackageAllowed('@radix-ui/react-dialog')).toBe(true);
    expect(isPackageAllowed('@headlessui/react')).toBe(true);
  });

  it('should return true for table packages', () => {
    expect(isPackageAllowed('@tanstack/react-table')).toBe(true);
  });

  it('should return true for DnD packages', () => {
    expect(isPackageAllowed('@dnd-kit/core')).toBe(true);
    expect(isPackageAllowed('@dnd-kit/sortable')).toBe(true);
  });

  it('should return true for state packages', () => {
    expect(isPackageAllowed('zustand')).toBe(true);
    expect(isPackageAllowed('jotai')).toBe(true);
  });

  it('should return true for misc packages', () => {
    expect(isPackageAllowed('react-hot-toast')).toBe(true);
    expect(isPackageAllowed('sonner')).toBe(true);
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

  it('should handle scoped package paths', () => {
    expect(isPackageAllowed('@radix-ui/react-dialog/dist/index.js')).toBe(true);
    expect(isPackageAllowed('@evil/package')).toBe(false);
  });

  it('should prioritize blocked list', () => {
    // Even if a package is in both lists, blocked should win
    expect(isPackageAllowed('axios')).toBe(false);
  });
});

describe('Dependency Bundle - Bundle Configuration', () => {
  it('should have valid bundle configuration', () => {
    expect(BUNDLE_CONFIG).toBeDefined();
    expect(Object.keys(BUNDLE_CONFIG).length).toBeGreaterThan(0);
  });

  it('should have loadStrategy for all bundles', () => {
    Object.values(BUNDLE_CONFIG).forEach(config => {
      expect(['always', 'lazy']).toContain(config.loadStrategy);
    });
  });

  it('should have packages array for all bundles', () => {
    Object.values(BUNDLE_CONFIG).forEach(config => {
      expect(Array.isArray(config.packages)).toBe(true);
    });
  });

  it('should have exports array for all bundles', () => {
    Object.values(BUNDLE_CONFIG).forEach(config => {
      expect(Array.isArray(config.exports)).toBe(true);
    });
  });

  it('should have core bundle', () => {
    expect(BUNDLE_CONFIG.core).toBeDefined();
    expect(BUNDLE_CONFIG.core.loadStrategy).toBe('always');
  });

  it('should have utils bundle', () => {
    expect(BUNDLE_CONFIG.utils).toBeDefined();
    expect(BUNDLE_CONFIG.utils.loadStrategy).toBe('always');
  });

  it('should have icons bundle', () => {
    expect(BUNDLE_CONFIG.icons).toBeDefined();
    expect(BUNDLE_CONFIG.icons.packages).toContain('lucide-react');
  });

  it('should have charts bundle', () => {
    expect(BUNDLE_CONFIG.charts).toBeDefined();
    expect(BUNDLE_CONFIG.charts.packages).toContain('recharts');
  });

  it('should have forms bundle', () => {
    expect(BUNDLE_CONFIG.forms).toBeDefined();
    expect(BUNDLE_CONFIG.forms.packages).toContain('react-hook-form');
    expect(BUNDLE_CONFIG.forms.packages).toContain('zod');
  });
});

describe('Dependency Bundle - Helper Functions', () => {
  describe('getAlwaysLoadedBundles', () => {
    it('should return bundles with always load strategy', () => {
      const bundles = getAlwaysLoadedBundles();

      expect(bundles).toContain('core');
      expect(bundles).toContain('utils');
      expect(bundles.length).toBeGreaterThan(0);
    });

    it('should not return lazy-loaded bundles', () => {
      const bundles = getAlwaysLoadedBundles();

      // These should be lazy-loaded
      expect(bundles).not.toContain('icons');
      expect(bundles).not.toContain('charts');
    });
  });

  describe('getLazyLoadedBundles', () => {
    it('should return bundles with lazy load strategy', () => {
      const bundles = getLazyLoadedBundles();

      expect(bundles.length).toBeGreaterThan(0);
    });

    it('should not return always-loaded bundles', () => {
      const bundles = getLazyLoadedBundles();

      expect(bundles).not.toContain('core');
      expect(bundles).not.toContain('utils');
    });

    it('should include common lazy bundles', () => {
      const bundles = getLazyLoadedBundles();

      expect(bundles).toContain('icons');
      expect(bundles).toContain('charts');
      expect(bundles).toContain('forms');
    });
  });

  describe('getAllPackages', () => {
    it('should return all unique packages', () => {
      const packages = getAllPackages();

      expect(packages.length).toBeGreaterThan(0);
      expect(new Set(packages).size).toBe(packages.length); // No duplicates
    });

    it('should include common packages', () => {
      const packages = getAllPackages();

      expect(packages).toContain('date-fns');
      expect(packages).toContain('lodash-es');
      expect(packages).toContain('lucide-react');
      expect(packages).toContain('recharts');
    });
  });

  describe('getBundleUrl', () => {
    it('should return correct URL for bundle', () => {
      const url = getBundleUrl('charts');

      expect(url).toBe('/runtime-deps/charts.js');
    });

    it('should support custom base path', () => {
      const url = getBundleUrl('charts', '/custom');

      expect(url).toBe('/custom/charts.js');
    });

    it('should work for all bundle names', () => {
      const bundles = [...getAlwaysLoadedBundles(), ...getLazyLoadedBundles()];

      bundles.forEach(bundle => {
        const url = getBundleUrl(bundle);
        expect(url).toContain(bundle);
        expect(url).toMatch(/^\/.*\.js$/);
      });
    });
  });

  describe('getGlobalNamespace', () => {
    it('should return correct global namespace', () => {
      const namespace = getGlobalNamespace();

      expect(namespace).toBe('window.AppDependencies');
    });
  });
});

describe('Dependency Bundle - Edge Cases', () => {
  it('should handle empty code', () => {
    const bundles = analyzeImports('');

    expect(bundles).toContain('core');
    expect(bundles).toContain('utils');
  });

  it('should handle code with only comments', () => {
    const code = `// This is a comment
/* Another comment */`;
    const bundles = analyzeImports(code);

    expect(bundles).toContain('core');
    expect(bundles).toContain('utils');
  });

  it('should handle malformed import statements', () => {
    const code = `import { from 'broken-import'`;
    const bundles = analyzeImports(code);

    // Should still return default bundles
    expect(bundles).toContain('core');
    expect(bundles).toContain('utils');
  });

  it('should handle mixed import styles', () => {
    const code = `
      import React from 'react';
      import { useState } from 'react';
      import * as Icons from 'lucide-react';
      import type { Props } from './types';
    `;
    const bundles = analyzeImports(code);

    expect(bundles).toContain('icons');
  });

  it('should handle dynamic imports', () => {
    const code = `const Chart = await import('recharts');`;
    const bundles = analyzeImports(code);

    expect(bundles).toContain('charts');
  });

  it('should handle require statements', () => {
    const code = `const dateFns = require('date-fns');`;
    const bundles = analyzeImports(code);

    // Our analyzer focuses on import statements, not require
    // but should still return default bundles
    expect(bundles).toContain('utils');
  });
});
