'use client';

import { useState, useCallback } from 'react';
import Link from 'next/link';
import { ArrowLeft, Settings, LayoutGrid, Table2, BarChart3 } from 'lucide-react';
import { FormPrimitive } from '@/components/primitives/FormPrimitive';
import { TablePrimitive } from '@/components/primitives/TablePrimitive';
import { ChartPrimitive } from '@/components/primitives/ChartPrimitive';
import type { ProjectSpec } from '@/lib/scaffolder/types';
import type { DataRecord, TablePrimitiveConfig, ChartPrimitiveConfig } from '@/lib/primitives/types';
import { cn } from '@/lib/utils';

interface AppRuntimeProps {
  appId: string;
  name: string;
  description: string;
  spec: ProjectSpec;
  initialData: DataRecord[];
}

type ViewMode = 'table' | 'chart' | 'both';

export function AppRuntime({ appId, name, description, spec, initialData }: AppRuntimeProps) {
  const [data, setData] = useState<DataRecord[]>(initialData);
  const [isLoading, setIsLoading] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('both');

  const handleAddRecord = useCallback(async (values: Record<string, unknown>) => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/apps/${appId}/data`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      });

      if (response.ok) {
        const { record } = await response.json();
        setData(prev => [...prev, record]);
      }
    } catch (error) {
      console.error('Failed to add record:', error);
    } finally {
      setIsLoading(false);
    }
  }, [appId]);

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

  // Find table and chart views from spec
  const tableView = spec.views.find(v => v.type === 'table');
  const chartView = spec.views.find(v => v.type === 'chart');

  const tableConfig: TablePrimitiveConfig = tableView?.config as TablePrimitiveConfig || {
    columns: spec.dataStore.fields.map(f => ({
      field: f.name,
      label: f.label,
      sortable: true,
      filterable: f.type === 'select',
    })),
    defaultSort: { field: 'createdAt', direction: 'desc' },
  };

  const chartConfig: ChartPrimitiveConfig = chartView?.config as ChartPrimitiveConfig || {
    chartType: 'bar',
    xAxis: spec.dataStore.fields.find(f => f.type === 'date')?.name || spec.dataStore.fields[0]?.name || 'date',
    yAxis: spec.dataStore.fields.find(f => f.type === 'number')?.name || 'value',
    groupBy: spec.dataStore.fields.find(f => f.type === 'select')?.name,
    aggregation: 'sum',
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-surface-50 via-surface-100 to-primary-50">
      {/* Background effects */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-primary-200/30 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-accent-200/20 rounded-full blur-3xl" />
      </div>

      {/* Header */}
      <header className="relative z-10 border-b border-surface-200 bg-white/80 backdrop-blur-lg">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link
                href="/dashboard"
                className="p-2 hover:bg-surface-100 rounded-lg transition-colors"
              >
                <ArrowLeft className="w-5 h-5 text-surface-600" />
              </Link>
              <div>
                <h1 className="text-xl font-bold font-display text-surface-900">{name}</h1>
                <p className="text-sm text-surface-500">{description}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {/* View mode toggle */}
              <div className="flex items-center bg-surface-100 rounded-lg p-1">
                <button
                  onClick={() => setViewMode('table')}
                  className={cn(
                    "p-2 rounded-md transition-colors",
                    viewMode === 'table' ? "bg-white shadow-sm" : "hover:bg-surface-200"
                  )}
                  title="Table View"
                >
                  <Table2 className="w-4 h-4 text-surface-600" />
                </button>
                <button
                  onClick={() => setViewMode('chart')}
                  className={cn(
                    "p-2 rounded-md transition-colors",
                    viewMode === 'chart' ? "bg-white shadow-sm" : "hover:bg-surface-200"
                  )}
                  title="Chart View"
                >
                  <BarChart3 className="w-4 h-4 text-surface-600" />
                </button>
                <button
                  onClick={() => setViewMode('both')}
                  className={cn(
                    "p-2 rounded-md transition-colors",
                    viewMode === 'both' ? "bg-white shadow-sm" : "hover:bg-surface-200"
                  )}
                  title="Both Views"
                >
                  <LayoutGrid className="w-4 h-4 text-surface-600" />
                </button>
              </div>
              <button className="p-2 hover:bg-surface-100 rounded-lg transition-colors">
                <Settings className="w-5 h-5 text-surface-600" />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="relative z-10 max-w-7xl mx-auto px-6 py-8">
        {/* Add entry form */}
        <div className="mb-8">
          <FormPrimitive
            fields={spec.dataStore.fields}
            submitLabel="Add Entry"
            onSubmit={handleAddRecord}
            isLoading={isLoading}
          />
        </div>

        {/* Views */}
        <div className={cn(
          "grid gap-6",
          viewMode === 'both' ? "lg:grid-cols-2" : "grid-cols-1"
        )}>
          {/* Table view */}
          {(viewMode === 'table' || viewMode === 'both') && (
            <div className={viewMode === 'both' ? "" : "lg:col-span-2"}>
              <TablePrimitive
                data={data}
                config={tableConfig}
                onDelete={spec.features.allowDelete ? handleDeleteRecord : undefined}
              />
            </div>
          )}

          {/* Chart view */}
          {(viewMode === 'chart' || viewMode === 'both') && chartView && (
            <div className={viewMode === 'both' ? "" : "lg:col-span-2"}>
              <ChartPrimitive
                data={data}
                config={chartConfig}
                title={chartView.title}
              />
            </div>
          )}
        </div>

        {/* Empty state */}
        {data.length === 0 && (
          <div className="text-center py-16">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-surface-100 flex items-center justify-center">
              <LayoutGrid className="w-8 h-8 text-surface-400" />
            </div>
            <h3 className="text-lg font-medium text-surface-700 mb-2">No entries yet</h3>
            <p className="text-surface-500">Add your first entry using the form above.</p>
          </div>
        )}
      </main>
    </div>
  );
}
