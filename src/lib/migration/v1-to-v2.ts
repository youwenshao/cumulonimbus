/**
 * V1 to V2 Migration Utilities
 * Converts V1 conversations and apps to V2 format
 */

import type { App, Conversation } from '@prisma/client';
import type { 
  DynamicConversationState, 
  Schema, 
  LayoutNode, 
  FieldDefinition,
  ReadinessScores,
} from '@/lib/scaffolder-v2/types';
import { createDynamicConversationState } from '@/lib/scaffolder-v2/state';
import { generateId } from '@/lib/utils';

// ============================================================================
// Types
// ============================================================================

export interface MigrationResult {
  success: boolean;
  conversationId?: string;
  appId?: string;
  errors?: string[];
}

export interface MigrationStats {
  conversationsTotal: number;
  conversationsMigrated: number;
  conversationsFailed: number;
  appsTotal: number;
  appsMigrated: number;
  appsFailed: number;
  errors: string[];
}

// ============================================================================
// Conversation Migration
// ============================================================================

/**
 * Convert V1 conversation to V2 format
 */
export function migrateConversation(v1Conversation: Conversation): DynamicConversationState {
  // Extract V1 state (handle both null and object cases)
  // agentState is stored as JSON string in SQLite, parse it first
  let v1State: Record<string, unknown> = {};
  if (v1Conversation.agentState) {
    try {
      v1State = typeof v1Conversation.agentState === 'string' 
        ? JSON.parse(v1Conversation.agentState)
        : v1Conversation.agentState as Record<string, unknown>;
    } catch {
      v1State = {};
    }
  }
  
  // Create base V2 state
  const v2State = createDynamicConversationState();
  v2State.id = v1Conversation.id;
  
  // Migrate messages (stored as JSON string in SQLite)
  if (v1Conversation.messages) {
    try {
      const messages = typeof v1Conversation.messages === 'string'
        ? JSON.parse(v1Conversation.messages)
        : v1Conversation.messages;
      if (Array.isArray(messages)) {
        v2State.messages = messages as DynamicConversationState['messages'];
      }
    } catch {
      // Keep default empty messages
    }
  }
  
  // Convert V1 schemas to V2 format
  if (v1State.schemas && Array.isArray(v1State.schemas)) {
    v2State.schemas = convertV1SchemasToV2(v1State.schemas);
  } else if (v1State.spec && typeof v1State.spec === 'object') {
    // Handle case where spec is directly in state
    const spec = v1State.spec as Record<string, unknown>;
    if (spec.schema) {
      v2State.schemas = convertV1SchemasToV2([spec.schema]);
    }
  }
  
  // Convert V1 layout to V2 format
  if (v1State.layout) {
    v2State.layout = convertV1LayoutToV2(v1State.layout);
  }
  
  // Migrate suggested app name
  if (v1State.suggestedAppName && typeof v1State.suggestedAppName === 'string') {
    v2State.suggestedAppName = v1State.suggestedAppName;
  }
  
  // Migrate phase if exists
  if (v1State.phase && typeof v1State.phase === 'string') {
    v2State.phase = mapV1PhaseToV2(v1State.phase);
  }
  
  // Infer readiness from state
  v2State.readiness = inferReadiness(v2State);
  
  // Set phase based on readiness if not already set
  if (!v2State.phase || v2State.phase === 'intent') {
    v2State.phase = getPhaseFromReadiness(v2State.readiness);
  }
  
  return v2State;
}

// ============================================================================
// App Migration
// ============================================================================

/**
 * Convert V1 app to V2 format
 */
export function migrateApp(v1App: App): Partial<App> {
  // spec is stored as JSON string in SQLite, parse it first
  let v1Spec: Record<string, unknown> = {};
  if (v1App.spec) {
    try {
      v1Spec = typeof v1App.spec === 'string' 
        ? JSON.parse(v1App.spec)
        : v1App.spec as Record<string, unknown>;
    } catch {
      v1Spec = {};
    }
  }
  
  // Convert schema
  let v2Schema: Schema | null = null;
  if (v1Spec.schema) {
    const schemas = convertV1SchemasToV2([v1Spec.schema]);
    v2Schema = schemas.length > 0 ? schemas[0] : null;
  } else if (v1Spec.entity && typeof v1Spec.entity === 'string') {
    // Handle primitive-based apps
    v2Schema = createSchemaFromPrimitives(v1Spec);
  }
  
  // Convert layout
  let v2Layout: LayoutNode | null = null;
  if (v1Spec.layout) {
    v2Layout = convertV1LayoutToV2(v1Spec.layout);
  } else if (v1Spec.views && Array.isArray(v1Spec.views)) {
    // Generate layout from V1 views
    v2Layout = createLayoutFromViews(v1Spec.views);
  }
  
  return {
    version: 'v2',
    spec: {
      schema: v2Schema,
      layout: v2Layout,
      components: (v1Spec.components as Record<string, string>) || {},
    } as unknown as App['spec'],
  };
}

// ============================================================================
// Schema Conversion
// ============================================================================

/**
 * Convert V1 schemas to V2 Schema type
 */
function convertV1SchemasToV2(v1Schemas: unknown[]): Schema[] {
  return v1Schemas.map(v1Schema => {
    const schema = v1Schema as Record<string, unknown>;
    
    // Handle different V1 schema formats
    const name = (schema.name || schema.entity || 'item') as string;
    const label = (schema.label || formatLabel(name)) as string;
    
    // Convert fields
    let fields: FieldDefinition[] = [];
    if (schema.fields && Array.isArray(schema.fields)) {
      fields = schema.fields.map(convertV1FieldToV2);
    } else if (schema.attributes && Array.isArray(schema.attributes)) {
      // Handle older format with "attributes" instead of "fields"
      fields = schema.attributes.map(convertV1FieldToV2);
    }
    
    // Ensure required fields exist
    fields = ensureRequiredFields(fields);
    
    return {
      name: sanitizeName(name),
      label,
      description: (schema.description || '') as string,
      fields,
      computedFields: (schema.computedFields as Schema['computedFields']) || [],
      relationships: (schema.relationships as Schema['relationships']) || [],
    };
  });
}

/**
 * Convert a V1 field to V2 FieldDefinition
 */
function convertV1FieldToV2(v1Field: unknown): FieldDefinition {
  const field = v1Field as Record<string, unknown>;
  
  const name = (field.name || field.key || 'field') as string;
  const fieldType = mapV1FieldType(field.type as string | undefined);
  
  return {
    name: sanitizeName(name),
    label: (field.label || formatLabel(name)) as string,
    type: fieldType,
    required: field.required === true,
    nullable: field.nullable !== false && field.required !== true,
    unique: field.unique === true,
    searchable: field.searchable === true,
    generated: field.generated === true,
    primaryKey: field.primaryKey === true,
    options: Array.isArray(field.options) ? field.options : undefined,
    validation: field.validation as FieldDefinition['validation'],
    placeholder: field.placeholder as string | undefined,
    description: field.description as string | undefined,
  };
}

/**
 * Map V1 field types to V2 FieldType
 */
function mapV1FieldType(v1Type: string | undefined): FieldDefinition['type'] {
  if (!v1Type) return 'string';
  
  const typeMap: Record<string, FieldDefinition['type']> = {
    'string': 'string',
    'text': 'text',
    'number': 'number',
    'integer': 'number',
    'float': 'number',
    'decimal': 'number',
    'boolean': 'boolean',
    'bool': 'boolean',
    'date': 'date',
    'datetime': 'datetime',
    'timestamp': 'datetime',
    'enum': 'enum',
    'select': 'enum',
    'array': 'array',
    'list': 'array',
    'json': 'json',
    'object': 'json',
    'textarea': 'text',
  };
  
  return typeMap[v1Type.toLowerCase()] || 'string';
}

/**
 * Ensure required system fields exist
 */
function ensureRequiredFields(fields: FieldDefinition[]): FieldDefinition[] {
  const result = [...fields];
  
  // Ensure ID field
  if (!result.find(f => f.name === 'id')) {
    result.unshift({
      name: 'id',
      label: 'ID',
      type: 'string',
      required: true,
      generated: true,
      primaryKey: true,
    });
  }
  
  // Ensure createdAt field
  if (!result.find(f => f.name === 'createdAt')) {
    result.push({
      name: 'createdAt',
      label: 'Created At',
      type: 'datetime',
      required: true,
      generated: true,
    });
  }
  
  return result;
}

/**
 * Create schema from primitive-based V1 apps
 */
function createSchemaFromPrimitives(v1Spec: Record<string, unknown>): Schema {
  const entity = (v1Spec.entity || 'item') as string;
  const fields: FieldDefinition[] = [];
  
  // Extract fields from form view if available
  const views = v1Spec.views as Array<Record<string, unknown>> | undefined;
  if (views) {
    const formView = views.find(v => v.type === 'form');
    if (formView && formView.config && typeof formView.config === 'object') {
      const config = formView.config as Record<string, unknown>;
      if (config.fields && Array.isArray(config.fields)) {
        for (const f of config.fields) {
          fields.push(convertV1FieldToV2(f));
        }
      }
    }
  }
  
  return {
    name: sanitizeName(entity),
    label: formatLabel(entity),
    description: `Migrated from V1 ${entity} app`,
    fields: ensureRequiredFields(fields),
  };
}

// ============================================================================
// Layout Conversion
// ============================================================================

/**
 * Convert V1 layout to V2 LayoutNode format
 */
function convertV1LayoutToV2(v1Layout: unknown): LayoutNode {
  if (!v1Layout) {
    return createDefaultLayout();
  }
  
  const layout = v1Layout as Record<string, unknown>;
  
  // If already in V2 format, return with validation
  if (layout.type && (layout.container || layout.component)) {
    return validateLayoutNode(layout);
  }
  
  // Convert from simple layout format
  if (layout.structure && typeof layout.structure === 'string') {
    return createLayoutFromStructure(layout.structure, layout);
  }
  
  // Convert primitive-based layout to component-based
  return createDefaultLayout();
}

/**
 * Create layout from V1 views array
 */
function createLayoutFromViews(views: unknown[]): LayoutNode {
  const children: LayoutNode[] = [];
  
  for (const view of views) {
    const v = view as Record<string, unknown>;
    const type = v.type as string;
    
    switch (type) {
      case 'form':
        children.push({
          id: generateId(),
          type: 'component',
          component: { type: 'form', props: v.config || {} },
        });
        break;
      case 'table':
        children.push({
          id: generateId(),
          type: 'component',
          component: { type: 'table', props: v.config || {} },
        });
        break;
      case 'chart':
        children.push({
          id: generateId(),
          type: 'component',
          component: { type: 'chart', props: v.config || {} },
        });
        break;
    }
  }
  
  return {
    id: generateId(),
    type: 'container',
    container: {
      direction: 'column',
      gap: '1.5rem',
      padding: '1.5rem',
      children: children.length > 0 ? children : [
        {
          id: generateId(),
          type: 'component',
          component: { type: 'form', props: {} },
        },
        {
          id: generateId(),
          type: 'component',
          component: { type: 'table', props: {} },
        },
      ],
    },
  };
}

/**
 * Create layout from structure hint
 */
function createLayoutFromStructure(structure: string, config: Record<string, unknown>): LayoutNode {
  const components = (config.components || ['form', 'table']) as string[];
  
  switch (structure) {
    case 'dashboard':
      return createDashboardLayout(components);
    case 'sidebar':
      return createSidebarLayout(components);
    case 'kanban':
      return createKanbanLayout(components);
    case 'split':
      return createSplitLayout(components);
    default:
      return createSimpleLayout(components);
  }
}

function createDefaultLayout(): LayoutNode {
  return {
    id: generateId(),
    type: 'container',
    container: {
      direction: 'column',
      gap: '1.5rem',
      padding: '1.5rem',
      children: [
        {
          id: generateId(),
          type: 'component',
          component: { type: 'form', props: {} },
        },
        {
          id: generateId(),
          type: 'component',
          component: { type: 'table', props: {} },
        },
      ],
    },
  };
}

function createDashboardLayout(components: string[]): LayoutNode {
  const children: LayoutNode[] = [];
  
  if (components.includes('stats')) {
    children.push({
      id: generateId(),
      type: 'component',
      component: { type: 'stats', props: {} },
    });
  }
  
  if (components.includes('chart')) {
    children.push({
      id: generateId(),
      type: 'component',
      component: { type: 'chart', props: {} },
    });
  }
  
  children.push({
    id: generateId(),
    type: 'container',
    container: {
      direction: 'row',
      gap: '1.5rem',
      responsive: { mobile: 'stack', tablet: 'stack', desktop: 'side-by-side' },
      children: [
        {
          id: generateId(),
          type: 'component',
          component: { type: 'form', props: {} },
          sizing: { basis: '350px', grow: 0, shrink: 0 },
        },
        {
          id: generateId(),
          type: 'component',
          component: { type: 'table', props: {} },
          sizing: { basis: '1fr', grow: 1, shrink: 1 },
        },
      ],
    },
  });
  
  return {
    id: generateId(),
    type: 'container',
    container: {
      direction: 'column',
      gap: '1.5rem',
      padding: '1.5rem',
      children,
    },
  };
}

function createSidebarLayout(components: string[]): LayoutNode {
  return {
    id: generateId(),
    type: 'container',
    container: {
      direction: 'row',
      gap: '1.5rem',
      padding: '1.5rem',
      responsive: { mobile: 'stack', tablet: 'side-by-side', desktop: 'side-by-side' },
      children: [
        {
          id: generateId(),
          type: 'container',
          container: {
            direction: 'column',
            gap: '1rem',
            children: [
              {
                id: generateId(),
                type: 'component',
                component: { type: 'form', props: {} },
              },
            ],
          },
          sizing: { basis: '320px', grow: 0, shrink: 0 },
        },
        {
          id: generateId(),
          type: 'container',
          container: {
            direction: 'column',
            gap: '1rem',
            children: [
              {
                id: generateId(),
                type: 'component',
                component: { type: 'table', props: {} },
              },
            ],
          },
          sizing: { basis: '1fr', grow: 1, shrink: 1 },
        },
      ],
    },
  };
}

function createKanbanLayout(components: string[]): LayoutNode {
  return {
    id: generateId(),
    type: 'container',
    container: {
      direction: 'column',
      gap: '1rem',
      padding: '1.5rem',
      children: [
        {
          id: generateId(),
          type: 'component',
          component: { type: 'form', variant: 'inline', props: {} },
        },
        {
          id: generateId(),
          type: 'component',
          component: { type: 'kanban', props: {} },
        },
      ],
    },
  };
}

function createSplitLayout(components: string[]): LayoutNode {
  return {
    id: generateId(),
    type: 'container',
    container: {
      direction: 'row',
      gap: '1.5rem',
      padding: '1.5rem',
      responsive: { mobile: 'stack', tablet: 'side-by-side', desktop: 'side-by-side' },
      children: [
        {
          id: generateId(),
          type: 'component',
          component: { type: 'form', props: {} },
          sizing: { basis: '50%', grow: 1, shrink: 1 },
        },
        {
          id: generateId(),
          type: 'component',
          component: { type: 'table', props: {} },
          sizing: { basis: '50%', grow: 1, shrink: 1 },
        },
      ],
    },
  };
}

function createSimpleLayout(components: string[]): LayoutNode {
  const children: LayoutNode[] = components.map(comp => ({
    id: generateId(),
    type: 'component' as const,
    component: { type: comp as 'form' | 'table' | 'chart', props: {} },
  }));
  
  return {
    id: generateId(),
    type: 'container',
    container: {
      direction: 'column',
      gap: '1.5rem',
      padding: '1.5rem',
      children: children.length > 0 ? children : [
        {
          id: generateId(),
          type: 'component',
          component: { type: 'form', props: {} },
        },
        {
          id: generateId(),
          type: 'component',
          component: { type: 'table', props: {} },
        },
      ],
    },
  };
}

/**
 * Validate and fix a layout node
 */
function validateLayoutNode(node: Record<string, unknown>): LayoutNode {
  const result: LayoutNode = {
    id: (node.id as string) || generateId(),
    type: node.type as 'container' | 'component',
  };
  
  if (node.container && typeof node.container === 'object') {
    const container = node.container as Record<string, unknown>;
    type ContainerDirection = 'row' | 'column' | 'grid';
    type ResponsiveConfig = { mobile: string; tablet: string; desktop: string };
    result.container = {
      direction: (container.direction as ContainerDirection) || 'column',
      gap: (container.gap as string) || '1rem',
      padding: container.padding as string | undefined,
      responsive: container.responsive as ResponsiveConfig | undefined,
      children: Array.isArray(container.children) 
        ? container.children.map(c => validateLayoutNode(c as Record<string, unknown>))
        : [],
    };
  }
  
  if (node.component && typeof node.component === 'object') {
    const component = node.component as Record<string, unknown>;
    type ComponentType = 'form' | 'table' | 'chart' | 'cards' | 'kanban' | 'calendar' | 'stats' | 'filters' | 'custom';
    result.component = {
      type: (component.type as ComponentType) || 'table',
      variant: component.variant as string | undefined,
      props: (component.props as Record<string, unknown>) || {},
    };
  }
  
  if (node.sizing && typeof node.sizing === 'object') {
    result.sizing = node.sizing as LayoutNode['sizing'];
  }
  
  return result;
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Map V1 phase to V2 phase
 * V2 phases: 'intent' | 'schema' | 'ui' | 'code' | 'refinement' | 'preview' | 'complete'
 */
function mapV1PhaseToV2(v1Phase: string): DynamicConversationState['phase'] {
  const phaseMap: Record<string, DynamicConversationState['phase']> = {
    'parse': 'intent',
    'probe': 'schema',
    'picture': 'ui',
    'plan': 'code',
    'build': 'code',
    'complete': 'complete',
    'intent': 'intent',
    'schema': 'schema',
    'ui': 'ui',
    'code': 'code',
    'design': 'schema',
    'refine': 'refinement',
    'refinement': 'refinement',
    'finalize': 'preview',
    'preview': 'preview',
  };
  
  return phaseMap[v1Phase.toLowerCase()] || 'intent';
}

/**
 * Infer readiness from state
 */
function inferReadiness(state: DynamicConversationState): ReadinessScores {
  let schema = 0;
  let ui = 0;
  let workflow = 50; // Default workflow readiness (optional)
  
  // Calculate schema readiness
  if (state.schemas.length > 0) {
    const fieldCount = state.schemas[0].fields.filter(f => !f.generated).length;
    schema = Math.min(30 + (fieldCount * 15), 100);
    if (state.schemas[0].description) schema = Math.min(schema + 10, 100);
  }
  
  // Calculate UI readiness
  if (state.layout) {
    ui = 70; // Has layout
    // Count components for bonus
    const componentCount = countComponents(state.layout);
    if (componentCount >= 2) ui = 85;
    if (componentCount >= 4) ui = 100;
  }
  
  const overall = Math.round(schema * 0.4 + ui * 0.4 + workflow * 0.2);
  
  return { schema, ui, workflow, overall };
}

/**
 * Get phase from readiness scores
 * V2 phases: 'intent' | 'schema' | 'ui' | 'code' | 'refinement' | 'preview' | 'complete'
 */
function getPhaseFromReadiness(readiness: ReadinessScores): DynamicConversationState['phase'] {
  if (readiness.overall >= 80) return 'preview';
  if (readiness.overall >= 60) return 'code';
  if (readiness.overall >= 40) return 'ui';
  if (readiness.overall >= 20) return 'schema';
  return 'intent';
}

/**
 * Count components in layout tree
 */
function countComponents(node: LayoutNode): number {
  if (!node) return 0;
  
  if (node.type === 'component') return 1;
  
  if (node.type === 'container' && node.container?.children) {
    return node.container.children.reduce(
      (sum, child) => sum + countComponents(child),
      0
    );
  }
  
  return 0;
}

/**
 * Sanitize name for code generation
 */
function sanitizeName(name: string): string {
  return name
    .replace(/[^a-zA-Z0-9]/g, '')
    .replace(/^[0-9]/, '_$&');
}

/**
 * Format name as label (camelCase to Title Case)
 */
function formatLabel(name: string): string {
  return name
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, str => str.toUpperCase())
    .trim();
}

// ============================================================================
// Exports
// ============================================================================

export {
  convertV1SchemasToV2,
  convertV1LayoutToV2,
  inferReadiness,
  getPhaseFromReadiness,
};
