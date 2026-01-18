/**
 * Intent Engine
 * Deep understanding of user requests with reference app detection,
 * entity extraction, workflow detection, and smart defaults
 */

import { BaseAgent } from './base-agent';
import { generateId } from '@/lib/utils';
import type { 
  ConversationState,
  DynamicConversationState,
  AgentResponse, 
  EnhancedIntent,
  AppCategory,
  ProactiveSuggestion,
  Schema,
  FieldDefinition,
  ComponentType,
} from '../types';

// Reference app patterns - known apps and their features
const REFERENCE_APPS: Record<string, {
  category: AppCategory;
  layout: 'dashboard' | 'sidebar' | 'kanban' | 'simple' | 'split';
  components: ComponentType[];
  entities: { name: string; fields: string[] }[];
  workflows: string[];
}> = {
  trello: {
    category: 'workflow',
    layout: 'kanban',
    components: ['kanban', 'cards', 'form'],
    entities: [
      { name: 'board', fields: ['name', 'description'] },
      { name: 'list', fields: ['name', 'position'] },
      { name: 'card', fields: ['title', 'description', 'dueDate', 'labels'] },
    ],
    workflows: ['drag_drop', 'status_columns', 'due_date_reminders'],
  },
  notion: {
    category: 'content',
    layout: 'sidebar',
    components: ['table', 'form', 'kanban', 'calendar'],
    entities: [
      { name: 'page', fields: ['title', 'content', 'icon', 'cover'] },
      { name: 'database', fields: ['name', 'properties'] },
    ],
    workflows: ['linked_databases', 'templates', 'filters'],
  },
  asana: {
    category: 'workflow',
    layout: 'sidebar',
    components: ['table', 'kanban', 'calendar', 'stats'],
    entities: [
      { name: 'project', fields: ['name', 'description', 'status', 'dueDate', 'owner'] },
      { name: 'task', fields: ['title', 'description', 'status', 'priority', 'assignee', 'dueDate'] },
      { name: 'subtask', fields: ['title', 'completed'] },
    ],
    workflows: ['task_assignment', 'progress_tracking', 'dependencies'],
  },
  todoist: {
    category: 'tracker',
    layout: 'sidebar',
    components: ['form', 'table', 'filters'],
    entities: [
      { name: 'project', fields: ['name', 'color'] },
      { name: 'task', fields: ['title', 'description', 'priority', 'dueDate', 'labels'] },
    ],
    workflows: ['recurring_tasks', 'priority_levels', 'quick_add'],
  },
  airtable: {
    category: 'dashboard',
    layout: 'dashboard',
    components: ['table', 'form', 'kanban', 'calendar', 'chart'],
    entities: [
      { name: 'base', fields: ['name'] },
      { name: 'table', fields: ['name', 'fields'] },
    ],
    workflows: ['linked_records', 'automations', 'views'],
  },
  hubspot: {
    category: 'crm',
    layout: 'dashboard',
    components: ['table', 'form', 'stats', 'chart'],
    entities: [
      { name: 'contact', fields: ['name', 'email', 'phone', 'company', 'status'] },
      { name: 'deal', fields: ['name', 'value', 'stage', 'closeDate'] },
      { name: 'company', fields: ['name', 'industry', 'size', 'website'] },
    ],
    workflows: ['pipeline_stages', 'email_tracking', 'deal_automation'],
  },
};

// Smart field type inference patterns
const FIELD_TYPE_PATTERNS: { pattern: RegExp; type: FieldDefinition['type']; options?: string[] }[] = [
  // Status/State fields
  { pattern: /status|state|phase/i, type: 'enum', options: ['Active', 'Pending', 'Completed'] },
  { pattern: /priority|urgency/i, type: 'enum', options: ['High', 'Medium', 'Low'] },
  { pattern: /type|category|kind/i, type: 'enum' },
  
  // Boolean fields
  { pattern: /^is[A-Z]|^has[A-Z]|completed|done|active|enabled|archived/i, type: 'boolean' },
  
  // Date fields
  { pattern: /date|when|deadline|due|created|updated|started|ended/i, type: 'date' },
  { pattern: /time|at|datetime/i, type: 'datetime' },
  
  // Numeric fields
  { pattern: /amount|price|cost|value|total|count|quantity|number|score|rating|percentage|percent/i, type: 'number' },
  { pattern: /age|year|month|day|hour|minute/i, type: 'number' },
  
  // Text fields
  { pattern: /description|notes|content|body|details|summary|comment/i, type: 'text' },
  { pattern: /email/i, type: 'string' },
  { pattern: /phone|tel/i, type: 'string' },
  { pattern: /url|link|website/i, type: 'string' },
  
  // Array fields
  { pattern: /tags|labels|categories|items/i, type: 'array' },
];

// Common app patterns for suggestions
const APP_SUGGESTIONS: Record<AppCategory, ProactiveSuggestion[]> = {
  tracker: [
    {
      id: 'progress-charts',
      feature: 'Progress visualization',
      reasoning: 'See your completion trends over time',
      confidence: 0.85,
      implementation: { effort: 'easy' },
      icon: '📊',
      category: 'visualization',
    },
    {
      id: 'streak-tracking',
      feature: 'Streak tracking',
      reasoning: 'Build habits with streak counters',
      confidence: 0.75,
      implementation: { effort: 'moderate' },
      icon: '🔥',
      category: 'data',
    },
  ],
  crm: [
    {
      id: 'activity-timeline',
      feature: 'Activity timeline',
      reasoning: 'Track all interactions chronologically',
      confidence: 0.9,
      implementation: { effort: 'moderate' },
      icon: '📅',
      category: 'data',
    },
    {
      id: 'pipeline-view',
      feature: 'Pipeline view',
      reasoning: 'Visualize deals through stages',
      confidence: 0.85,
      implementation: { effort: 'easy' },
      icon: '📈',
      category: 'visualization',
    },
  ],
  dashboard: [
    {
      id: 'auto-refresh',
      feature: 'Auto-refresh data',
      reasoning: 'Keep metrics up to date automatically',
      confidence: 0.8,
      implementation: { effort: 'easy' },
      icon: '⚡',
      category: 'ux',
    },
  ],
  workflow: [
    {
      id: 'status-automations',
      feature: 'Status automations',
      reasoning: 'Automatically update related items',
      confidence: 0.85,
      implementation: { effort: 'moderate' },
      icon: '⚙️',
      category: 'workflow',
    },
  ],
  content: [],
  inventory: [
    {
      id: 'low-stock-alerts',
      feature: 'Low stock alerts',
      reasoning: 'Get notified before items run out',
      confidence: 0.9,
      implementation: { effort: 'easy' },
      icon: '⚠️',
      category: 'workflow',
    },
  ],
  social: [],
  generic: [],
};

const INTENT_EXTRACTION_SCHEMA = `{
  "primaryGoal": "string",
  "appCategory": "tracker|crm|dashboard|workflow|content|inventory|social|generic",
  "complexityScore": 1-10,
  "entities": [{
    "name": "string",
    "role": "primary|secondary",
    "fields": ["string"],
    "relationships": ["string"]
  }],
  "referenceApps": [{
    "name": "string",
    "aspects": ["string"],
    "confidence": 0-1
  }],
  "workflows": [{
    "trigger": "string",
    "action": "string",
    "description": "string"
  }],
  "layoutHints": {
    "structure": "dashboard|sidebar|kanban|simple|split",
    "components": ["string"],
    "emphasis": "data-entry|visualization|workflow|balanced"
  },
  "suggestedEnhancements": ["string"]
}`;

const INTENT_SYSTEM_PROMPT = `You are an expert at understanding app requirements. Extract comprehensive information from user descriptions.

IMPORTANT: Make smart inferences - don't ask the user for details you can figure out.

Entity Detection:
- Identify all data entities (projects, tasks, users, etc.)
- Infer relationships between entities (projects have tasks, etc.)
- Suggest appropriate fields for each entity

Reference App Detection:
- Listen for mentions of apps: "like Trello", "similar to Notion"
- Also detect implied patterns: "kanban" implies Trello-like, "database" implies Airtable-like

Workflow Detection:
- Listen for automation hints: "when done", "notify when", "after X days"
- Detect state machines: status transitions, approvals

Layout Hints:
- Dashboard: stats at top, charts, overview focus
- Sidebar: navigation-heavy, form on side
- Kanban: columns by status, drag-drop
- Simple: basic form + table
- Split: equal columns

Complexity Scoring (1-10):
- 1-3: Simple tracker, few fields
- 4-6: Multiple entities, some relationships
- 7-10: Complex workflows, many entities, automations

Always suggest enhancements that would be useful for the app category.`;

export class IntentEngine extends BaseAgent {
  constructor() {
    super({
      name: 'IntentEngine',
      description: 'Deep understanding of user app requirements',
      temperature: 0.3,
      maxTokens: 4096,
    });
  }

  protected buildSystemPrompt(state: ConversationState): string {
    return INTENT_SYSTEM_PROMPT;
  }

  /**
   * Main processing entry point
   */
  async process(
    message: string,
    state: ConversationState
  ): Promise<AgentResponse> {
    const dynamicState = state as DynamicConversationState;
    this.log('Extracting intent', { message: message.substring(0, 100) });

    const intent = await this.extractIntent(message, dynamicState);
    const suggestions = this.generateSuggestions(intent);

    // Generate smart defaults for schema
    const defaultSchema = this.generateSmartSchema(intent);

    return {
      success: true,
      message: this.formatIntentMessage(intent),
      data: {
        intent,
        suggestions,
        defaultSchema,
      },
      requiresUserInput: false,
      suggestedActions: intent.suggestedEnhancements.slice(0, 3),
    };
  }

  /**
   * Extract enhanced intent from user message
   */
  async extractIntent(
    message: string,
    state: DynamicConversationState
  ): Promise<EnhancedIntent> {
    // First, check for reference app mentions
    const detectedRefs = this.detectReferenceApps(message);
    
    const prompt = `Analyze this app request in depth:

"${message}"

${detectedRefs.length > 0 ? `Detected reference apps: ${detectedRefs.map(r => r.name).join(', ')}` : ''}

Extract:
1. Primary goal and app category
2. All entities and their fields (infer reasonable fields)
3. Reference apps if mentioned (or implied by patterns)
4. Any workflows or automations mentioned
5. Layout preferences
6. Useful enhancements to suggest

Respond with JSON matching the schema.`;

    try {
      const result = await this.callLLMJSON<EnhancedIntent>(
        [
          { role: 'system', content: INTENT_SYSTEM_PROMPT },
          { role: 'user', content: prompt },
        ],
        INTENT_EXTRACTION_SCHEMA
      );

      // Merge detected references with LLM results
      const mergedRefs = this.mergeReferenceApps(result.referenceApps, detectedRefs);

      // Apply reference app patterns
      const enhancedIntent = this.applyReferencePatterns({
        ...result,
        referenceApps: mergedRefs,
      });

      return enhancedIntent;
    } catch (error) {
      this.log('Intent extraction failed, using fallback', { error });
      return this.createFallbackIntent(message, detectedRefs);
    }
  }

  /**
   * Detect reference apps from message
   */
  private detectReferenceApps(message: string): EnhancedIntent['referenceApps'] {
    const refs: EnhancedIntent['referenceApps'] = [];
    const lower = message.toLowerCase();

    for (const [appName, pattern] of Object.entries(REFERENCE_APPS)) {
      if (lower.includes(appName) || lower.includes(appName.replace(/[aeiou]/g, ''))) {
        refs.push({
          name: appName.charAt(0).toUpperCase() + appName.slice(1),
          aspects: pattern.components,
          confidence: 0.9,
        });
      }
    }

    // Pattern-based detection
    if (/kanban|columns?.*status|drag.*drop/i.test(message) && !refs.some(r => r.name === 'Trello')) {
      refs.push({
        name: 'Trello',
        aspects: ['kanban_layout', 'drag_drop'],
        confidence: 0.7,
      });
    }
    
    if (/database|spreadsheet|views?/i.test(message) && !refs.some(r => r.name === 'Airtable')) {
      refs.push({
        name: 'Airtable',
        aspects: ['flexible_views', 'linked_records'],
        confidence: 0.6,
      });
    }

    if (/crm|leads?|pipeline|deals?/i.test(message) && !refs.some(r => r.name === 'Hubspot')) {
      refs.push({
        name: 'Hubspot',
        aspects: ['pipeline_stages', 'contact_management'],
        confidence: 0.7,
      });
    }

    return refs;
  }

  /**
   * Merge reference apps from LLM and detection
   */
  private mergeReferenceApps(
    llmRefs: EnhancedIntent['referenceApps'],
    detectedRefs: EnhancedIntent['referenceApps']
  ): EnhancedIntent['referenceApps'] {
    const merged = [...llmRefs];
    
    for (const detected of detectedRefs) {
      const existing = merged.find(r => r.name.toLowerCase() === detected.name.toLowerCase());
      if (existing) {
        existing.confidence = Math.max(existing.confidence, detected.confidence);
        existing.aspects = Array.from(new Set([...existing.aspects, ...detected.aspects]));
      } else {
        merged.push(detected);
      }
    }
    
    return merged;
  }

  /**
   * Apply reference app patterns to intent
   */
  private applyReferencePatterns(intent: EnhancedIntent): EnhancedIntent {
    const enhanced = { ...intent };
    
    for (const ref of intent.referenceApps) {
      const pattern = REFERENCE_APPS[ref.name.toLowerCase()];
      if (!pattern) continue;
      
      // Apply category if not set or generic
      if (enhanced.appCategory === 'generic') {
        enhanced.appCategory = pattern.category;
      }
      
      // Apply layout if simple
      if (enhanced.layoutHints.structure === 'simple') {
        enhanced.layoutHints.structure = pattern.layout;
      }
      
      // Merge components
      enhanced.layoutHints.components = Array.from(new Set([
        ...enhanced.layoutHints.components,
        ...pattern.components
      ]));
      
      // Add entity patterns if entities are sparse
      if (enhanced.entities.length < pattern.entities.length) {
        for (const patternEntity of pattern.entities) {
          if (!enhanced.entities.find(e => e.name.toLowerCase() === patternEntity.name)) {
            enhanced.entities.push({
              name: patternEntity.name,
              role: enhanced.entities.length === 0 ? 'primary' : 'secondary',
              fields: patternEntity.fields,
              relationships: [],
            });
          }
        }
      }
    }
    
    return enhanced;
  }

  /**
   * Generate smart schema from intent
   */
  generateSmartSchema(intent: EnhancedIntent): Schema[] {
    const schemas: Schema[] = [];
    
    for (const entity of intent.entities) {
      const fields: FieldDefinition[] = [
        {
          name: 'id',
          label: 'ID',
          type: 'string',
          required: true,
          generated: true,
          primaryKey: true,
        },
      ];
      
      // Generate fields from entity field names
      for (const fieldName of entity.fields) {
        const field = this.inferField(fieldName, entity.name);
        fields.push(field);
      }
      
      // Ensure basic fields exist
      if (!fields.find(f => f.name === 'name' || f.name === 'title')) {
        fields.splice(1, 0, {
          name: 'name',
          label: 'Name',
          type: 'string',
          required: true,
        });
      }
      
      // Add createdAt
      if (!fields.find(f => f.name === 'createdAt')) {
        fields.push({
          name: 'createdAt',
          label: 'Created At',
          type: 'datetime',
          required: true,
          generated: true,
        });
      }
      
      schemas.push({
        name: this.sanitizeName(entity.name),
        label: entity.name.charAt(0).toUpperCase() + entity.name.slice(1),
        description: `${entity.name.charAt(0).toUpperCase() + entity.name.slice(1)} data`,
        fields,
        relationships: entity.relationships.map(rel => ({
          type: 'hasMany' as const,
          target: rel,
        })),
      });
    }
    
    return schemas;
  }

  /**
   * Infer field definition from name
   */
  private inferField(fieldName: string, entityName: string): FieldDefinition {
    const cleanName = fieldName.replace(/[^a-zA-Z0-9]/g, '');
    const camelName = cleanName.charAt(0).toLowerCase() + cleanName.slice(1);
    const label = cleanName
      .replace(/([A-Z])/g, ' $1')
      .replace(/^./, str => str.toUpperCase())
      .trim();
    
    // Find matching pattern
    for (const pattern of FIELD_TYPE_PATTERNS) {
      if (pattern.pattern.test(fieldName)) {
        return {
          name: camelName,
          label,
          type: pattern.type,
          required: pattern.type !== 'text' && !fieldName.toLowerCase().includes('optional'),
          options: pattern.options,
        };
      }
    }
    
    // Default to string
    return {
      name: camelName,
      label,
      type: 'string',
      required: true,
    };
  }

  /**
   * Generate proactive suggestions
   */
  generateSuggestions(intent: EnhancedIntent): ProactiveSuggestion[] {
    const suggestions = [...(APP_SUGGESTIONS[intent.appCategory] || [])];
    
    // Add suggestions based on entities
    if (intent.entities.some(e => e.fields.some(f => /date|due/i.test(f)))) {
      suggestions.push({
        id: 'calendar-view',
        feature: 'Calendar view',
        reasoning: 'Visualize items by date',
        confidence: 0.8,
        implementation: { effort: 'easy' },
        icon: '📅',
        category: 'visualization',
      });
    }
    
    if (intent.entities.some(e => e.fields.some(f => /amount|price|value/i.test(f)))) {
      suggestions.push({
        id: 'financial-summary',
        feature: 'Financial summary',
        reasoning: 'Track totals and averages',
        confidence: 0.85,
        implementation: { effort: 'easy' },
        icon: '💰',
        category: 'visualization',
      });
    }
    
    // Sort by confidence and limit
    return suggestions
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, 5);
  }

  /**
   * Create fallback intent
   */
  private createFallbackIntent(
    message: string,
    detectedRefs: EnhancedIntent['referenceApps']
  ): EnhancedIntent {
    // Extract entities from message
    const words = message.toLowerCase().split(/\s+/);
    const entities: EnhancedIntent['entities'] = [];
    
    const entityPatterns = [
      'project', 'task', 'item', 'expense', 'habit', 'goal',
      'contact', 'customer', 'lead', 'order', 'product', 'event',
      'note', 'document', 'file', 'user', 'team', 'member',
    ];
    
    for (const pattern of entityPatterns) {
      if (words.some(w => w.includes(pattern))) {
        entities.push({
          name: pattern,
          role: entities.length === 0 ? 'primary' : 'secondary',
          fields: ['name', 'description', 'status'],
          relationships: [],
        });
      }
    }
    
    if (entities.length === 0) {
      entities.push({
        name: 'item',
        role: 'primary',
        fields: ['name', 'description', 'status'],
        relationships: [],
      });
    }
    
    // Detect category
    let category: AppCategory = 'generic';
    if (/track|habit|goal|daily|streak/i.test(message)) category = 'tracker';
    if (/customer|contact|crm|lead|pipeline/i.test(message)) category = 'crm';
    if (/dashboard|analytics|stats|metrics/i.test(message)) category = 'dashboard';
    if (/workflow|approval|process|status/i.test(message)) category = 'workflow';
    if (/inventory|stock|warehouse|quantity/i.test(message)) category = 'inventory';
    
    // Determine layout from refs or category
    let structure: EnhancedIntent['layoutHints']['structure'] = 'simple';
    if (detectedRefs.some(r => r.name.toLowerCase() === 'trello')) {
      structure = 'kanban';
    } else if (category === 'dashboard') {
      structure = 'dashboard';
    } else if (category === 'crm' || category === 'workflow') {
      structure = 'sidebar';
    }
    
    return {
      primaryGoal: message,
      appCategory: category,
      complexityScore: Math.min(10, 3 + entities.length),
      entities,
      referenceApps: detectedRefs,
      workflows: [],
      layoutHints: {
        structure,
        components: ['form', 'table'],
        emphasis: 'balanced',
      },
      suggestedEnhancements: [],
    };
  }

  /**
   * Format intent as user message
   */
  private formatIntentMessage(intent: EnhancedIntent): string {
    let message = `I understand you want to build a **${intent.appCategory}** app.\n\n`;
    
    message += `**What I'll create:**\n`;
    for (const entity of intent.entities) {
      message += `- ${entity.name.charAt(0).toUpperCase() + entity.name.slice(1)}`;
      if (entity.fields.length > 0) {
        message += ` (with ${entity.fields.slice(0, 3).join(', ')}${entity.fields.length > 3 ? '...' : ''})`;
      }
      message += '\n';
    }
    
    if (intent.referenceApps.length > 0) {
      message += `\n**Drawing from:** ${intent.referenceApps.map(r => r.name).join(', ')}\n`;
    }
    
    if (intent.layoutHints.structure !== 'simple') {
      message += `\n**Layout:** ${intent.layoutHints.structure} style\n`;
    }
    
    return message;
  }

  /**
   * Sanitize name for code generation
   */
  private sanitizeName(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-zA-Z0-9]/g, '')
      .replace(/^[0-9]/, '_$&');
  }
}

// Export singleton instance
export const intentEngine = new IntentEngine();
