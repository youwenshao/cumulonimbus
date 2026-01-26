/**
 * Agent Result Consolidator
 * Merges results from Intent Engine, Schema Designer, UI Designer, and Workflow Agent
 * into a unified state for Code Generation
 */

import { generateId } from '@/lib/utils';
import type { 
  EnhancedIntent, 
  Schema, 
  LayoutNode, 
  WorkflowDefinition,
  ComputedField,
  FieldDefinition,
  SchemaProposal,
  LayoutProposal,
  ComponentType,
  AestheticSpec,
} from '@/lib/scaffolder-v2/types';
import type { FreeformState, GeneratedSpec } from './freeform-architect';

/**
 * Consolidated result from all agents
 */
export interface ConsolidatedAgentResult {
  /** The consolidated schema with computed fields merged in */
  schema: Schema;
  /** The validated layout that references valid schema fields */
  layout: LayoutNode;
  /** Aesthetic specifications for distinctive UI styling */
  aesthetics?: AestheticSpec;
  /** All detected workflows */
  workflows: WorkflowDefinition[];
  /** Computed fields from workflow agent */
  computedFields: ComputedField[];
  /** Metadata about the consolidation */
  metadata: {
    intent: EnhancedIntent;
    confidence: number;
    agentTimings: Record<string, number>;
    validationWarnings: string[];
  };
}

/**
 * Individual agent results before consolidation
 */
export interface AgentResults {
  intentResult?: EnhancedIntent;
  schemaResult?: SchemaProposal | { schemas: Schema[] };
  uiResult?: LayoutProposal | { layout: LayoutNode };
  workflowResult?: {
    workflows: WorkflowDefinition[];
    computedFields: ComputedField[];
  };
  timings: Record<string, number>;
}

/**
 * Consolidate results from all parallel agents into unified state
 */
export async function consolidateAgentResults(
  agentResults: AgentResults
): Promise<ConsolidatedAgentResult> {
  const warnings: string[] = [];
  
  // Extract schema (with fallback)
  let schema: Schema;
  if (agentResults.schemaResult) {
    const schemaData = 'schemas' in agentResults.schemaResult 
      ? agentResults.schemaResult.schemas[0]
      : agentResults.schemaResult.schemas[0];
    schema = schemaData || createFallbackSchema(agentResults.intentResult);
  } else {
    schema = createFallbackSchema(agentResults.intentResult);
    warnings.push('Using fallback schema - Schema Designer result not available');
  }
  
  // Merge computed fields from workflow agent into schema
  if (agentResults.workflowResult?.computedFields?.length) {
    schema = {
      ...schema,
      computedFields: [
        ...(schema.computedFields || []),
        ...agentResults.workflowResult.computedFields,
      ],
    };
  }
  
  // Extract layout (with fallback)
  let layout: LayoutNode;
  let aesthetics: AestheticSpec | undefined;
  
  if (agentResults.uiResult) {
    layout = 'layout' in agentResults.uiResult 
      ? agentResults.uiResult.layout 
      : agentResults.uiResult.layout;
    
    // Extract aesthetics from LayoutProposal if available
    if ('aesthetics' in agentResults.uiResult && agentResults.uiResult.aesthetics) {
      aesthetics = agentResults.uiResult.aesthetics;
      console.log(`[Consolidator] Extracted aesthetics: theme="${aesthetics.theme}"`);
    }
  } else {
    layout = createFallbackLayout(schema);
    warnings.push('Using fallback layout - UI Designer result not available');
  }
  
  // Validate layout against schema
  layout = validateLayoutAgainstSchema(layout, schema, warnings);
  
  // Extract workflows
  const workflows = agentResults.workflowResult?.workflows || [];
  const computedFields = agentResults.workflowResult?.computedFields || [];
  
  // Calculate confidence
  const confidence = calculateOverallConfidence(
    agentResults.intentResult,
    schema,
    layout,
    warnings.length
  );
  
  return {
    schema,
    layout,
    aesthetics,
    workflows,
    computedFields,
    metadata: {
      intent: agentResults.intentResult || createFallbackIntent(),
      confidence,
      agentTimings: agentResults.timings,
      validationWarnings: warnings,
    },
  };
}

/**
 * Create a fallback schema when Schema Designer fails
 */
function createFallbackSchema(intent?: EnhancedIntent): Schema {
  const rawName = intent?.entities[0]?.name || 'item';
  // Ensure PascalCase for schema name (used in TypeScript types and component names)
  const pascalName = toPascalCase(rawName);
  
  console.log(`[Consolidator] createFallbackSchema: rawName="${rawName}" -> pascalName="${pascalName}"`);
  
  const fields: FieldDefinition[] = [
    {
      name: 'id',
      label: 'ID',
      type: 'string',
      required: true,
      generated: true,
      primaryKey: true,
    },
    {
      name: 'name',
      label: 'Name',
      type: 'string',
      required: true,
      placeholder: `Enter ${name} name`,
    },
    {
      name: 'description',
      label: 'Description',
      type: 'text',
      required: false,
      placeholder: 'Add description',
    },
  ];
  
  // Add fields from intent if available
  if (intent?.entities[0]?.fields) {
    for (const fieldName of intent.entities[0].fields) {
      if (!fields.find(f => f.name.toLowerCase() === fieldName.toLowerCase())) {
        fields.push(inferFieldFromName(fieldName));
      }
    }
  }
  
  // Always add createdAt
  if (!fields.find(f => f.name === 'createdAt')) {
    fields.push({
      name: 'createdAt',
      label: 'Created At',
      type: 'datetime',
      required: true,
      generated: true,
    });
  }
  
  return {
    name: pascalName, // PascalCase for TypeScript types and component names
    label: pascalName, // Use PascalCase for label too
    description: intent?.primaryGoal || `Manage your ${rawName}s`,
    fields,
  };
}

/**
 * Infer field definition from field name
 */
function inferFieldFromName(fieldName: string): FieldDefinition {
  const cleanName = fieldName.replace(/[^a-zA-Z0-9]/g, '');
  const camelName = cleanName.charAt(0).toLowerCase() + cleanName.slice(1);
  const label = cleanName
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, str => str.toUpperCase())
    .trim();
  
  // Infer type from common patterns
  let type: FieldDefinition['type'] = 'string';
  let options: string[] | undefined;
  
  if (/status|state|phase/i.test(fieldName)) {
    type = 'enum';
    options = ['Active', 'Pending', 'Completed'];
  } else if (/priority|urgency/i.test(fieldName)) {
    type = 'enum';
    options = ['High', 'Medium', 'Low'];
  } else if (/^is[A-Z]|^has[A-Z]|completed|done|active/i.test(fieldName)) {
    type = 'boolean';
  } else if (/date|when|deadline|due|created|updated/i.test(fieldName)) {
    type = 'date';
  } else if (/amount|price|cost|value|total|count|quantity|number|score/i.test(fieldName)) {
    type = 'number';
  } else if (/description|notes|content|body|details/i.test(fieldName)) {
    type = 'text';
  } else if (/tags|labels|categories/i.test(fieldName)) {
    type = 'array';
  }
  
  return {
    name: camelName,
    label,
    type,
    required: type !== 'text',
    options,
    placeholder: `Enter ${label.toLowerCase()}`,
  };
}

/**
 * Create a fallback layout when UI Designer fails
 */
function createFallbackLayout(schema: Schema): LayoutNode {
  const fields = schema.fields.filter(f => !f.generated);
  
  return {
    id: generateId(),
    type: 'container',
    container: {
      direction: 'column',
      gap: '1.5rem',
      padding: '2rem',
      children: [
        // Form section
        {
          id: generateId(),
          type: 'component',
          component: {
            type: 'form',
            props: {
              schemaName: schema.name,
              fields: fields.map(f => f.name),
              submitLabel: 'Add Entry',
            },
          },
        },
        // Table section
        {
          id: generateId(),
          type: 'component',
          component: {
            type: 'table',
            props: {
              schemaName: schema.name,
              columns: fields.map(f => ({
                field: f.name,
                label: f.label,
                sortable: true,
              })),
              paginated: true,
              pageSize: 10,
            },
          },
        },
      ],
      responsive: {
        mobile: 'stack',
        tablet: 'stack',
        desktop: 'side-by-side',
      },
    },
  };
}

/**
 * Validate layout references valid schema fields
 * Returns validated layout with invalid references replaced by fallbacks
 */
function validateLayoutAgainstSchema(
  layout: LayoutNode,
  schema: Schema,
  warnings: string[]
): LayoutNode {
  const validFieldNames = new Set(schema.fields.map(f => f.name));
  
  function validateNode(node: LayoutNode): LayoutNode {
    if (node.type === 'component' && node.component) {
      const props = { ...node.component.props };
      
      // Validate fields array in form components
      if (props.fields && Array.isArray(props.fields)) {
        const validFields = (props.fields as string[]).filter(f => {
          if (!validFieldNames.has(f)) {
            warnings.push(`Layout references unknown field: ${f}`);
            return false;
          }
          return true;
        });
        
        // If no valid fields, use all non-generated fields
        if (validFields.length === 0) {
          props.fields = schema.fields.filter(f => !f.generated).map(f => f.name);
        } else {
          props.fields = validFields;
        }
      }
      
      // Validate columns in table components
      if (props.columns && Array.isArray(props.columns)) {
        props.columns = (props.columns as Array<{ field: string; label: string }>).filter(col => {
          if (!validFieldNames.has(col.field)) {
            warnings.push(`Table references unknown column: ${col.field}`);
            return false;
          }
          return true;
        });
        
        // If no valid columns, use all non-generated fields
        if ((props.columns as unknown[]).length === 0) {
          props.columns = schema.fields.filter(f => !f.generated).map(f => ({
            field: f.name,
            label: f.label,
            sortable: true,
          }));
        }
      }
      
      return {
        ...node,
        component: {
          ...node.component,
          props,
        },
      };
    }
    
    if (node.type === 'container' && node.container?.children) {
      return {
        ...node,
        container: {
          ...node.container,
          children: node.container.children.map(validateNode),
        },
      };
    }
    
    return node;
  }
  
  return validateNode(layout);
}

/**
 * Calculate overall confidence score
 */
function calculateOverallConfidence(
  intent: EnhancedIntent | undefined,
  schema: Schema,
  layout: LayoutNode,
  warningCount: number
): number {
  let confidence = 70; // Base confidence
  
  // Boost from intent
  if (intent) {
    confidence += Math.min(intent.complexityScore * 2, 15); // Up to +15
  }
  
  // Boost from schema quality
  const fieldCount = schema.fields.filter(f => !f.generated).length;
  if (fieldCount >= 3) confidence += 5;
  if (fieldCount >= 5) confidence += 5;
  
  // Boost from layout complexity
  if (layout.type === 'container' && layout.container?.children) {
    if (layout.container.children.length >= 2) confidence += 5;
    if (layout.container.children.length >= 3) confidence += 5;
  }
  
  // Penalty for warnings
  confidence -= Math.min(warningCount * 5, 20);
  
  return Math.max(0, Math.min(100, confidence));
}

/**
 * Create fallback intent when Intent Engine fails
 */
function createFallbackIntent(): EnhancedIntent {
  return {
    primaryGoal: 'Build a simple data management app',
    appCategory: 'generic',
    complexityScore: 3,
    entities: [{
      name: 'item',
      role: 'primary',
      fields: ['name', 'description'],
      relationships: [],
    }],
    referenceApps: [],
    workflows: [],
    layoutHints: {
      structure: 'simple',
      components: ['form', 'table'],
      emphasis: 'balanced',
    },
    suggestedEnhancements: [],
  };
}

/**
 * Convert consolidated result to GeneratedSpec format for backward compatibility
 */
export function toGeneratedSpec(result: ConsolidatedAgentResult): GeneratedSpec {
  return {
    name: result.schema.label,
    description: result.schema.description || result.metadata.intent.primaryGoal,
    entities: [{
      name: result.schema.name,
      fields: result.schema.fields
        .filter(f => !f.generated)
        .map(f => ({
          name: f.name,
          type: mapV2TypeToV1(f.type),
          required: f.required,
          enumValues: f.options,
        })),
    }],
    views: extractViewsFromLayout(result.layout, result.schema.name),
    category: result.metadata.intent.appCategory === 'generic' 
      ? 'Productivity' 
      : capitalize(result.metadata.intent.appCategory),
  };
}

/**
 * Map V2 field type to V1 type string
 */
function mapV2TypeToV1(type: string): string {
  const typeMap: Record<string, string> = {
    string: 'string',
    text: 'string',
    number: 'number',
    boolean: 'boolean',
    date: 'date',
    datetime: 'date',
    enum: 'enum',
    array: 'string',
    json: 'string',
  };
  return typeMap[type] || 'string';
}

/**
 * Extract views from layout for GeneratedSpec
 */
function extractViewsFromLayout(
  layout: LayoutNode,
  entityName: string
): Array<{ type: string; title: string; entityName: string }> {
  const views: Array<{ type: string; title: string; entityName: string }> = [];
  
  function extractFromNode(node: LayoutNode) {
    if (node.type === 'component' && node.component) {
      const type = node.component.type;
      if (['table', 'chart', 'cards', 'kanban', 'calendar', 'stats'].includes(type)) {
        views.push({
          type,
          title: `${capitalize(entityName)} ${capitalize(type)}`,
          entityName,
        });
      }
    }
    
    if (node.type === 'container' && node.container?.children) {
      node.container.children.forEach(extractFromNode);
    }
  }
  
  extractFromNode(layout);
  
  // Ensure at least a table view
  if (!views.find(v => v.type === 'table')) {
    views.push({
      type: 'table',
      title: `All ${capitalize(entityName)}s`,
      entityName,
    });
  }
  
  return views;
}

/**
 * Capitalize first letter
 */
function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

/**
 * Convert string to PascalCase
 * Examples:
 * - "habit" -> "Habit"
 * - "task-manager" -> "TaskManager"
 * - "expense_tracker" -> "ExpenseTracker"
 * - "my app" -> "MyApp"
 */
function toPascalCase(str: string): string {
  return str
    .replace(/[^a-zA-Z0-9]+(.)/g, (_, char) => char.toUpperCase())
    .replace(/^[a-z]/, char => char.toUpperCase())
    .replace(/[^a-zA-Z0-9]/g, '');
}
