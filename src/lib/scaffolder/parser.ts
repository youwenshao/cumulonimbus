import { completeJSON, type ChatMessage } from '@/lib/qwen';
import type { ParsedIntent, TrackerCategory } from './types';

const PARSE_SYSTEM_PROMPT = `You are an intent parser for a personal tracker app builder. Your job is to analyze user descriptions and extract structured information about what kind of tracker they want to build.

Analyze the user's request and extract:
1. Category: The type of tracker (expense, habit, project, health, learning, inventory, time, or custom)
2. Entities: The main things being tracked (e.g., "expenses", "habits", "tasks")
3. Actions: What the user wants to do (e.g., "track", "monitor", "analyze", "visualize")
4. Relationships: How entities relate (e.g., "expenses by category", "habits over time")
5. A suggested name for the app

Respond with a JSON object only.`;

const PARSE_SCHEMA = `{
  "category": "expense|habit|project|health|learning|inventory|time|custom",
  "entities": ["string"],
  "actions": ["string"],
  "relationships": ["string"],
  "suggestedName": "string",
  "confidence": 0.0-1.0
}`;

export async function parseIntent(userPrompt: string): Promise<ParsedIntent> {
  const messages: ChatMessage[] = [
    { role: 'system', content: PARSE_SYSTEM_PROMPT },
    { role: 'user', content: userPrompt },
  ];

  const result = await completeJSON<ParsedIntent>({
    messages,
    schema: PARSE_SCHEMA,
    temperature: 0.3,
  });

  // Validate and set defaults
  return {
    category: validateCategory(result.category),
    entities: result.entities || [],
    actions: result.actions || [],
    relationships: result.relationships || [],
    suggestedName: result.suggestedName || 'My Tracker',
    confidence: typeof result.confidence === 'number' ? result.confidence : 0.5,
  };
}

function validateCategory(category: string): TrackerCategory {
  const validCategories: TrackerCategory[] = [
    'expense', 'habit', 'project', 'health', 'learning', 'inventory', 'time', 'custom'
  ];
  return validCategories.includes(category as TrackerCategory) 
    ? (category as TrackerCategory) 
    : 'custom';
}

// Pre-defined field templates based on category
export const CATEGORY_TEMPLATES: Record<TrackerCategory, { fields: string[]; views: string[] }> = {
  expense: {
    fields: ['amount', 'category', 'description', 'date', 'paymentMethod'],
    views: ['table', 'chart'],
  },
  habit: {
    fields: ['habitName', 'completed', 'date', 'notes', 'streak'],
    views: ['table', 'chart'],
  },
  project: {
    fields: ['taskName', 'status', 'priority', 'dueDate', 'assignee', 'notes'],
    views: ['table', 'cards'],
  },
  health: {
    fields: ['metric', 'value', 'unit', 'date', 'notes'],
    views: ['table', 'chart'],
  },
  learning: {
    fields: ['topic', 'timeSpent', 'date', 'progress', 'notes'],
    views: ['table', 'chart'],
  },
  inventory: {
    fields: ['itemName', 'quantity', 'category', 'location', 'lastUpdated'],
    views: ['table', 'cards'],
  },
  time: {
    fields: ['activity', 'startTime', 'endTime', 'duration', 'category', 'notes'],
    views: ['table', 'chart'],
  },
  custom: {
    fields: ['name', 'value', 'date', 'notes'],
    views: ['table'],
  },
};
