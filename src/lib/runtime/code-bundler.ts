/**
 * Code Bundler
 * Bundles generated code for execution in iframe sandbox
 */

export interface BundleOptions {
  /** App identifier */
  appId: string;
  /** Main app code (React component) */
  appCode: string;
  /** Additional component files */
  componentFiles?: Record<string, string>;
  /** Type definitions (for display, not execution) */
  typeDefinitions?: string;
  /** Initial data for the app */
  initialData?: Record<string, unknown>[];
  /** App schema for form generation */
  schema?: {
    name: string;
    label: string;
    fields: Array<{
      name: string;
      label: string;
      type: string;
      required?: boolean;
      options?: string[];
      placeholder?: string;
    }>;
  };
}

export interface BundleResult {
  /** Bundled code ready for iframe execution */
  bundledCode: string;
  /** Separate component files (for code viewer) */
  files: Record<string, string>;
  /** Estimated bundle size in bytes */
  bundleSize: number;
}

/**
 * Wrapper template that provides app infrastructure
 */
const WRAPPER_TEMPLATE = `
// ============================================
// Auto-generated wrapper for sandbox execution
// ============================================

// App State Hook (provides data management)
function useAppData() {
  const [data, setData] = React.useState(window.SandboxAPI?.getData() || []);
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState(null);

  const refresh = React.useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const result = await window.SandboxAPI.fetch('');
      const newData = result.data || [];
      setData(newData);
      window.SandboxAPI.updateData(newData);
    } catch (e) {
      setError(e.message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const addRecord = React.useCallback(async (record) => {
    try {
      setIsLoading(true);
      const result = await window.SandboxAPI.fetch('', {
        method: 'POST',
        body: record
      });
      const newData = [...data, result.record];
      setData(newData);
      window.SandboxAPI.updateData(newData);
      return result.record;
    } catch (e) {
      setError(e.message);
      throw e;
    } finally {
      setIsLoading(false);
    }
  }, [data]);

  const updateRecord = React.useCallback(async (id, updates) => {
    try {
      setIsLoading(true);
      const result = await window.SandboxAPI.fetch('', {
        method: 'PATCH',
        body: { id, ...updates }
      });
      const newData = data.map(r => r.id === id ? result.record : r);
      setData(newData);
      window.SandboxAPI.updateData(newData);
      return result.record;
    } catch (e) {
      setError(e.message);
      throw e;
    } finally {
      setIsLoading(false);
    }
  }, [data]);

  const deleteRecord = React.useCallback(async (id) => {
    try {
      setIsLoading(true);
      await window.SandboxAPI.fetch('?id=' + id, { method: 'DELETE' });
      const newData = data.filter(r => r.id !== id);
      setData(newData);
      window.SandboxAPI.updateData(newData);
    } catch (e) {
      setError(e.message);
      throw e;
    } finally {
      setIsLoading(false);
    }
  }, [data]);

  return { 
    data, 
    isLoading, 
    error, 
    refresh, 
    addRecord, 
    updateRecord,
    deleteRecord 
  };
}

// Make hook globally available
window.useAppData = useAppData;
`;

/**
 * Generate a default app component from schema
 */
function generateDefaultApp(schema: BundleOptions['schema']): string {
  if (!schema) {
    return `
function App() {
  return (
    <div className="min-h-screen bg-black text-white p-8">
      <h1 className="text-2xl font-bold">App Ready</h1>
      <p className="text-gray-400">No content defined</p>
    </div>
  );
}
`;
  }

  const fields = schema.fields || [];
  const editableFields = fields.filter(f => f.name !== 'id' && f.name !== 'createdAt');

  return `
function App() {
  const { data, isLoading, error, addRecord, deleteRecord } = useAppData();
  const [formData, setFormData] = React.useState({});

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await addRecord(formData);
      setFormData({});
    } catch (e) {
      console.error('Failed to add record:', e);
    }
  };

  const handleDelete = async (id) => {
    if (confirm('Delete this entry?')) {
      await deleteRecord(id);
    }
  };

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="max-w-6xl mx-auto p-6">
        <header className="mb-8">
          <h1 className="text-3xl font-bold">${schema.label}</h1>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Form */}
          <div className="bg-gray-900 rounded-lg p-6">
            <h2 className="text-lg font-semibold mb-4">Add Entry</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              ${editableFields.map(f => `
              <div>
                <label className="block text-sm text-gray-400 mb-1">
                  ${f.label}${f.required ? ' *' : ''}
                </label>
                ${f.type === 'enum' && f.options ? `
                <select
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded text-white"
                  value={formData.${f.name} || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, ${f.name}: e.target.value }))}
                  ${f.required ? 'required' : ''}
                >
                  <option value="">Select...</option>
                  ${f.options.map(o => `<option value="${o}">${o}</option>`).join('\n                  ')}
                </select>
                ` : f.type === 'text' ? `
                <textarea
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded text-white"
                  value={formData.${f.name} || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, ${f.name}: e.target.value }))}
                  placeholder="${f.placeholder || ''}"
                  ${f.required ? 'required' : ''}
                  rows={3}
                />
                ` : `
                <input
                  type="${f.type === 'number' ? 'number' : f.type === 'date' ? 'date' : 'text'}"
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded text-white"
                  value={formData.${f.name} || ''}
                  onChange={(e) => setFormData(prev => ({ 
                    ...prev, 
                    ${f.name}: ${f.type === 'number' ? 'Number(e.target.value)' : 'e.target.value'} 
                  }))}
                  placeholder="${f.placeholder || ''}"
                  ${f.required ? 'required' : ''}
                />
                `}
              </div>`).join('\n')}
              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-2 px-4 bg-red-600 hover:bg-red-700 text-white rounded disabled:opacity-50"
              >
                {isLoading ? 'Adding...' : 'Add Entry'}
              </button>
            </form>
          </div>

          {/* Table */}
          <div className="lg:col-span-2 bg-gray-900 rounded-lg p-6">
            <h2 className="text-lg font-semibold mb-4">Entries ({data.length})</h2>
            {error && (
              <div className="mb-4 p-3 bg-red-900/50 border border-red-700 rounded text-red-300">
                {error}
              </div>
            )}
            {data.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                No entries yet. Add your first entry using the form.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-700">
                      ${fields.map(f => `<th className="text-left py-2 px-3 text-sm text-gray-400">${f.label}</th>`).join('\n                      ')}
                      <th className="text-right py-2 px-3 text-sm text-gray-400">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.map((row) => (
                      <tr key={row.id} className="border-b border-gray-800 hover:bg-gray-800/50">
                        ${fields.map(f => `<td className="py-2 px-3">{${f.type === 'boolean' ? `row.${f.name} ? '✓' : '✗'` : `String(row.${f.name} ?? '')`}}</td>`).join('\n                        ')}
                        <td className="py-2 px-3 text-right">
                          <button
                            onClick={() => handleDelete(row.id)}
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
        </div>
      </div>
    </div>
  );
}
`;
}

/**
 * Clean and validate generated code
 */
function cleanCode(code: string): string {
  // Remove 'use client' directive (not needed in sandbox)
  code = code.replace(/'use client';?\n?/g, '');
  code = code.replace(/"use client";?\n?/g, '');

  // Remove imports (we provide React globally)
  code = code.replace(/import\s+.*?from\s+['"][^'"]+['"];?\n?/g, '');
  code = code.replace(/import\s+{[^}]+}\s+from\s+['"][^'"]+['"];?\n?/g, '');

  // Remove export statements
  code = code.replace(/export\s+default\s+/g, '');
  code = code.replace(/export\s+/g, '');

  return code.trim();
}

/**
 * Bundle code for iframe execution
 */
export function bundleCode(options: BundleOptions): BundleResult {
  const {
    appId,
    appCode,
    componentFiles = {},
    typeDefinitions,
    schema,
  } = options;

  // Start with wrapper template
  let bundledCode = WRAPPER_TEMPLATE;

  // Add any additional component files
  for (const [filename, code] of Object.entries(componentFiles)) {
    if (filename !== 'App.tsx' && filename !== 'page.tsx') {
      bundledCode += `\n// ${filename}\n${cleanCode(code)}\n`;
    }
  }

  // Add the main app code or generate default
  if (appCode && appCode.trim()) {
    const cleanedAppCode = cleanCode(appCode);

    // Extract the main component name from the cleaned code
    let mainComponentName = 'App'; // default fallback

    // Debug: Log the cleaned code structure
    console.log('[DEBUG] Code bundler - cleaned code analysis:', {
      firstLines: cleanedAppCode.split('\n').slice(0, 10).join('\n'),
      hasFunction: /function\s+\w+\(/.test(cleanedAppCode),
      hasArrow: /const\s+\w+\s*=.*=>/.test(cleanedAppCode),
      hasExport: /export/.test(cleanedAppCode)
    });

    // Try to find function declaration like "function ComponentName("
    const functionMatch = cleanedAppCode.match(/function\s+(\w+)\s*\(/);
    if (functionMatch) {
      mainComponentName = functionMatch[1];
      console.log('[DEBUG] Code bundler - found function:', mainComponentName);
    } else {
      // Try to find arrow function like "const ComponentName = "
      const arrowMatch = cleanedAppCode.match(/const\s+(\w+)\s*=\s*(?:\([^)]*\)\s*=>|.*=>)/);
      if (arrowMatch) {
        mainComponentName = arrowMatch[1];
        console.log('[DEBUG] Code bundler - found arrow function:', mainComponentName);
      } else {
        console.log('[DEBUG] Code bundler - no component name found, using default App');
      }
    }

    // Add code to make the component globally available as 'App'
    bundledCode += `\n// Main App Component\n${cleanedAppCode}\n`;
    bundledCode += `\n// Make component globally available\nwindow.App = ${mainComponentName};\n`;

    // Debug logging - check for syntax errors
    console.log('[DEBUG] Code bundler - Component detection:', {
      detectedComponentName: mainComponentName,
      cleanedCodeLength: cleanedAppCode.length,
      cleanedCodeLastLines: cleanedAppCode.slice(-100),
      bundledCodeSnippet: bundledCode.slice(-200),
      hasWindowAppAssignment: bundledCode.includes('window.App ='),
      totalBundleSize: bundledCode.length
    });

    // Check if the bundled code is valid JavaScript
    try {
      new Function(bundledCode);
      console.log('[DEBUG] Bundled code syntax validation: PASSED');
    } catch (syntaxError) {
      console.error('[DEBUG] Bundled code syntax validation: FAILED', syntaxError instanceof Error ? syntaxError.message : String(syntaxError));
      console.error('[DEBUG] Syntax error details:', {
        error: syntaxError instanceof Error ? syntaxError.message : String(syntaxError),
        position: syntaxError instanceof Error ? syntaxError.toString() : String(syntaxError),
        bundledCodePreview: bundledCode.slice(Math.max(0, bundledCode.length - 1000))
      });
      // Throw the syntax error to prevent bundling of invalid code
      throw new Error(`Generated code contains syntax errors: ${syntaxError instanceof Error ? syntaxError.message : String(syntaxError)}`);
    }


  } else {
    bundledCode += `\n// Generated App Component\n${generateDefaultApp(schema)}\n`;
  }

  // Create files object for code viewer
  const files: Record<string, string> = {
    'App.tsx': appCode || generateDefaultApp(schema),
    ...componentFiles,
  };

  if (typeDefinitions) {
    files['types.ts'] = typeDefinitions;
  }

  return {
    bundledCode,
    files,
    bundleSize: new TextEncoder().encode(bundledCode).length,
  };
}

/**
 * Validate that code is safe for sandbox execution
 */
export function validateCode(code: string): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Check for dangerous patterns
  const dangerousPatterns = [
    { pattern: /eval\s*\(/g, message: 'eval() is not allowed' },
    { pattern: /new\s+Function\s*\(/g, message: 'Function constructor is not allowed' },
    { pattern: /document\.cookie/g, message: 'Cookie access is not allowed' },
    { pattern: /localStorage/g, message: 'localStorage is not allowed (use SandboxAPI)' },
    { pattern: /sessionStorage/g, message: 'sessionStorage is not allowed (use SandboxAPI)' },
    { pattern: /window\.open/g, message: 'window.open is not allowed' },
    { pattern: /window\.location\s*=/g, message: 'Navigation is not allowed' },
    { pattern: /fetch\s*\(\s*['"][^'"]*['"]\s*\)/g, message: 'Direct fetch is not allowed (use SandboxAPI.fetch)' },
  ];

  for (const { pattern, message } of dangerousPatterns) {
    if (pattern.test(code)) {
      errors.push(message);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Estimate complexity of generated code
 */
export function estimateComplexity(code: string): {
  lines: number;
  components: number;
  hooks: number;
  complexity: 'simple' | 'moderate' | 'complex';
} {
  const lines = code.split('\n').length;
  const components = (code.match(/function\s+[A-Z]\w+/g) || []).length;
  const hooks = (code.match(/use[A-Z]\w+/g) || []).length;

  let complexity: 'simple' | 'moderate' | 'complex' = 'simple';
  if (lines > 500 || components > 10 || hooks > 10) {
    complexity = 'complex';
  } else if (lines > 200 || components > 5 || hooks > 5) {
    complexity = 'moderate';
  }

  return { lines, components, hooks, complexity };
}
