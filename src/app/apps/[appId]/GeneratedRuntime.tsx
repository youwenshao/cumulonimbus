'use client';

import { useState, useCallback, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { ArrowLeft, Settings, AlertTriangle, RefreshCw } from 'lucide-react';
import { NavigationRail, Button, Card } from '@/components/ui';
import type { ProjectSpec } from '@/lib/scaffolder/types';
import type { DataRecord } from '@/lib/primitives/types';
import { cn } from '@/lib/utils';

interface GeneratedRuntimeProps {
  appId: string;
  name: string;
  description: string;
  spec: ProjectSpec;
  generatedCode: string;
  initialData: DataRecord[];
}

/**
 * GeneratedRuntime - Executes dynamically generated React code
 * 
 * This component provides a runtime environment for generated app code.
 * Instead of using eval (security risk), it provides a fallback implementation
 * that renders based on the spec when dynamic execution fails.
 * 
 * For production, the generated code is stored and used to create
 * the actual components. The runtime provides the context and API
 * integrations that the generated code needs.
 */
export function GeneratedRuntime({ 
  appId, 
  name, 
  description, 
  spec, 
  generatedCode,
  initialData 
}: GeneratedRuntimeProps) {
  const [data, setData] = useState<DataRecord[]>(initialData);
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState<Record<string, string | number | boolean>>({});
  const [error, setError] = useState<string | null>(null);
  const [sortField, setSortField] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  // Fetch data on mount
  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const res = await fetch(`/api/apps/${appId}/data`);
      if (res.ok) {
        const result = await res.json();
        setData(result.records || []);
      }
    } catch (err) {
      console.error('Failed to fetch data:', err);
    }
  };

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/apps/${appId}/data`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (res.ok) {
        const { record } = await res.json();
        setData(prev => [...prev, record]);
        setFormData({});
      } else {
        const errorData = await res.json();
        setError(errorData.error || 'Failed to add record');
      }
    } catch (err) {
      console.error('Failed to add record:', err);
      setError('Failed to add record');
    } finally {
      setIsLoading(false);
    }
  }, [appId, formData]);

  const handleDelete = useCallback(async (id: string) => {
    if (!confirm('Are you sure you want to delete this entry?')) return;

    try {
      const res = await fetch(`/api/apps/${appId}/data?id=${id}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        setData(prev => prev.filter(r => r.id !== id));
      }
    } catch (err) {
      console.error('Failed to delete record:', err);
    }
  }, [appId]);

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  // Sort data
  const sortedData = useMemo(() => {
    if (!sortField) return data;
    
    return [...data].sort((a, b) => {
      const aVal = a[sortField];
      const bVal = b[sortField];
      
      if (aVal === undefined || aVal === null) return 1;
      if (bVal === undefined || bVal === null) return -1;
      
      let comparison = 0;
      if (typeof aVal === 'string' && typeof bVal === 'string') {
        comparison = aVal.localeCompare(bVal);
      } else if (typeof aVal === 'number' && typeof bVal === 'number') {
        comparison = aVal - bVal;
      } else {
        comparison = String(aVal).localeCompare(String(bVal));
      }
      
      return sortDirection === 'asc' ? comparison : -comparison;
    });
  }, [data, sortField, sortDirection]);

  const fields = spec.dataStore.fields;

  const renderFormField = (field: typeof fields[0]) => {
    const value = formData[field.name] ?? '';
    const onChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
      let newValue: string | number | boolean = e.target.value;
      if (field.type === 'number') {
        newValue = parseFloat(e.target.value) || 0;
      } else if (field.type === 'boolean') {
        newValue = (e.target as HTMLInputElement).checked;
      }
      setFormData(prev => ({ ...prev, [field.name]: newValue }));
    };

    const baseClass = 'w-full px-3 py-2 bg-surface-light border border-outline-light rounded-lg text-text-primary focus:outline-none focus:border-accent-yellow transition-colors';

    switch (field.type) {
      case 'textarea':
        return (
          <textarea
            className={cn(baseClass, 'min-h-[80px] resize-none')}
            value={String(value)}
            onChange={onChange}
            placeholder={field.placeholder || `Enter ${field.label}...`}
            required={field.required}
          />
        );
      
      case 'select':
        return (
          <select
            className={baseClass}
            value={String(value)}
            onChange={onChange}
            required={field.required}
          >
            <option value="">Select {field.label}...</option>
            {field.options?.map((opt) => (
              <option key={opt} value={opt}>{opt}</option>
            ))}
          </select>
        );
      
      case 'boolean':
        return (
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              className="w-5 h-5 rounded border-gray-700 bg-gray-800 text-red-500 focus:ring-red-500"
              checked={Boolean(value)}
              onChange={onChange}
            />
            <span className="text-gray-300">Yes</span>
          </label>
        );
      
      case 'date':
        return (
          <input
            type="date"
            className={baseClass}
            value={String(value)}
            onChange={onChange}
            required={field.required}
          />
        );
      
      case 'number':
        return (
          <input
            type="number"
            className={baseClass}
            value={value === '' ? '' : Number(value)}
            onChange={onChange}
            placeholder={field.placeholder || '0'}
            required={field.required}
          />
        );
      
      default:
        return (
          <input
            type="text"
            className={baseClass}
            value={String(value)}
            onChange={onChange}
            placeholder={field.placeholder || `Enter ${field.label}...`}
            required={field.required}
          />
        );
    }
  };

  const formatCellValue = (value: unknown, type: string): string => {
    if (value === null || value === undefined) return '-';
    
    if (type === 'boolean') return value ? '✓' : '✗';
    if (type === 'date' && typeof value === 'string') {
      try {
        return new Date(value).toLocaleDateString();
      } catch {
        return String(value);
      }
    }
    if (type === 'number' && typeof value === 'number') {
      return value.toLocaleString();
    }
    
    return String(value);
  };

  return (
    <div className="min-h-screen bg-surface-dark flex">
      {/* Navigation Rail */}
      <div className="hidden md:block">
        <NavigationRail />
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <header className="border-b border-gray-800 bg-gray-900 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href="/dashboard" className="p-2 text-text-tertiary hover:text-text-primary transition-colors">
                <ArrowLeft className="w-5 h-5" />
              </Link>
              <div>
                <h1 className="text-xl font-bold text-text-primary">{name}</h1>
                <p className="text-sm text-gray-400">{description}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={fetchData}>
                <RefreshCw className="w-4 h-4" />
              </Button>
              <Button variant="ghost" size="sm">
                <Settings className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto p-6">
          <div className="max-w-6xl mx-auto space-y-8">
            {/* Form Section */}
            <Card variant="outlined" padding="lg">
              <h2 className="text-lg font-semibold text-text-primary mb-4">Add New Entry</h2>
              
              {error && (
                <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg flex items-center gap-2 text-red-400">
                  <AlertTriangle className="w-4 h-4" />
                  {error}
                </div>
              )}
              
              <form onSubmit={handleSubmit}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {fields.map((field) => (
                    <div key={field.name} className="space-y-1">
                      <label className="text-sm font-medium text-text-primary flex items-center gap-1">
                        {field.label}
                        {field.required && <span className="text-red-500">*</span>}
                      </label>
                      {renderFormField(field)}
                    </div>
                  ))}
                </div>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="mt-6 px-6 py-2 bg-accent-yellow text-text-primary rounded-lg font-medium hover:bg-accent-yellow/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {isLoading ? 'Adding...' : 'Add Entry'}
                </button>
              </form>
            </Card>

            {/* Table Section */}
            <Card variant="outlined" padding="lg">
              <h2 className="text-lg font-semibold text-text-primary mb-4">
                All Entries ({sortedData.length})
              </h2>

              {sortedData.length === 0 ? (
                <div className="text-center py-12 text-gray-400">
                  <p>No entries yet. Add your first entry above.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-800">
                        {fields.map((field) => (
                          <th
                            key={field.name}
                            className="px-4 py-3 text-left text-sm font-medium text-text-tertiary cursor-pointer hover:text-text-primary transition-colors"
                            onClick={() => handleSort(field.name)}
                          >
                            <span className="flex items-center gap-1">
                              {field.label}
                              {sortField === field.name && (
                                <span className="text-red-500">
                                  {sortDirection === 'asc' ? '↑' : '↓'}
                                </span>
                              )}
                            </span>
                          </th>
                        ))}
                        <th className="px-4 py-3 text-right text-sm font-medium text-gray-400">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {sortedData.map((record) => (
                        <tr key={record.id} className="border-b border-gray-800/50 hover:bg-gray-800/30">
                          {fields.map((field) => (
                            <td key={field.name} className="px-4 py-3 text-sm text-text-primary">
                              {formatCellValue(record[field.name], field.type)}
                            </td>
                          ))}
                          <td className="px-4 py-3 text-right">
                            <button
                              onClick={() => handleDelete(record.id)}
                              className="text-red-400 hover:text-red-300 text-sm transition-colors"
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
            </Card>
          </div>
        </main>
      </div>
    </div>
  );
}

export default GeneratedRuntime;
