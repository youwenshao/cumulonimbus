/**
 * Freeform Generator Agent
 * Generates completely unconstrained React applications based on natural language
 */

import { BaseAgent } from './base-agent';
import { streamComplete, complete, completeJSON } from '@/lib/llm';
import { bundleCode, validateCode, type BundleResult } from '@/lib/runtime';
import type { ConversationState, AgentResponse, Schema } from '../types';

const FREEFORM_SYSTEM_PROMPT = `You are an expert React developer creating complete, production-ready web applications.

CRITICAL REQUIREMENTS:
1. Generate a complete, self-contained React application
2. Use modern React patterns (hooks, functional components)
3. Style with Tailwind CSS using a dark theme (bg-black, bg-gray-900, text-text-primary)
4. Use red-500/red-600 as the accent color for interactive elements
5. Handle loading, error, and empty states gracefully
6. Include proper TypeScript-style type safety where possible

AVAILABLE GLOBALS (do not import these):
- React (with all hooks: useState, useEffect, useCallback, useMemo, useRef)
- useAppData() hook - returns { data, isLoading, error, addRecord, deleteRecord, updateRecord, refresh }

CRITICAL SYNTAX RULES:
- Do NOT use import statements - all dependencies are provided globally
- Do NOT use 'use client' directive
- Define a single 'App' function component as the entry point
- Use window.SandboxAPI.fetch() for API calls if needed beyond useAppData
- AVOID backticks (\`) in Tailwind classes - they create syntax errors in template literals
- Use standard Tailwind classes only, avoid arbitrary values with backticks like content-['text']
- For custom content in CSS, use standard approaches without backticks

EXAMPLE STRUCTURE:
\`\`\`
function App() {
  const { data, isLoading, addRecord, deleteRecord } = useAppData();
  const [formState, setFormState] = React.useState({});

  // Your app logic here

  return (
    <div className="min-h-screen bg-black text-text-primary p-6">
      {/* Your UI here */}
    </div>
  );
}
\`\`\`

Generate clean, well-organized code with VALID JavaScript syntax. Test mentally for syntax errors before outputting.`;

const DESIGN_SYSTEM_PROMPT = `You are an expert app designer. Analyze the user's request and design a complete application.

Provide your design as JSON with this structure:
{
  "appName": "string - short name for the app",
  "description": "string - one sentence description",
  "features": ["array of main features"],
  "schema": {
    "name": "PascalCase name for data type",
    "label": "Human-readable label",
    "fields": [
      {
        "name": "camelCase field name",
        "label": "Human-readable label",
        "type": "string | number | boolean | date | text | enum",
        "required": true/false,
        "options": ["for enum type only"],
        "placeholder": "optional"
      }
    ]
  },
  "uiComponents": ["list of UI components needed"],
  "interactions": ["list of user interactions"],
  "complexity": "simple | moderate | complex"
}

Be creative but practical. Design apps that are useful and complete.`;

export interface FreeformGenerationOptions {
  prompt: string;
  style?: 'minimal' | 'detailed' | 'creative';
  includeCharts?: boolean;
  includeFilters?: boolean;
}

export interface FreeformDesign {
  appName: string;
  description: string;
  features: string[];
  schema: Schema;
  uiComponents: string[];
  interactions: string[];
  complexity: 'simple' | 'moderate' | 'complex';
}

export interface FreeformGenerationResult {
  design: FreeformDesign;
  code: string;
  bundle: BundleResult;
  warnings: string[];
}

export class FreeformGenerator extends BaseAgent {
  constructor() {
    super({
      name: 'FreeformGenerator',
      description: 'Generates unconstrained React applications',
      temperature: 0.7,
      maxTokens: 8192,
    });
  }

  protected buildSystemPrompt(): string {
    return FREEFORM_SYSTEM_PROMPT;
  }

  /**
   * Process a freeform generation request
   */
  async process(
    message: string,
    state: ConversationState
  ): Promise<AgentResponse> {
    this.log('Processing freeform generation request');

    try {
      // Step 1: Design the app
      const design = await this.designApp(message);
      
      // Step 2: Generate the code
      const code = await this.generateCode(message, design);
      
      // Step 3: Bundle and validate
      const bundle = bundleCode({
        appId: state.id,
        appCode: code,
        schema: design.schema,
      });

      const validation = validateCode(bundle.bundledCode);
      
      return {
        success: true,
        message: `I've designed and generated your "${design.appName}" app with ${design.features.length} features.`,
        data: {
          design,
          code,
          bundle,
          warnings: validation.errors,
        },
      };
    } catch (error) {
      this.log('Freeform generation failed', { error });
      return {
        success: false,
        message: `Failed to generate app: ${error instanceof Error ? error.message : 'Unknown error'}`,
        requiresUserInput: true,
      };
    }
  }

  /**
   * Design the app based on user prompt
   */
  async designApp(prompt: string): Promise<FreeformDesign> {
    this.log('Designing app from prompt');

    const response = await completeJSON<FreeformDesign>({
      messages: [
        { role: 'system', content: DESIGN_SYSTEM_PROMPT },
        { role: 'user', content: `Design an app for: ${prompt}` },
      ],
      temperature: 0.5,
      maxTokens: 2048,
    });

    // Ensure schema has proper structure
    if (response.schema && !response.schema.fields.some(f => f.name === 'id')) {
      response.schema.fields.unshift({
        name: 'id',
        label: 'ID',
        type: 'string',
        required: true,
      });
    }

    this.log('App designed', { appName: response.appName, features: response.features.length });

    return response;
  }

  /**
   * Generate code for the designed app
   */
  async generateCode(prompt: string, design: FreeformDesign): Promise<string> {
    this.log('Generating code for app', { appName: design.appName });

    const codePrompt = `Generate a complete React application for: "${prompt}"

Design specification:
- App name: ${design.appName}
- Description: ${design.description}
- Features: ${design.features.join(', ')}
- Components needed: ${design.uiComponents.join(', ')}
- Interactions: ${design.interactions.join(', ')}

Data schema (use with useAppData hook):
${JSON.stringify(design.schema, null, 2)}

Generate the complete App component. Remember:
- Use useAppData() for data operations
- Use React.useState, React.useEffect, etc. (React is global)
- Style with Tailwind dark theme classes
- Handle loading and error states
- Make the UI modern and responsive

Generate ONLY the code, no markdown code blocks or explanations.`;

    const code = await complete({
      messages: [
        { role: 'system', content: FREEFORM_SYSTEM_PROMPT },
        { role: 'user', content: codePrompt },
      ],
      temperature: 0.3,
      maxTokens: 8192,
    });

    // Clean up the code
    let cleanedCode = code
      .replace(/```(?:typescript|tsx|javascript|jsx)?\n?/g, '')
      .replace(/```$/g, '')
      .trim();

    this.log('Code generated', { length: cleanedCode.length });

    return cleanedCode;
  }

  /**
   * Stream code generation for real-time display
   */
  async *streamGenerateCode(
    prompt: string,
    design: FreeformDesign
  ): AsyncGenerator<{ type: 'chunk' | 'complete'; content: string }> {
    this.log('Starting streaming code generation');

    const codePrompt = `Generate a complete React application for: "${prompt}"

Design specification:
- App name: ${design.appName}
- Description: ${design.description}
- Features: ${design.features.join(', ')}
- Components needed: ${design.uiComponents.join(', ')}

Data schema (use with useAppData hook):
${JSON.stringify(design.schema, null, 2)}

Generate the complete App component. Remember:
- Use useAppData() for data operations
- Use React.useState, React.useEffect, etc. (React is global)
- Style with Tailwind dark theme classes
- Handle loading and error states

Generate ONLY the code, no markdown code blocks or explanations.`;

    let fullCode = '';

    for await (const chunk of streamComplete({
      messages: [
        { role: 'system', content: FREEFORM_SYSTEM_PROMPT },
        { role: 'user', content: codePrompt },
      ],
      temperature: 0.3,
      maxTokens: 8192,
    })) {
      fullCode += chunk;
      yield { type: 'chunk', content: chunk };
    }

    // Clean up the final code
    let cleanedCode = fullCode
      .replace(/```(?:typescript|tsx|javascript|jsx)?\n?/g, '')
      .replace(/```$/g, '')
      .trim();

    // Fix common syntax issues from LLM generation
    cleanedCode = cleanedCode
      // Remove backticks from Tailwind arbitrary values that cause syntax errors
      .replace(/content-\['[^']*'\]/g, 'content-empty')
      // Fix other potential backtick issues in class names
      .replace(/`([^`]*)`/g, (match, content) => {
        // Only replace backticks that are inside className strings
        if (content.includes('className=') || content.includes('class=')) {
          return content.replace(/`/g, '');
        }
        return match;
      });

    yield { type: 'complete', content: cleanedCode };
  }

  /**
   * Refine existing code based on feedback
   */
  async refineCode(
    originalCode: string,
    feedback: string,
    design: FreeformDesign
  ): Promise<string> {
    this.log('Refining code based on feedback');

    const refinePrompt = `Here is the current app code:

${originalCode}

User feedback: ${feedback}

Please modify the code to address the feedback while maintaining:
- The same overall structure and design
- Proper use of useAppData() hook
- Tailwind dark theme styling
- React best practices

Generate ONLY the updated code, no explanations.`;

    const refinedCode = await complete({
      messages: [
        { role: 'system', content: FREEFORM_SYSTEM_PROMPT },
        { role: 'user', content: refinePrompt },
      ],
      temperature: 0.3,
      maxTokens: 8192,
    });

    return refinedCode
      .replace(/```(?:typescript|tsx|javascript|jsx)?\n?/g, '')
      .replace(/```$/g, '')
      .trim();
  }

  /**
   * Generate a quick prototype for preview
   */
  async generatePrototype(prompt: string): Promise<{ design: FreeformDesign; previewCode: string }> {
    this.log('Generating quick prototype');

    // Quick design
    const design = await this.designApp(prompt);

    // Generate simplified preview code
    const previewCode = this.generatePreviewCode(design);

    return { design, previewCode };
  }

  /**
   * Generate a static preview without API integration
   */
  private generatePreviewCode(design: FreeformDesign): string {
    const fields = design.schema.fields.filter(f => f.name !== 'id' && f.name !== 'createdAt');

    return `
function App() {
  const [data, setData] = React.useState([
    // Sample data for preview
    ${fields.length > 0 ? `{
      id: '1',
      ${fields.map(f => `${f.name}: ${f.type === 'number' ? '42' : f.type === 'boolean' ? 'true' : `'Sample ${f.label}'`}`).join(',\n      ')}
    }` : '{ id: "1" }'}
  ]);
  const [formData, setFormData] = React.useState({});

  const handleSubmit = (e) => {
    e.preventDefault();
    const newItem = { id: String(Date.now()), ...formData };
    setData(prev => [...prev, newItem]);
    setFormData({});
  };

  const handleDelete = (id) => {
    setData(prev => prev.filter(item => item.id !== id));
  };

  return (
    <div className="min-h-screen bg-black text-text-primary p-6">
      <div className="max-w-6xl mx-auto">
        <header className="mb-8">
          <h1 className="text-3xl font-bold text-text-primary">${design.appName}</h1>
          <p className="text-gray-400">${design.description}</p>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="bg-gray-900 rounded-lg p-6">
            <h2 className="text-lg font-semibold mb-4">Add Entry</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              ${fields.map(f => `
              <div>
                <label className="block text-sm text-gray-400 mb-1">${f.label}</label>
                <input
                  type="${f.type === 'number' ? 'number' : 'text'}"
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded text-text-primary"
                  value={formData.${f.name} || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, ${f.name}: e.target.value }))}
                />
              </div>`).join('')}
              <button type="submit" className="w-full py-2 bg-accent-yellow hover:bg-accent-yellow/90 rounded text-text-primary">
                Add Entry
              </button>
            </form>
          </div>

          <div className="lg:col-span-2 bg-gray-900 rounded-lg p-6">
            <h2 className="text-lg font-semibold mb-4">Entries ({data.length})</h2>
            {data.length === 0 ? (
              <p className="text-gray-500 text-center py-8">No entries yet</p>
            ) : (
              <div className="space-y-3">
                {data.map(item => (
                  <div key={item.id} className="flex justify-between items-center p-3 bg-gray-800 rounded">
                    <div>
                      ${fields.slice(0, 2).map(f => `<span className="mr-4">{String(item.${f.name})}</span>`).join('')}
                    </div>
                    <button
                      onClick={() => handleDelete(item.id)}
                      className="text-accent-yellow hover:text-accent-yellow/80"
                    >
                      Delete
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}`;
  }
}

// Export singleton instance
export const freeformGenerator = new FreeformGenerator();
