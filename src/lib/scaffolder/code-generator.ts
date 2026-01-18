/**
 * Code Generator Module
 * Generates React component code from ProjectSpec using LLM
 */

import { streamComplete } from '@/lib/qwen';
import type { ProjectSpec } from './types';

/**
 * Structure for generated code output
 */
export interface GeneratedCode {
  pageComponent: string;      // Main page.tsx code
  formComponent?: string;     // Optional separate form component
  tableComponent?: string;    // Optional separate table component
  chartComponent?: string;    // Optional separate chart component
  types?: string;             // TypeScript types
}

/**
 * Chunk types for streaming code generation
 */
export interface CodeGenerationChunk {
  type: 'status' | 'code' | 'complete' | 'error';
  component?: 'page' | 'form' | 'table' | 'chart' | 'types';
  content: string;
  progress: number;
}

/**
 * Build the system prompt for code generation
 */
function buildSystemPrompt(): string {
  return `You are an expert React developer generating production-ready Next.js components.

CRITICAL REQUIREMENTS:
1. Generate ONLY the code - no explanations, no markdown code blocks, no comments before or after
2. Use TypeScript with proper types
3. Use Tailwind CSS for styling with a modern dark theme
4. Include proper error handling
5. Make the component fully functional with CRUD operations
6. Use 'use client' directive for client components
7. Follow React best practices (hooks, memoization where needed)

AVAILABLE IMPORTS - You have access to these pre-bundled dependencies:

CORE:
- React hooks: useState, useEffect, useCallback, useMemo, useRef

ICONS:
- lucide-react: Any icon (Heart, CheckCircle, Menu, Plus, Trash, Edit, Loader2, AlertCircle, etc.)

DATES:
- date-fns: format, parseISO, differenceInDays, addDays, subDays

FORMS & VALIDATION:
- react-hook-form: useForm, Controller
- zod: z.object, z.string, z.number, etc.

CHARTS:
- recharts: LineChart, BarChart, PieChart, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer

UTILITIES:
- clsx: Conditional className utility
- tailwind-merge: Merge Tailwind classes
- nanoid: Tiny unique ID generator

EXPLICITLY AVOID:
- axios (use native fetch)
- moment (use date-fns)
- redux/mobx (use useState or zustand)
- Any server-side packages

STYLING GUIDELINES:
- Use a dark theme: bg-black, bg-gray-900, text-text-primary
- Use accent colors: red-500/red-600 for primary actions
- Use gray-800/gray-700 for cards and surfaces
- Use proper spacing and responsive design
- Make forms and tables visually appealing`;
}

/**
 * Build the code generation prompt for a page component
 */
function buildPagePrompt(spec: ProjectSpec, appId: string): string {
  const fieldsDescription = spec.dataStore.fields
    .map(f => {
      let fieldInfo = `- ${f.name}: ${f.type}`;
      if (f.required) fieldInfo += ' (required)';
      if (f.label) fieldInfo += ` [label: "${f.label}"]`;
      if (f.options) fieldInfo += ` [options: ${f.options.join(', ')}]`;
      if (f.placeholder) fieldInfo += ` [placeholder: "${f.placeholder}"]`;
      return fieldInfo;
    })
    .join('\n');

  const viewsDescription = spec.views
    .map(v => `- ${v.type}: ${v.title}`)
    .join('\n');

  return `Generate a complete Next.js page component for a ${spec.category} tracking app called "${spec.name}".

APP DESCRIPTION: ${spec.description}

DATA FIELDS:
${fieldsDescription}

VIEWS TO INCLUDE:
${viewsDescription}

API ENDPOINTS (already implemented):
- GET /api/apps/${appId}/data - Fetch all records
- POST /api/apps/${appId}/data - Create new record (body: field values)
- DELETE /api/apps/${appId}/data?id={recordId} - Delete a record

REQUIREMENTS:
1. Start with 'use client'
2. Create a DataRecord interface with all fields plus id: string and createdAt: string
3. Create a form to add new entries with proper validation
4. Display data in a table with sorting capability
5. Add delete functionality with confirmation
6. Include loading and empty states
7. Use useState for data, loading states
8. Use useCallback for handlers
9. Make it responsive (mobile-friendly)
10. Include a header with the app name

STRUCTURE:
- Export default function ${spec.name.replace(/\s+/g, '')}Page()
- Include all TypeScript interfaces at the top
- Include form component inline
- Include table component inline

Generate the complete page.tsx code now:`;
}

/**
 * Parse and clean the generated code
 */
function cleanGeneratedCode(code: string): string {
  // Remove markdown code blocks if present
  let cleaned = code
    .replace(/^```(?:typescript|tsx|javascript|jsx)?\n?/gm, '')
    .replace(/```$/gm, '')
    .trim();

  // Ensure it starts with 'use client' if it's a client component
  if (!cleaned.startsWith("'use client'") && !cleaned.startsWith('"use client"')) {
    // Check if it should be a client component (has useState, useEffect, etc.)
    if (cleaned.includes('useState') || cleaned.includes('useEffect') || cleaned.includes('useCallback')) {
      cleaned = "'use client';\n\n" + cleaned;
    }
  }

  return cleaned;
}

/**
 * Validate that the generated code has required elements
 */
function validateGeneratedCode(code: string): { valid: boolean; issues: string[] } {
  const issues: string[] = [];

  // Check for export default
  if (!code.includes('export default')) {
    issues.push('Missing default export');
  }

  // Check for required imports/hooks in a client component
  if (code.includes("'use client'") || code.includes('"use client"')) {
    if (!code.includes('useState') && !code.includes('React.useState')) {
      issues.push('Client component should use useState for state management');
    }
  }

  // Check for basic structure
  if (!code.includes('function') && !code.includes('=>')) {
    issues.push('No function definition found');
  }

  // Check for return statement with JSX
  if (!code.includes('return (') && !code.includes('return(')) {
    issues.push('No JSX return statement found');
  }

  return {
    valid: issues.length === 0,
    issues,
  };
}

/**
 * Generate app code from a ProjectSpec
 * Yields chunks for real-time streaming display
 */
export async function* generateAppCode(
  spec: ProjectSpec,
  appId: string
): AsyncGenerator<CodeGenerationChunk> {
  console.log('\n🔧 === Starting Code Generation ===');
  console.log(`   App: ${spec.name}`);
  console.log(`   ID: ${appId}`);
  console.log(`   Fields: ${spec.dataStore.fields.length}`);
  console.log(`   Views: ${spec.views.length}`);

  // Emit starting status
  yield {
    type: 'status',
    content: 'Initializing code generation...',
    progress: 5,
  };

  try {
    // Build prompts
    const systemPrompt = buildSystemPrompt();
    const userPrompt = buildPagePrompt(spec, appId);

    yield {
      type: 'status',
      content: 'Generating page component...',
      progress: 10,
    };

    // Stream the code generation
    let fullCode = '';
    let chunkCount = 0;

    yield {
      type: 'status',
      component: 'page',
      content: 'Writing component code...',
      progress: 15,
    };

    for await (const chunk of streamComplete({
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.3,
      maxTokens: 4096,
    })) {
      fullCode += chunk;
      chunkCount++;

      // Emit code chunks periodically (every few chunks to avoid overwhelming)
      if (chunkCount % 3 === 0 || chunk.includes('\n')) {
        const progress = Math.min(15 + Math.floor((fullCode.length / 3000) * 70), 85);
        yield {
          type: 'code',
          component: 'page',
          content: chunk,
          progress,
        };
      }
    }

    // Emit any remaining content
    yield {
      type: 'status',
      content: 'Cleaning and validating code...',
      progress: 90,
    };

    // Clean the generated code
    const cleanedCode = cleanGeneratedCode(fullCode);

    // Validate the code
    const validation = validateGeneratedCode(cleanedCode);

    if (!validation.valid) {
      console.warn('⚠️ Code validation warnings:', validation.issues);
      yield {
        type: 'status',
        content: `Code generated with warnings: ${validation.issues.join(', ')}`,
        progress: 95,
      };
    }

    console.log(`✅ Code generation complete`);
    console.log(`   Total length: ${cleanedCode.length} characters`);
    console.log(`   Chunks received: ${chunkCount}`);

    yield {
      type: 'status',
      content: 'Code generation complete!',
      progress: 100,
    };

    // Yield the complete code
    yield {
      type: 'complete',
      component: 'page',
      content: cleanedCode,
      progress: 100,
    };

  } catch (error) {
    console.error('❌ Code generation failed:', error);
    yield {
      type: 'error',
      content: error instanceof Error ? error.message : 'Unknown error during code generation',
      progress: 0,
    };
  }
}

/**
 * Generate code with issues context for regeneration
 */
export async function* regenerateAppCode(
  spec: ProjectSpec,
  appId: string,
  previousCode: string,
  issues: string
): AsyncGenerator<CodeGenerationChunk> {
  console.log('\n🔄 === Starting Code Regeneration ===');
  console.log(`   App: ${spec.name}`);
  console.log(`   Issues: ${issues}`);

  yield {
    type: 'status',
    content: 'Analyzing issues and preparing fix...',
    progress: 5,
  };

  try {
    const systemPrompt = buildSystemPrompt() + `

REGENERATION CONTEXT:
The previous code had issues reported by the user. Fix these issues while maintaining the overall structure.`;

    const userPrompt = `${buildPagePrompt(spec, appId)}

PREVIOUS CODE (with issues):
\`\`\`tsx
${previousCode.substring(0, 2000)}${previousCode.length > 2000 ? '\n... (truncated)' : ''}
\`\`\`

USER REPORTED ISSUES:
${issues}

Generate the FIXED page.tsx code now, addressing all the reported issues:`;

    yield {
      type: 'status',
      content: 'Generating fixed code...',
      progress: 15,
    };

    let fullCode = '';
    let chunkCount = 0;

    for await (const chunk of streamComplete({
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.3,
      maxTokens: 4096,
    })) {
      fullCode += chunk;
      chunkCount++;

      if (chunkCount % 3 === 0 || chunk.includes('\n')) {
        const progress = Math.min(15 + Math.floor((fullCode.length / 3000) * 70), 85);
        yield {
          type: 'code',
          component: 'page',
          content: chunk,
          progress,
        };
      }
    }

    yield {
      type: 'status',
      content: 'Cleaning and validating fixed code...',
      progress: 90,
    };

    const cleanedCode = cleanGeneratedCode(fullCode);
    const validation = validateGeneratedCode(cleanedCode);

    if (!validation.valid) {
      console.warn('⚠️ Regenerated code validation warnings:', validation.issues);
    }

    console.log(`✅ Code regeneration complete`);
    console.log(`   Total length: ${cleanedCode.length} characters`);

    yield {
      type: 'status',
      content: 'Code regeneration complete!',
      progress: 100,
    };

    yield {
      type: 'complete',
      component: 'page',
      content: cleanedCode,
      progress: 100,
    };

  } catch (error) {
    console.error('❌ Code regeneration failed:', error);
    yield {
      type: 'error',
      content: error instanceof Error ? error.message : 'Unknown error during code regeneration',
      progress: 0,
    };
  }
}

/**
 * Generate a simple fallback component when LLM fails
 */
export function generateFallbackCode(spec: ProjectSpec, appId: string): string {
  const componentName = spec.name.replace(/\s+/g, '');
  const fields = spec.dataStore.fields;

  return `'use client';

import { useState, useCallback, useEffect } from 'react';

interface DataRecord {
  id: string;
${fields.map(f => `  ${f.name}: ${f.type === 'number' ? 'number' : f.type === 'boolean' ? 'boolean' : 'string'};`).join('\n')}
  createdAt: string;
}

export default function ${componentName}Page() {
  const [data, setData] = useState<DataRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [formData, setFormData] = useState<Record<string, string | number | boolean>>({});

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const res = await fetch('/api/apps/${appId}/data');
      if (res.ok) {
        const result = await res.json();
        setData(result.records || []);
      }
    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/apps/${appId}/data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      if (res.ok) {
        const { record } = await res.json();
        setData(prev => [...prev, record]);
        setFormData({});
      }
    } catch (error) {
      console.error('Failed to add record:', error);
    }
  }, [formData]);

  const handleDelete = useCallback(async (id: string) => {
    if (!confirm('Delete this entry?')) return;
    try {
      const res = await fetch(\`/api/apps/${appId}/data?id=\${id}\`, {
        method: 'DELETE',
      });
      if (res.ok) {
        setData(prev => prev.filter(r => r.id !== id));
      }
    } catch (error) {
      console.error('Failed to delete:', error);
    }
  }, []);

  return (
    <div className="min-h-screen bg-surface-dark text-text-primary p-8">
      <header className="mb-8">
        <h1 className="text-3xl font-bold">${spec.name}</h1>
        <p className="text-gray-400">${spec.description}</p>
      </header>

      <form onSubmit={handleSubmit} className="bg-gray-900 rounded-lg p-6 mb-8">
        <h2 className="text-xl font-semibold mb-4">Add Entry</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
${fields.map(f => `          <div>
            <label className="block text-sm text-gray-400 mb-1">${f.label || f.name}</label>
            <input
              type="${f.type === 'number' ? 'number' : f.type === 'date' ? 'date' : 'text'}"
              className="w-full px-3 py-2 bg-surface-light border border-outline-light rounded text-text-primary"
              value={String(formData['${f.name}'] || '')}
              onChange={(e) => setFormData(prev => ({ ...prev, ${f.name}: e.target.value }))}
              ${f.required ? 'required' : ''}
            />
          </div>`).join('\n')}
        </div>
        <button type="submit" className="mt-4 px-6 py-2 bg-accent-yellow text-text-primary rounded hover:bg-accent-yellow/90">
          Add Entry
        </button>
      </form>

      {isLoading ? (
        <div className="text-center py-8">Loading...</div>
      ) : data.length === 0 ? (
        <div className="text-center py-8 text-gray-400">No entries yet</div>
      ) : (
        <div className="bg-gray-900 rounded-lg overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-800">
              <tr>
${fields.map(f => `                <th className="px-4 py-3 text-left text-sm font-medium">${f.label || f.name}</th>`).join('\n')}
                <th className="px-4 py-3 text-right text-sm font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {data.map((record) => (
                <tr key={record.id} className="border-t border-gray-800">
${fields.map(f => `                  <td className="px-4 py-3">{String(record.${f.name})}</td>`).join('\n')}
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => handleDelete(record.id)}
                      className="text-red-400 hover:text-red-300 text-sm"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
`;
}
