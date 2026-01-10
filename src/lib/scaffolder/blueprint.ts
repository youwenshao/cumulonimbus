import type { 
  BlueprintState, 
  ParsedIntent, 
  ProbeQuestion, 
  ProjectSpec, 
  FieldDefinition,
  ViewConfig,
  DataStoreConfig,
  TrackerCategory,
} from './types';
import { generateId } from '@/lib/utils';

// Initialize a new blueprint state
export function createBlueprintState(): BlueprintState {
  return {
    phase: 'parse',
    questions: [],
    answers: {},
  };
}

// Update blueprint after parsing intent
export function updateBlueprintWithIntent(
  state: BlueprintState, 
  intent: ParsedIntent
): BlueprintState {
  return {
    ...state,
    phase: 'probe',
    intent,
    spec: {
      name: intent.suggestedName,
      description: `A ${intent.category} tracker for ${intent.entities.join(', ')}`,
      category: intent.category,
    },
  };
}

// Update blueprint with probe questions
export function updateBlueprintWithQuestions(
  state: BlueprintState,
  questions: ProbeQuestion[]
): BlueprintState {
  return {
    ...state,
    questions,
  };
}

// Record an answer to a probe question
export function recordAnswer(
  state: BlueprintState,
  questionId: string,
  answer: string | string[]
): BlueprintState {
  const updatedQuestions = state.questions.map(q =>
    q.id === questionId ? { ...q, answered: true } : q
  );
  
  const allAnswered = updatedQuestions.every(q => q.answered);

  return {
    ...state,
    questions: updatedQuestions,
    answers: { ...state.answers, [questionId]: answer },
    phase: allAnswered ? 'picture' : state.phase,
  };
}

// Build the full spec from answers
export function buildSpecFromAnswers(state: BlueprintState): ProjectSpec {
  const { intent, answers } = state;
  
  if (!intent) {
    throw new Error('Cannot build spec without parsed intent');
  }

  // Determine fields from answers
  const selectedFields = (answers['q_fields'] as string[]) || getDefaultFields(intent.category);
  const fields = selectedFields.map(fieldId => createFieldDefinition(fieldId, intent.category));

  // Determine views from answers
  const selectedViews = (answers['q_visualization'] as string[]) || ['table'];
  const views = selectedViews.map(viewType => createViewConfig(viewType, fields));

  const dataStore: DataStoreConfig = {
    name: 'entries',
    label: intent.suggestedName,
    fields,
  };

  return {
    name: intent.suggestedName,
    description: `A ${intent.category} tracker for ${intent.entities.join(', ')}`,
    category: intent.category,
    dataStore,
    views,
    features: {
      allowEdit: true,
      allowDelete: true,
      allowExport: false,
    },
  };
}

// Get default fields for a category
function getDefaultFields(category: TrackerCategory): string[] {
  const defaults: Record<TrackerCategory, string[]> = {
    expense: ['amount', 'category', 'date', 'description'],
    habit: ['habitName', 'completed', 'date', 'notes'],
    project: ['taskName', 'status', 'priority', 'dueDate'],
    health: ['metric', 'value', 'date', 'notes'],
    learning: ['topic', 'timeSpent', 'date', 'notes'],
    inventory: ['itemName', 'quantity', 'category', 'location'],
    time: ['activity', 'duration', 'date', 'category'],
    custom: ['name', 'value', 'date', 'notes'],
  };
  return defaults[category];
}

// Create a field definition from a field ID
function createFieldDefinition(fieldId: string, category: TrackerCategory): FieldDefinition {
  const fieldTemplates: Record<string, FieldDefinition> = {
    // Common fields
    name: { name: 'name', label: 'Name', type: 'text', required: true },
    value: { name: 'value', label: 'Value', type: 'number', required: true },
    date: { name: 'date', label: 'Date', type: 'date', required: true },
    notes: { name: 'notes', label: 'Notes', type: 'textarea', required: false },
    description: { name: 'description', label: 'Description', type: 'textarea', required: false },
    
    // Expense fields
    amount: { name: 'amount', label: 'Amount', type: 'number', required: true, placeholder: '0.00' },
    category: { 
      name: 'category', 
      label: 'Category', 
      type: 'select', 
      required: true,
      options: ['Food', 'Transport', 'Entertainment', 'Shopping', 'Bills', 'Other'],
    },
    paymentMethod: {
      name: 'paymentMethod',
      label: 'Payment Method',
      type: 'select',
      required: false,
      options: ['Cash', 'Credit Card', 'Debit Card', 'Bank Transfer', 'Other'],
    },

    // Habit fields
    habitName: { name: 'habitName', label: 'Habit', type: 'text', required: true },
    completed: { name: 'completed', label: 'Completed', type: 'boolean', required: true },
    streak: { name: 'streak', label: 'Streak', type: 'number', required: false },

    // Project fields
    taskName: { name: 'taskName', label: 'Task', type: 'text', required: true },
    status: {
      name: 'status',
      label: 'Status',
      type: 'select',
      required: true,
      options: ['To Do', 'In Progress', 'Done', 'Blocked'],
    },
    priority: {
      name: 'priority',
      label: 'Priority',
      type: 'select',
      required: false,
      options: ['Low', 'Medium', 'High', 'Urgent'],
    },
    dueDate: { name: 'dueDate', label: 'Due Date', type: 'date', required: false },
    assignee: { name: 'assignee', label: 'Assignee', type: 'text', required: false },

    // Health fields
    metric: { name: 'metric', label: 'Metric', type: 'text', required: true },
    unit: { name: 'unit', label: 'Unit', type: 'text', required: false },

    // Learning fields
    topic: { name: 'topic', label: 'Topic', type: 'text', required: true },
    timeSpent: { name: 'timeSpent', label: 'Time Spent (min)', type: 'number', required: true },
    progress: { name: 'progress', label: 'Progress (%)', type: 'number', required: false },

    // Inventory fields
    itemName: { name: 'itemName', label: 'Item', type: 'text', required: true },
    quantity: { name: 'quantity', label: 'Quantity', type: 'number', required: true },
    location: { name: 'location', label: 'Location', type: 'text', required: false },
    lastUpdated: { name: 'lastUpdated', label: 'Last Updated', type: 'date', required: false },

    // Time tracking fields
    activity: { name: 'activity', label: 'Activity', type: 'text', required: true },
    startTime: { name: 'startTime', label: 'Start Time', type: 'text', required: true },
    endTime: { name: 'endTime', label: 'End Time', type: 'text', required: false },
    duration: { name: 'duration', label: 'Duration (min)', type: 'number', required: true },
  };

  return fieldTemplates[fieldId] || { 
    name: fieldId, 
    label: fieldId.charAt(0).toUpperCase() + fieldId.slice(1), 
    type: 'text', 
    required: false 
  };
}

// Create a view configuration
function createViewConfig(viewType: string, fields: FieldDefinition[]): ViewConfig {
  switch (viewType) {
    case 'table':
      return {
        type: 'table',
        title: 'All Entries',
        config: {
          columns: fields.map(f => ({
            field: f.name,
            label: f.label,
            sortable: true,
            filterable: f.type === 'select',
          })),
          defaultSort: {
            field: 'date',
            direction: 'desc',
          },
        },
      };

    case 'chart':
      const numericField = fields.find(f => f.type === 'number');
      const dateField = fields.find(f => f.type === 'date');
      const categoryField = fields.find(f => f.type === 'select');
      
      return {
        type: 'chart',
        title: 'Trends',
        config: {
          chartType: 'bar',
          xAxis: dateField?.name || categoryField?.name || fields[0]?.name || 'date',
          yAxis: numericField?.name || 'value',
          groupBy: categoryField?.name,
          aggregation: 'sum',
        },
      };

    case 'cards':
      return {
        type: 'cards',
        title: 'Cards View',
        config: {
          titleField: fields[0]?.name || 'name',
          subtitleField: fields.find(f => f.type === 'date')?.name,
          bodyFields: fields.slice(1, 4).map(f => f.name),
        },
      };

    default:
      return createViewConfig('table', fields);
  }
}

// Generate preview HTML for the blueprint
export function generatePreviewHTML(spec: ProjectSpec): string {
  const fieldsHTML = spec.dataStore.fields
    .map(f => `
      <div class="field">
        <label>${f.label}${f.required ? ' *' : ''}</label>
        <input type="${f.type === 'number' ? 'number' : f.type === 'date' ? 'date' : 'text'}" placeholder="${f.placeholder || f.label}" />
      </div>
    `)
    .join('');

  const viewsHTML = spec.views
    .map(v => `
      <div class="view-preview">
        <h4>${v.title}</h4>
        <div class="view-type">${v.type.toUpperCase()}</div>
      </div>
    `)
    .join('');

  return `
    <div class="app-preview">
      <header>
        <h2>${spec.name}</h2>
        <p>${spec.description}</p>
      </header>
      <section class="form-preview">
        <h3>Data Entry Form</h3>
        ${fieldsHTML}
        <button>Add Entry</button>
      </section>
      <section class="views-preview">
        <h3>Views</h3>
        ${viewsHTML}
      </section>
    </div>
  `;
}
