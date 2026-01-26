/**
 * V2 Agents Index
 * Export all agent implementations
 * 
 * Agent Naming Convention:
 * - Architect: Coordinates parallel agent execution, decision graphs, readiness tracking
 * - Coordinator: Generates data schemas from natural language
 * - Designer: Creates layouts and component arrangements
 * - Coder: Generates modular React components
 * - Advisor: Deep understanding with reference app detection
 * - Automator: Handles automations and state machines
 */

export { BaseAgent, type AgentConfig } from './base-agent';

// Legacy exports (for backward compatibility)
export { ArchitectAgent, architectAgent } from './architect';
export { AdaptiveArchitect, adaptiveArchitect } from './adaptive-architect';
export { IntentEngine, intentEngine } from './intent-engine';
export { WorkflowAgent, workflowAgent } from './workflow-agent';
export { SchemaDesignerAgent, schemaDesignerAgent } from './schema-designer';
export { UIDesignerAgent, uiDesignerAgent } from './ui-designer';
export { CodeGeneratorAgent, codeGeneratorAgent } from './code-generator';

// New named exports (preferred)
export { AdaptiveArchitect as Architect, adaptiveArchitect as architect } from './adaptive-architect';
export { SchemaDesignerAgent as Coordinator, schemaDesignerAgent as coordinator } from './schema-designer';
export { UIDesignerAgent as Designer, uiDesignerAgent as designer } from './ui-designer';
export { CodeGeneratorAgent as Coder, codeGeneratorAgent as coder } from './code-generator';
export { IntentEngine as Advisor, intentEngine as advisor } from './intent-engine';
export { WorkflowAgent as Automator, workflowAgent as automator } from './workflow-agent';

// Creative exploration agent
export { DesignExplorerAgent, designExplorerAgent } from './design-explorer';
export type { DesignConcept, ExplorationResult } from './design-explorer';

// ============================================================================
// Journey-First Architecture Agents (v3)
// These agents design user experiences, not database interfaces
// ============================================================================

export { JourneyArchitect, journeyArchitect } from './journey-architect';
export { UXDesignerV3, uxDesignerV3 } from './ux-designer-v3';
export { InteractionDesigner, interactionDesigner } from './interaction-designer';
export { ComponentArchitect, componentArchitect } from './component-architect';
export { DataArchitect, dataArchitect } from './data-architect';
export { ImplementationEngineer, implementationEngineer } from './implementation-engineer';
