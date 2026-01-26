/**
 * Code Generator Agent
 * Generates modular, production-ready React components
 */

import { BaseAgent } from './base-agent';
import { generateId } from '@/lib/utils';
import { streamComplete } from '@/lib/qwen';
import type { 
  ConversationState, 
  AgentResponse, 
  Schema,
  LayoutNode,
  ComponentSpec,
  GeneratedApp,
  GeneratedComponent,
  ComponentGenerationEvent,
  ComponentType,
} from '../types';
import { getComponents } from '../layout/dsl';
import { FeedbackLoop } from '../feedback-loop';

const CODE_GEN_SYSTEM_PROMPT = `You are an expert React/TypeScript developer generating production-ready code.

### TYPE SAFETY REQUIREMENTS
- Strict TypeScript with no implicit any
- Define interfaces for all data structures
- Use type annotations for all function parameters and returns
- Implement proper error boundaries and null checks
- All useState hooks must have explicit type parameters
- All event handlers must have proper React event types (e.g., React.ChangeEvent, React.FormEvent)

### COMPONENT SPECIFICATIONS
- Generate ONLY the code - no explanations, no markdown code blocks
- Use 'use client' directive for client components
- Follow React best practices (hooks, proper state management)
- Use NAMED EXPORTS for all components (e.g., export function ComponentName...) - DO NOT use default exports
- Use NAMED IMPORTS for all internal dependencies (e.g., import { ComponentName } from './components/ComponentName')

### COMPILATION REQUIREMENTS
- Must compile with TypeScript strict mode
- Include proper imports (React, hooks, etc.)
- Use functional components with proper typing
- Handle async operations with try/catch and proper typing

### FILE STRUCTURE & IMPORT PATHS

The generated app has this exact file structure:
- lib/types.ts          # Type definitions (EntityName, EntityNameInput)
- lib/validators.ts     # Zod validators  
- lib/api.ts            # API client functions
- lib/hooks.ts          # Custom hooks (useEntityNameData)
- lib/utils.ts          # Utility functions (cn, formatDate, truncate)
- components/Form.tsx   # Your components go here
- components/Table.tsx
- App.tsx               # Root page component

CRITICAL IMPORT RULES for components in the components/ directory:
- Types: import { EntityName, EntityNameInput } from '../lib/types';
- Validators: import { entityNameSchema } from '../lib/validators';
- API: import { createEntityName, fetchEntityNames } from '../lib/api';
- Hooks: import { useEntityNameData } from '../lib/hooks';
- Utils: import { cn, formatDate, truncate } from '../lib/utils';
- Other components: import { OtherComponent } from './OtherComponent';

NEVER use these import paths (they will cause runtime errors):
- import from '../hooks/...' - WRONG! hooks are in lib/hooks.ts
- import from './hooks/...' - WRONG!
- import from '../../lib/...' - WRONG! Only one level up
- import from 'hooks/...' - WRONG!

ALWAYS use these correct relative paths from components/ directory:
- '../lib/types' for type imports
- '../lib/hooks' for hook imports
- '../lib/api' for API function imports
- '../lib/validators' for validator imports
- '../lib/utils' for utility functions
- './ComponentName' for sibling component imports

### AVAILABLE IMPORTS - You have access to these pre-bundled dependencies:

CORE & BUILT-INS:
- React hooks: useState, useEffect, useCallback, useMemo, useRef, useReducer, useContext
- useAppData() hook: Built-in hook for CRUD operations (prefer over react-query)
- SandboxAPI.fetch(): Built-in fetch wrapper (prefer over axios)

ICONS:
- lucide-react: Any icon component (Heart, CheckCircle, Menu, Plus, Trash, Edit, etc.)

DATES:
- date-fns: format, parseISO, differenceInDays, addDays, subDays, startOfDay, endOfDay
- dayjs: Lightweight date manipulation

FORMS & VALIDATION:
- react-hook-form: useForm, useFormContext, FormProvider, Controller, useWatch, useFieldArray
- zod: z.object, z.string, z.number, z.enum, z.boolean, etc.

CHARTS & VISUALIZATION:
- recharts: LineChart, Line, BarChart, Bar, PieChart, Pie, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell

UI COMPONENTS:
- framer-motion: motion, AnimatePresence, useAnimation, useMotionValue

UTILITIES:
- clsx: Conditional className utility
- tailwind-merge: Merge Tailwind classes (use cn() = clsx + twMerge)
- lodash-es: debounce, throttle, groupBy, sortBy, orderBy, uniqBy, keyBy, flatten, chunk, pick, omit
- nanoid: Tiny unique ID generator

STATE MANAGEMENT (if needed beyond useState):
- zustand: create, useStore
- jotai: atom, useAtom, useAtomValue, useSetAtom

TABLES:
- @tanstack/react-table: useReactTable, getCoreRowModel, getSortedRowModel, getFilteredRowModel, getPaginationRowModel, flexRender, createColumnHelper

DRAG & DROP:
- @dnd-kit/core: DndContext, useDraggable, useDroppable, DragOverlay
- @dnd-kit/sortable: SortableContext, useSortable, arrayMove

OTHER:
- react-hot-toast: toast, Toaster
- sonner: toast (alternative toasts)
- react-markdown: ReactMarkdown
- react-confetti: Confetti

EXPLICITLY AVOID (will cause build errors):
- axios (use SandboxAPI.fetch or native fetch)
- @tanstack/react-query for CRUD (use useAppData hook)
- moment (use date-fns or dayjs)
- redux/mobx (use zustand or jotai if needed)
- Any server frameworks (express, fastify)
- Any database drivers (pg, mysql, mongodb)
- File system libraries (fs, fs-extra)
- react-router (use state for view switching)
- Any package not listed above

### STYLING
- Use Tailwind CSS classes
- Dark theme: bg-black, bg-gray-900, text-text-primary
- Accent: red-500/red-600 for primary actions
- Cards: bg-gray-800/gray-700
- Responsive design patterns`;

export class CodeGeneratorAgent extends BaseAgent {
  constructor() {
    super({
      name: 'CodeGenerator',
      description: 'Generates modular React components',
      temperature: 0.2,
      maxTokens: 8192,
    });
  }

  protected buildSystemPrompt(state: ConversationState): string {
    return CODE_GEN_SYSTEM_PROMPT;
  }

  /**
   * Process a message (typically finalize request)
   */
  async process(
    message: string,
    state: ConversationState
  ): Promise<AgentResponse> {
    this.log('Processing code generation request');

    if (state.schemas.length === 0) {
      return {
        success: false,
        message: 'No schema defined. Please complete the design first.',
        requiresUserInput: true,
      };
    }

    // Generate component specs from layout
    const layout = state.layout || this.createDefaultLayout(state.schemas[0]);
    const componentSpecs = this.extractComponentSpecs(layout, state.schemas[0]);

    return {
      success: true,
      message: `Ready to generate ${componentSpecs.length} components for your app.`,
      data: { componentSpecs, layout },
      requiresUserInput: false,
    };
  }

  /**
   * Generate all app code incrementally
   */
  async *generateAppIncremental(
    schema: Schema,
    layout: LayoutNode,
    appId: string
  ): AsyncGenerator<ComponentGenerationEvent> {
    this.log('Starting incremental code generation', { appId });

    let progress = 0;

    // 1. Generate TypeScript types
    yield { type: 'types', progress: 5 };
    const types = this.generateTypes(schema);
    yield { type: 'types', code: types, progress: 10 };

    // 2. Generate validators
    const validators = this.generateValidators(schema);
    yield { type: 'component', name: 'validators', code: validators, progress: 15 };

    // 3. Generate API client
    const apiClient = this.generateAPIClient(schema, appId);
    yield { type: 'component', name: 'api', code: apiClient, progress: 20 };

    // 4. Generate hooks
    const hooks = this.generateHooks(schema, appId);
    yield { type: 'component', name: 'hooks', code: hooks, progress: 25 };

    // 5. Generate utils
    const utils = this.generateUtils();
    yield { type: 'component', name: 'utils', code: utils, progress: 28 };

    // 6. Extract and generate components
    const componentSpecs = this.extractComponentSpecs(layout, schema);
    const totalComponents = componentSpecs.length;
    
    for (let i = 0; i < componentSpecs.length; i++) {
      const spec = componentSpecs[i];
      progress = 30 + Math.floor((i / totalComponents) * 50);
      
      yield { type: 'component', name: spec.name, progress };
      
      try {
        const code = await this.generateComponent(spec, schema);
        yield { type: 'component', name: spec.name, code, progress: progress + 5 };
      } catch (error) {
        this.log('Component generation failed, using template', { name: spec.name, error });
        const fallbackCode = this.generateFallbackComponent(spec, schema);
        yield { type: 'component', name: spec.name, code: fallbackCode, progress: progress + 5 };
      }
    }

    // 7. Generate page wrapper
    yield { type: 'page', progress: 85 };
    const pageCode = this.generatePageWrapper(schema, layout, componentSpecs);
    yield { type: 'page', code: pageCode, progress: 95 };

    // 8. Complete
    yield { type: 'complete', progress: 100 };
  }

  /**
   * Generate a complete app (non-streaming)
   */
  async generateApp(
    schema: Schema,
    layout: LayoutNode,
    appId: string
  ): Promise<GeneratedApp> {
    const componentSpecs = this.extractComponentSpecs(layout, schema);
    const components: Record<string, string> = {};

    // Generate all components
    for (const spec of componentSpecs) {
      try {
        components[spec.name] = await this.generateComponent(spec, schema);
      } catch (error) {
        components[spec.name] = this.generateFallbackComponent(spec, schema);
      }
    }

    return {
      types: this.generateTypes(schema),
      validators: this.generateValidators(schema),
      apiClient: this.generateAPIClient(schema, appId),
      hooks: this.generateHooks(schema, appId),
      utils: this.generateUtils(),
      components,
      page: this.generatePageWrapper(schema, layout, componentSpecs),
      routes: {
        'route.ts': this.generateAPIRoute(schema, appId),
      },
    };
  }

  /**
   * Generate a single component using LLM
   */
  async generateComponent(
    spec: ComponentSpec,
    schema: Schema
  ): Promise<string> {
    const template = this.getComponentTemplate(spec.type);
    const prompt = this.buildComponentPrompt(spec, schema, template);

    let code = '';
    for await (const chunk of streamComplete({
      messages: [
        { role: 'system', content: CODE_GEN_SYSTEM_PROMPT },
        { role: 'user', content: prompt },
      ],
      temperature: 0.2,
      maxTokens: 8192,
    })) {
      code += chunk;
    }

    return this.cleanGeneratedCode(code);
  }

  /**
   * Regenerate a component based on feedback
   */
  async regenerateComponentWithFeedback(
    code: string,
    errorLog: string,
    originalPrompt: string = 'Generate component'
  ): Promise<string> {
    const feedbackLoop = new FeedbackLoop(generateId(), originalPrompt);
    feedbackLoop.addFeedback(code, errorLog);
    
    const correctionPrompt = feedbackLoop.generateCorrectionPrompt();
    
    let correctedCode = '';
    for await (const chunk of streamComplete({
      messages: [
        { role: 'system', content: CODE_GEN_SYSTEM_PROMPT },
        { role: 'user', content: correctionPrompt },
      ],
      temperature: 0.1, // Lower temperature for fixes
      maxTokens: 2048,
    })) {
      correctedCode += chunk;
    }

    return this.cleanGeneratedCode(correctedCode);
  }

  /**
   * Generate TypeScript types for the schema
   */
  generateTypes(schema: Schema): string {
    const fields = schema.fields.filter(f => !f.generated || f.name === 'id');
    
    const interfaceFields = fields.map(field => {
      let tsType = 'string';
      switch (field.type) {
        case 'number': tsType = 'number'; break;
        case 'boolean': tsType = 'boolean'; break;
        case 'date':
        case 'datetime': tsType = 'string'; break; // ISO string
        case 'enum': 
          tsType = field.options?.map(o => `'${o}'`).join(' | ') || 'string';
          break;
        case 'array': tsType = 'string[]'; break;
        case 'json': tsType = 'Record<string, unknown>'; break;
        default: tsType = 'string';
      }
      
      const optional = field.nullable || !field.required ? '?' : '';
      return `  ${field.name}${optional}: ${tsType};`;
    });

    return `// Types for ${schema.label}

export interface ${schema.name} {
${interfaceFields.join('\n')}
  createdAt: string;
}

export type ${schema.name}Input = Omit<${schema.name}, 'id' | 'createdAt'>;

export interface ${schema.name}FilterParams {
  search?: string;
  sortBy?: keyof ${schema.name};
  sortOrder?: 'asc' | 'desc';
  page?: number;
  pageSize?: number;
}
`;
  }

  /**
   * Generate Zod validators
   */
  generateValidators(schema: Schema): string {
    const fields = schema.fields.filter(f => !f.generated);
    
    const zodFields = fields.map(field => {
      let zodType = 'z.string()';
      switch (field.type) {
        case 'number': 
          zodType = 'z.number()';
          if (field.validation?.min !== undefined) {
            zodType += `.min(${field.validation.min})`;
          }
          if (field.validation?.max !== undefined) {
            zodType += `.max(${field.validation.max})`;
          }
          break;
        case 'boolean': zodType = 'z.boolean()'; break;
        case 'date':
        case 'datetime': zodType = 'z.string().datetime()'; break;
        case 'enum':
          zodType = `z.enum([${field.options?.map(o => `'${o}'`).join(', ') || ''}])`;
          break;
        case 'text':
        case 'string':
          zodType = 'z.string()';
          if (field.validation?.minLength) {
            zodType += `.min(${field.validation.minLength})`;
          }
          if (field.validation?.maxLength) {
            zodType += `.max(${field.validation.maxLength})`;
          }
          break;
        default: zodType = 'z.string()';
      }
      
      if (field.nullable || !field.required) {
        zodType += '.optional()';
      }
      
      return `  ${field.name}: ${zodType},`;
    });

    return `import { z } from 'zod';

export const ${schema.name.toLowerCase()}Schema = z.object({
${zodFields.join('\n')}
});

export type ${schema.name}FormData = z.infer<typeof ${schema.name.toLowerCase()}Schema>;
`;
  }

  /**
   * Generate API client functions
   */
  generateAPIClient(schema: Schema, appId: string): string {
    const name = schema.name;
    const nameLower = name.toLowerCase();

    return `// API Client for ${name}

const API_BASE = '/api/apps/${appId}/data';

export async function fetch${name}s(): Promise<${name}[]> {
  const res = await fetch(API_BASE);
  if (!res.ok) throw new Error('Failed to fetch ${nameLower}s');
  const data = await res.json();
  return data.records || [];
}

export async function create${name}(input: ${name}Input): Promise<${name}> {
  const res = await fetch(API_BASE, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new Error('Failed to create ${nameLower}');
  const data = await res.json();
  return data.record;
}

export async function update${name}(id: string, input: Partial<${name}Input>): Promise<${name}> {
  const res = await fetch(\`\${API_BASE}?id=\${id}\`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new Error('Failed to update ${nameLower}');
  const data = await res.json();
  return data.record;
}

export async function delete${name}(id: string): Promise<void> {
  const res = await fetch(\`\${API_BASE}?id=\${id}\`, {
    method: 'DELETE',
  });
  if (!res.ok) throw new Error('Failed to delete ${nameLower}');
}
`;
  }

  /**
   * Generate React hooks
   */
  generateHooks(schema: Schema, appId: string): string {
    const name = schema.name;
    const nameLower = name.toLowerCase();

    return `'use client';

import { useState, useEffect, useCallback } from 'react';
import { fetch${name}s, create${name}, update${name}, delete${name} } from './api';
import type { ${name}, ${name}Input } from './types';

export function use${name}Data() {
  const [${nameLower}s, set${name}s] = useState<${name}[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await fetch${name}s();
      set${name}s(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch data');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const add${name} = useCallback(async (input: ${name}Input) => {
    try {
      const newItem = await create${name}(input);
      set${name}s(prev => [...prev, newItem]);
      return newItem;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add');
      throw err;
    }
  }, []);

  const remove${name} = useCallback(async (id: string) => {
    try {
      await delete${name}(id);
      set${name}s(prev => prev.filter(item => item.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete');
      throw err;
    }
  }, []);

  const edit${name} = useCallback(async (id: string, input: Partial<${name}Input>) => {
    try {
      const updated = await update${name}(id, input);
      set${name}s(prev => prev.map(item => item.id === id ? updated : item));
      return updated;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update');
      throw err;
    }
  }, []);

  return {
    ${nameLower}s,
    isLoading,
    error,
    add${name},
    remove${name},
    edit${name},
    refresh: fetchData,
  };
}
`;
  }

  /**
   * Generate utility functions
   */
  generateUtils(): string {
    return `import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Merge Tailwind CSS classes with conflict resolution
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Format a date to a readable string
 */
export function formatDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

/**
 * Truncate text to a maximum length
 */
export function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength - 3) + '...';
}
`;
  }

  /**
   * Generate page wrapper component
   */
  generatePageWrapper(
    schema: Schema,
    layout: LayoutNode,
    componentSpecs: ComponentSpec[]
  ): string {
    const name = schema.name;
    const nameLower = name.toLowerCase();
    const componentImports = componentSpecs
      .map(s => `import { ${s.name} } from './components/${s.name}';`)
      .join('\n');

    return `'use client';

import { useState } from 'react';
import { use${name}Data } from './lib/hooks';
${componentImports}

export default function ${name}Page() {
  const { ${nameLower}s, isLoading, error, add${name}, remove${name}, refresh } = use${name}Data();
  const [filters, setFilters] = useState<Record<string, string>>({});

  const handleSubmit = async (data: Parameters<typeof add${name}>[0]) => {
    await add${name}(data);
  };

  const handleDelete = async (id: string) => {
    if (confirm('Delete this entry?')) {
      await remove${name}(id);
    }
  };

  const filteredData = ${nameLower}s.filter(item => {
    // Apply filters
    return Object.entries(filters).every(([key, value]) => {
      if (!value) return true;
      const itemValue = String(item[key as keyof typeof item] || '').toLowerCase();
      return itemValue.includes(value.toLowerCase());
    });
  });

  if (error) {
    return (
      <div className="min-h-screen bg-black text-text-primary flex items-center justify-center">
        <div className="text-center">
          <p className="text-accent-yellow mb-4">{error}</p>
          <button onClick={refresh} className="px-4 py-2 bg-red-600 rounded hover:bg-red-700">
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-text-primary">
      <div className="max-w-7xl mx-auto p-6">
        <header className="mb-8">
          <h1 className="text-3xl font-bold">${schema.label}</h1>
          <p className="text-gray-400">${schema.description || `Manage your ${nameLower}s`}</p>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1">
            <${name}Form onSubmit={handleSubmit} />
          </div>
          
          <div className="lg:col-span-2 space-y-6">
            {isLoading ? (
              <div className="text-center py-12 text-gray-500">Loading...</div>
            ) : filteredData.length === 0 ? (
              <div className="text-center py-12 text-gray-500">No entries yet</div>
            ) : (
              <${name}Table data={filteredData} onDelete={handleDelete} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
`;
  }

  /**
   * Generate API route handler
   */
  generateAPIRoute(schema: Schema, appId: string): string {
    return `import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth';
import prisma from '@/lib/db';

export async function GET(req: NextRequest) {
  const session = await getServerSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const app = await prisma.app.findFirst({
    where: { id: '${appId}', userId: session.user.id },
  });

  if (!app) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  return NextResponse.json({ records: app.data || [] });
}

export async function POST(req: NextRequest) {
  const session = await getServerSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json();
  
  const app = await prisma.app.findFirst({
    where: { id: '${appId}', userId: session.user.id },
  });

  if (!app) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const newRecord = {
    id: crypto.randomUUID(),
    ...body,
    createdAt: new Date().toISOString(),
  };

  const data = Array.isArray(app.data) ? [...app.data, newRecord] : [newRecord];

  await prisma.app.update({
    where: { id: app.id },
    data: { data },
  });

  return NextResponse.json({ record: newRecord });
}

export async function DELETE(req: NextRequest) {
  const session = await getServerSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const recordId = searchParams.get('id');

  if (!recordId) {
    return NextResponse.json({ error: 'Record ID required' }, { status: 400 });
  }

  const app = await prisma.app.findFirst({
    where: { id: '${appId}', userId: session.user.id },
  });

  if (!app) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const data = Array.isArray(app.data) 
    ? app.data.filter((r: { id: string }) => r.id !== recordId)
    : [];

  await prisma.app.update({
    where: { id: app.id },
    data: { data },
  });

  return NextResponse.json({ success: true });
}
`;
  }

  /**
   * Extract component specs from layout
   */
  private extractComponentSpecs(layout: LayoutNode, schema: Schema): ComponentSpec[] {
    const components = getComponents(layout);
    const specs: ComponentSpec[] = [];
    const seenTypes = new Set<string>();

    for (const node of components) {
      if (!node.component) continue;
      
      const type = node.component.type;
      if (seenTypes.has(type)) continue;
      seenTypes.add(type);

      specs.push({
        id: generateId(),
        name: `${schema.name}${this.capitalizeFirst(type)}`,
        type,
        variant: node.component.variant,
        schemaRef: schema.name,
        props: node.component.props as Record<string, unknown>,
      });
    }

    // Ensure we have at least form and table
    if (!seenTypes.has('form')) {
      specs.unshift({
        id: generateId(),
        name: `${schema.name}Form`,
        type: 'form',
        schemaRef: schema.name,
        props: {},
      });
    }

    if (!seenTypes.has('table')) {
      specs.push({
        id: generateId(),
        name: `${schema.name}Table`,
        type: 'table',
        schemaRef: schema.name,
        props: {},
      });
    }

    return specs;
  }

  /**
   * Build prompt for component generation
   */
  private buildComponentPrompt(
    spec: ComponentSpec,
    schema: Schema,
    template: string
  ): string {
    const fields = schema.fields.filter(f => !f.generated);
    const existingTypes = this.generateTypes(schema);
    
    return `Generate a production-ready TypeScript React component for ${spec.type}.

## CRITICAL: IMPORT PATHS
This component is in the components/ directory. Use EXACTLY these import paths:
- import { ${schema.name}, ${schema.name}Input } from '../lib/types';
- import { use${schema.name}Data } from '../lib/hooks';
- import { create${schema.name}, fetch${schema.name}s } from '../lib/api';

DO NOT use '../hooks/...' - that path does NOT exist! Hooks are in '../lib/hooks'.

## TYPE REQUIREMENTS
- Return type: React.FC or JSX.Element
- Props: Define interface ${spec.name}Props (if needed)
- State: Each useState must have explicit type parameter
- Events: All event handlers must have typed parameters

## REFERENCE TYPES
Use these exact type definitions. Import them from '../lib/types':
\`\`\`typescript
${existingTypes}
\`\`\`

## COMPONENT STRUCTURE
1. 'use client' directive
2. Import React and hooks from 'react'
3. Import types from '../lib/types'
4. Import custom hooks from '../lib/hooks' (NOT '../hooks/')
5. Main component with proper typing
6. Helper functions with typed params/returns

## CONTEXT
Schema: ${schema.name}
Fields:
${fields.map(f => `- ${f.name}: ${f.type}${f.required ? ' (required)' : ''}${f.options ? ` [${f.options.join(', ')}]` : ''}`).join('\n')}

Component name: ${spec.name}
${spec.variant ? `Variant: ${spec.variant}` : ''}
${Object.keys(spec.props).length > 0 ? `Props: ${JSON.stringify(spec.props)}` : ''}

## SPECIFIC REQUIREMENTS
${template}

## EXAMPLE PATTERN WITH CORRECT IMPORTS
\`\`\`typescript
'use client';

import React, { useState } from 'react';
import { ${schema.name}, ${schema.name}Input } from '../lib/types';  // Correct path!
import { use${schema.name}Data } from '../lib/hooks';  // Correct path! NOT '../hooks/'

interface ${spec.name}Props {
  onSubmit?: (data: ${schema.name}Input) => Promise<void>;
}

export function ${spec.name}({ onSubmit }: ${spec.name}Props) {
  const [formData, setFormData] = useState<Partial<${schema.name}Input>>({});
  const [loading, setLoading] = useState<boolean>(false);
  
  const handleSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    // Implementation
  };
  
  return (
    // JSX
  );
}
\`\`\`

Generate the complete component code following this exact pattern with CORRECT import paths.`;
  }

  /**
   * Get template/requirements for component type
   */
  private getComponentTemplate(type: ComponentType): string {
    const templates: Record<ComponentType, string> = {
      form: `
- Accept typed onSubmit callback prop (async (data: InputType) => void)
- Include all schema fields with appropriate inputs
- Use Tailwind dark theme styling
- Handle form state with typed useState<InputType>
- Include submit button with loading state
- Clear form after successful submit`,

      table: `
- Accept typed data array (DataType[]) and onDelete callback props
- Display all schema fields as columns
- Include delete button per row
- Use Tailwind dark theme table styling
- Handle empty state`,

      chart: `
- Display as a styled placeholder for now
- Show chart type indicator
- Use Tailwind dark theme styling`,

      cards: `
- Accept typed data array prop (DataType[])
- Display items as cards in a grid
- Show key fields (first 3)
- Include delete action
- Use Tailwind dark theme styling`,

      stats: `
- Calculate totals/counts from data
- Display as metric cards
- Use Tailwind dark theme styling`,

      filters: `
- Accept typed filters state and onChange callback
- Include filter inputs for filterable fields
- Use Tailwind dark theme styling`,

      kanban: `
- Accept typed data array and status field
- Display columns by status
- Use Tailwind dark theme styling`,

      calendar: `
- Display as styled placeholder
- Show month/date indicator
- Use Tailwind dark theme styling`,

      custom: `
- Create a flexible custom component
- Accept typed data prop
- Use Tailwind dark theme styling`,
    };

    return templates[type] || templates.custom;
  }

  /**
   * Generate fallback component when LLM fails
   */
  private generateFallbackComponent(spec: ComponentSpec, schema: Schema): string {
    const fields = schema.fields.filter(f => !f.generated);

    switch (spec.type) {
      case 'form':
        return this.generateFallbackForm(spec.name, schema, fields);
      case 'table':
        return this.generateFallbackTable(spec.name, schema, fields);
      default:
        return `'use client';

export function ${spec.name}({ data }: { data?: unknown[] }) {
  return (
    <div className="bg-gray-900 rounded-lg p-6">
      <h3 className="text-lg font-semibold mb-4">${spec.type}</h3>
      <p className="text-gray-400">Component placeholder</p>
    </div>
  );
}
`;
    }
  }

  /**
   * Generate fallback form component
   */
  private generateFallbackForm(name: string, schema: Schema, fields: typeof schema.fields): string {
    return `'use client';

import { useState } from 'react';
import type { ${schema.name}Input } from '../lib/types';

interface ${name}Props {
  onSubmit: (data: ${schema.name}Input) => Promise<void>;
  initialData?: Partial<${schema.name}Input>;
}

export function ${name}({ onSubmit, initialData = {} }: ${name}Props) {
  const [formData, setFormData] = useState<Partial<${schema.name}Input>>(initialData);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await onSubmit(formData as ${schema.name}Input);
      setFormData({});
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="bg-gray-900 rounded-lg p-6">
      <h3 className="text-lg font-semibold mb-4">Add Entry</h3>
      <div className="space-y-4">
${fields.map(f => `        <div>
          <label className="block text-sm text-gray-400 mb-1">${f.label}${f.required ? ' *' : ''}</label>
          ${f.type === 'enum' ? `<select
            className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded text-text-primary"
            value={String(formData.${f.name} || '')}
            onChange={(e) => setFormData(prev => ({ ...prev, ${f.name}: e.target.value }))}
            ${f.required ? 'required' : ''}
          >
            <option value="">Select...</option>
${(f.options || []).map(o => `            <option value="${o}">${o}</option>`).join('\n')}
          </select>` : `<input
            type="${f.type === 'number' ? 'number' : f.type === 'date' ? 'date' : 'text'}"
            className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded text-text-primary"
            value={String(formData.${f.name} || '')}
            onChange={(e) => setFormData(prev => ({ ...prev, ${f.name}: ${f.type === 'number' ? 'Number(e.target.value)' : 'e.target.value'} }))}
            ${f.required ? 'required' : ''}
          />`}
        </div>`).join('\n')}
      </div>
      <button
        type="submit"
        disabled={isSubmitting}
        className="mt-4 w-full px-4 py-2 bg-accent-yellow text-text-primary rounded hover:bg-accent-yellow/90 disabled:opacity-50"
      >
        {isSubmitting ? 'Adding...' : 'Add Entry'}
      </button>
    </form>
  );
}
`;
  }

  /**
   * Generate fallback table component
   */
  private generateFallbackTable(name: string, schema: Schema, fields: typeof schema.fields): string {
    return `'use client';

import type { ${schema.name} } from '../lib/types';

interface ${name}Props {
  data: ${schema.name}[];
  onDelete: (id: string) => void;
}

export function ${name}({ data, onDelete }: ${name}Props) {
  if (data.length === 0) {
    return (
      <div className="bg-gray-900 rounded-lg p-6 text-center text-gray-500">
        No entries yet
      </div>
    );
  }

  return (
    <div className="bg-gray-900 rounded-lg overflow-hidden">
      <table className="w-full">
        <thead className="bg-gray-800">
          <tr>
${fields.map(f => `            <th className="px-4 py-3 text-left text-sm font-medium text-gray-400">${f.label}</th>`).join('\n')}
            <th className="px-4 py-3 text-right text-sm font-medium text-gray-400">Actions</th>
          </tr>
        </thead>
        <tbody>
          {data.map((item) => (
            <tr key={item.id} className="border-t border-gray-800 hover:bg-gray-800/50">
${fields.map(f => `              <td className="px-4 py-3">${f.type === 'boolean' ? `{item.${f.name} ? '✓' : '✗'}` : `{String(item.${f.name} ?? '')}`}</td>`).join('\n')}
              <td className="px-4 py-3 text-right">
                <button
                  onClick={() => onDelete(item.id)}
                  className="text-accent-yellow hover:text-accent-yellow/80 text-sm"
                >
                  Delete
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
`;
  }

  /**
   * Create default layout if none provided
   */
  private createDefaultLayout(schema: Schema): LayoutNode {
    return {
      id: generateId(),
      type: 'container',
      container: {
        direction: 'column',
        gap: '1.5rem',
        children: [
          {
            id: generateId(),
            type: 'component',
            component: { type: 'form', props: {} },
          },
          {
            id: generateId(),
            type: 'component',
            component: { type: 'table', props: {} },
          },
        ],
      },
    };
  }

  /**
   * Clean generated code
   */
  private cleanGeneratedCode(code: string): string {
    return code
      .replace(/^```(?:typescript|tsx|javascript|jsx)?\n?/gm, '')
      .replace(/```$/gm, '')
      .trim();
  }

  /**
   * Capitalize first letter
   */
  private capitalizeFirst(str: string): string {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }
}

// Export singleton instance
export const codeGeneratorAgent = new CodeGeneratorAgent();
