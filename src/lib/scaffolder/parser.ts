import { completeJSON, type ChatMessage } from '@/lib/qwen';
import type { ParsedIntent, TrackerCategory } from './types';
import { emitStatus } from '@/lib/scaffolder/status/emitter';
import { 
  AIServiceError, 
  AIParseError, 
  RateLimitError, 
  wrapError,
  withRetry,
  safeJSONParse 
} from '@/lib/error-handling/scaffolder-errors';

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

export async function parseIntent(userPrompt: string, conversationId?: string): Promise<ParsedIntent> {
  const messages: ChatMessage[] = [
    { role: 'system', content: PARSE_SYSTEM_PROMPT },
    { role: 'user', content: userPrompt },
  ];

  // Helper to emit status messages
  const emitParseStatus = async (message: string, severity: 'info' | 'warning' | 'error', details?: string, progress?: number) => {
    if (conversationId) {
      emitStatus(conversationId, 'parse', message, { severity, technicalDetails: details, progress });
    }
  };

  try {
    // Use withRetry for automatic retry with backoff
    const result = await withRetry(
      async () => {
        const response = await completeJSON<ParsedIntent>({
          messages,
          schema: PARSE_SCHEMA,
          temperature: 0.3,
        });
        return response;
      },
      {
        maxRetries: 2,
        baseDelayMs: 500,
        phase: 'parse',
        onRetry: async (error, attempt) => {
          console.log(`🔄 parseIntent retry ${attempt}: ${error.message}`);
          await emitParseStatus(
            `Retrying AI analysis (attempt ${attempt + 1})...`,
            'warning',
            error.technicalDetails,
            15 + attempt * 5
          );
        },
      }
    );

    // Validate and set defaults
    return {
      category: validateCategory(result.category),
      entities: result.entities || [],
      actions: result.actions || [],
      relationships: result.relationships || [],
      suggestedName: result.suggestedName || 'My Tracker',
      confidence: typeof result.confidence === 'number' ? result.confidence : 0.5,
    };
  } catch (error: unknown) {
    // Wrap the error in our custom error type
    const wrappedError = wrapError(error, 'parse');
    
    // Log for debugging
    console.error('❌ parseIntent failed:', wrappedError.toJSON());
    
    // Emit appropriate status based on error type
    if (wrappedError instanceof RateLimitError) {
      await emitParseStatus(
        'AI service is busy, using smart fallback...',
        'warning',
        wrappedError.technicalDetails,
        20
      );
    } else if (wrappedError instanceof AIServiceError) {
      await emitParseStatus(
        wrappedError.recovery?.suggestion || 'Using fallback analysis...',
        'warning',
        wrappedError.technicalDetails,
        20
      );
    } else if (wrappedError instanceof AIParseError) {
      await emitParseStatus(
        'AI response unclear, using keyword analysis...',
        'warning',
        wrappedError.technicalDetails,
        20
      );
    } else {
      await emitParseStatus(
        'Unexpected issue, using fallback...',
        'warning',
        wrappedError.technicalDetails,
        20
      );
    }

    // Return fallback intent based on keywords in prompt
    return getFallbackIntent(userPrompt);
  }
}

/**
 * Export the fallback function for use in error recovery
 */
export { getFallbackIntent };

function getFallbackIntent(userPrompt: string): ParsedIntent {
  const lowerPrompt = userPrompt.toLowerCase();
  console.log(`🔄 getFallbackIntent: Analyzing "${userPrompt}"`);
  
  // Keyword matching for category with priority order
  const categoryPatterns: { category: TrackerCategory; keywords: string[]; name: string }[] = [
    { category: 'expense', keywords: ['expense', 'spending', 'money', 'budget', 'cost', 'purchase', 'payment'], name: 'Expense Tracker' },
    { category: 'habit', keywords: ['habit', 'routine', 'daily', 'workout', 'exercise', 'gym', 'meditation', 'morning'], name: 'Habit Tracker' },
    { category: 'project', keywords: ['project', 'task', 'todo', 'work', 'assignment', 'deadline'], name: 'Project Tracker' },
    { category: 'health', keywords: ['health', 'fitness', 'weight', 'diet', 'calories', 'sleep', 'water', 'steps'], name: 'Health Tracker' },
    { category: 'learning', keywords: ['learning', 'study', 'course', 'book', 'reading', 'skill'], name: 'Learning Tracker' },
    { category: 'inventory', keywords: ['inventory', 'stock', 'items', 'collection', 'supplies'], name: 'Inventory Tracker' },
    { category: 'time', keywords: ['time', 'hours', 'clock', 'schedule', 'log'], name: 'Time Tracker' },
    { category: 'custom', keywords: ['calendar', 'event', 'schedule', 'appointment'], name: 'Event Tracker' },
  ];
  
  let matchedCategory = categoryPatterns[categoryPatterns.length - 1]; // Default to custom
  
  for (const pattern of categoryPatterns) {
    if (pattern.keywords.some(kw => lowerPrompt.includes(kw))) {
      matchedCategory = pattern;
      break;
    }
  }
  
  // Extract entities from prompt (nouns that appear after "track", "manage", "log", etc.)
  const entities = extractEntitiesFromPrompt(userPrompt);
  
  // Extract actions from prompt
  const actions = extractActionsFromPrompt(userPrompt);
  
  // Generate a more specific name based on extracted info
  const suggestedName = generateSmartName(matchedCategory.name, entities, userPrompt);
  
  console.log(`🔄 Fallback result: category=${matchedCategory.category}, entities=[${entities.join(', ')}], name="${suggestedName}"`);
  
  return {
    category: matchedCategory.category,
    entities: entities.length > 0 ? entities : ['items'],
    actions: actions.length > 0 ? actions : ['track'],
    relationships: [],
    suggestedName,
    confidence: 0.3,
    originalPrompt: userPrompt, // Store original prompt for better descriptions
  };
}

function extractEntitiesFromPrompt(prompt: string): string[] {
  const entities: string[] = [];
  const lowerPrompt = prompt.toLowerCase();
  
  // Common entity patterns
  const entityKeywords = [
    'expense', 'spending', 'purchase', 'cost',
    'habit', 'routine', 'activity',
    'task', 'project', 'todo',
    'workout', 'exercise', 'run', 'gym',
    'meal', 'food', 'water', 'sleep',
    'book', 'course', 'lesson',
    'meeting', 'appointment', 'event',
    'note', 'idea', 'thought',
    'goal', 'milestone',
    'calendar', 'schedule',
  ];
  
  for (const keyword of entityKeywords) {
    if (lowerPrompt.includes(keyword)) {
      entities.push(keyword + 's'); // Pluralize
    }
  }
  
  return Array.from(new Set(entities)).slice(0, 3); // Dedupe and limit
}

function extractActionsFromPrompt(prompt: string): string[] {
  const actions: string[] = [];
  const lowerPrompt = prompt.toLowerCase();
  
  const actionKeywords = [
    { word: 'track', action: 'track' },
    { word: 'manage', action: 'manage' },
    { word: 'monitor', action: 'monitor' },
    { word: 'log', action: 'log' },
    { word: 'record', action: 'record' },
    { word: 'analyze', action: 'analyze' },
    { word: 'view', action: 'visualize' },
    { word: 'see', action: 'visualize' },
    { word: 'chart', action: 'visualize' },
    { word: 'graph', action: 'visualize' },
  ];
  
  for (const { word, action } of actionKeywords) {
    if (lowerPrompt.includes(word)) {
      actions.push(action);
    }
  }
  
  return Array.from(new Set(actions));
}

function generateSmartName(baseName: string, entities: string[], prompt: string): string {
  // If we have specific entities, use them to create a more descriptive name
  if (entities.length > 0) {
    const mainEntity = entities[0].replace(/s$/, ''); // Remove plural
    const capitalizedEntity = mainEntity.charAt(0).toUpperCase() + mainEntity.slice(1);
    
    // Check for specific patterns
    const lowerPrompt = prompt.toLowerCase();
    
    if (lowerPrompt.includes('daily') || lowerPrompt.includes('everyday')) {
      return `Daily ${capitalizedEntity} Tracker`;
    }
    if (lowerPrompt.includes('weekly')) {
      return `Weekly ${capitalizedEntity} Log`;
    }
    if (lowerPrompt.includes('monthly')) {
      return `Monthly ${capitalizedEntity} Tracker`;
    }
    
    return `My ${capitalizedEntity} Tracker`;
  }
  
  return baseName;
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
