/**
 * Scaffolder V2 - Dynamic AI Pipeline
 * Main entry point for the v2 scaffolding system
 * 
 * Features:
 * - Adaptive architect with parallel agent execution
 * - Multi-proposal system with visual mockups
 * - Smart defaults and proactive suggestions
 * - Context-aware intent engine with reference understanding
 * - Workflow and automation detection
 */

// Types
export * from './types';

// Agents
export { 
  architectAgent, 
  ArchitectAgent,
  adaptiveArchitect,
  AdaptiveArchitect,
  intentEngine,
  IntentEngine,
  workflowAgent,
  WorkflowAgent,
  schemaDesignerAgent,
  SchemaDesignerAgent,
  uiDesignerAgent,
  UIDesignerAgent,
  codeGeneratorAgent,
  CodeGeneratorAgent,
} from './agents';

// Feature flags
export { 
  shouldUseV2, 
  getFeatureFlags, 
  SCAFFOLDER_VERSION,
  isFeatureEnabled,
  isUserInRollout,
} from './feature-flags';

// State management
export { 
  createConversationState,
  createDynamicConversationState,
  ensureDynamicState,
  updateConversationState,
  addMessageToState,
  transitionPhase,
  addRefinementEntry,
  updateReadiness,
  setEnhancedIntent,
  addWorkflow,
  updateWorkflows,
  setSuggestions,
  createCheckpoint,
  restoreCheckpoint,
  isReadyToBuild,
  getPhaseFromReadiness,
  serializeState,
  serializeDynamicState,
  deserializeState,
  deserializeDynamicState,
} from './state';

// Layout system
export * from './layout';

// Preview system
export * from './preview';

// Proposal system
export { proposalEngine, ProposalEngine } from './proposals';

// Mockup system
export { mockupGenerator, MockupGenerator } from './mockup';

// Error handling and feedback loop
export { 
  FeedbackLoop,
  type FeedbackSession,
  type FeedbackIteration,
  type TokenUsageStats,
} from './feedback-loop';

export { 
  ErrorAnalyzer,
  type AnalyzedError,
  type ErrorCategory,
} from './error-analyzer';

export {
  ErrorDetectionService,
  errorDetectionService,
  type DetectedError,
  type ErrorDetectionResult,
  type RuntimeErrorData,
} from './error-detection-service';

export {
  SmartContextExtractor,
  smartContextExtractor,
  type SmartContext,
} from './smart-context-extractor';

export {
  IncrementalFixGenerator,
  incrementalFixGenerator,
  type FixResult,
  type FixHistoryEntry,
} from './incremental-fix-generator';

export {
  FEEDBACK_CONFIG,
  getRetryStrategy,
  getContextWindowSize,
  shouldRetry,
  type ErrorStage,
  type RetryStrategy,
  type FeedbackConfig,
} from './feedback-config';
