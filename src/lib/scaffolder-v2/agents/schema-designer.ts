/**
 * Schema Designer Agent
 * Creates custom data models from natural language descriptions
 */

import { BaseAgent } from './base-agent';
import { generateId } from '@/lib/utils';
import type { 
  ConversationState, 
  AgentResponse, 
  Schema,
  SchemaProposal,
  FieldDefinition,
  FieldType,
  ComputedField,
  Relationship,
} from '../types';

const SCHEMA_PROPOSAL_SCHEMA = `{
  "suggestedName": "string",
  "domain": "string",
  "schemas": [{
    "name": "string",
    "label": "string",
    "description": "string",
    "fields": [{
      "name": "string",
      "label": "string",
      "type": "string|text|number|boolean|date|datetime|enum|array",
      "required": true|false,
      "nullable": true|false,
      "unique": true|false,
      "searchable": true|false,
      "options": ["string"],
      "validation": {
        "min": number,
        "max": number,
        "minLength": number,
        "maxLength": number,
        "pattern": "string"
      },
      "placeholder": "string",
      "description": "string"
    }],
    "computedFields": [{
      "name": "string",
      "label": "string",
      "type": "string|number|boolean",
      "formula": "string",
      "description": "string"
    }],
    "relationships": [{
      "type": "belongsTo|hasMany|hasOne|manyToMany",
      "target": "string",
      "foreignKey": "string"
    }]
  }],
  "reasoning": "string"
}`;

const SCHEMA_DESIGNER_SYSTEM_PROMPT = `You are a schema designer for an AI app builder. Your job is to analyze user descriptions and create MINIMAL, PURPOSE-FOCUSED data models.

## Key Principle: Design for the USER'S GOAL, not for a database

Think about:
- What is the user ACTUALLY trying to accomplish?
- What data is ESSENTIAL vs what is just "nice to have"?
- How will this data be USED in the app's primary view?

## Schema Design Guidelines

1. **Start minimal** - Include only fields essential for the core functionality
   - Habit tracker: Just need habit name, completion dates
   - Expense tracker: Amount, category, date - not 20 fields
   - Task list: Title, done status - complexity can be added later

2. Create intuitive field names (camelCase)

3. Use appropriate field types:
   - 'string' for short text (names, titles)
   - 'text' for long text (descriptions, notes)
   - 'number' for numeric values (amounts, quantities, ratings)
   - 'boolean' for yes/no values (completion status, toggles)
   - 'date' for dates without time (due dates, completion dates)
   - 'datetime' for dates with time (events, appointments)
   - 'enum' for predefined options (status, category)
   - 'array' for lists of values

4. Add validations only where needed:
   - Required fields for truly essential data
   - Min/max for numbers that have natural bounds
   - Skip validations for optional/flexible fields

5. Include computed fields when they ADD VALUE:
   - Streak counts for habit trackers
   - Running totals for expense trackers
   - Progress percentages

6. **Avoid over-engineering**:
   - Don't add fields "just in case"
   - Don't create relationships unless explicitly needed
   - Start simple, complexity can be added later

## Example: Habit Tracker

User says: "I want to track my daily habits with a heatmap"

GOOD schema (minimal, purpose-focused):
- name: string (the habit name)
- completedDates: array (dates when completed - for heatmap)

OVER-ENGINEERED schema (avoid this):
- id, createdAt, updatedAt, name, description, frequency, reminderTime, 
  streakCount, longestStreak, totalCompletions, category, priority, notes...

Always provide clear reasoning for your design decisions.`;

export class SchemaDesignerAgent extends BaseAgent {
  constructor() {
    super({
      name: 'SchemaDesigner',
      description: 'Designs data schemas from natural language',
      temperature: 0.3,
      maxTokens: 4096,
    });
  }

  protected buildSystemPrompt(state: ConversationState): string {
    let contextPrompt = SCHEMA_DESIGNER_SYSTEM_PROMPT;

    // Add context from existing schemas
    if (state.schemas.length > 0) {
      contextPrompt += `\n\nExisting schemas:\n${JSON.stringify(state.schemas, null, 2)}`;
    }

    return contextPrompt;
  }

  /**
   * Process a message and propose/refine schema
   */
  async process(
    message: string,
    state: ConversationState
  ): Promise<AgentResponse> {
    this.log('Processing schema request', { message: message.substring(0, 100) });

    // Determine if this is a new proposal or refinement
    if (state.schemas.length === 0) {
      return this.proposeSchema(message, state);
    } else {
      return this.refineSchema(message, state);
    }
  }

  /**
   * Propose a new schema based on user description
   */
  async proposeSchema(
    description: string,
    state: ConversationState
  ): Promise<AgentResponse> {
    this.log('Proposing new schema');

    const systemPrompt = this.buildSystemPrompt(state);
    
    const userPrompt = `Design a data schema for the following app:

"${description}"

Create a complete schema with:
1. All necessary fields with appropriate types
2. Validations for data integrity
3. Computed fields if useful
4. Clear labels and descriptions

Respond with JSON matching the schema format.`;

    try {
      const proposal = await this.callLLMJSON<SchemaProposal>(
        [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        SCHEMA_PROPOSAL_SCHEMA
      );

      // Validate and enhance the proposal
      const validatedProposal = this.validateProposal(proposal);

      // Build user-friendly message
      const responseMessage = this.formatProposalMessage(validatedProposal);

      return {
        success: true,
        message: responseMessage,
        data: validatedProposal,
        requiresUserInput: true,
        suggestedActions: [
          'Looks good, continue to UI design',
          'Add more fields',
          'Change field types',
          'Remove some fields',
        ],
      };
    } catch (error) {
      this.log('Schema proposal failed', { error });
      
      // Return fallback proposal
      const fallback = this.createFallbackProposal(description);
      return {
        success: true,
        message: this.formatProposalMessage(fallback),
        data: fallback,
        requiresUserInput: true,
        suggestedActions: ['Refine the schema', 'Add fields'],
      };
    }
  }

  /**
   * Refine an existing schema based on user feedback
   */
  async refineSchema(
    feedback: string,
    state: ConversationState
  ): Promise<AgentResponse> {
    this.log('Refining schema', { feedback: feedback.substring(0, 100) });

    const currentSchema = state.schemas[0];
    const systemPrompt = this.buildSystemPrompt(state);

    const userPrompt = `Refine this schema based on user feedback:

Current Schema:
${JSON.stringify(currentSchema, null, 2)}

User Feedback:
"${feedback}"

Apply the requested changes while maintaining schema integrity.
Respond with the complete updated schema in JSON format.`;

    try {
      const proposal = await this.callLLMJSON<SchemaProposal>(
        [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        SCHEMA_PROPOSAL_SCHEMA
      );

      const validatedProposal = this.validateProposal(proposal);
      const changes = this.detectChanges(currentSchema, validatedProposal.schemas[0]);

      const responseMessage = this.formatRefinementMessage(validatedProposal, changes);

      return {
        success: true,
        message: responseMessage,
        data: validatedProposal,
        requiresUserInput: true,
        suggestedActions: [
          'Approve changes',
          'Make more adjustments',
          'Undo changes',
        ],
      };
    } catch (error) {
      this.log('Schema refinement failed', { error });
      return {
        success: false,
        message: 'I had trouble understanding those changes. Could you rephrase?',
        requiresUserInput: true,
      };
    }
  }

  /**
   * Extend schema with new requirements
   */
  async extendSchema(
    requirement: string,
    state: ConversationState
  ): Promise<AgentResponse> {
    this.log('Extending schema', { requirement });

    const currentSchema = state.schemas[0];
    const systemPrompt = this.buildSystemPrompt(state);

    const userPrompt = `Add new functionality to this schema:

Current Schema:
${JSON.stringify(currentSchema, null, 2)}

New Requirement:
"${requirement}"

Add new fields or modify existing ones to support this requirement.
Keep existing functionality intact.
Respond with the complete updated schema in JSON format.`;

    try {
      const proposal = await this.callLLMJSON<SchemaProposal>(
        [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        SCHEMA_PROPOSAL_SCHEMA
      );

      const validatedProposal = this.validateProposal(proposal);
      const changes = this.detectChanges(currentSchema, validatedProposal.schemas[0]);

      const responseMessage = `I've added support for: "${requirement}"\n\n${this.formatRefinementMessage(validatedProposal, changes)}`;

      return {
        success: true,
        message: responseMessage,
        data: validatedProposal,
        requiresUserInput: true,
      };
    } catch (error) {
      this.log('Schema extension failed', { error });
      return {
        success: false,
        message: 'I had trouble adding that feature. Could you provide more details?',
        requiresUserInput: true,
      };
    }
  }

  /**
   * Validate and clean up a schema proposal
   */
  private validateProposal(proposal: SchemaProposal): SchemaProposal {
    const validated: SchemaProposal = {
      ...proposal,
      schemas: proposal.schemas.map(schema => this.validateSchema(schema)),
    };

    return validated;
  }

  /**
   * Validate a single schema
   */
  private validateSchema(schema: Schema): Schema {
    const validated: Schema = {
      ...schema,
      name: this.sanitizeSchemaName(schema.name), // Use PascalCase for schemas
      label: schema.label || this.generateLabel(schema.name),
      fields: schema.fields.map(field => this.validateField(field)),
      computedFields: schema.computedFields?.map(cf => this.validateComputedField(cf)),
      relationships: schema.relationships,
    };

    // Ensure there's an ID field
    if (!validated.fields.find(f => f.name === 'id')) {
      validated.fields.unshift({
        name: 'id',
        label: 'ID',
        type: 'string',
        required: true,
        generated: true,
        primaryKey: true,
      });
    }

    // Ensure there's a createdAt field
    if (!validated.fields.find(f => f.name === 'createdAt')) {
      validated.fields.push({
        name: 'createdAt',
        label: 'Created At',
        type: 'datetime',
        required: true,
        generated: true,
      });
    }

    return validated;
  }

  /**
   * Validate a field definition
   */
  private validateField(field: FieldDefinition): FieldDefinition {
    const validTypes: FieldType[] = ['string', 'text', 'number', 'boolean', 'date', 'datetime', 'enum', 'array', 'json'];
    
    return {
      ...field,
      name: this.sanitizeName(field.name),
      label: field.label || this.generateLabel(field.name),
      type: validTypes.includes(field.type) ? field.type : 'string',
      required: field.required ?? false,
      nullable: field.nullable ?? !field.required,
    };
  }

  /**
   * Validate a computed field
   */
  private validateComputedField(field: ComputedField): ComputedField {
    return {
      ...field,
      name: this.sanitizeName(field.name),
      label: field.label || this.generateLabel(field.name),
    };
  }

  /**
   * Sanitize a name to be a valid identifier (preserves casing for fields)
   */
  private sanitizeName(name: string): string {
    return name
      .replace(/[^a-zA-Z0-9]/g, '')
      .replace(/^[0-9]/, '_$&');
  }

  /**
   * Sanitize a schema name to be a valid PascalCase identifier
   * Schema names are used for TypeScript types and React component names
   */
  private sanitizeSchemaName(name: string): string {
    // Remove non-alphanumeric chars and convert to PascalCase
    return name
      .replace(/[^a-zA-Z0-9]+(.)/g, (_, char) => char.toUpperCase())
      .replace(/^[a-z]/, char => char.toUpperCase())
      .replace(/[^a-zA-Z0-9]/g, '')
      .replace(/^[0-9]/, '_$&');
  }

  /**
   * Generate a label from a camelCase name
   */
  private generateLabel(name: string): string {
    return name
      .replace(/([A-Z])/g, ' $1')
      .replace(/^./, str => str.toUpperCase())
      .trim();
  }

  /**
   * Detect changes between old and new schema
   */
  private detectChanges(
    oldSchema: Schema,
    newSchema: Schema
  ): { added: string[]; removed: string[]; modified: string[] } {
    const oldFields = new Set(oldSchema.fields.map(f => f.name));
    const newFields = new Set(newSchema.fields.map(f => f.name));

    const added = newSchema.fields
      .filter(f => !oldFields.has(f.name))
      .map(f => f.label);
    
    const removed = oldSchema.fields
      .filter(f => !newFields.has(f.name))
      .map(f => f.label);

    const modified: string[] = [];
    for (const newField of newSchema.fields) {
      const oldField = oldSchema.fields.find(f => f.name === newField.name);
      if (oldField && JSON.stringify(oldField) !== JSON.stringify(newField)) {
        modified.push(newField.label);
      }
    }

    return { added, removed, modified };
  }

  /**
   * Format schema proposal as user-friendly message
   */
  private formatProposalMessage(proposal: SchemaProposal): string {
    const schema = proposal.schemas[0];
    const fields = schema.fields.filter(f => !f.generated);

    let message = `## ${schema.label}\n\n`;
    message += `${schema.description || proposal.reasoning}\n\n`;
    message += `### Fields\n\n`;

    for (const field of fields) {
      const required = field.required ? '(required)' : '(optional)';
      const type = this.formatFieldType(field);
      message += `- **${field.label}** ${required}\n`;
      message += `  - Type: ${type}\n`;
      if (field.description) {
        message += `  - ${field.description}\n`;
      }
      if (field.options && field.options.length > 0) {
        message += `  - Options: ${field.options.join(', ')}\n`;
      }
    }

    if (schema.computedFields && schema.computedFields.length > 0) {
      message += `\n### Computed Fields\n\n`;
      for (const cf of schema.computedFields) {
        message += `- **${cf.label}**: ${cf.description || cf.formula}\n`;
      }
    }

    message += `\n---\n\nDoes this look right? You can:\n`;
    message += `- **Approve** to continue to UI design\n`;
    message += `- **Request changes** (e.g., "add a priority field")\n`;
    message += `- **Ask questions** about the schema\n`;

    return message;
  }

  /**
   * Format refinement message with changes
   */
  private formatRefinementMessage(
    proposal: SchemaProposal,
    changes: { added: string[]; removed: string[]; modified: string[] }
  ): string {
    let message = `## Updated Schema\n\n`;

    if (changes.added.length > 0) {
      message += `**Added:** ${changes.added.join(', ')}\n\n`;
    }
    if (changes.removed.length > 0) {
      message += `**Removed:** ${changes.removed.join(', ')}\n\n`;
    }
    if (changes.modified.length > 0) {
      message += `**Modified:** ${changes.modified.join(', ')}\n\n`;
    }

    message += this.formatProposalMessage(proposal);

    return message;
  }

  /**
   * Format field type for display
   */
  private formatFieldType(field: FieldDefinition): string {
    switch (field.type) {
      case 'enum':
        return `Selection (${field.options?.length || 0} options)`;
      case 'text':
        return 'Long Text';
      case 'datetime':
        return 'Date & Time';
      case 'boolean':
        return 'Yes/No';
      case 'array':
        return 'Multiple Values';
      default:
        return field.type.charAt(0).toUpperCase() + field.type.slice(1);
    }
  }

  /**
   * Create a fallback proposal when LLM fails
   */
  private createFallbackProposal(description: string): SchemaProposal {
    const name = this.extractNameFromDescription(description);
    
    return {
      suggestedName: `My ${name} Tracker`,
      domain: name.toLowerCase(),
      schemas: [{
        name: name.toLowerCase().replace(/\s+/g, ''),
        label: name,
        description: `Track your ${name.toLowerCase()}`,
        fields: [
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
            placeholder: `Enter ${name.toLowerCase()} name`,
          },
          {
            name: 'description',
            label: 'Description',
            type: 'text',
            required: false,
            placeholder: 'Add notes or description',
          },
          {
            name: 'date',
            label: 'Date',
            type: 'date',
            required: true,
          },
          {
            name: 'status',
            label: 'Status',
            type: 'enum',
            required: true,
            options: ['Active', 'Completed', 'Pending'],
          },
          {
            name: 'createdAt',
            label: 'Created At',
            type: 'datetime',
            required: true,
            generated: true,
          },
        ],
      }],
      reasoning: 'Created a basic tracker schema. You can customize the fields to better match your needs.',
    };
  }

  /**
   * Extract a name from user description
   */
  private extractNameFromDescription(description: string): string {
    const patterns = [
      /track(?:er for|ing)?\s+(?:my\s+)?(.+?)(?:\s+and|\s+with|$)/i,
      /(?:want to|need to)\s+(?:track|manage|log)\s+(?:my\s+)?(.+?)(?:\s+and|\s+with|$)/i,
      /(.+?)\s+tracker/i,
      /(.+?)\s+app/i,
    ];

    for (const pattern of patterns) {
      const match = description.match(pattern);
      if (match && match[1]) {
        const extracted = match[1].trim();
        // Capitalize first letter of each word
        return extracted
          .split(/\s+/)
          .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
          .join(' ');
      }
    }

    return 'Items';
  }
}

// Export singleton instance
export const schemaDesignerAgent = new SchemaDesignerAgent();
