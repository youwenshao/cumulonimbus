/**
 * Server-Side Bundler
 * 
 * Uses esbuild to transpile and bundle user-generated TypeScript/JSX code
 * on the server before sending to the browser sandbox.
 */

import * as esbuild from 'esbuild';
import { 
  isPackageAllowed, 
  isPackageBlocked, 
  analyzeImports,
  BLOCKED_PACKAGES,
  type BundleName 
} from './dependency-bundle';

/**
 * Result of bundling user code
 */
export interface ServerBundleResult {
  success: boolean;
  code: string;
  sourceMap?: string;
  errors: BundleError[];
  warnings: string[];
  requiredBundles: BundleName[];
  stats: {
    inputSize: number;
    outputSize: number;
    buildTimeMs: number;
  };
}

export interface BundleError {
  message: string;
  line?: number;
  column?: number;
  source?: string;
  suggestion?: string;
}

/**
 * Options for bundling user code
 */
export interface ServerBundleOptions {
  /** The TypeScript/JSX code to bundle */
  code: string;
  /** Unique identifier for the app */
  appId: string;
  /** Enable source maps for debugging */
  sourceMaps?: boolean;
  /** Minify the output */
  minify?: boolean;
  /** Additional validation beyond standard checks */
  strictMode?: boolean;
}

/**
 * Dangerous patterns to check for in code
 */
const DANGEROUS_PATTERNS = [
  { pattern: /\beval\s*\(/g, message: 'eval() is not allowed for security reasons' },
  { pattern: /new\s+Function\s*\(/g, message: 'Function constructor is not allowed' },
  { pattern: /document\.cookie/g, message: 'Cookie access is not allowed' },
  { pattern: /localStorage\s*\./g, message: 'Use SandboxAPI for persistence instead of localStorage' },
  { pattern: /sessionStorage\s*\./g, message: 'Use SandboxAPI for persistence instead of sessionStorage' },
  { pattern: /window\.open\s*\(/g, message: 'window.open() is not allowed' },
  { pattern: /window\.location\s*=/g, message: 'Navigation is not allowed' },
  { pattern: /\.innerHTML\s*=/g, message: 'innerHTML assignment is discouraged, use React instead', isWarning: true },
  { pattern: /document\.write/g, message: 'document.write() is not allowed' },
  { pattern: /importScripts\s*\(/g, message: 'importScripts() is not allowed' },
  { pattern: /WebSocket\s*\(/g, message: 'WebSocket is not allowed in sandbox', isWarning: true },
  { pattern: /XMLHttpRequest/g, message: 'Use fetch() or SandboxAPI.fetch() instead of XMLHttpRequest', isWarning: true },
];

/**
 * Validate code for security issues
 */
function validateSecurity(code: string): { errors: BundleError[]; warnings: string[] } {
  const errors: BundleError[] = [];
  const warnings: string[] = [];
  
  for (const { pattern, message, isWarning } of DANGEROUS_PATTERNS) {
    const match = pattern.exec(code);
    if (match) {
      // Find line number
      const lineNumber = code.substring(0, match.index).split('\n').length;
      
      if (isWarning) {
        warnings.push(`Line ${lineNumber}: ${message}`);
      } else {
        errors.push({
          message,
          line: lineNumber,
          source: match[0],
        });
      }
    }
    // Reset regex lastIndex
    pattern.lastIndex = 0;
  }
  
  return { errors, warnings };
}

/**
 * Validate imports against allowlist
 */
function validateImports(code: string): { errors: BundleError[]; warnings: string[] } {
  const errors: BundleError[] = [];
  const warnings: string[] = [];
  
  // Find all import statements
  const importRegex = /import\s+(?:(?:\{[^}]*\}|\*\s+as\s+\w+|\w+)\s+from\s+)?['"]([^'"]+)['"]/g;
  let match;
  
  while ((match = importRegex.exec(code)) !== null) {
    const packageName = match[1];
    const lineNumber = code.substring(0, match.index).split('\n').length;
    
    // Skip relative imports (local files)
    if (packageName.startsWith('./') || packageName.startsWith('../')) {
      continue;
    }
    
    // Get the base package name (handle scoped packages)
    const basePkg = packageName.startsWith('@') 
      ? packageName.split('/').slice(0, 2).join('/')
      : packageName.split('/')[0];
    
    if (isPackageBlocked(basePkg)) {
      errors.push({
        message: `Package '${basePkg}' is blocked for security or performance reasons`,
        line: lineNumber,
        source: match[0],
        suggestion: getSuggestion(basePkg),
      });
    } else if (!isPackageAllowed(basePkg)) {
      warnings.push(`Line ${lineNumber}: Package '${basePkg}' is not in the allowlist and may not work`);
    }
  }
  
  return { errors, warnings };
}

/**
 * Get suggestion for blocked package
 */
function getSuggestion(packageName: string): string | undefined {
  const suggestions: Record<string, string> = {
    'axios': 'Use fetch() or the built-in SandboxAPI.fetch()',
    'moment': 'Use date-fns or dayjs instead',
    'lodash': 'Use lodash-es for tree-shakeable imports',
    'redux': 'Use zustand or jotai for simpler state management',
    'react-redux': 'Use zustand or jotai for simpler state management',
    'mobx': 'Use zustand or jotai for simpler state management',
    'express': 'Server-side frameworks are not available in the sandbox',
    'fastify': 'Server-side frameworks are not available in the sandbox',
    'fs': 'File system access is not available in the sandbox',
    'fs-extra': 'File system access is not available in the sandbox',
    'pg': 'Database drivers are not available. Use the built-in useAppData() hook',
    'mysql': 'Database drivers are not available. Use the built-in useAppData() hook',
    'mongodb': 'Database drivers are not available. Use the built-in useAppData() hook',
    'react-router': 'Routing is handled by the platform. Use state for view switching.',
    'react-router-dom': 'Routing is handled by the platform. Use state for view switching.',
    'next': 'Next.js features are not available in the sandbox.',
  };
  
  return suggestions[packageName];
}

/**
 * Transform imports to use global dependencies
 */
function transformImportsPlugin(): esbuild.Plugin {
  return {
    name: 'transform-imports',
    setup(build) {
      // Handle node_modules imports by marking them as external
      // They will be provided via window.AppDependencies
      build.onResolve({ filter: /^[^./]/ }, (args) => {
        // Don't transform react/react-dom - they're provided via CDN
        if (args.path === 'react' || args.path === 'react-dom') {
          return { path: args.path, external: true };
        }
        
        // Mark all other packages as external - they'll be provided globally
        return { path: args.path, external: true };
      });
    }
  };
}

/**
 * Generate import shim code that maps npm imports to globals
 */
function generateImportShim(requiredBundles: BundleName[]): string {
  const shims: string[] = [
    '// Import shim - maps npm packages to pre-bundled globals',
    'const React = window.React;',
    'const { useState, useEffect, useCallback, useMemo, useRef, useReducer, useContext, createContext, memo, forwardRef, lazy, Suspense, Fragment } = React;',
  ];
  
  // Add shims for each required bundle
  if (requiredBundles.includes('utils')) {
    shims.push(`
const { format, parseISO, differenceInDays, addDays, subDays, startOfDay, endOfDay, isValid, formatDistance, formatRelative, isAfter, isBefore, addMonths, subMonths, startOfWeek, endOfWeek, startOfMonth, endOfMonth } = window.AppDependencies?.utils || {};
const { debounce, throttle, groupBy, sortBy, orderBy, uniqBy, keyBy, flatten, chunk, pick, omit, get, set, merge, cloneDeep, isEmpty } = window.AppDependencies?.utils || {};
const { clsx } = window.AppDependencies?.utils || { clsx: (...args) => args.filter(Boolean).join(' ') };
const { twMerge } = window.AppDependencies?.utils || { twMerge: (...args) => args.join(' ') };
const cn = window.cn || ((...inputs) => twMerge(clsx(inputs)));
const { nanoid } = window.AppDependencies?.utils || { nanoid: () => Math.random().toString(36).slice(2) };
const dayjs = window.AppDependencies?.utils?.dayjs || ((d) => new Date(d));
`);
  }
  
  if (requiredBundles.includes('icons')) {
    shims.push(`
const LucideIcons = window.AppDependencies?.icons || {};
// Destructure common icons - users can access others via LucideIcons.IconName
const { Check, X, Plus, Minus, ChevronDown, ChevronUp, ChevronLeft, ChevronRight, Search, Menu, Home, Settings, User, Heart, Star, Edit, Trash, Copy, Download, Upload, RefreshCw, Loader2, AlertCircle, CheckCircle, Info, AlertTriangle, ArrowLeft, ArrowRight, ArrowUp, ArrowDown, Calendar, Clock, Mail, Phone, MapPin, Link, ExternalLink, Eye, EyeOff, Lock, Unlock, Filter, SortAsc, SortDesc } = LucideIcons;
`);
  }
  
  if (requiredBundles.includes('forms')) {
    shims.push(`
const { useForm, useFormContext, FormProvider, Controller, useWatch, useFieldArray } = window.AppDependencies?.forms || {};
const { z } = window.AppDependencies?.forms || { z: { object: () => ({}), string: () => ({}), number: () => ({}) } };
`);
  }
  
  if (requiredBundles.includes('charts')) {
    shims.push(`
const { LineChart, Line, BarChart, Bar, PieChart, Pie, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell, ComposedChart, Scatter, ScatterChart, RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis } = window.AppDependencies?.charts || {};
`);
  }
  
  if (requiredBundles.includes('animations')) {
    shims.push(`
const { motion, AnimatePresence, useAnimation, useMotionValue, useSpring, useTransform, useInView, useScroll } = window.AppDependencies?.animations || { motion: { div: 'div', span: 'span', button: 'button' }, AnimatePresence: ({ children }) => children };
`);
  }
  
  if (requiredBundles.includes('tables')) {
    shims.push(`
const { useReactTable, getCoreRowModel, getSortedRowModel, getFilteredRowModel, getPaginationRowModel, flexRender, createColumnHelper } = window.AppDependencies?.tables || {};
`);
  }
  
  if (requiredBundles.includes('state')) {
    shims.push(`
const { create: createStore } = window.AppDependencies?.state || { create: () => () => ({}) };
const { atom, useAtom, useAtomValue, useSetAtom } = window.AppDependencies?.state || {};
`);
  }
  
  if (requiredBundles.includes('misc')) {
    shims.push(`
const { toast, Toaster } = window.AppDependencies?.misc || { toast: console.log, Toaster: () => null };
`);
  }
  
  // Add useAppData hook (always available)
  shims.push(`
// Built-in useAppData hook (provided by sandbox)
const useAppData = window.useAppData || (() => ({ data: [], isLoading: false, error: null, addRecord: async () => {}, deleteRecord: async () => {}, updateRecord: async () => {}, refresh: async () => {} }));
`);
  
  return shims.join('\n');
}

/**
 * Bundle user code for browser execution
 */
export async function bundleAppCode(options: ServerBundleOptions): Promise<ServerBundleResult> {
  const startTime = Date.now();
  const { code, appId, sourceMaps = false, minify = true, strictMode = false } = options;
  
  const errors: BundleError[] = [];
  const warnings: string[] = [];
  
  // 1. Security validation
  const securityCheck = validateSecurity(code);
  errors.push(...securityCheck.errors);
  warnings.push(...securityCheck.warnings);
  
  // 2. Import validation
  const importCheck = validateImports(code);
  errors.push(...importCheck.errors);
  warnings.push(...importCheck.warnings);
  
  // Fail early if there are errors
  if (errors.length > 0) {
    return {
      success: false,
      code: '',
      errors,
      warnings,
      requiredBundles: [],
      stats: {
        inputSize: code.length,
        outputSize: 0,
        buildTimeMs: Date.now() - startTime,
      },
    };
  }
  
  // 3. Analyze which bundles are needed
  const requiredBundles = analyzeImports(code);
  
  // 4. Clean the code - remove 'use client' and prepare for bundling
  let cleanedCode = code
    .replace(/['"]use client['"];?\n?/g, '')
    .replace(/['"]use strict['"];?\n?/g, '');
  
  // 5. Generate import shim
  const importShim = generateImportShim(requiredBundles);
  
  try {
    // 6. Transform with esbuild
    const result = await esbuild.transform(cleanedCode, {
      loader: 'tsx',
      target: 'es2020',
      format: 'iife',
      minify,
      sourcemap: sourceMaps ? 'inline' : false,
      jsx: 'transform',
      jsxFactory: 'React.createElement',
      jsxFragment: 'React.Fragment',
    });
    
    // Add any esbuild warnings
    for (const warning of result.warnings) {
      warnings.push(`esbuild: ${warning.text}`);
    }
    
    // 7. Combine shim with transformed code
    const bundledCode = `
// App: ${appId}
// Generated: ${new Date().toISOString()}
(function() {
  'use strict';
  
${importShim}

// User App Code
${result.code}

  // Render the app
  try {
    const appRoot = document.getElementById('root');
    if (appRoot && typeof App !== 'undefined') {
      const root = ReactDOM.createRoot(appRoot);
      root.render(React.createElement(App));
      window.SandboxAPI?._notifyReady?.();
    } else if (typeof App === 'undefined') {
      throw new Error('App component not found. Make sure to define a function called App.');
    }
  } catch (e) {
    console.error('Failed to render app:', e);
    window.SandboxAPI?._notifyError?.(e.message);
    document.getElementById('root').innerHTML = '<div style="padding: 20px; color: #f87171;"><h2>Render Error</h2><pre>' + e.message + '</pre></div>';
  }
})();
`;
    
    return {
      success: true,
      code: bundledCode,
      sourceMap: sourceMaps ? result.map : undefined,
      errors: [],
      warnings,
      requiredBundles,
      stats: {
        inputSize: code.length,
        outputSize: bundledCode.length,
        buildTimeMs: Date.now() - startTime,
      },
    };
    
  } catch (err) {
    // Parse esbuild errors
    if (err instanceof Error) {
      const esbuildError = err as esbuild.TransformFailure;
      
      if (esbuildError.errors) {
        for (const e of esbuildError.errors) {
          errors.push({
            message: e.text,
            line: e.location?.line,
            column: e.location?.column,
            source: e.location?.lineText,
          });
        }
      } else {
        errors.push({
          message: err.message,
        });
      }
    }
    
    return {
      success: false,
      code: '',
      errors,
      warnings,
      requiredBundles,
      stats: {
        inputSize: code.length,
        outputSize: 0,
        buildTimeMs: Date.now() - startTime,
      },
    };
  }
}

/**
 * Validate TypeScript code without bundling
 */
export async function validateTypeScript(code: string): Promise<{
  valid: boolean;
  errors: BundleError[];
  warnings: string[];
}> {
  const errors: BundleError[] = [];
  const warnings: string[] = [];
  
  // Security check
  const securityCheck = validateSecurity(code);
  errors.push(...securityCheck.errors);
  warnings.push(...securityCheck.warnings);
  
  // Import check
  const importCheck = validateImports(code);
  errors.push(...importCheck.errors);
  warnings.push(...importCheck.warnings);
  
  if (errors.length > 0) {
    return { valid: false, errors, warnings };
  }
  
  // Try to parse with esbuild
  try {
    await esbuild.transform(code, {
      loader: 'tsx',
      target: 'es2020',
      format: 'esm',
      jsx: 'transform',
      jsxFactory: 'React.createElement',
      jsxFragment: 'React.Fragment',
    });
    
    return { valid: true, errors: [], warnings };
  } catch (err) {
    if (err instanceof Error) {
      const esbuildError = err as esbuild.TransformFailure;
      
      if (esbuildError.errors) {
        for (const e of esbuildError.errors) {
          errors.push({
            message: e.text,
            line: e.location?.line,
            column: e.location?.column,
            source: e.location?.lineText,
          });
        }
      } else {
        errors.push({ message: err.message });
      }
    }
    
    return { valid: false, errors, warnings };
  }
}

/**
 * Quick syntax check without full validation
 */
export async function quickSyntaxCheck(code: string): Promise<boolean> {
  try {
    await esbuild.transform(code, {
      loader: 'tsx',
      target: 'es2020',
      format: 'esm',
      jsx: 'preserve',
    });
    return true;
  } catch {
    return false;
  }
}
