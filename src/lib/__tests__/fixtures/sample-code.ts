/**
 * Sample Generated Code Fixtures for Testing
 * Provides valid and invalid code examples
 */

/**
 * Valid React component code
 */
export const validReactComponent = `'use client';

import { useState, useEffect } from 'react';

interface DataRecord {
  id: string;
  title: string;
  amount: number;
  createdAt: string;
}

export default function ExpenseTrackerPage() {
  const [data, setData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const res = await fetch('/api/apps/test-id/data');
      if (res.ok) {
        const result = await res.json();
        setData(result.records || []);
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black text-white p-8">
      <h1 className="text-3xl font-bold">Expense Tracker</h1>
      {isLoading ? <div>Loading...</div> : <div>Ready</div>}
    </div>
  );
}`;

/**
 * Valid code with markdown wrapper (needs cleaning)
 */
export const codeWithMarkdown = `\`\`\`typescript
'use client';

import { useState } from 'react';

export default function TestPage() {
  const [count, setCount] = useState(0);
  
  return (
    <div>
      <button onClick={() => setCount(count + 1)}>
        Count: {count}
      </button>
    </div>
  );
}
\`\`\``;

/**
 * Valid code without 'use client' (needs to be added)
 */
export const codeWithoutUseClient = `import { useState, useEffect } from 'react';

export default function TestPage() {
  const [data, setData] = useState([]);

  useEffect(() => {
    console.log('Component mounted');
  }, []);

  return <div>Test Page</div>;
}`;

/**
 * Code with dangerous pattern - eval
 */
export const codeWithEval = `'use client';

export default function DangerousPage() {
  const handleClick = () => {
    eval('alert("Hello")'); // Dangerous!
  };
  
  return <button onClick={handleClick}>Click</button>;
}`;

/**
 * Code with dangerous pattern - localStorage
 */
export const codeWithLocalStorage = `'use client';

import { useState, useEffect } from 'react';

export default function BadStoragePage() {
  const [data, setData] = useState([]);

  useEffect(() => {
    const saved = localStorage.getItem('data'); // Should use SandboxAPI
    if (saved) {
      setData(JSON.parse(saved));
    }
  }, []);

  return <div>Data: {data.length}</div>;
}`;

/**
 * Code with dangerous pattern - window.open
 */
export const codeWithWindowOpen = `'use client';

export default function PopupPage() {
  const openPopup = () => {
    window.open('https://example.com'); // Not allowed
  };
  
  return <button onClick={openPopup}>Open</button>;
}`;

/**
 * Code with blocked import - axios
 */
export const codeWithBlockedImport = `'use client';

import axios from 'axios'; // Blocked package

export default function AxiosPage() {
  const fetchData = async () => {
    const res = await axios.get('/api/data');
    console.log(res.data);
  };
  
  return <button onClick={fetchData}>Fetch</button>;
}`;

/**
 * Code with blocked import - fs
 */
export const codeWithFsImport = `'use client';

import fs from 'fs'; // Blocked server-side package

export default function FilePage() {
  return <div>File operations</div>;
}`;

/**
 * Code with syntax error - missing closing brace
 */
export const codeWithSyntaxError = `'use client';

export default function BrokenPage() {
  return (
    <div>
      <h1>Broken
    </div>
  );
`;

/**
 * Code with missing default export
 */
export const codeWithoutDefaultExport = `'use client';

import { useState } from 'react';

function TestPage() {
  const [count, setCount] = useState(0);
  return <div>Count: {count}</div>;
}`;

/**
 * Code with arrow function component
 */
export const arrowFunctionComponent = `'use client';

import { useState } from 'react';

const TestPage = () => {
  const [count, setCount] = useState(0);
  
  return (
    <div>
      <button onClick={() => setCount(count + 1)}>
        Count: {count}
      </button>
    </div>
  );
};

export default TestPage;`;

/**
 * Complex valid code with multiple hooks and patterns
 */
export const complexValidCode = `'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';

interface DataItem {
  id: string;
  amount: number;
  category: string;
}

export default function ComplexPage() {
  const [data, setData] = useState<DataItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const res = await fetch('/api/data');
      if (res.ok) {
        const result = await res.json();
        setData(result.items || []);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const filteredData = useMemo(() => {
    if (filter === 'all') return data;
    return data.filter(item => item.category === filter);
  }, [data, filter]);

  const total = useMemo(() => {
    return filteredData.reduce((sum, item) => sum + item.amount, 0);
  }, [filteredData]);

  const handleDelete = useCallback(async (id: string) => {
    if (!confirm('Delete this item?')) return;
    try {
      const res = await fetch('/api/data?id=' + id, {
        method: 'DELETE',
      });
      if (res.ok) {
        setData(prev => prev.filter(item => item.id !== id));
      }
    } catch (error) {
      console.error('Failed to delete:', error);
    }
  }, []);

  if (isLoading) {
    return <div className="p-8">Loading...</div>;
  }

  return (
    <div className="container p-8">
      <h1 className="text-3xl font-bold">Complex Page</h1>
      <p className="text-gray-600">Total: {total.toFixed(2)}</p>
      <select value={filter} onChange={(e) => setFilter(e.target.value)}>
        <option value="all">All</option>
        <option value="food">Food</option>
      </select>
      <div className="mt-4">
        {filteredData.map(item => (
          <div key={item.id}>
            <span>{item.category}: {item.amount}</span>
            <button onClick={() => handleDelete(item.id)}>Delete</button>
          </div>
        ))}
      </div>
    </div>
  );
}`;

/**
 * Minimal valid component
 */
export const minimalComponent = `'use client';

export default function MinimalPage() {
  return <div>Hello World</div>;
}`;

/**
 * Empty/invalid code samples
 */
export const emptyCode = '';
export const nullCode = null;
export const whitespaceOnlyCode = '   \n\n   \t\t  ';
