/**
 * Test Utilities for App Generation Tests
 * Provides mocks, helpers, and fixtures for testing
 */

import type { ProjectSpec, FieldDefinition, ViewConfig } from '@/lib/scaffolder/types';
import type { Schema, FieldDefinition as V2FieldDefinition } from '@/lib/scaffolder-v2/types';

/**
 * LLM Mock Factory
 * Creates mock functions for LLM API calls
 */
export class LLMMockFactory {
  private static responses: Map<string, any> = new Map();
  
  /**
   * Reset all mocked responses
   */
  static reset() {
    this.responses.clear();
  }
  
  /**
   * Mock a JSON completion response
   */
  static mockCompleteJSON<T>(key: string, response: T) {
    this.responses.set(`json:${key}`, response);
  }
  
  /**
   * Mock a text completion response
   */
  static mockComplete(key: string, response: string) {
    this.responses.set(`text:${key}`, response);
  }
  
  /**
   * Mock a streaming completion response
   */
  static mockStreamComplete(key: string, chunks: string[]) {
    this.responses.set(`stream:${key}`, chunks);
  }
  
  /**
   * Create a mock completeJSON function
   */
  static createCompleteJSONMock() {
    return jest.fn().mockImplementation(async ({ messages }) => {
      const lastMessage = messages[messages.length - 1].content;
      const key = this.findMatchingKey(lastMessage, 'json');
      if (key) {
        return this.responses.get(key);
      }
      throw new Error('No mock response configured');
    });
  }
  
  /**
   * Create a mock complete function
   */
  static createCompleteMock() {
    return jest.fn().mockImplementation(async ({ messages }) => {
      const lastMessage = messages[messages.length - 1].content;
      const key = this.findMatchingKey(lastMessage, 'text');
      if (key) {
        return this.responses.get(key);
      }
      throw new Error('No mock response configured');
    });
  }
  
  /**
   * Create a mock streamComplete function
   */
  static createStreamCompleteMock() {
    return jest.fn().mockImplementation(async function* ({ messages }) {
      const lastMessage = messages[messages.length - 1].content;
      const key = LLMMockFactory.findMatchingKey(lastMessage, 'stream');
      if (key) {
        const chunks = LLMMockFactory.responses.get(key) as string[];
        for (const chunk of chunks) {
          yield chunk;
        }
      } else {
        throw new Error('No mock response configured');
      }
    });
  }
  
  /**
   * Find a matching key in responses
   */
  private static findMatchingKey(content: string, prefix: string): string | null {
    for (const key of this.responses.keys()) {
      if (key.startsWith(`${prefix}:`) && content.includes(key.substring(prefix.length + 1))) {
        return key;
      }
    }
    return null;
  }
}

/**
 * Create a sample ProjectSpec for testing
 */
export function createSampleProjectSpec(overrides?: Partial<ProjectSpec>): ProjectSpec {
  return {
    name: 'Test App',
    description: 'A test application',
    category: 'expense',
    dataStore: {
      name: 'entries',
      label: 'Entries',
      fields: [
        {
          name: 'amount',
          label: 'Amount',
          type: 'number',
          required: true,
        },
        {
          name: 'category',
          label: 'Category',
          type: 'select',
          required: true,
          options: ['Food', 'Transport', 'Entertainment'],
        },
        {
          name: 'date',
          label: 'Date',
          type: 'date',
          required: true,
        },
        {
          name: 'notes',
          label: 'Notes',
          type: 'textarea',
          required: false,
        },
      ],
    },
    views: [
      {
        type: 'table',
        title: 'All Entries',
        config: {
          columns: ['amount', 'category', 'date'],
          sortBy: 'date',
          sortOrder: 'desc',
        },
      },
      {
        type: 'chart',
        title: 'Spending by Category',
        config: {
          chartType: 'pie',
          xAxis: 'category',
          yAxis: 'amount',
          groupBy: 'category',
          aggregation: 'sum',
        },
      },
    ],
    features: {
      allowEdit: true,
      allowDelete: true,
      allowExport: false,
    },
    ...overrides,
  };
}

/**
 * Create a sample V2 Schema for testing
 */
export function createSampleSchema(overrides?: Partial<Schema>): Schema {
  return {
    name: 'Entry',
    label: 'Entry',
    description: 'A data entry',
    fields: [
      {
        name: 'id',
        label: 'ID',
        type: 'string',
        required: true,
        primaryKey: true,
        generated: true,
      },
      {
        name: 'title',
        label: 'Title',
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
        name: 'createdAt',
        label: 'Created At',
        type: 'datetime',
        required: true,
        generated: true,
      },
    ],
    ...overrides,
  };
}

/**
 * Create a sample generated code for testing
 */
export function createSampleGeneratedCode(appName = 'TestApp'): string {
  return `'use client';

import { useState, useEffect, useCallback } from 'react';

interface DataRecord {
  id: string;
  title: string;
  amount: number;
  createdAt: string;
}

export default function ${appName}Page() {
  const [data, setData] = useState<DataRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [formData, setFormData] = useState<Partial<DataRecord>>({});

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
    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/apps/test-id/data', {
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
      const res = await fetch(\`/api/apps/test-id/data?id=\${id}\`, {
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
    <div className="min-h-screen bg-black text-text-primary p-8">
      <header className="mb-8">
        <h1 className="text-3xl font-bold">${appName}</h1>
      </header>

      <form onSubmit={handleSubmit} className="bg-gray-900 rounded-lg p-6 mb-8">
        <h2 className="text-xl font-semibold mb-4">Add Entry</h2>
        <div className="space-y-4">
          <input
            type="text"
            placeholder="Title"
            className="w-full px-3 py-2 bg-gray-800 rounded"
            value={formData.title || ''}
            onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
            required
          />
          <input
            type="number"
            placeholder="Amount"
            className="w-full px-3 py-2 bg-gray-800 rounded"
            value={formData.amount || ''}
            onChange={(e) => setFormData(prev => ({ ...prev, amount: Number(e.target.value) }))}
            required
          />
          <button type="submit" className="px-6 py-2 bg-accent-yellow rounded">
            Add Entry
          </button>
        </div>
      </form>

      {isLoading ? (
        <div>Loading...</div>
      ) : data.length === 0 ? (
        <div>No entries yet</div>
      ) : (
        <div className="bg-gray-900 rounded-lg overflow-hidden">
          <table className="w-full">
            <thead>
              <tr>
                <th>Title</th>
                <th>Amount</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {data.map((record) => (
                <tr key={record.id}>
                  <td>{record.title}</td>
                  <td>{record.amount}</td>
                  <td>
                    <button onClick={() => handleDelete(record.id)}>
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

/**
 * Helper to test async generators
 */
export async function collectAsyncGenerator<T>(
  generator: AsyncGenerator<T>
): Promise<T[]> {
  const results: T[] = [];
  for await (const item of generator) {
    results.push(item);
  }
  return results;
}

/**
 * Wait for a specified time (for testing async operations)
 */
export function wait(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Create a mock fetch function
 */
export function createMockFetch(responses: Record<string, any>) {
  return jest.fn().mockImplementation((url: string, options?: any) => {
    const key = `${options?.method || 'GET'}:${url}`;
    const response = responses[key] || responses[url];
    
    if (response instanceof Error) {
      return Promise.reject(response);
    }
    
    return Promise.resolve({
      ok: response?.ok !== false,
      status: response?.status || 200,
      json: async () => response?.data || response || {},
      text: async () => JSON.stringify(response?.data || response || {}),
    });
  });
}
