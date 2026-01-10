import type { ProjectSpec, FieldDefinition, ViewConfig } from '@/lib/scaffolder/types';
import type { AppConfig, PrimitiveConfig } from '@/lib/scaffolder/compiler';

export interface GeneratedAppConfig {
  id: string;
  name: string;
  description: string;
  schema: FieldDefinition[];
  views: GeneratedView[];
  features: {
    allowEdit: boolean;
    allowDelete: boolean;
    allowExport: boolean;
  };
}

export interface GeneratedView {
  id: string;
  type: 'table' | 'chart' | 'cards';
  title: string;
  config: Record<string, unknown>;
}

// Convert a ProjectSpec into a runtime configuration
export function generateRuntimeConfig(spec: ProjectSpec): GeneratedAppConfig {
  return {
    id: generateId(),
    name: spec.name,
    description: spec.description,
    schema: spec.dataStore.fields,
    views: spec.views.map((view, index) => ({
      id: `view_${index}`,
      type: view.type,
      title: view.title,
      config: view.config as unknown as Record<string, unknown>,
    })),
    features: spec.features,
  };
}

// Convert stored app config to runtime format
export function appConfigToRuntimeConfig(config: AppConfig): GeneratedAppConfig {
  const schema = config.primitives
    .filter(p => p.type === 'data-store')
    .flatMap(p => (p.config.schema as FieldDefinition[]) || []);

  const views = config.primitives
    .filter(p => p.type === 'view-layer')
    .map(p => ({
      id: p.id,
      type: p.config.viewType as 'table' | 'chart' | 'cards',
      title: (p.config.title as string) || 'View',
      config: p.config,
    }));

  return {
    id: config.id,
    name: config.name,
    description: config.description,
    schema,
    views,
    features: config.spec.features,
  };
}

// Generate column configuration for a table view
export function generateTableColumns(fields: FieldDefinition[]) {
  return fields.map(field => ({
    field: field.name,
    label: field.label,
    sortable: true,
    filterable: field.type === 'select',
  }));
}

// Generate chart configuration
export function generateChartConfig(
  fields: FieldDefinition[],
  chartType: 'bar' | 'line' | 'pie' | 'area' = 'bar'
) {
  const numericField = fields.find(f => f.type === 'number');
  const dateField = fields.find(f => f.type === 'date');
  const categoryField = fields.find(f => f.type === 'select');

  return {
    chartType,
    xAxis: dateField?.name || categoryField?.name || fields[0]?.name || 'date',
    yAxis: numericField?.name || 'value',
    groupBy: categoryField?.name,
    aggregation: 'sum' as const,
  };
}

function generateId(): string {
  return Math.random().toString(36).substring(2, 15);
}

// Validate that a config has all required fields
export function validateConfig(config: GeneratedAppConfig): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!config.name) errors.push('App name is required');
  if (!config.schema || config.schema.length === 0) errors.push('At least one field is required');
  if (!config.views || config.views.length === 0) errors.push('At least one view is required');

  return { valid: errors.length === 0, errors };
}
