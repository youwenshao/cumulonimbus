import { complete, type ChatMessage } from '@/lib/qwen';
import type { ParsedIntent, ProbeQuestion, QuestionOption } from './types';
import { CATEGORY_TEMPLATES } from './parser';

const PROBE_SYSTEM_PROMPT = `You are a product manager helping users define their tracker app. Based on the user's intent, generate 3-5 strategic clarifying questions.

Questions should cover:
1. DATA: What specific fields/data points to track
2. LOGIC: Any calculations, rules, or automations needed
3. UI: How they want to visualize the data
4. INTEGRATION: Any external data sources or exports

Format each question as a multiple choice with 2-4 options. Make options concise and actionable.

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

export async function generateProbeQuestions(intent: ParsedIntent): Promise<ProbeQuestion[]> {
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
      "id": "q1",
      "question": "Question text?",
      "type": "single",
      "category": "data",
      "options": [
        { "id": "opt1", "label": "Option 1", "description": "Brief description" }
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
      return getDefaultQuestions(intent.category);
    }

    const parsed = JSON.parse(jsonMatch[0]) as GeneratedQuestions;
    return parsed.questions.map(q => ({
      ...q,
      answered: false,
    }));
  } catch (error) {
    console.error('Failed to generate probe questions:', error);
    return getDefaultQuestions(intent.category);
  }
}

// Fallback questions if AI generation fails
function getDefaultQuestions(category: string): ProbeQuestion[] {
  const baseQuestions: ProbeQuestion[] = [
    {
      id: 'q_fields',
      question: 'What information do you want to track for each entry?',
      type: 'multiple',
      category: 'data',
      options: getFieldOptions(category),
      answered: false,
    },
    {
      id: 'q_frequency',
      question: 'How often will you be adding new entries?',
      type: 'single',
      category: 'logic',
      options: [
        { id: 'daily', label: 'Daily', description: 'Once or more per day' },
        { id: 'weekly', label: 'Weekly', description: 'A few times per week' },
        { id: 'occasional', label: 'Occasionally', description: 'When needed' },
      ],
      answered: false,
    },
    {
      id: 'q_visualization',
      question: 'How do you want to view your data?',
      type: 'multiple',
      category: 'ui',
      options: [
        { id: 'table', label: 'Data Table', description: 'Sortable list of all entries' },
        { id: 'chart', label: 'Charts', description: 'Visual graphs and trends' },
        { id: 'summary', label: 'Summary', description: 'Key metrics at a glance' },
      ],
      answered: false,
    },
  ];

  return baseQuestions;
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
