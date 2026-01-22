/**
 * Scaffolder V2 Types
 * Core type definitions for the dynamic AI pipeline
 */

// ============================================================================
// Schema Types
// ============================================================================

export type FieldType = 
  | 'string' 
  | 'text' 
  | 'number' 
  | 'boolean' 
  | 'date' 
  | 'datetime' 
  | 'enum' 
  | 'array' 
  | 'json';

export interface FieldValidation {
  min?: number;
  max?: number;
  minLength?: number;
  maxLength?: number;
  pattern?: string;
  message?: string;
}

export interface FieldDefinition {
  name: string;
  label: string;
  type: FieldType;
  required: boolean;
  nullable?: boolean;
  unique?: boolean;
  searchable?: boolean;
  generated?: boolean;
  primaryKey?: boolean;
  defaultValue?: unknown;
  options?: string[]; // For enum type
  validation?: FieldValidation;
  placeholder?: string;
  description?: string;
}

export interface ComputedField {
  name: string;
  label: string;
  type: FieldType;
  formula: string;
  description?: string;
}

export interface Relationship {
  type: 'belongsTo' | 'hasMany' | 'hasOne' | 'manyToMany';
  target: string;
  foreignKey?: string;
  through?: string; // For manyToMany
}

export interface Schema {
  name: string;
  label: string;
  description?: string;
  fields: FieldDefinition[];
  computedFields?: ComputedField[];
  relationships?: Relationship[];
  indexes?: string[][];
}

export interface SchemaProposal {
  schemas: Schema[];
  reasoning: string;
  suggestedName: string;
  domain: string;
}

// ============================================================================
// Layout Types
// ============================================================================

export type ComponentType = 
  | 'form' 
  | 'table' 
  | 'chart' 
  | 'cards' 
  | 'kanban' 
  | 'calendar' 
  | 'stats' 
  | 'filters'
  | 'custom';

export type ContainerDirection = 'row' | 'column' | 'grid';

export type ResponsiveBehavior = 'stack' | 'scroll' | 'tabs' | 'grid' | 'side-by-side' | 'collapse';

export interface ResponsiveConfig {
  mobile: ResponsiveBehavior;
  tablet: ResponsiveBehavior;
  desktop: ResponsiveBehavior;
}

export interface SizingConfig {
  basis: string;
  grow: number;
  shrink: number;
  minWidth?: string;
  maxWidth?: string;
}

export interface ComponentPosition {
  sticky?: boolean;
  order?: number;
}

export interface ComponentConfig {
  type: ComponentType;
  variant?: string;
  props: Record<string, unknown>;
  position?: ComponentPosition;
}

export interface ContainerConfig {
  direction: ContainerDirection;
  children: LayoutNode[];
  responsive?: ResponsiveConfig;
  gap?: string;
  padding?: string;
}

export interface LayoutNode {
  id: string;
  type: 'container' | 'component';
  container?: ContainerConfig;
  component?: ComponentConfig;
  sizing?: SizingConfig;
  className?: string;
}

export interface LayoutProposal {
  layout: LayoutNode;
  reasoning: string;
  responsiveNotes: string;
}

// ============================================================================
// Conversation Types
// ============================================================================

export type ConversationPhase = 'intent' | 'schema' | 'ui' | 'code' | 'refinement' | 'preview' | 'complete';

export type AgentType = 'architect' | 'schema' | 'ui' | 'code' | 'workflow' | 'intent';

export type IntentType = 
  | 'INITIAL_REQUEST'
  | 'REFINEMENT'
  | 'APPROVAL'
  | 'QUESTION'
  | 'NEW_REQUIREMENT'
  | 'UNDO'
  | 'FINALIZE';

export interface ParsedIntent {
  type: IntentType;
  subject?: 'schema' | 'ui' | 'code' | 'general';
  content: string;
  confidence: number;
  extractedEntities?: string[];
  extractedActions?: string[];
}

export interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  agentType?: AgentType;
  metadata?: {
    phase?: ConversationPhase;
    schemaProposal?: SchemaProposal;
    layoutProposal?: LayoutProposal;
    componentName?: string;
    refinementTarget?: string;
  };
}

export interface RefinementEntry {
  id: string;
  timestamp: Date;
  phase: ConversationPhase;
  userFeedback: string;
  agentResponse: string;
  changes: ChangeLog[];
}

export interface ChangeLog {
  type: 'add' | 'modify' | 'remove';
  target: 'field' | 'schema' | 'component' | 'layout';
  path: string;
  before?: unknown;
  after?: unknown;
}

export interface ConversationState {
  id: string;
  version: 'v2';
  phase: ConversationPhase;
  
  // Conversation history
  messages: Message[];
  
  // Design artifacts
  intent?: {
    domain: string;
    description: string;
    userGoals: string[];
    entities: string[];
  };
  schemas: Schema[];
  layout?: LayoutNode;
  
  // Generated code
  generatedCode: Record<string, string>;
  componentSpecs: ComponentSpec[];
  
  // Refinement tracking
  refinementHistory: RefinementEntry[];
  
  // Metadata
  suggestedAppName?: string;
  createdAt: Date;
  updatedAt: Date;
}

// ============================================================================
// Agent Types
// ============================================================================

export interface AgentAction {
  agent: AgentType;
  action: 'propose' | 'refine' | 'clarify' | 'extend' | 'generate' | 'finalize';
  target?: string;
  context?: Record<string, unknown>;
}

export interface ArchitectDecision {
  nextAction: AgentAction;
  reasoning: string;
  phaseTransition?: ConversationPhase;
  userMessage?: string;
}

export interface AgentResponse {
  success: boolean;
  message: string;
  data?: unknown;
  requiresUserInput?: boolean;
  suggestedActions?: string[];
}

// ============================================================================
// Component Generation Types
// ============================================================================

export interface ComponentSpec {
  id: string;
  name: string;
  type: ComponentType;
  variant?: string;
  schemaRef: string; // Reference to schema name
  props: Record<string, unknown>;
  customizations?: string[];
}

export interface GeneratedComponent {
  name: string;
  filename: string;
  code: string;
  types?: string;
  tests?: string;
}

export interface GeneratedApp {
  types: string;
  validators: string;
  apiClient: string;
  hooks: string;
  components: Record<string, string>;
  page: string;
  routes: Record<string, string>;
}

export interface ComponentGenerationEvent {
  type: 'types' | 'component' | 'page' | 'route' | 'complete' | 'error';
  name?: string;
  code?: string;
  progress: number;
  refined?: boolean;
  error?: string;
}

// ============================================================================
// API Types
// ============================================================================

export interface V2ChatRequest {
  conversationId?: string;
  message: string;
  action?: 'chat' | 'finalize' | 'undo' | 'select_proposal' | 'fix_component' | 'resolve_feedback';
  componentCode?: string;
  errorLog?: string;
}

export interface V2ChatResponse {
  conversationId: string;
  messages: Message[];
  state: Partial<ConversationState>;
  requiresUserInput: boolean;
  suggestedActions?: string[];
}

export interface V2FinalizeResponse {
  success: boolean;
  appId: string;
  appUrl: string;
  generatedCode: GeneratedApp;
}

// ============================================================================
// Feature Flag Types
// ============================================================================

export interface FeatureFlags {
  scaffolderV2Enabled: boolean;
  livePreviewEnabled: boolean;
  multiEntityEnabled: boolean;
  advancedLayoutsEnabled: boolean;
}

// ============================================================================
// Dynamic Pipeline Types (Enhanced for parallel execution)
// ============================================================================

/**
 * Readiness scores replace fixed phases - each aspect has a 0-100 score
 */
export interface ReadinessScores {
  schema: number;      // 0-100: How complete is the schema design?
  ui: number;          // 0-100: How complete is the UI design?
  workflow: number;    // 0-100: How complete are workflows/automations?
  overall: number;     // 0-100: Overall readiness to build
}

/**
 * App category detection for smarter defaults
 */
export type AppCategory = 
  | 'tracker'      // Task/habit/expense trackers
  | 'crm'          // Customer/contact management
  | 'dashboard'    // Analytics/monitoring dashboards
  | 'workflow'     // Process/approval workflows
  | 'content'      // CMS/blog/documentation
  | 'inventory'    // Stock/asset management
  | 'social'       // Social/community features
  | 'generic';     // General CRUD app

/**
 * Enhanced intent with deep understanding
 */
export interface EnhancedIntent {
  // Core understanding
  primaryGoal: string;
  appCategory: AppCategory;
  complexityScore: number; // 1-10
  
  // Entity detection
  entities: {
    name: string;
    role: 'primary' | 'secondary';
    fields: string[];
    relationships: string[];
  }[];
  
  // Reference app matching ("like Trello")
  referenceApps: {
    name: string;
    aspects: string[]; // e.g., ["kanban_layout", "drag_drop"]
    confidence: number;
  }[];
  
  // Workflow/automation detection
  workflows: {
    trigger: string;
    action: string;
    description: string;
  }[];
  
  // Layout preferences
  layoutHints: {
    structure: 'dashboard' | 'sidebar' | 'kanban' | 'simple' | 'split';
    components: ComponentType[];
    emphasis: 'data-entry' | 'visualization' | 'workflow' | 'balanced';
  };
  
  // Proactive suggestions
  suggestedEnhancements: string[];
}

/**
 * Parallel action for multi-agent execution
 */
export interface ParallelAction {
  id: string;
  agent: AgentType | 'workflow' | 'intent';
  action: string;
  priority: number; // 1-10, higher = more urgent
  dependsOn?: string[]; // IDs of actions this depends on
  context?: Record<string, unknown>;
  estimatedMs?: number;
}

/**
 * Enhanced orchestration decision with parallel support
 */
export interface EnhancedArchitectDecision {
  // Parallel actions to execute simultaneously
  parallelActions: ParallelAction[];
  
  // Dependencies between actions
  dependencies: Record<string, string[]>;
  
  // Overall reasoning
  reasoning: string;
  
  // Should we show proposals to user?
  generateProposals: boolean;
  
  // User message to display
  userMessage?: string;
  
  // Updated readiness after this action
  expectedReadiness: Partial<ReadinessScores>;
  
  // Estimated time for all actions
  estimatedTimeMs: number;
}

/**
 * Single design proposal
 */
export interface DesignProposal {
  id: string;
  name: string; // e.g., "Minimalist", "Dashboard-focused", "Kanban"
  description: string;
  
  // Design artifacts
  schema: Schema[];
  layout: LayoutNode;
  workflows?: WorkflowDefinition[];
  
  // Visual mockup (SVG or description)
  mockup?: MockupData;
  
  // Trade-offs
  tradeoffs: {
    pros: string[];
    cons: string[];
  };
  
  // Best use case
  bestFor: string;
  
  // LLM confidence in this proposal
  confidence: number;
  
  // Is this the recommended option?
  recommended: boolean;
}

/**
 * Set of proposals for user to choose from
 */
export interface ProposalSet {
  proposals: DesignProposal[];
  reasoning: string;
  recommendedIndex: number;
  
  // Context that led to these proposals
  basedOnIntent: EnhancedIntent;
}

/**
 * Mockup data for visual previews
 */
export interface MockupData {
  type: 'svg' | 'ascii' | 'description';
  content: string;
  annotations?: {
    component: string;
    description: string;
    position?: { x: number; y: number };
  }[];
  interactions?: {
    trigger: string;
    effect: string;
  }[];
}

/**
 * Workflow/automation definition
 */
export interface WorkflowDefinition {
  id: string;
  name: string;
  description: string;
  
  // Trigger conditions
  trigger: {
    type: 'field_change' | 'time_based' | 'record_create' | 'record_delete' | 'manual';
    field?: string;
    condition?: string;
    schedule?: string; // For time-based
  };
  
  // Actions to perform
  actions: {
    type: 'update_field' | 'create_record' | 'delete_record' | 'send_notification' | 'compute';
    target: string;
    value?: unknown;
    formula?: string; // For compute
  }[];
  
  // Is this enabled?
  enabled: boolean;
}

/**
 * Proactive suggestion for enhancements
 */
export interface ProactiveSuggestion {
  id: string;
  feature: string;
  reasoning: string;
  confidence: number;
  
  // What would change if accepted
  implementation: {
    schemaChanges?: Partial<Schema>[];
    layoutChanges?: Partial<LayoutNode>;
    workflowChanges?: WorkflowDefinition[];
    effort: 'trivial' | 'easy' | 'moderate';
  };
  
  // Display info
  icon?: string;
  category: 'data' | 'visualization' | 'workflow' | 'ux';
}

import { AnalyzedError } from './error-analyzer';

export interface FeedbackIteration {
  iteration: number;
  code: string;
  errorLog: string;
  analysis: AnalyzedError;
  timestamp: Date;
}

export interface FeedbackSession {
  id: string;
  originalPrompt: string;
  iterations: FeedbackIteration[];
  maxIterations: number;
  status: 'active' | 'resolved' | 'failed';
}

/**
 * Enhanced conversation state with dynamic pipeline
 */
export interface DynamicConversationState extends ConversationState {
  // Replace phase with readiness scores
  readiness: ReadinessScores;
  
  // Enhanced intent understanding
  enhancedIntent?: EnhancedIntent;
  
  // Current proposals (if showing options to user)
  currentProposals?: ProposalSet;
  selectedProposalId?: string;
  
  // Workflows/automations
  workflows: WorkflowDefinition[];
  
  // Proactive suggestions
  suggestions: ProactiveSuggestion[];
  
  // Smart checkpoints for undo
  checkpoints: StateCheckpoint[];

  // Feedback loop session
  feedbackSession?: FeedbackSession;
}

/**
 * State checkpoint for smart undo
 */
export interface StateCheckpoint {
  id: string;
  timestamp: Date;
  label: string;
  readiness: ReadinessScores;
  schemas: Schema[];
  layout?: LayoutNode;
  workflows: WorkflowDefinition[];
}

/**
 * Result from parallel agent execution
 */
export interface ParallelExecutionResult {
  actionId: string;
  agent: string;
  success: boolean;
  result?: AgentResponse;
  error?: string;
  durationMs: number;
}

/**
 * Merged result from all parallel executions
 */
export interface MergedAgentResult {
  // Combined state updates
  schemaUpdates?: Schema[];
  layoutUpdate?: LayoutNode;
  workflowUpdates?: WorkflowDefinition[];
  
  // Combined message for user
  userMessage: string;
  
  // Updated readiness scores
  readiness: ReadinessScores;
  
  // Any proposals to show
  proposals?: ProposalSet;
  
  // Suggestions for user
  suggestions: ProactiveSuggestion[];
  
  // Individual results for debugging
  individualResults: ParallelExecutionResult[];
}
