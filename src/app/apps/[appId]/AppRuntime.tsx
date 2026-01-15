'use client';

import { useState, useCallback } from 'react';
import Link from 'next/link';
import { ArrowLeft, Settings, LayoutGrid, Table2, BarChart3 } from 'lucide-react';
import { NavigationRail, Button, Card } from '@/components/ui';
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
  // #region agent log
  fetch('http://127.0.0.1:7243/ingest/abdc0eda-3bc5-4723-acde-13a524455249',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'AppRuntime.tsx:25',message:'AppRuntime component initialized',data:{appId,name,description,specKeys:Object.keys(spec),hasViews:'views' in spec,hasDataStore:'dataStore' in spec,hasLayout:'layout' in spec,specType:typeof spec,initialDataCount:initialData.length},sessionId:'debug-session',runId:'v2-runtime-fix',hypothesisId:'H1'})}).catch(()=>{});
  // #endregion

  const [data, setData] = useState<DataRecord[]>(initialData);
  const [isLoading, setIsLoading] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('both');

  // #region agent log
  fetch('http://127.0.0.1:7243/ingest/abdc0eda-3bc5-4723-acde-13a524455249',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'AppRuntime.tsx:30',message:'Checking for V2 vs V1 format',data:{isV2Format:spec.name && (spec as any).fields && !spec.views && !spec.dataStore,isV1Format:spec.views && spec.dataStore},sessionId:'debug-session',runId:'v2-runtime-fix',hypothesisId:'H1'})}).catch(()=>{});
  // #endregion

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

  // Check if this is V2 data (should not be handled by AppRuntime)
  if (spec.name && (spec as any).fields && !spec.views && !spec.dataStore) {
    return (
      <div className="h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-text-primary mb-4">V2 App Detected</h2>
          <p className="text-gray-400 mb-8">This app was created with the new V2 system but is being rendered with the old runtime.</p>
          <p className="text-sm text-gray-500">This should be handled by V2Runtime component.</p>
        </div>
      </div>
    );
  }

  // Find table and chart views from spec
  // #region agent log
  fetch('http://127.0.0.1:7243/ingest/abdc0eda-3bc5-4723-acde-13a524455249',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'AppRuntime.tsx:66',message:'About to access spec.views',data:{specViews:spec.views,specViewsType:typeof spec.views,specViewsLength:spec.views?.length},sessionId:'debug-session',runId:'v2-runtime-fix',hypothesisId:'H1'})}).catch(()=>{});
  // #endregion

  const tableView = spec.views?.find(v => v.type === 'table');
  const chartView = spec.views?.find(v => v.type === 'chart');

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
    <div className="h-screen bg-black flex">
      {/* Navigation Rail - Hidden on mobile, shown on desktop */}
      <div className="hidden md:block">
        <NavigationRail />
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <header className="border-b border-outline-mid bg-surface-base px-6 py-4">
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
              </div>
            </div>
            <div className="flex items-center gap-2">
              {/* View mode toggle */}
              <div className="flex items-center bg-surface-elevated rounded-lg p-1">
                <button
                  onClick={() => setViewMode('table')}
                  className={cn(
                    "p-2 rounded-md transition-colors",
                    viewMode === 'table' ? "bg-accent-yellow text-text-primary" : "text-text-secondary hover:text-text-primary"
                  )}
                  title="Table View"
                >
                  <Table2 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setViewMode('chart')}
                  className={cn(
                    "p-2 rounded-md transition-colors",
                    viewMode === 'chart' ? "bg-accent-yellow text-text-primary" : "text-text-secondary hover:text-text-primary"
                  )}
                  title="Chart View"
                >
                  <BarChart3 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setViewMode('both')}
                  className={cn(
                    "p-2 rounded-md transition-colors",
                    viewMode === 'both' ? "bg-accent-yellow text-text-primary" : "text-text-secondary hover:text-text-primary"
                  )}
                  title="Both Views"
                >
                  <LayoutGrid className="w-4 h-4" />
                </button>
              </div>
              <Button variant="ghost" size="sm">
                <Settings className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </header>

        {/* Main content */}
        <main className="flex-1 overflow-y-auto">
          <div className="max-w-7xl mx-auto p-6">
            {/* Add entry form */}
            <Card variant="outlined" padding="lg" className="mb-8">
              <FormPrimitive
                fields={spec.dataStore.fields}
                submitLabel="Add Entry"
                onSubmit={handleAddRecord}
                isLoading={isLoading}
              />
            </Card>

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
              <Card variant="outlined" padding="lg" className="text-center">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-surface-light flex items-center justify-center">
                  <LayoutGrid className="w-8 h-8 text-text-tertiary" />
                </div>
                <h3 className="text-lg font-medium text-text-primary mb-2">No entries yet</h3>
                <p className="text-text-secondary">Add your first entry using the form above.</p>
              </Card>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
