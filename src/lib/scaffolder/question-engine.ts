/**
 * Adaptive Question Engine
 * Generates intelligent, context-aware questions based on user intent and previous answers
 */

import type { ParsedIntent, Question } from './types';

export interface QuestionOption {
  id: string;
  label: string;
  description?: string;
}

export interface QuestionNode {
  id: string;
  question: string;
  type: 'single' | 'multiple' | 'text';
  category: 'data' | 'logic' | 'ui' | 'integration';
  options: QuestionOption[];
  priority: number; // 1-5, higher = more important
  dependencies?: QuestionDependency[];
  skipConditions?: SkipCondition[];
  defaultAnswer?: string | string[];
}

export interface QuestionDependency {
  questionId: string;
  requiredAnswer?: string | string[];
  condition: 'equals' | 'contains' | 'not_equals' | 'exists';
}

export interface SkipCondition {
  questionId: string;
  answer: string | string[];
  condition: 'if_equals' | 'if_contains' | 'if_not_equals';
}

export interface ValidationResult {
  valid: boolean;
  error?: string;
  warning?: string;
  suggestion?: string;
}

// Template questions for each category
const CATEGORY_QUESTIONS: Record<string, QuestionNode[]> = {
  expense: [
    {
      id: 'q_fields',
      question: 'What information would you like to track for each expense?',
      type: 'multiple',
      category: 'data',
      priority: 5,
      options: [
        { id: 'amount', label: 'Amount', description: 'How much you spent' },
        { id: 'category', label: 'Category', description: 'Type of expense (Food, Transport, etc.)' },
        { id: 'description', label: 'Description', description: 'What the expense was for' },
        { id: 'date', label: 'Date', description: 'When the expense occurred' },
        { id: 'paymentMethod', label: 'Payment Method', description: 'Cash, card, etc.' },
        { id: 'receipt', label: 'Receipt/Notes', description: 'Additional details' },
      ],
      defaultAnswer: ['amount', 'category', 'date', 'description'],
    },
    {
      id: 'q_categories',
      question: 'Which expense categories would you like to use?',
      type: 'multiple',
      category: 'data',
      priority: 4,
      options: [
        { id: 'food', label: 'Food & Dining' },
        { id: 'transport', label: 'Transportation' },
        { id: 'shopping', label: 'Shopping' },
        { id: 'bills', label: 'Bills & Utilities' },
        { id: 'entertainment', label: 'Entertainment' },
        { id: 'health', label: 'Healthcare' },
        { id: 'education', label: 'Education' },
        { id: 'other', label: 'Other' },
      ],
      defaultAnswer: ['food', 'transport', 'shopping', 'bills', 'entertainment', 'other'],
      dependencies: [{ questionId: 'q_fields', requiredAnswer: 'category', condition: 'contains' }],
    },
    {
      id: 'q_visualization',
      question: 'How would you like to see your spending data?',
      type: 'multiple',
      category: 'ui',
      priority: 3,
      options: [
        { id: 'table', label: 'Data Table', description: 'See all expenses in a list' },
        { id: 'chart_pie', label: 'Pie Chart', description: 'See spending by category' },
        { id: 'chart_bar', label: 'Bar Chart', description: 'Compare categories side by side' },
        { id: 'chart_line', label: 'Trend Line', description: 'See spending over time' },
      ],
      defaultAnswer: ['table', 'chart_pie'],
    },
  ],

  habit: [
    {
      id: 'q_fields',
      question: 'What details would you like to track for each habit?',
      type: 'multiple',
      category: 'data',
      priority: 5,
      options: [
        { id: 'habitName', label: 'Habit Name', description: 'Name of the habit' },
        { id: 'completed', label: 'Completion Status', description: 'Did you complete it?' },
        { id: 'date', label: 'Date', description: 'When you did the habit' },
        { id: 'streak', label: 'Streak Count', description: 'Days in a row' },
        { id: 'notes', label: 'Notes', description: 'How it went' },
        { id: 'time', label: 'Time of Day', description: 'Morning, afternoon, evening' },
      ],
      defaultAnswer: ['habitName', 'completed', 'date', 'notes'],
    },
    {
      id: 'q_habits',
      question: 'What habits would you like to track? (You can add more later)',
      type: 'multiple',
      category: 'data',
      priority: 4,
      options: [
        { id: 'meditation', label: 'Meditation', description: 'Daily mindfulness' },
        { id: 'exercise', label: 'Exercise', description: 'Physical activity' },
        { id: 'reading', label: 'Reading', description: 'Read for 30 minutes' },
        { id: 'water', label: 'Drink Water', description: '8 glasses a day' },
        { id: 'sleep', label: 'Sleep Early', description: 'Get to bed on time' },
        { id: 'journal', label: 'Journaling', description: 'Daily reflection' },
        { id: 'custom', label: 'Custom Habit', description: "I'll add my own" },
      ],
      defaultAnswer: ['meditation', 'exercise', 'reading', 'water'],
    },
    {
      id: 'q_visualization',
      question: 'How would you like to track your progress?',
      type: 'multiple',
      category: 'ui',
      priority: 3,
      options: [
        { id: 'table', label: 'Habit Log', description: 'See all habit entries' },
        { id: 'chart_bar', label: 'Progress Chart', description: 'Visualize completion rates' },
        { id: 'cards', label: 'Habit Cards', description: 'Quick view of today\'s habits' },
      ],
      defaultAnswer: ['table', 'chart_bar'],
    },
  ],

  project: [
    {
      id: 'q_fields',
      question: 'What information do you need for each task?',
      type: 'multiple',
      category: 'data',
      priority: 5,
      options: [
        { id: 'taskName', label: 'Task Name', description: 'What needs to be done' },
        { id: 'status', label: 'Status', description: 'To Do, In Progress, Done' },
        { id: 'priority', label: 'Priority', description: 'High, Medium, Low' },
        { id: 'dueDate', label: 'Due Date', description: 'When it\'s due' },
        { id: 'assignee', label: 'Assignee', description: 'Who\'s responsible' },
        { id: 'notes', label: 'Notes', description: 'Additional details' },
        { id: 'tags', label: 'Tags/Labels', description: 'Categorize tasks' },
      ],
      defaultAnswer: ['taskName', 'status', 'priority', 'dueDate'],
    },
    {
      id: 'q_statuses',
      question: 'What task statuses would you like to use?',
      type: 'multiple',
      category: 'data',
      priority: 4,
      options: [
        { id: 'todo', label: 'To Do', description: 'Not started' },
        { id: 'inProgress', label: 'In Progress', description: 'Currently working on' },
        { id: 'review', label: 'In Review', description: 'Waiting for review' },
        { id: 'done', label: 'Done', description: 'Completed' },
        { id: 'blocked', label: 'Blocked', description: 'Stuck on something' },
      ],
      defaultAnswer: ['todo', 'inProgress', 'done'],
      dependencies: [{ questionId: 'q_fields', requiredAnswer: 'status', condition: 'contains' }],
    },
    {
      id: 'q_visualization',
      question: 'How would you like to view your tasks?',
      type: 'multiple',
      category: 'ui',
      priority: 3,
      options: [
        { id: 'table', label: 'Task List', description: 'Traditional list view' },
        { id: 'cards', label: 'Task Cards', description: 'Card-based view' },
        { id: 'chart_bar', label: 'Progress Chart', description: 'Task completion stats' },
      ],
      defaultAnswer: ['table', 'cards'],
    },
  ],

  health: [
    {
      id: 'q_metrics',
      question: 'What health metrics would you like to track?',
      type: 'multiple',
      category: 'data',
      priority: 5,
      options: [
        { id: 'weight', label: 'Weight', description: 'Body weight tracking' },
        { id: 'sleep', label: 'Sleep', description: 'Hours of sleep' },
        { id: 'water', label: 'Water Intake', description: 'Glasses of water' },
        { id: 'steps', label: 'Steps', description: 'Daily step count' },
        { id: 'bloodPressure', label: 'Blood Pressure', description: 'BP readings' },
        { id: 'heartRate', label: 'Heart Rate', description: 'Resting heart rate' },
        { id: 'mood', label: 'Mood', description: 'Daily mood tracking' },
        { id: 'calories', label: 'Calories', description: 'Calorie intake' },
      ],
      defaultAnswer: ['weight', 'sleep', 'water', 'steps'],
    },
    {
      id: 'q_visualization',
      question: 'How would you like to see your health data?',
      type: 'multiple',
      category: 'ui',
      priority: 3,
      options: [
        { id: 'table', label: 'Health Log', description: 'See all entries' },
        { id: 'chart_line', label: 'Trend Charts', description: 'See progress over time' },
        { id: 'chart_bar', label: 'Comparison Charts', description: 'Compare metrics' },
      ],
      defaultAnswer: ['table', 'chart_line'],
    },
  ],

  time: [
    {
      id: 'q_fields',
      question: 'What would you like to track for each time entry?',
      type: 'multiple',
      category: 'data',
      priority: 5,
      options: [
        { id: 'activity', label: 'Activity Name', description: 'What you worked on' },
        { id: 'duration', label: 'Duration', description: 'How long it took' },
        { id: 'category', label: 'Category', description: 'Type of activity' },
        { id: 'date', label: 'Date', description: 'When it happened' },
        { id: 'notes', label: 'Notes', description: 'Additional details' },
        { id: 'project', label: 'Project', description: 'Associated project' },
      ],
      defaultAnswer: ['activity', 'duration', 'category', 'date'],
    },
    {
      id: 'q_categories',
      question: 'What activity categories would you like?',
      type: 'multiple',
      category: 'data',
      priority: 4,
      options: [
        { id: 'work', label: 'Work', description: 'Job-related tasks' },
        { id: 'learning', label: 'Learning', description: 'Education & skills' },
        { id: 'personal', label: 'Personal', description: 'Personal tasks' },
        { id: 'admin', label: 'Admin', description: 'Administrative work' },
        { id: 'meetings', label: 'Meetings', description: 'Calls & meetings' },
        { id: 'other', label: 'Other', description: 'Everything else' },
      ],
      defaultAnswer: ['work', 'learning', 'personal', 'admin', 'other'],
      dependencies: [{ questionId: 'q_fields', requiredAnswer: 'category', condition: 'contains' }],
    },
    {
      id: 'q_visualization',
      question: 'How would you like to view your time data?',
      type: 'multiple',
      category: 'ui',
      priority: 3,
      options: [
        { id: 'table', label: 'Time Log', description: 'See all entries' },
        { id: 'chart_pie', label: 'Time Distribution', description: 'See where time goes' },
        { id: 'chart_bar', label: 'Daily Totals', description: 'Hours per day' },
      ],
      defaultAnswer: ['table', 'chart_pie'],
    },
  ],

  inventory: [
    {
      id: 'q_fields',
      question: 'What information do you need for each item?',
      type: 'multiple',
      category: 'data',
      priority: 5,
      options: [
        { id: 'itemName', label: 'Item Name', description: 'Name of the item' },
        { id: 'quantity', label: 'Quantity', description: 'How many you have' },
        { id: 'category', label: 'Category', description: 'Type of item' },
        { id: 'location', label: 'Location', description: 'Where it\'s stored' },
        { id: 'value', label: 'Value', description: 'How much it\'s worth' },
        { id: 'notes', label: 'Notes', description: 'Additional details' },
      ],
      defaultAnswer: ['itemName', 'quantity', 'category', 'location'],
    },
    {
      id: 'q_visualization',
      question: 'How would you like to view your inventory?',
      type: 'multiple',
      category: 'ui',
      priority: 3,
      options: [
        { id: 'table', label: 'Item List', description: 'See all items in a table' },
        { id: 'cards', label: 'Item Cards', description: 'Visual card layout' },
        { id: 'chart_bar', label: 'Inventory Chart', description: 'Quantity by category' },
      ],
      defaultAnswer: ['table', 'cards'],
    },
  ],

  custom: [
    {
      id: 'q_fields',
      question: 'What fields would you like for your tracker?',
      type: 'multiple',
      category: 'data',
      priority: 5,
      options: [
        { id: 'name', label: 'Name/Title', description: 'Main identifier' },
        { id: 'value', label: 'Value/Amount', description: 'A numeric value' },
        { id: 'category', label: 'Category', description: 'For organization' },
        { id: 'date', label: 'Date', description: 'When it happened' },
        { id: 'notes', label: 'Notes', description: 'Additional details' },
        { id: 'status', label: 'Status', description: 'Current state' },
      ],
      defaultAnswer: ['name', 'value', 'date', 'notes'],
    },
    {
      id: 'q_visualization',
      question: 'How would you like to view your data?',
      type: 'multiple',
      category: 'ui',
      priority: 3,
      options: [
        { id: 'table', label: 'Data Table', description: 'See all entries' },
        { id: 'chart_bar', label: 'Bar Chart', description: 'Compare values' },
        { id: 'cards', label: 'Cards', description: 'Card-based view' },
      ],
      defaultAnswer: ['table'],
    },
  ],
};

export class QuestionEngine {
  private templates: Record<string, QuestionNode[]>;

  constructor() {
    this.templates = CATEGORY_QUESTIONS;
  }

  /**
   * Generate adaptive questions based on intent and previous answers
   */
  generateAdaptiveQuestions(
    intent: ParsedIntent,
    previousAnswers: Record<string, string | string[]> = {}
  ): Question[] {
    // 1. Get template questions for the category
    const category = intent.category || 'custom';
    let questions = [...(this.templates[category] || this.templates.custom)];

    // 2. Filter based on dependencies
    questions = questions.filter(q => this.checkDependencies(q, previousAnswers));

    // 3. Filter based on skip conditions
    questions = questions.filter(q => !this.shouldSkipQuestion(q, previousAnswers));

    // 4. Sort by priority (highest first)
    questions.sort((a, b) => b.priority - a.priority);

    // 5. Limit to reasonable number (4-5 max for good UX)
    questions = questions.slice(0, 5);

    // 6. Generate follow-up questions based on answers
    const followUps = this.generateFollowUpQuestions(previousAnswers, intent);
    questions = [...questions, ...followUps].slice(0, 5);

    // 7. Convert to Question type with answered status
    return questions.map(q => ({
      id: q.id,
      question: q.question,
      type: q.type,
      category: q.category,
      options: q.options,
      answered: !!previousAnswers[q.id],
    }));
  }

  /**
   * Check if question dependencies are satisfied
   */
  private checkDependencies(
    question: QuestionNode,
    answers: Record<string, string | string[]>
  ): boolean {
    if (!question.dependencies || question.dependencies.length === 0) {
      return true;
    }

    return question.dependencies.every(dep => {
      const answer = answers[dep.questionId];
      if (!answer) {
        return dep.condition === 'exists' ? false : true; // No answer yet
      }

      switch (dep.condition) {
        case 'equals':
          return Array.isArray(answer)
            ? answer.includes(dep.requiredAnswer as string)
            : answer === dep.requiredAnswer;

        case 'contains':
          return Array.isArray(answer)
            ? answer.some(a => dep.requiredAnswer?.includes(a))
            : dep.requiredAnswer?.includes(answer);

        case 'not_equals':
          return Array.isArray(answer)
            ? !answer.includes(dep.requiredAnswer as string)
            : answer !== dep.requiredAnswer;

        case 'exists':
          return !!answer;

        default:
          return true;
      }
    });
  }

  /**
   * Check if question should be skipped based on previous answers
   */
  private shouldSkipQuestion(
    question: QuestionNode,
    answers: Record<string, string | string[]>
  ): boolean {
    if (!question.skipConditions || question.skipConditions.length === 0) {
      return false;
    }

    return question.skipConditions.some(skip => {
      const answer = answers[skip.questionId];
      if (!answer) return false;

      switch (skip.condition) {
        case 'if_equals':
          return Array.isArray(answer)
            ? answer.includes(skip.answer as string)
            : answer === skip.answer;

        case 'if_contains':
          return Array.isArray(answer)
            ? answer.some(a => (skip.answer as string[]).includes(a))
            : (skip.answer as string[]).includes(answer);

        case 'if_not_equals':
          return Array.isArray(answer)
            ? !answer.includes(skip.answer as string)
            : answer !== skip.answer;

        default:
          return false;
      }
    });
  }

  /**
   * Generate follow-up questions based on specific answers
   */
  private generateFollowUpQuestions(
    answers: Record<string, string | string[]>,
    intent: ParsedIntent
  ): QuestionNode[] {
    const followUps: QuestionNode[] = [];

    // If user selected charts, ask about chart preferences
    const visualizationAnswer = answers['q_visualization'];
    if (visualizationAnswer && Array.isArray(visualizationAnswer)) {
      const hasCharts = visualizationAnswer.some(v => v.startsWith('chart_'));
      
      if (hasCharts && !answers['q_chart_type']) {
        const selectedCharts = visualizationAnswer.filter(v => v.startsWith('chart_'));
        if (selectedCharts.length > 1) {
          followUps.push({
            id: 'q_primary_chart',
            question: 'Which chart would you like as your main visualization?',
            type: 'single',
            category: 'ui',
            priority: 2,
            options: selectedCharts.map(c => {
              const chartType = c.replace('chart_', '');
              return {
                id: chartType,
                label: `${chartType.charAt(0).toUpperCase() + chartType.slice(1)} Chart`,
              };
            }),
          });
        }
      }
    }

    // If tracking categories, ask about custom categories
    const fieldsAnswer = answers['q_fields'];
    if (fieldsAnswer && Array.isArray(fieldsAnswer) && fieldsAnswer.includes('category')) {
      if (!answers['q_custom_categories']) {
        // Check if they haven't answered category-specific question yet
        const categoryQuestion = ['q_categories', 'q_statuses', 'q_metrics'].find(q => answers[q]);
        if (!categoryQuestion) {
          followUps.push({
            id: 'q_add_custom_category',
            question: 'Would you like to add any custom categories?',
            type: 'single',
            category: 'data',
            priority: 2,
            options: [
              { id: 'yes', label: 'Yes', description: "I'll add custom ones" },
              { id: 'no', label: 'No', description: 'Defaults are fine' },
            ],
          });
        }
      }
    }

    return followUps;
  }

  /**
   * Validate an answer for a question
   */
  validateAnswer(
    question: Question,
    answer: string | string[],
    currentAnswers: Record<string, string | string[]> = {}
  ): ValidationResult {
    // Multiple choice should have at least one selection
    if (question.type === 'multiple') {
      if (!Array.isArray(answer) || answer.length === 0) {
        return {
          valid: false,
          error: 'Please select at least one option',
          suggestion: 'Choose the options that best fit your needs',
        };
      }
    }

    // Single choice should have exactly one selection
    if (question.type === 'single') {
      if (Array.isArray(answer) && answer.length !== 1) {
        return {
          valid: false,
          error: 'Please select exactly one option',
        };
      }
    }

    // Field selection should have minimum fields
    if (question.id === 'q_fields') {
      const fields = Array.isArray(answer) ? answer : [answer];
      if (fields.length < 2) {
        return {
          valid: false,
          error: 'Please select at least 2 fields',
          suggestion: 'Most trackers need a name/title and at least one data field',
        };
      }
    }

    // Warn if no date field for certain categories
    if (question.id === 'q_fields') {
      const fields = Array.isArray(answer) ? answer : [answer];
      if (!fields.includes('date') && !fields.includes('dueDate')) {
        return {
          valid: true,
          warning: 'Consider adding a date field for time-based tracking',
        };
      }
    }

    return { valid: true };
  }

  /**
   * Get the next unanswered question
   */
  getNextQuestion(
    questions: Question[],
    answers: Record<string, string | string[]>
  ): Question | null {
    return questions.find(q => !answers[q.id]) || null;
  }

  /**
   * Check if all questions are answered
   */
  areAllQuestionsAnswered(
    questions: Question[],
    answers: Record<string, string | string[]>
  ): boolean {
    return questions.every(q => !!answers[q.id]);
  }
}

// Export singleton instance
export const questionEngine = new QuestionEngine();

// Export convenient functions
export function generateQuestions(
  intent: ParsedIntent,
  previousAnswers?: Record<string, string | string[]>
): Question[] {
  return questionEngine.generateAdaptiveQuestions(intent, previousAnswers);
}

export function validateQuestionAnswer(
  question: Question,
  answer: string | string[]
): ValidationResult {
  return questionEngine.validateAnswer(question, answer);
}
