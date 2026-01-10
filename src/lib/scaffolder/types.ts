// Types for the Conversational Scaffolder

export type ConversationPhase = 'parse' | 'probe' | 'picture' | 'plan' | 'complete';

export interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  metadata?: {
    phase?: ConversationPhase;
    questionType?: string;
    options?: QuestionOption[];
  };
}

export interface QuestionOption {
  id: string;
  label: string;
  description?: string;
}

export interface ParsedIntent {
  category: TrackerCategory;
  entities: string[];
  actions: string[];
  relationships: string[];
  suggestedName: string;
  confidence: number;
}

export type TrackerCategory = 
  | 'expense'
  | 'habit'
  | 'project'
  | 'health'
  | 'learning'
  | 'inventory'
  | 'time'
  | 'custom';

export interface FieldDefinition {
  name: string;
  label: string;
  type: 'text' | 'number' | 'date' | 'boolean' | 'select' | 'textarea';
  required: boolean;
  options?: string[]; // For select type
  placeholder?: string;
  defaultValue?: string | number | boolean;
  validation?: {
    min?: number;
    max?: number;
    pattern?: string;
  };
}

export interface DataStoreConfig {
  name: string;
  label: string;
  fields: FieldDefinition[];
}

export interface ViewConfig {
  type: 'table' | 'chart' | 'cards';
  title: string;
  config: TableConfig | ChartConfig | CardsConfig;
}

export interface TableConfig {
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

export interface ChartConfig {
  chartType: 'line' | 'bar' | 'pie' | 'area';
  xAxis: string;
  yAxis: string;
  groupBy?: string;
  aggregation?: 'sum' | 'count' | 'average';
}

export interface CardsConfig {
  titleField: string;
  subtitleField?: string;
  bodyFields: string[];
}

export interface ProjectSpec {
  name: string;
  description: string;
  category: TrackerCategory;
  dataStore: DataStoreConfig;
  views: ViewConfig[];
  features: {
    allowEdit: boolean;
    allowDelete: boolean;
    allowExport: boolean;
  };
}

export interface BlueprintState {
  phase: ConversationPhase;
  intent?: ParsedIntent;
  questions: ProbeQuestion[];
  answers: Record<string, string | string[]>;
  spec?: Partial<ProjectSpec>;
}

export interface ProbeQuestion {
  id: string;
  question: string;
  type: 'single' | 'multiple' | 'text';
  category: 'data' | 'logic' | 'ui' | 'integration';
  options?: QuestionOption[];
  dependsOn?: string;
  answered: boolean;
}
