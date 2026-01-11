/**
 * Type definitions for the validation system
 */

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

export interface DetailedValidationResult extends ValidationResult {
  fieldResults: Map<string, ValidationResult>;
  viewResults: Map<string, ValidationResult>;
  crossValidationResults: ValidationResult;
}

export interface FieldDefinition {
  name: string;
  label: string;
  type: 'text' | 'number' | 'date' | 'select' | 'textarea' | 'checkbox' | 'email' | 'url' | 'time';
  required?: boolean;
  placeholder?: string;
  defaultValue?: string | number | boolean;
  options?: string[];
  validation?: FieldValidationRules;
}

export interface FieldValidationRules {
  min?: number;
  max?: number;
  minLength?: number;
  maxLength?: number;
  pattern?: string;
  patternMessage?: string;
}

export interface ViewDefinition {
  type: 'table' | 'chart' | 'cards';
  title: string;
  config: TableConfig | ChartConfig | CardsConfig;
}

export interface TableConfig {
  columns?: string[];
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  pageSize?: number;
}

export interface ChartConfig {
  chartType: 'bar' | 'line' | 'pie' | 'area';
  xAxis?: string;
  yAxis: string;
  groupBy?: string;
  aggregation?: 'sum' | 'average' | 'count';
}

export interface CardsConfig {
  titleField: string;
  subtitleField?: string;
  layout?: 'grid' | 'list';
}

export interface DataStoreDefinition {
  name: string;
  label: string;
  fields: FieldDefinition[];
}

export interface ProjectSpec {
  name: string;
  description: string;
  category?: string;
  dataStore: DataStoreDefinition;
  views: ViewDefinition[];
  features?: {
    allowEdit?: boolean;
    allowDelete?: boolean;
    allowExport?: boolean;
  };
}

export type ValidatorFunction<T> = (value: T) => ValidationResult;
