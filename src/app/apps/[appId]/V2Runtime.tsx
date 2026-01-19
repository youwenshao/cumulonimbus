'use client';

import { useState, useCallback } from 'react';
import Link from 'next/link';
import { ArrowLeft, Settings, Plus, Trash2 } from 'lucide-react';
import { NavigationRail, Button, Card } from '@/components/ui';
import type { Schema, LayoutNode } from '@/lib/scaffolder-v2/types';
import type { DataRecord } from '@/lib/primitives/types';
import { cn } from '@/lib/utils';

interface V2RuntimeProps {
  appId: string;
  name: string;
  description: string;
  schema: Schema;
  layout?: LayoutNode;
  componentFiles?: Record<string, string>;
  initialData: DataRecord[];
}

export function V2Runtime({
  appId,
  name,
  description,
  schema,
  layout,
  componentFiles,
  initialData
}: V2RuntimeProps) {
  const [data, setData] = useState<DataRecord[]>(initialData);
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState<Record<string, any>>({});

  const handleAddRecord = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const response = await fetch(`/api/apps/${appId}/data`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        const { record } = await response.json();
        setData(prev => [...prev, record]);
        setFormData({});
      }
    } catch (error) {
      console.error('Failed to add record:', error);
    } finally {
      setIsLoading(false);
    }
  }, [appId, formData]);

  const handleDeleteRecord = useCallback(async (id: string) => {
    if (!confirm('Are you sure you want to delete this entry?')) return;

    try {
      const response = await fetch(`/api/apps/${appId}/data?id=${id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setData(prev => prev.filter(r => r.id !== id));
      }
    } catch (error) {
      console.error('Failed to delete record:', error);
    }
  }, [appId]);

  // Get user-editable fields (exclude generated fields)
  const editableFields = schema.fields.filter(f => !f.generated);

  return (
    <div className="h-screen bg-surface-dark flex">
      {/* Navigation Rail - Hidden on mobile, shown on desktop */}
      <div className="hidden md:block">
        <NavigationRail />
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <header className="border-b border-outline-mid bg-surface-dark px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link
                href="/dashboard"
                className="btn-ghost p-2"
              >
                <ArrowLeft className="w-5 h-5" />
              </Link>
              <div>
                <h1 className="text-xl font-bold text-text-primary">{name}</h1>
                <p className="text-sm text-text-secondary">{description}</p>
                <span className="text-xs bg-pastel-purple px-2 py-1 rounded text-text-primary">
                  V2 App
                </span>
              </div>
            </div>
            <Button variant="ghost" size="sm">
              <Settings className="w-4 h-4" />
            </Button>
          </div>
        </header>

        {/* Main content */}
        <main className="flex-1 overflow-y-auto">
          <div className="max-w-7xl mx-auto p-6 space-y-6">
            {/* Schema Info */}
            <Card variant="outlined" padding="lg">
              <h2 className="text-lg font-semibold text-text-primary mb-4">Schema: {schema.label}</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {schema.fields.map(field => (
                  <div key={field.name} className="p-3 bg-gray-800 rounded">
                    <div className="font-medium text-text-primary">{field.label}</div>
                    <div className="text-sm text-gray-400">{field.type}</div>
                    {field.required && <div className="text-xs text-red-400">Required</div>}
                  </div>
                ))}
              </div>
            </Card>

            {/* Add Entry Form */}
            <Card variant="outlined" padding="lg">
              <h2 className="text-lg font-semibold text-text-primary mb-4 flex items-center gap-2">
                <Plus className="w-5 h-5" />
                Add Entry
              </h2>
              <form onSubmit={handleAddRecord} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {editableFields.map(field => (
                    <div key={field.name}>
                      <label className="block text-sm text-gray-400 mb-1">
                        {field.label}
                        {field.required && <span className="text-red-400 ml-1">*</span>}
                      </label>
                      {field.type === 'enum' ? (
                        <select
                          value={formData[field.name] || ''}
                          onChange={(e) => setFormData(prev => ({ ...prev, [field.name]: e.target.value }))}
                          className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded text-text-primary"
                          required={field.required}
                        >
                          <option value="">Select...</option>
                          {(field.options || []).map(option => (
                            <option key={option} value={option}>{option}</option>
                          ))}
                        </select>
                      ) : field.type === 'text' ? (
                        <textarea
                          value={formData[field.name] || ''}
                          onChange={(e) => setFormData(prev => ({ ...prev, [field.name]: e.target.value }))}
                          className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded text-text-primary"
                          placeholder={field.placeholder}
                          required={field.required}
                          rows={3}
                        />
                      ) : (
                        <input
                          type={field.type === 'number' ? 'number' : field.type === 'date' ? 'date' : 'text'}
                          value={formData[field.name] || ''}
                          onChange={(e) => setFormData(prev => ({
                            ...prev,
                            [field.name]: field.type === 'number' ? Number(e.target.value) : e.target.value
                          }))}
                          className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded text-text-primary"
                          placeholder={field.placeholder}
                          required={field.required}
                        />
                      )}
                    </div>
                  ))}
                </div>
                <Button type="submit" disabled={isLoading} className="mt-4">
                  {isLoading ? 'Adding...' : 'Add Entry'}
                </Button>
              </form>
            </Card>

            {/* Data Table */}
            <Card variant="outlined" padding="lg">
              <h2 className="text-lg font-semibold text-text-primary mb-4">Entries ({data.length})</h2>
              {data.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  No entries yet. Add your first entry above.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-700">
                        {schema.fields.map(field => (
                          <th key={field.name} className="text-left py-2 px-4 text-sm font-medium text-gray-400">
                            {field.label}
                          </th>
                        ))}
                        <th className="text-right py-2 px-4 text-sm font-medium text-gray-400">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.map((record) => (
                        <tr key={record.id} className="border-b border-gray-800 hover:bg-gray-800/50">
                          {schema.fields.map(field => (
                            <td key={field.name} className="py-2 px-4 text-text-primary">
                              {field.type === 'boolean'
                                ? (record[field.name] ? '✓' : '✗')
                                : String(record[field.name] ?? '')}
                            </td>
                          ))}
                          <td className="py-2 px-4 text-right">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteRecord(record.id)}
                              className="text-red-400 hover:text-red-300"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Card>

            {/* Layout Info (if available) */}
            {layout && (
              <Card variant="outlined" padding="lg">
                <h2 className="text-lg font-semibold text-text-primary mb-4">Layout Information</h2>
                <pre className="text-xs text-gray-400 bg-gray-900 p-4 rounded overflow-auto">
                  {JSON.stringify(layout, null, 2)}
                </pre>
              </Card>
            )}

            {/* Component Files Info (if available) */}
            {componentFiles && Object.keys(componentFiles).length > 0 && (
              <Card variant="outlined" padding="lg">
                <h2 className="text-lg font-semibold text-text-primary mb-4">Generated Components</h2>
                <div className="space-y-2">
                  {Object.keys(componentFiles).map(filename => (
                    <div key={filename} className="text-sm text-gray-400">
                      {filename}
                    </div>
                  ))}
                </div>
              </Card>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}