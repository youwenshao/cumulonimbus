#!/usr/bin/env npx ts-node

/**
 * Build Dependencies Script
 * 
 * Bundles approved npm packages into separate bundles for lazy-loading
 * in the browser sandbox environment.
 * 
 * Usage: npx ts-node scripts/build-dependencies.ts
 */

import * as esbuild from 'esbuild';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';

// Output directory
const OUTPUT_DIR = path.join(process.cwd(), 'public', 'runtime-deps');

// Bundle configurations matching dependency-bundle.ts
const BUNDLES: Record<string, {
  packages: string[];
  exports: Record<string, string[]>;
  globalName: string;
}> = {
  utils: {
    packages: ['date-fns', 'lodash-es', 'clsx', 'tailwind-merge', 'nanoid', 'uuid', 'dayjs', 'ms'],
    exports: {
      'date-fns': [
        'format', 'parseISO', 'differenceInDays', 'addDays', 'subDays',
        'startOfDay', 'endOfDay', 'isValid', 'formatDistance', 'formatRelative',
        'isAfter', 'isBefore', 'addMonths', 'subMonths',
        'startOfWeek', 'endOfWeek', 'startOfMonth', 'endOfMonth', 'parse',
        'addWeeks', 'subWeeks', 'addYears', 'subYears', 'differenceInMonths',
        'differenceInWeeks', 'differenceInYears', 'differenceInHours',
        'differenceInMinutes', 'differenceInSeconds', 'formatDistanceToNow'
      ],
      'lodash-es': [
        'debounce', 'throttle', 'groupBy', 'sortBy', 'orderBy',
        'uniqBy', 'keyBy', 'flatten', 'chunk', 'pick', 'omit',
        'get', 'set', 'merge', 'cloneDeep', 'isEmpty', 'isEqual',
        'map', 'filter', 'reduce', 'find', 'findIndex', 'some', 'every',
        'compact', 'uniq', 'intersection', 'difference', 'union'
      ],
      'clsx': ['clsx'],
      'tailwind-merge': ['twMerge'],
      'nanoid': ['nanoid'],
      'uuid': ['v4'],
      'dayjs': ['default'],
      'ms': ['default']
    },
    globalName: 'AppDeps_Utils'
  },

  icons: {
    packages: ['lucide-react'],
    exports: {
      'lucide-react': ['*'] // Export all icons
    },
    globalName: 'AppDeps_Icons'
  },

  forms: {
    packages: ['react-hook-form', 'zod'],
    exports: {
      'react-hook-form': [
        'useForm', 'useFormContext', 'FormProvider', 'Controller',
        'useWatch', 'useFieldArray', 'useFormState'
      ],
      'zod': ['z']
    },
    globalName: 'AppDeps_Forms'
  },

  charts: {
    packages: ['recharts'],
    exports: {
      'recharts': [
        'LineChart', 'Line', 'BarChart', 'Bar', 'PieChart', 'Pie',
        'AreaChart', 'Area', 'XAxis', 'YAxis', 'CartesianGrid',
        'Tooltip', 'Legend', 'ResponsiveContainer', 'Cell',
        'ComposedChart', 'Scatter', 'ScatterChart', 'RadarChart', 'Radar',
        'PolarGrid', 'PolarAngleAxis', 'PolarRadiusAxis', 'Treemap',
        'Funnel', 'FunnelChart', 'RadialBarChart', 'RadialBar'
      ]
    },
    globalName: 'AppDeps_Charts'
  },

  animations: {
    packages: ['framer-motion'],
    exports: {
      'framer-motion': [
        'motion', 'AnimatePresence', 'useAnimation', 'useMotionValue',
        'useSpring', 'useTransform', 'useInView', 'useScroll',
        'animate', 'stagger', 'LayoutGroup', 'Reorder'
      ]
    },
    globalName: 'AppDeps_Animations'
  },

  tables: {
    packages: ['@tanstack/react-table'],
    exports: {
      '@tanstack/react-table': [
        'useReactTable', 'getCoreRowModel', 'getSortedRowModel',
        'getFilteredRowModel', 'getPaginationRowModel', 'flexRender',
        'createColumnHelper', 'getExpandedRowModel', 'getGroupedRowModel'
      ]
    },
    globalName: 'AppDeps_Tables'
  },

  state: {
    packages: ['zustand', 'jotai'],
    exports: {
      'zustand': ['create', 'createStore', 'useStore'],
      'jotai': ['atom', 'useAtom', 'useAtomValue', 'useSetAtom', 'Provider']
    },
    globalName: 'AppDeps_State'
  },

  misc: {
    packages: ['sonner'],
    exports: {
      'sonner': ['toast', 'Toaster']
    },
    globalName: 'AppDeps_Misc'
  }
};

interface BundleManifest {
  version: string;
  bundles: {
    name: string;
    file: string;
    size: number;
    hash: string;
    packages: string[];
    loadStrategy: 'always' | 'lazy';
  }[];
  totalSize: number;
  generatedAt: string;
}

async function buildBundle(name: string, config: typeof BUNDLES[string]): Promise<{
  size: number;
  hash: string;
}> {
  console.log(`📦 Building ${name} bundle...`);
  
  // Create entry point content that exports everything
  const entryContent = generateEntryContent(name, config);
  const entryPath = path.join(OUTPUT_DIR, `_entry_${name}.js`);
  
  // Ensure output directory exists
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  
  // Write temporary entry file
  fs.writeFileSync(entryPath, entryContent);
  
  try {
    const outputPath = path.join(OUTPUT_DIR, `${name}.js`);
    
    const result = await esbuild.build({
      entryPoints: [entryPath],
      bundle: true,
      minify: true,
      format: 'iife',
      globalName: config.globalName,
      outfile: outputPath,
      platform: 'browser',
      target: ['es2020'],
      external: ['react', 'react-dom'], // React is loaded separately via CDN
      define: {
        'process.env.NODE_ENV': '"production"'
      },
      metafile: true,
      treeShaking: true,
      // Ignore warnings about missing packages
      logLevel: 'error'
    });
    
    // Read output and calculate hash
    const content = fs.readFileSync(outputPath, 'utf-8');
    const hash = crypto.createHash('sha256').update(content).digest('hex').substring(0, 8);
    const size = Buffer.byteLength(content, 'utf-8');
    
    // Add global assignment wrapper to expose on window.AppDependencies
    const wrappedContent = `
// ${name} bundle - Auto-generated
(function() {
  window.AppDependencies = window.AppDependencies || {};
  window.AppDependencies.${name} = ${config.globalName};
  
  // Also expose common exports directly for convenience
  ${generateDirectExports(name, config)}
})();
${content}
`;
    
    fs.writeFileSync(outputPath, wrappedContent);
    
    console.log(`  ✅ ${name}.js - ${(size / 1024).toFixed(1)}KB`);
    
    return { size, hash };
  } finally {
    // Clean up entry file
    if (fs.existsSync(entryPath)) {
      fs.unlinkSync(entryPath);
    }
  }
}

function generateEntryContent(name: string, config: typeof BUNDLES[string]): string {
  const imports: string[] = [];
  const exports: string[] = [];
  
  for (const [pkg, exportList] of Object.entries(config.exports)) {
    if (exportList.includes('*')) {
      imports.push(`export * from '${pkg}';`);
    } else if (exportList.includes('default')) {
      const safeName = pkg.replace(/[^a-zA-Z]/g, '_');
      imports.push(`import ${safeName} from '${pkg}';`);
      exports.push(`export { ${safeName} as ${safeName.replace(/_/g, '')} };`);
    } else {
      imports.push(`export { ${exportList.join(', ')} } from '${pkg}';`);
    }
  }
  
  return [...imports, ...exports].join('\n');
}

function generateDirectExports(name: string, config: typeof BUNDLES[string]): string {
  // Generate code that exposes common utilities directly on window
  const lines: string[] = [];
  
  if (name === 'utils') {
    lines.push(`
      // Expose cn utility (clsx + twMerge)
      window.cn = function(...inputs) {
        return ${config.globalName}.twMerge(${config.globalName}.clsx(inputs));
      };
      // Expose common date-fns functions
      window.dateFns = {
        format: ${config.globalName}.format,
        parseISO: ${config.globalName}.parseISO,
        differenceInDays: ${config.globalName}.differenceInDays,
        addDays: ${config.globalName}.addDays,
        subDays: ${config.globalName}.subDays
      };
    `);
  }
  
  if (name === 'forms') {
    lines.push(`
      window.z = ${config.globalName}.z;
      window.useForm = ${config.globalName}.useForm;
    `);
  }
  
  if (name === 'animations') {
    lines.push(`
      window.motion = ${config.globalName}.motion;
      window.AnimatePresence = ${config.globalName}.AnimatePresence;
    `);
  }
  
  if (name === 'misc') {
    lines.push(`
      window.toast = ${config.globalName}.toast;
      window.Toaster = ${config.globalName}.Toaster;
    `);
  }
  
  return lines.join('\n');
}

async function generateLoaderScript(manifest: BundleManifest): Promise<void> {
  const loaderContent = `
/**
 * Runtime Dependency Loader
 * Auto-generated - do not edit
 * Generated: ${manifest.generatedAt}
 */
(function() {
  'use strict';
  
  window.AppDependencies = window.AppDependencies || {};
  
  var manifest = ${JSON.stringify(manifest, null, 2)};
  
  var loadedBundles = {};
  var loadingPromises = {};
  
  function loadBundle(name) {
    if (loadedBundles[name]) {
      return Promise.resolve(window.AppDependencies[name]);
    }
    
    if (loadingPromises[name]) {
      return loadingPromises[name];
    }
    
    var bundle = manifest.bundles.find(function(b) { return b.name === name; });
    if (!bundle) {
      return Promise.reject(new Error('Unknown bundle: ' + name));
    }
    
    loadingPromises[name] = new Promise(function(resolve, reject) {
      var script = document.createElement('script');
      script.src = '/runtime-deps/' + bundle.file + '?v=' + bundle.hash;
      script.async = true;
      script.onload = function() {
        loadedBundles[name] = true;
        resolve(window.AppDependencies[name]);
      };
      script.onerror = function() {
        reject(new Error('Failed to load bundle: ' + name));
      };
      document.head.appendChild(script);
    });
    
    return loadingPromises[name];
  }
  
  function loadBundles(names) {
    return Promise.all(names.map(loadBundle));
  }
  
  // Auto-load always bundles
  var alwaysBundles = manifest.bundles
    .filter(function(b) { return b.loadStrategy === 'always'; })
    .map(function(b) { return b.name; });
  
  if (alwaysBundles.length > 0) {
    loadBundles(alwaysBundles).catch(function(err) {
      console.error('[AppDependencies] Failed to load core bundles:', err);
    });
  }
  
  // Expose loader API
  window.AppDependencies.load = loadBundle;
  window.AppDependencies.loadAll = loadBundles;
  window.AppDependencies.manifest = manifest;
  window.AppDependencies.isLoaded = function(name) { return !!loadedBundles[name]; };
})();
`;

  fs.writeFileSync(path.join(OUTPUT_DIR, 'loader.js'), loaderContent);
  console.log('📄 Generated loader.js');
}

async function main() {
  console.log('🚀 Building runtime dependency bundles...\n');
  
  const startTime = Date.now();
  const manifest: BundleManifest = {
    version: '1.0.0',
    bundles: [],
    totalSize: 0,
    generatedAt: new Date().toISOString()
  };
  
  // Ensure output directory exists
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  
  // Build each bundle
  for (const [name, config] of Object.entries(BUNDLES)) {
    try {
      const { size, hash } = await buildBundle(name, config);
      
      manifest.bundles.push({
        name,
        file: `${name}.js`,
        size,
        hash,
        packages: config.packages,
        loadStrategy: (name === 'utils' || name === 'core') ? 'always' : 'lazy'
      });
      
      manifest.totalSize += size;
    } catch (error) {
      console.error(`  ❌ Failed to build ${name}:`, error);
      // Continue with other bundles
    }
  }
  
  // Generate loader script
  await generateLoaderScript(manifest);
  
  // Write manifest
  fs.writeFileSync(
    path.join(OUTPUT_DIR, 'manifest.json'),
    JSON.stringify(manifest, null, 2)
  );
  console.log('📄 Generated manifest.json');
  
  const elapsed = Date.now() - startTime;
  console.log(`\n✨ Build complete in ${elapsed}ms`);
  console.log(`   Total size: ${(manifest.totalSize / 1024).toFixed(1)}KB`);
  console.log(`   Bundles: ${manifest.bundles.length}`);
}

// Run if called directly
main().catch(console.error);
