import { complete, type ChatMessage } from '@/lib/qwen';
import type { ParsedIntent, ProbeQuestion, QuestionOption } from './types';
import { CATEGORY_TEMPLATES } from './parser';
import { generateQuestions } from './question-engine';

const PROBE_SYSTEM_PROMPT = `You are a product manager helping users define their tracker app. Based on the user's intent, generate 3-5 strategic clarifying questions.

CRITICAL ID REQUIREMENTS:
- Use specific question IDs based on category: "q_fields" for data, "q_visualization" for UI, "q_frequency" for logic, "q_integration" for integration
- Use field names from the suggested fields as option IDs (e.g., "habitName", "completed", "date", "notes")
- This ensures the app can be properly built from your answers

Questions should cover:
1. DATA (id: "q_fields"): What specific fields/data points to track
2. LOGIC (id: "q_frequency"): Any calculations, rules, or automations needed
3. UI (id: "q_visualization"): How would you prefer to visualize the data
4. INTEGRATION (id: "q_integration"): Any external data sources or exports

Format each question as a multiple choice with 2-4 options. Make options concise and actionable.
Use the suggested field names as option IDs.

Respond with JSON only.`;

interface GeneratedQuestions {
  questions: {
    id: string;
    question: string;
    type: 'single' | 'multiple';
    category: 'data' | 'logic' | 'ui' | 'integration';
    options: { id: string; label: string; description?: string }[];
  }[];
}

// Validate and fix question IDs to match expected format
function validateAndFixQuestionIds(questions: GeneratedQuestions['questions'], category: string): GeneratedQuestions['questions'] {
  const requiredCategories = ['data', 'ui'];
  const categoryIdMap: Record<string, string> = {
    'data': 'q_fields',
    'logic': 'q_frequency',
    'ui': 'q_visualization',
    'integration': 'q_integration'
  };

  const validated: GeneratedQuestions['questions'] = [];
  const usedCategories = new Set<string>();

  // First pass: fix IDs for existing questions
  for (const question of questions) {
    let fixedQuestion = { ...question };

    // Fix ID if it's not in the expected format
    const expectedId = categoryIdMap[question.category];
    if (expectedId && question.id !== expectedId) {
      console.log(`🔧 Fixing question ID from "${question.id}" to "${expectedId}" for category "${question.category}"`);
      fixedQuestion.id = expectedId;
    }

    // Ensure options have valid IDs (field names from template)
    const template = CATEGORY_TEMPLATES[category as keyof typeof CATEGORY_TEMPLATES];
    if (template && question.category === 'data') {
      fixedQuestion.options = fixedQuestion.options.map(option => {
        // If option ID doesn't match a template field, try to map it
        if (!template.fields.includes(option.id)) {
          // Map common variations
          const idMapping: Record<string, string> = {
            'habitName': 'habitName',
            'completed': 'completed',
            'date': 'date',
            'notes': 'notes',
            'name': 'name',
            'value': 'value'
          };

          const mappedId = idMapping[option.id] || template.fields[validated.length % template.fields.length];
          console.log(`🔧 Mapping option ID from "${option.id}" to "${mappedId}"`);
          return { ...option, id: mappedId };
        }
        return option;
      });
    }

    validated.push(fixedQuestion);
    usedCategories.add(question.category);
  }

  // Second pass: ensure required categories are covered
  for (const requiredCategory of requiredCategories) {
    if (!usedCategories.has(requiredCategory)) {
      console.log(`⚠️ Missing required category "${requiredCategory}", adding default question`);
      const defaultQuestion = getDefaultQuestionForCategory(requiredCategory, category);
      if (defaultQuestion) {
        validated.push(defaultQuestion);
      }
    }
  }

  return validated.slice(0, 5); // Limit to 5 questions max
}

function getDefaultQuestionForCategory(category: string, trackerCategory: string): GeneratedQuestions['questions'][0] | null {
  const defaults: Record<string, GeneratedQuestions['questions'][0]> = {
    'data': {
      id: 'q_fields',
      question: 'What information do you want to track for each entry?',
      type: 'multiple',
      category: 'data',
      options: getFieldOptions(trackerCategory).slice(0, 4) // Limit options
    },
    'ui': {
      id: 'q_visualization',
      question: 'How do you want to view your data?',
      type: 'multiple',
      category: 'ui',
      options: [
        { id: 'table', label: 'Data Table', description: 'Sortable list of all entries' },
        { id: 'chart', label: 'Charts', description: 'Visual graphs and trends' }
      ]
    }
  };

  return defaults[category] || null;
}

export async function generateProbeQuestions(intent: ParsedIntent, conversationId?: string): Promise<ProbeQuestion[]> {
  const template = CATEGORY_TEMPLATES[intent.category];
  
  const messages: ChatMessage[] = [
    { role: 'system', content: PROBE_SYSTEM_PROMPT },
    { 
      role: 'user', 
      content: `The user wants to build a ${intent.category} tracker.
      
Entities to track: ${intent.entities.join(', ')}
Actions: ${intent.actions.join(', ')}
Relationships: ${intent.relationships.join(', ')}
Suggested fields: ${template.fields.join(', ')}

Generate 3-5 clarifying questions as JSON with this format:
{
  "questions": [
    {
      "id": "q_fields",
      "question": "What specific data points do you want to track?",
      "type": "multiple",
      "category": "data",
      "options": [
        { "id": "habitName", "label": "Habit Name", "description": "Name of the habit" },
        { "id": "completed", "label": "Completed", "description": "Whether the habit was done" },
        { "id": "date", "label": "Date", "description": "When the habit was tracked" }
      ]
    }
  ]
}` 
    },
  ];

  try {
    const response = await complete({
      messages,
      temperature: 0.5,
    });

    // Extract JSON from response
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      if (conversationId) {
        const { emitStatus } = await import('@/app/api/scaffolder/status/[conversationId]/route');
        emitStatus(conversationId, 'probe', 'Using standard questions...', {
          severity: 'info',
          technicalDetails: 'AI response did not contain valid JSON',
          progress: 50,
        });
      }
      return getDefaultQuestions(intent.category);
    }

    const parsed = JSON.parse(jsonMatch[0]) as GeneratedQuestions;

    // Validate and fix question IDs
    const validatedQuestions = validateAndFixQuestionIds(parsed.questions, intent.category);

    return validatedQuestions.map(q => ({
      ...q,
      answered: false,
    }));
  } catch (error: any) {
    // Emit error status if conversationId provided
    if (conversationId) {
      const { emitStatus } = await import('@/app/api/scaffolder/status/[conversationId]/route');
      
      if (error.status === 429) {
        emitStatus(conversationId, 'probe', 'AI service rate limited, using standard questions...', {
          severity: 'warning',
          technicalDetails: `Rate limit error: ${error.message}`,
          progress: 50,
        });
      } else {
        emitStatus(conversationId, 'probe', 'Using standard questions...', {
          severity: 'info',
          technicalDetails: `AI unavailable: ${error.message}`,
          progress: 50,
        });
      }
    }

    console.error('❌ Failed to generate probe questions, using defaults:', error);
    console.log('🔄 Using default questions for category:', intent.category);
    return getDefaultQuestions(intent.category);
  }
}

// Fallback questions using the Question Engine
function getDefaultQuestions(category: string): ProbeQuestion[] {
  // Use the question engine for intelligent, category-aware defaults
  const intent: ParsedIntent = {
    category: category as ParsedIntent['category'],
    entities: [],
    actions: ['track'],
    relationships: [],
    suggestedName: 'My Tracker',
    confidence: 0.5,
  };

  const questions = generateQuestions(intent);
  
  // Convert to ProbeQuestion format
  return questions.map(q => ({
    id: q.id,
    question: q.question,
    type: q.type,
    category: q.category,
    options: q.options,
    answered: false,
  }));
}

function getFieldOptions(category: string): QuestionOption[] {
  const fieldMap: Record<string, QuestionOption[]> = {
    expense: [
      { id: 'amount', label: 'Amount', description: 'How much was spent' },
      { id: 'category', label: 'Category', description: 'Type of expense' },
      { id: 'date', label: 'Date', description: 'When it occurred' },
      { id: 'description', label: 'Description', description: 'Notes about the expense' },
      { id: 'paymentMethod', label: 'Payment Method', description: 'How you paid' },
    ],
    habit: [
      { id: 'habitName', label: 'Habit Name', description: 'What habit to track' },
      { id: 'completed', label: 'Completion Status', description: 'Done or not' },
      { id: 'date', label: 'Date', description: 'When it was done' },
      { id: 'notes', label: 'Notes', description: 'Additional context' },
    ],
    project: [
      { id: 'taskName', label: 'Task Name', description: 'What to do' },
      { id: 'status', label: 'Status', description: 'Progress state' },
      { id: 'priority', label: 'Priority', description: 'How important' },
      { id: 'dueDate', label: 'Due Date', description: 'When it is due' },
    ],
  };

  return fieldMap[category] || [
    { id: 'name', label: 'Name', description: 'Entry name' },
    { id: 'value', label: 'Value', description: 'Main data point' },
    { id: 'date', label: 'Date', description: 'When it occurred' },
    { id: 'notes', label: 'Notes', description: 'Additional info' },
  ];
}
