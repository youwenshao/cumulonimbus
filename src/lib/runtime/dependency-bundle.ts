/**
 * Dependency Bundle System
 * 
 * Pre-bundles approved npm packages for use in generated apps.
 * Exposes them as global window objects for iframe/sandbox consumption.
 */

/**
 * Manifest of all approved dependency bundles
 */
export interface DependencyManifest {
  version: string;
  bundles: BundleInfo[];
  totalSize: number;
  generatedAt: string;
}

export interface BundleInfo {
  name: string;
  packages: string[];
  size: number;
  hash: string;
  loadStrategy: 'always' | 'lazy';
  exports: string[];
}

/**
 * Bundle categories with their packages
 */
export const BUNDLE_CONFIG = {
  // Core - always loaded
  core: {
    loadStrategy: 'always' as const,
    packages: [
      // React is loaded via CDN, but we export hooks
    ],
    exports: [
      'useState', 'useEffect', 'useCallback', 'useMemo', 
      'useRef', 'useReducer', 'useContext', 'createContext',
      'memo', 'forwardRef', 'lazy', 'Suspense', 'Fragment'
    ]
  },

  // Utils - always loaded (small, commonly used)
  utils: {
    loadStrategy: 'always' as const,
    packages: [
      'date-fns',
      'lodash-es',
      'clsx',
      'tailwind-merge',
      'nanoid',
      'uuid',
      'dayjs',
      'ms'
    ],
    exports: [
      // date-fns
      'format', 'parseISO', 'differenceInDays', 'addDays', 'subDays',
      'startOfDay', 'endOfDay', 'isValid', 'formatDistance', 'formatRelative',
      'isAfter', 'isBefore', 'isEqual', 'addMonths', 'subMonths',
      'startOfWeek', 'endOfWeek', 'startOfMonth', 'endOfMonth',
      // lodash-es
      'debounce', 'throttle', 'groupBy', 'sortBy', 'orderBy',
      'uniqBy', 'keyBy', 'flatten', 'chunk', 'pick', 'omit',
      'get', 'set', 'merge', 'cloneDeep', 'isEmpty', 'isEqual as _isEqual',
      // clsx & tailwind-merge
      'clsx', 'twMerge', 'cn',
      // nanoid & uuid
      'nanoid', 'v4 as uuidv4',
      // dayjs
      'dayjs',
      // ms
      'ms'
    ]
  },

  // Icons - lazy loaded
  icons: {
    loadStrategy: 'lazy' as const,
    packages: [
      'lucide-react',
      // react-icons is too large, we'll provide lucide-react primarily
    ],
    exports: [
      // Common lucide icons (exported from lucide-react)
      '*' // Export all icons - tree-shaking handles the rest
    ]
  },

  // Forms & Validation - lazy loaded
  forms: {
    loadStrategy: 'lazy' as const,
    packages: [
      'react-hook-form',
      'zod',
      'yup'
    ],
    exports: [
      // react-hook-form
      'useForm', 'useFormContext', 'FormProvider', 'Controller',
      'useWatch', 'useFieldArray',
      // zod
      'z',
      // yup
      'yup'
    ]
  },

  // Charts - lazy loaded (large)
  charts: {
    loadStrategy: 'lazy' as const,
    packages: [
      'recharts'
    ],
    exports: [
      'LineChart', 'Line', 'BarChart', 'Bar', 'PieChart', 'Pie',
      'AreaChart', 'Area', 'XAxis', 'YAxis', 'CartesianGrid',
      'Tooltip', 'Legend', 'ResponsiveContainer', 'Cell',
      'ComposedChart', 'Scatter', 'ScatterChart', 'RadarChart', 'Radar',
      'PolarGrid', 'PolarAngleAxis', 'PolarRadiusAxis'
    ]
  },

  // Animations - lazy loaded
  animations: {
    loadStrategy: 'lazy' as const,
    packages: [
      'framer-motion'
    ],
    exports: [
      'motion', 'AnimatePresence', 'useAnimation', 'useMotionValue',
      'useSpring', 'useTransform', 'useInView', 'useScroll',
      'animate', 'stagger', 'spring', 'LayoutGroup'
    ]
  },

  // UI Components - lazy loaded
  ui: {
    loadStrategy: 'lazy' as const,
    packages: [
      '@radix-ui/react-dialog',
      '@radix-ui/react-dropdown-menu',
      '@radix-ui/react-popover',
      '@radix-ui/react-tooltip',
      '@radix-ui/react-select',
      '@radix-ui/react-tabs',
      '@radix-ui/react-switch',
      '@radix-ui/react-checkbox',
      '@radix-ui/react-slider',
      '@radix-ui/react-accordion',
      '@headlessui/react'
    ],
    exports: [
      // Radix components
      'Dialog', 'DialogTrigger', 'DialogContent', 'DialogTitle', 'DialogDescription',
      'DropdownMenu', 'DropdownMenuTrigger', 'DropdownMenuContent', 'DropdownMenuItem',
      'Popover', 'PopoverTrigger', 'PopoverContent',
      'Tooltip', 'TooltipTrigger', 'TooltipContent', 'TooltipProvider',
      'Select', 'SelectTrigger', 'SelectContent', 'SelectItem', 'SelectValue',
      'Tabs', 'TabsList', 'TabsTrigger', 'TabsContent',
      'Switch', 'Checkbox', 'Slider', 'Accordion',
      // Headless UI
      'Menu', 'Listbox', 'Combobox', 'Transition', 'Disclosure'
    ]
  },

  // Tables - lazy loaded
  tables: {
    loadStrategy: 'lazy' as const,
    packages: [
      '@tanstack/react-table',
      'react-window'
    ],
    exports: [
      // react-table
      'useReactTable', 'getCoreRowModel', 'getSortedRowModel',
      'getFilteredRowModel', 'getPaginationRowModel', 'flexRender',
      'createColumnHelper',
      // react-window
      'FixedSizeList', 'VariableSizeList', 'FixedSizeGrid', 'VariableSizeGrid'
    ]
  },

  // Drag & Drop - lazy loaded
  dnd: {
    loadStrategy: 'lazy' as const,
    packages: [
      '@dnd-kit/core',
      '@dnd-kit/sortable',
      '@dnd-kit/utilities'
    ],
    exports: [
      'DndContext', 'useDraggable', 'useDroppable', 'DragOverlay',
      'SortableContext', 'useSortable', 'arrayMove', 'sortableKeyboardCoordinates',
      'horizontalListSortingStrategy', 'verticalListSortingStrategy',
      'CSS'
    ]
  },

  // State Management - lazy loaded
  state: {
    loadStrategy: 'lazy' as const,
    packages: [
      'zustand',
      'jotai'
    ],
    exports: [
      // zustand
      'create', 'createStore', 'useStore',
      // jotai
      'atom', 'useAtom', 'useAtomValue', 'useSetAtom', 'Provider as JotaiProvider'
    ]
  },

  // Misc utilities - lazy loaded
  misc: {
    loadStrategy: 'lazy' as const,
    packages: [
      'react-hot-toast',
      'sonner',
      'react-markdown',
      'react-confetti',
      'qrcode.react',
      'react-dropzone'
    ],
    exports: [
      // react-hot-toast
      'toast', 'Toaster',
      // sonner
      'toast as sonnerToast', 'Toaster as SonnerToaster',
      // react-markdown
      'ReactMarkdown',
      // react-confetti
      'Confetti',
      // qrcode.react
      'QRCodeSVG', 'QRCodeCanvas',
      // react-dropzone
      'useDropzone'
    ]
  }
} as const;

export type BundleName = keyof typeof BUNDLE_CONFIG;

/**
 * Get packages that should always be loaded
 */
export function getAlwaysLoadedBundles(): BundleName[] {
  return Object.entries(BUNDLE_CONFIG)
    .filter(([_, config]) => config.loadStrategy === 'always')
    .map(([name]) => name as BundleName);
}

/**
 * Get packages that should be lazy-loaded
 */
export function getLazyLoadedBundles(): BundleName[] {
  return Object.entries(BUNDLE_CONFIG)
    .filter(([_, config]) => config.loadStrategy === 'lazy')
    .map(([name]) => name as BundleName);
}

/**
 * Analyze code to determine which bundles are needed
 */
export function analyzeImports(code: string): BundleName[] {
  const neededBundles: Set<BundleName> = new Set();
  
  // Always include core and utils
  neededBundles.add('core');
  neededBundles.add('utils');
  
  // Check for package imports
  const importRegex = /import\s+(?:{[^}]+}|\*\s+as\s+\w+|\w+)\s+from\s+['"]([^'"]+)['"]/g;
  let match;
  
  while ((match = importRegex.exec(code)) !== null) {
    const packageName = match[1];
    
    // Find which bundle contains this package
    for (const [bundleName, config] of Object.entries(BUNDLE_CONFIG)) {
      if (config.packages.some(pkg => packageName.startsWith(pkg))) {
        neededBundles.add(bundleName as BundleName);
        break;
      }
    }
  }
  
  // Also check for common usage patterns without imports (for sandbox code)
  const usagePatterns: Record<string, BundleName> = {
    'lucide-react': 'icons',
    '<LineChart': 'charts',
    '<BarChart': 'charts',
    '<PieChart': 'charts',
    'recharts': 'charts',
    'useForm': 'forms',
    'z.object': 'forms',
    'z.string': 'forms',
    'motion.': 'animations',
    '<motion': 'animations',
    'AnimatePresence': 'animations',
    'framer-motion': 'animations',
    '@radix-ui': 'ui',
    '@headlessui': 'ui',
    'Dialog': 'ui',
    'Popover': 'ui',
    'useReactTable': 'tables',
    'react-table': 'tables',
    'DndContext': 'dnd',
    'useDraggable': 'dnd',
    'useSortable': 'dnd',
    'zustand': 'state',
    'jotai': 'state',
    'useAtom': 'state',
    'toast(': 'misc',
    'Toaster': 'misc',
    'ReactMarkdown': 'misc',
    'Confetti': 'misc',
    'QRCode': 'misc',
    'useDropzone': 'misc',
  };
  
  for (const [pattern, bundle] of Object.entries(usagePatterns)) {
    if (code.includes(pattern)) {
      neededBundles.add(bundle);
    }
  }
  
  return Array.from(neededBundles);
}

/**
 * Get all packages that need to be installed
 */
export function getAllPackages(): string[] {
  const packages: string[] = [];
  
  for (const config of Object.values(BUNDLE_CONFIG)) {
    packages.push(...config.packages);
  }
  
  return [...new Set(packages)];
}

/**
 * Get the CDN URL for a bundle
 */
export function getBundleUrl(bundleName: BundleName, basePath = '/runtime-deps'): string {
  return `${basePath}/${bundleName}.js`;
}

/**
 * Generate the global namespace structure for bundles
 */
export function getGlobalNamespace(): string {
  return 'window.AppDependencies';
}

/**
 * Blocked packages that should never be allowed
 */
export const BLOCKED_PACKAGES = [
  // Security risks
  'fs', 'fs-extra', 'node:fs',
  'child_process', 'node:child_process',
  'os', 'node:os',
  'cluster', 'node:cluster',
  'vm', 'node:vm',
  'express', 'fastify', 'koa', 'hapi',
  'pg', 'mysql', 'mysql2', 'mongodb', 'sqlite3', 'better-sqlite3',
  'prisma', '@prisma/client',
  'mongoose', 'sequelize', 'typeorm', 'knex',
  'net', 'node:net', 'dgram', 'node:dgram',
  'http', 'node:http', 'https', 'node:https',
  'crypto', 'node:crypto',
  'path', 'node:path',
  'stream', 'node:stream',
  'buffer', 'node:buffer',
  'process', 'node:process',
  
  // Performance concerns (too large or deprecated)
  'moment', 'moment-timezone',
  'lodash', // Use lodash-es instead
  'redux', 'react-redux', '@reduxjs/toolkit',
  'mobx', 'mobx-react', 'mobx-react-lite',
  'rxjs',
  'three', '@react-three/fiber', '@react-three/drei',
  
  // Redundant (we provide alternatives)
  'axios', // Use fetch or SandboxAPI.fetch
  'react-router', 'react-router-dom', // We control routing
  'next', 'next/router', 'next/navigation', // No Next.js features in sandbox
];

/**
 * Check if a package is blocked
 */
export function isPackageBlocked(packageName: string): boolean {
  return BLOCKED_PACKAGES.some(blocked => 
    packageName === blocked || packageName.startsWith(`${blocked}/`)
  );
}

/**
 * Check if a package is in the allowlist
 */
export function isPackageAllowed(packageName: string): boolean {
  if (isPackageBlocked(packageName)) return false;
  
  // Check if it's in our approved bundles
  for (const config of Object.values(BUNDLE_CONFIG)) {
    if (config.packages.some(pkg => packageName === pkg || packageName.startsWith(`${pkg}/`))) {
      return true;
    }
  }
  
  // Also allow react since it's loaded via CDN
  if (packageName === 'react' || packageName === 'react-dom') {
    return true;
  }
  
  return false;
}
