// Types for the Conversational Scaffolder

export type ConversationPhase = 'parse' | 'probe' | 'picture' | 'plan' | 'complete';

export interface QuestionOption {
  id: string;
  label: string;
  description?: string;
}

export interface QuestionNode {
  id: string;
  question: string;
  type: 'single' | 'multiple' | 'text';
  category: 'data' | 'logic' | 'ui' | 'integration';
  options: QuestionOption[];
  priority: number; // 1-5, higher = more important
  dependencies?: QuestionDependency[];
  skipConditions?: SkipCondition[];
  defaultAnswer?: string | string[];
}

export interface QuestionDependency {
  questionId: string;
  requiredAnswer?: string | string[];
  condition: 'equals' | 'contains' | 'not_equals' | 'exists';
}

export interface SkipCondition {
  questionId: string;
  answer: string | string[];
  condition: 'if_equals' | 'if_contains' | 'if_not_equals';
}

// Alias for backwards compatibility
export type Question = QuestionNode;

/**
 * Component plan describing a single UI component
 */
export interface ComponentPlan {
  name: string;
  type: string;
  description: string;
  props?: Record<string, string>;
}

/**
 * Implementation plan structure for app building
 */
export interface ImplementationPlan {
  overview: string;
  architecture: {
    primitives: string[];
    dataFlow: string;
  };
  components: {
    form: ComponentPlan;
    views: ComponentPlan[];
  };
  steps: string[];
  estimatedComplexity: 'simple' | 'moderate' | 'complex';
}

export interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  metadata?: {
    phase?: ConversationPhase;
    questionType?: string;
    options?: QuestionOption[];
    plan?: ImplementationPlan;
  };
}

export interface ParsedIntent {
  category: TrackerCategory;
  entities: string[];
  actions: string[];
  relationships: string[];
  suggestedName: string;
  confidence: number;
  originalPrompt?: string; // Store original user request for better descriptions
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
  columns?: string[];
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  pageSize?: number;
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
  layout?: 'grid' | 'list';
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
  plan?: ImplementationPlan;
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
