/**
 * Freeform Architect
 * Autonomous AI agent for building apps through natural conversation.
 * No hard-coded templates - dynamically decides what to ask and when.
 */

import { streamComplete, completeJSON, type ChatMessage } from '@/lib/llm';
import type { UserLLMSettings } from '@/lib/llm';
import { generateId } from '@/lib/utils';

// Types for the Freeform Architect
export interface FreeformMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  metadata?: {
    readinessScore?: number;
    entities?: ExtractedEntity[];
    spec?: GeneratedSpec;
  };
}

export interface ExtractedEntity {
  name: string;
  fields: Array<{
    name: string;
    type: 'string' | 'number' | 'boolean' | 'date' | 'enum' | 'relation';
    required?: boolean;
    enumValues?: string[];
  }>;
  relationships?: Array<{
    target: string;
    type: 'one-to-one' | 'one-to-many' | 'many-to-many';
  }>;
}

export interface GeneratedSpec {
  name: string;
  description: string;
  entities: ExtractedEntity[];
  views: Array<{
    type: 'table' | 'chart' | 'cards' | 'form' | 'kanban';
    title: string;
    entityName: string;
  }>;
  category: string;
}

export interface FreeformState {
  id: string;
  messages: FreeformMessage[];
  entities: ExtractedEntity[];
  readinessScore: number;
  spec?: GeneratedSpec;
  phase: 'exploring' | 'refining' | 'ready' | 'building' | 'complete';
}

export interface ArchitectAnalysis {
  understanding: string;
  entities: ExtractedEntity[];
  readinessScore: number;
  shouldAskQuestion: boolean;
  question?: string;
  canBuild: boolean;
  spec?: GeneratedSpec;
  responseMessage: string;
}

// Analysis schema for LLM JSON response
const ANALYSIS_SCHEMA = `{
  "understanding": "string - brief summary of what user wants",
  "entities": [{
    "name": "string",
    "fields": [{
      "name": "string",
      "type": "string|number|boolean|date|enum|relation",
      "required": true|false,
      "enumValues": ["string"] (optional, only for enum type)
    }],
    "relationships": [{
      "target": "string - entity name",
      "type": "one-to-one|one-to-many|many-to-many"
    }]
  }],
  "readinessScore": 0-100,
  "shouldAskQuestion": true|false,
  "question": "string (optional - specific question to ask if needed)",
  "canBuild": true|false,
  "spec": {
    "name": "string",
    "description": "string",
    "entities": [...same as above...],
    "views": [{
      "type": "table|chart|cards|form|kanban",
      "title": "string",
      "entityName": "string"
    }],
    "category": "string"
  } (optional - only when canBuild is true),
  "responseMessage": "string - natural language response to user"
}`;

// Export for use by dual-agent orchestrator
export const ARCHITECT_SYSTEM_PROMPT = `You are an autonomous AI Architect that builds apps through natural conversation.

## PLATFORM CONTEXT - CRITICAL
You are building hosted web apps for the Cumulonimbus platform.

PLATFORM ARCHITECTURE:
- Apps run as isolated React components inside the platform's sandbox
- Data is automatically persisted via /api/apps/{appId}/data endpoints
- No external cloud storage needed - the platform handles all persistence
- No authentication/login needed - handled by platform
- Available API: GET (fetch all), POST (create), PUT (update), DELETE (remove)
- Apps are single-page React components with full access to modern libraries
- Styling uses Tailwind CSS with dark theme support

PLATFORM CAPABILITIES:
- In-app authentication systems are possible (apps run in containers)
- Local databases like SQLite are supported
- Full backend logic can run within the container
- Complex stateful applications are supported

DO NOT ASK ABOUT:
- Third-party cloud storage (AWS S3, GCP, Firebase Storage) - not available
- External database services (managed Postgres, MongoDB Atlas) - use local SQLite instead
- Third-party distribution or app stores - apps live within the platform
- External API integrations requiring secrets - not supported
- CDN or edge deployment - handled by platform

ALWAYS INFER:
- Data persistence: Platform's built-in data API or local SQLite
- File storage: Platform's built-in storage (no external cloud)
- Authentication: Can implement in-app auth if needed, or use platform context
- State management: React useState/useReducer (no Redux needed)

## CORE PRINCIPLES
1. Ask questions ONLY when truly necessary - most details can be inferred
2. Infer technical details (field types, validations, UI patterns) from context
3. Learn from conversation context - each message builds on the previous
4. Decide dynamically when you have enough information to build
5. Generate specs without rigid templates - be creative and adaptive
6. Trust your Advisor partner to fill in gaps - work as a team

## CAPABILITIES
- Extract entities and relationships from natural language descriptions
- Detect reference apps ("like Trello", "similar to Excel") and apply their patterns
- Make smart assumptions about data types (dates, numbers, text) and validations
- Propose multiple UI patterns when appropriate (tables, charts, kanban, cards)
- Know when you're ready to build (readiness score 0-100)

## READINESS SCORING
- 0-30: Initial idea, need basic understanding
- 30-60: Core entities identified, need details on relationships or views
- 60-80: Well-defined, minor clarifications might help
- 80-100: Ready to build - you have enough information

## RESPONSE STYLE
- Be conversational and helpful
- When you understand enough, propose what you'll build
- When asking questions, make them specific and contextual (never generic templates)
- Show your thinking process briefly
- When ready, clearly indicate you can build now
- Frame questions as "thinking out loud" - your Advisor will help decide

## EXAMPLES OF GOOD INFERENCE
- "track expenses" → Expense entity with amount(number), description(string), date(date), category(enum)
- "todo list" → Task entity with title(string), completed(boolean), dueDate(date), priority(enum)
- "like Trello" → Kanban board with lists, cards, drag-and-drop

## WHEN TO ASK vs INFER
ASK when:
- Core purpose is unclear
- User mentions something ambiguous that could go multiple ways
- A critical feature choice affects the whole design

INFER when:
- Standard field types (dates, names, descriptions)
- Common patterns (CRUD operations, basic views)
- UI choices that can be changed later
- Technical implementation details (your Advisor handles these)`;

/**
 * Analyze user message and conversation history to determine next action
 */
export async function analyzeConversation(
  message: string,
  state: FreeformState,
  userSettings?: UserLLMSettings
): Promise<ArchitectAnalysis> {
  const conversationContext = state.messages
    .map(m => `${m.role}: ${m.content}`)
    .join('\n');

  const currentEntities = state.entities.length > 0
    ? `\n\nCurrently identified entities:\n${JSON.stringify(state.entities, null, 2)}`
    : '';

  const analysisPrompt = `Analyze this conversation and determine the next step.

CONVERSATION HISTORY:
${conversationContext}

USER'S NEW MESSAGE:
${message}
${currentEntities}

Current readiness score: ${state.readinessScore}

Based on this conversation:
1. What does the user want to build?
2. What entities and fields can you identify or infer?
3. How ready are you to build (0-100)?
4. Do you need to ask anything, or can you infer it?
5. If readiness >= 80, generate the full spec.

Respond with valid JSON only.`;

  const messages: ChatMessage[] = [
    { role: 'system', content: ARCHITECT_SYSTEM_PROMPT },
    { role: 'user', content: analysisPrompt },
  ];

  try {
    const analysis = await completeJSON<ArchitectAnalysis>({
      messages,
      schema: ANALYSIS_SCHEMA,
      temperature: 0.3,
      userSettings,
    });

    return analysis;
  } catch (error) {
    console.error('Architect analysis failed:', error);
    // Return a fallback that asks for clarification
    return {
      understanding: 'I had trouble understanding that. Could you tell me more?',
      entities: state.entities,
      readinessScore: Math.max(state.readinessScore - 10, 0),
      shouldAskQuestion: true,
      question: 'Could you describe what you want to build in a bit more detail?',
      canBuild: false,
      responseMessage: "I'd love to help you build something! Could you tell me a bit more about what you're looking to create?",
    };
  }
}

/**
 * Generate a streaming response from the architect
 */
export async function* streamArchitectResponse(
  message: string,
  state: FreeformState,
  userSettings?: UserLLMSettings
): AsyncGenerator<{ type: 'chunk' | 'analysis' | 'done'; content?: string; analysis?: ArchitectAnalysis }> {
  const conversationContext = state.messages
    .slice(-10) // Last 10 messages for context
    .map(m => `${m.role}: ${m.content}`)
    .join('\n');

  const currentEntities = state.entities.length > 0
    ? `\n\nCurrently identified entities:\n${JSON.stringify(state.entities, null, 2)}`
    : '';

  const responsePrompt = `You are having a conversation about building an app. Continue the conversation naturally.

CONVERSATION HISTORY:
${conversationContext}

USER'S NEW MESSAGE:
${message}
${currentEntities}

Current readiness score: ${state.readinessScore}/100

Guidelines:
- If you understand what they want, describe what you'll build
- If you need clarification, ask a specific question (not generic templates)
- If readiness is high (>70), indicate you're ready to build
- Be conversational, not robotic
- Show your reasoning briefly

Respond naturally as the architect.`;

  const messages: ChatMessage[] = [
    { role: 'system', content: ARCHITECT_SYSTEM_PROMPT },
    { role: 'user', content: responsePrompt },
  ];

  // First, stream the response
  let fullResponse = '';
  try {
    for await (const chunk of streamComplete({
      messages,
      temperature: 0.7,
      userSettings,
    })) {
      fullResponse += chunk;
      yield { type: 'chunk', content: chunk };
    }
  } catch (error) {
    console.error('Streaming failed:', error);
    yield { type: 'chunk', content: "I'm having a moment - let me think about your request..." };
    fullResponse = "I'm having a moment - let me think about your request...";
  }

  // Then, analyze to get structured data
  const analysis = await analyzeConversation(message, state, userSettings);
  yield { type: 'analysis', analysis };

  yield { type: 'done', content: fullResponse };
}

/**
 * Create initial state for a new freeform conversation
 */
export function createFreeformState(): FreeformState {
  return {
    id: generateId(),
    messages: [],
    entities: [],
    readinessScore: 0,
    phase: 'exploring',
  };
}

/**
 * Add a message to the state
 */
export function addMessage(
  state: FreeformState,
  role: 'user' | 'assistant',
  content: string,
  metadata?: FreeformMessage['metadata']
): FreeformState {
  return {
    ...state,
    messages: [
      ...state.messages,
      {
        id: generateId(),
        role,
        content,
        timestamp: new Date(),
        metadata,
      },
    ],
  };
}

/**
 * Update state with analysis results
 */
export function updateStateWithAnalysis(
  state: FreeformState,
  analysis: ArchitectAnalysis
): FreeformState {
  const newPhase = analysis.canBuild
    ? 'ready'
    : analysis.readinessScore >= 60
      ? 'refining'
      : 'exploring';

  return {
    ...state,
    entities: analysis.entities.length > 0 ? analysis.entities : state.entities,
    readinessScore: analysis.readinessScore,
    spec: analysis.spec || state.spec,
    phase: newPhase,
  };
}

/**
 * Convert freeform spec to the format expected by code generator
 * Now with robust fallbacks for empty entities or views
 */
export function convertSpecToProjectSpec(spec: GeneratedSpec) {
  // Ensure we have at least one entity
  const entities = spec.entities && spec.entities.length > 0 
    ? spec.entities 
    : [{
        name: 'Item',
        fields: [
          { name: 'title', type: 'string' as const, required: true },
          { name: 'description', type: 'string' as const, required: false },
          { name: 'createdAt', type: 'date' as const, required: true },
        ]
      }];

  const primaryEntity = entities[0];

  // Ensure we have at least one view
  let views = spec.views && spec.views.length > 0
    ? spec.views
    : [{
        type: 'table' as const,
        title: `All ${primaryEntity.name}s`,
        entityName: primaryEntity.name
      }];

  // Build fields from all entities
  const allFields = entities.flatMap(entity =>
    entity.fields.map(field => ({
      name: field.name,
      label: field.name.charAt(0).toUpperCase() + field.name.slice(1).replace(/([A-Z])/g, ' $1'),
      type: mapFieldType(field.type),
      required: field.required ?? false,
      options: field.enumValues,
    }))
  );
  
  // Filter out duplicate field names, keeping the first occurrence
  const seen = new Set<string>();
  const uniqueFields = allFields.filter(field => {
    if (seen.has(field.name)) return false;
    seen.add(field.name);
    return true;
  });

  // Ensure we have at least one field (fallback to basic structure)
  const finalFields = uniqueFields.length > 0 
    ? uniqueFields
    : [
        { name: 'title', label: 'Title', type: 'text', required: true },
        { name: 'description', label: 'Description', type: 'text', required: false },
      ];

  return {
    name: spec.name || 'My App',
    description: spec.description || 'A new application',
    category: spec.category || 'Productivity',
    dataStore: {
      name: primaryEntity.name.toLowerCase(),
      label: primaryEntity.name,
      fields: finalFields,
    },
    views: views.map(view => ({
      type: view.type,
      title: view.title,
      config: {},
    })),
  };
}

function mapFieldType(type: string): string {
  const typeMap: Record<string, string> = {
    string: 'text',
    number: 'number',
    boolean: 'checkbox',
    date: 'date',
    enum: 'select',
    relation: 'text', // Simplified for now
  };
  return typeMap[type] || 'text';
}

/**
 * Advisor feedback interface (imported from advisor-agent for type reference)
 */
export interface AdvisorFeedback {
  critique: string;
  suggestions: string[];
  confidence: number;
  decision: 'iterate' | 'approve';
  refinedApproach?: string;
  gaps?: string[];
}

/**
 * Generate a refined response incorporating Advisor feedback
 * Used by the dual-agent orchestrator when iterating
 */
export async function* streamRefinedResponse(
  message: string,
  state: FreeformState,
  previousResponse: string,
  feedback: AdvisorFeedback,
  iteration: number,
  userSettings?: UserLLMSettings
): AsyncGenerator<{ type: 'chunk' | 'done'; content: string }> {
  const conversationContext = state.messages
    .slice(-10)
    .map(m => `${m.role}: ${m.content}`)
    .join('\n');

  const currentEntities = state.entities.length > 0
    ? `\n\nCurrently identified entities:\n${JSON.stringify(state.entities, null, 2)}`
    : '';

  const refinementPrompt = `You are refining your previous response based on feedback from an Advisor.

CONVERSATION HISTORY:
${conversationContext}

USER'S MESSAGE:
${message}
${currentEntities}

YOUR PREVIOUS RESPONSE (Iteration ${iteration - 1}):
${previousResponse}

ADVISOR FEEDBACK:
- Confidence: ${feedback.confidence}%
- Critique: ${feedback.critique}
- Suggestions: ${feedback.suggestions.join('; ') || 'None specific'}
${feedback.refinedApproach ? `- Refined Approach: ${feedback.refinedApproach}` : ''}
${feedback.gaps ? `- Gaps to Address: ${feedback.gaps.join(', ')}` : ''}

Please generate an improved response that:
1. Addresses the Advisor's critique
2. Incorporates the suggestions
3. Fills any identified gaps
4. Maintains a conversational, helpful tone

Respond naturally as the architect with your refined response.`;

  const messages: ChatMessage[] = [
    { role: 'system', content: ARCHITECT_SYSTEM_PROMPT },
    { role: 'user', content: refinementPrompt },
  ];

  let fullResponse = '';
  try {
    for await (const chunk of streamComplete({
      messages,
      temperature: 0.7,
      userSettings,
    })) {
      fullResponse += chunk;
      yield { type: 'chunk', content: chunk };
    }
  } catch (error) {
    console.error('Refined streaming failed:', error);
    yield { type: 'chunk', content: previousResponse }; // Fall back to previous
    fullResponse = previousResponse;
  }

  yield { type: 'done', content: fullResponse };
}
