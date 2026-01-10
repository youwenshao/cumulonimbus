import type { FieldDefinition } from '@/lib/scaffolder/types';

export interface DataRecord {
  id: string;
  createdAt: string;
  updatedAt: string;
  [key: string]: unknown;
}

export interface PrimitiveProps {
  appId: string;
  data: DataRecord[];
  config: Record<string, unknown>;
  onDataChange?: (data: DataRecord[]) => void;
}

export interface FormPrimitiveConfig {
  fields: FieldDefinition[];
  submitLabel?: string;
  onSubmit?: (values: Record<string, unknown>) => void;
}

export interface TablePrimitiveConfig {
  columns: {
    field: string;
    label: string;
    sortable?: boolean;
    filterable?: boolean;
  }[];
  defaultSort?: {
    field: string;
    direction: 'asc' | 'desc';
  };
}

export interface ChartPrimitiveConfig {
  chartType: 'line' | 'bar' | 'pie' | 'area';
  xAxis: string;
  yAxis: string;
  groupBy?: string;
  aggregation?: 'sum' | 'count' | 'average';
}
