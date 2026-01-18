/**
 * Mock LLM Response Fixtures for Testing
 * Pre-defined LLM responses for deterministic testing
 */

import type { ParsedIntent } from '@/lib/scaffolder/types';
import type { FreeformDesign } from '@/lib/scaffolder-v2/agents/freeform-generator';

/**
 * Parsed intent for expense tracker
 */
export const expenseIntentResponse: ParsedIntent = {
  category: 'expense',
  entities: ['expenses', 'spending', 'budget'],
  actions: ['track', 'monitor', 'visualize'],
  relationships: ['expenses by category', 'spending over time'],
  suggestedName: 'Expense Tracker',
  confidence: 0.95,
};

/**
 * Parsed intent for habit tracker
 */
export const habitIntentResponse: ParsedIntent = {
  category: 'habit',
  entities: ['habits', 'routines', 'activities'],
  actions: ['track', 'monitor', 'log'],
  relationships: ['habits over time', 'completion status'],
  suggestedName: 'Habit Tracker',
  confidence: 0.92,
};

/**
 * Parsed intent with low confidence
 */
export const lowConfidenceIntentResponse: ParsedIntent = {
  category: 'custom',
  entities: ['items', 'things'],
  actions: ['track'],
  relationships: [],
  suggestedName: 'My Tracker',
  confidence: 0.3,
};

/**
 * Malformed JSON response (missing required fields)
 */
export const malformedIntentResponse = {
  category: 'expense',
  // Missing entities, actions, etc.
};

/**
 * Expense tracker design response
 */
export const expenseDesignResponse: FreeformDesign = {
  appName: 'Expense Tracker',
  description: 'Track and visualize your daily expenses',
  features: [
    'Add expenses with amount, category, and date',
    'View all expenses in a table',
    'Visualize spending by category',
    'Filter by date range',
  ],
  schema: {
    name: 'Expense',
    label: 'Expense',
    fields: [
      {
        name: 'id',
        label: 'ID',
        type: 'string',
        required: true,
      },
      {
        name: 'amount',
        label: 'Amount',
        type: 'number',
        required: true,
      },
      {
        name: 'category',
        label: 'Category',
        type: 'enum',
        required: true,
        options: ['Food', 'Transport', 'Entertainment', 'Bills', 'Other'],
      },
      {
        name: 'description',
        label: 'Description',
        type: 'string',
        required: false,
      },
      {
        name: 'date',
        label: 'Date',
        type: 'date',
        required: true,
      },
      {
        name: 'createdAt',
        label: 'Created At',
        type: 'datetime',
        required: true,
      },
    ],
  },
  uiComponents: ['form', 'table', 'pie-chart', 'filter'],
  interactions: ['add-expense', 'delete-expense', 'filter-by-category', 'filter-by-date'],
  complexity: 'moderate',
};

/**
 * Simple app design response
 */
export const simpleDesignResponse: FreeformDesign = {
  appName: 'Simple Tracker',
  description: 'A simple tracking app',
  features: ['Add items', 'View items', 'Delete items'],
  schema: {
    name: 'Item',
    label: 'Item',
    fields: [
      {
        name: 'id',
        label: 'ID',
        type: 'string',
        required: true,
      },
      {
        name: 'name',
        label: 'Name',
        type: 'string',
        required: true,
      },
      {
        name: 'createdAt',
        label: 'Created At',
        type: 'datetime',
        required: true,
      },
    ],
  },
  uiComponents: ['form', 'list'],
  interactions: ['add-item', 'delete-item'],
  complexity: 'simple',
};

/**
 * Generated code response (streamed chunks)
 */
export const generatedCodeChunks = [
  "'use client';\n\n",
  "import { useState, useEffect",
  ", useCallback } from 'react';\n\n",
  "interface DataRecord {\n",
  "  id: string;\n",
  "  amount: number;\n",
  "  category: string;\n",
  "  date: string;\n",
  "}\n\n",
  "export default function ExpenseTrackerPage() {\n",
  "  const [data, setData] = useState<DataRecord[]>([]);\n",
  "  const [isLoading, setIsLoading] = useState(true);\n\n",
  "  useEffect(() => {\n",
  "    fetchData();\n",
  "  }, []);\n\n",
  "  const fetchData = async () => {\n",
  "    setIsLoading(true);\n",
  "    try {\n",
  "      const res = await fetch('/api/apps/test/data');\n",
  "      if (res.ok) {\n",
  "        const result = await res.json();\n",
  "        setData(result.records || []);\n",
  "      }\n",
  "    } finally {\n",
  "      setIsLoading(false);\n",
  "    }\n",
  "  };\n\n",
  "  return (\n",
  "    <div className=\"min-h-screen bg-black p-8\">\n",
  "      <h1 className=\"text-3xl font-bold\">Expense Tracker</h1>\n",
  "      {isLoading ? <div>Loading...</div> : <div>Ready</div>}\n",
  "    </div>\n",
  "  );\n",
  "}\n",
];

/**
 * Full generated code response
 */
export const fullGeneratedCode = generatedCodeChunks.join('');

/**
 * Truncated/incomplete code response
 */
export const truncatedCodeResponse = "'use client';\n\nimport { useState } from 'react';\n\nexport default function Page() {\n  const [data, setData] = useState([]);\n  \n  return (\n    <div>\n      <h1>App";

/**
 * Code with syntax errors
 */
export const syntaxErrorCodeResponse = `'use client';

export default function Page() {
  return (
    <div>
      <h1>Missing closing tag
    </div>
  )
}`;

/**
 * Code with markdown wrapper
 */
export const codeWithMarkdownResponse = `\`\`\`typescript
'use client';

export default function Page() {
  return <div>Hello</div>;
}
\`\`\``;

/**
 * Empty/null responses for error testing
 */
export const emptyResponse = '';
export const nullResponse = null;
export const undefinedResponse = undefined;

/**
 * Rate limit error response
 */
export const rateLimitError = {
  error: {
    message: 'Rate limit exceeded',
    type: 'rate_limit_error',
    code: 429,
  },
};

/**
 * Network timeout error
 */
export const timeoutError = new Error('Request timeout after 30000ms');

/**
 * Invalid JSON response
 */
export const invalidJsonResponse = '{category: "expense", entities: [}';

/**
 * Response with trailing comma (fixable)
 */
export const fixableJsonResponse = `{
  "category": "expense",
  "entities": ["expenses", "spending",],
  "actions": ["track"],
  "relationships": [],
  "suggestedName": "Expense Tracker",
  "confidence": 0.9,
}`;

/**
 * Response with single quotes (fixable)
 */
export const singleQuoteJsonResponse = `{
  'category': 'expense',
  'entities': ['expenses'],
  'actions': ['track'],
  'relationships': [],
  'suggestedName': 'Expense Tracker',
  'confidence': 0.9
}`;
