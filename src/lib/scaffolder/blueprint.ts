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
import { CATEGORY_TEMPLATES } from './parser';
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
  console.log(`\n📝 recordAnswer:`);
  console.log(`   QuestionId: ${questionId}`);
  console.log(`   Answer: ${JSON.stringify(answer)}`);
  console.log(`   Question exists in state: ${state.questions.some(q => q.id === questionId)}`);
  
  const updatedQuestions = state.questions.map(q =>
    q.id === questionId ? { ...q, answered: true } : q
  );
  
  const allAnswered = updatedQuestions.every(q => q.answered);
  console.log(`   All answered: ${allAnswered}`);

  const newAnswers = { ...state.answers, [questionId]: answer };
  console.log(`   Updated answers object:`, JSON.stringify(newAnswers));

  return {
    ...state,
    questions: updatedQuestions,
    answers: newAnswers,
    phase: allAnswered ? 'picture' : state.phase,
  };
}

// Build the full spec from answers
export function buildSpecFromAnswers(state: BlueprintState): ProjectSpec {
  const { intent, answers } = state;

  if (!intent) {
    throw new Error('Cannot build spec without parsed intent');
  }

  // Determine fields from answers with flexible extraction
  const selectedFields = extractFieldsFromAnswers(answers, state.questions, intent.category);

  // Validate selected fields
  const validFields = validateSelectedFields(selectedFields, intent.category);
  const fields = validFields.map(fieldId => createFieldDefinition(fieldId, intent.category));

  // Determine views from answers with flexible extraction
  const selectedViews = extractViewsFromAnswers(answers, state.questions);

  // Validate selected views
  const validViews = validateSelectedViews(selectedViews);
  const views = validViews.map(viewType => createViewConfig(viewType, fields));

  const dataStore: DataStoreConfig = {
    name: 'entries',
    label: intent.suggestedName,
    fields,
  };

  // Generate a more specific description
  const description = generateDescription(intent, fields, views);

  return {
    name: intent.suggestedName,
    description,
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

// Generate a more specific and helpful description
function generateDescription(intent: ParsedIntent, fields: FieldDefinition[], views: ViewConfig[]): string {
  const parts: string[] = [];
  
  // Start with a base description
  if (intent.originalPrompt) {
    // Use original prompt context if available
    const prompt = intent.originalPrompt.toLowerCase();
    
    if (prompt.includes('daily') || prompt.includes('everyday')) {
      parts.push('Track your daily');
    } else if (prompt.includes('weekly')) {
      parts.push('Track your weekly');
    } else if (prompt.includes('monthly')) {
      parts.push('Track your monthly');
    } else {
      parts.push('Track your');
    }
  } else {
    parts.push('Track your');
  }
  
  // Add the main entity
  if (intent.entities.length > 0) {
    parts.push(intent.entities.slice(0, 2).join(' and '));
  } else {
    parts.push(intent.category + ' data');
  }
  
  // Add field highlights
  const keyFields = fields.filter(f => f.required).slice(0, 3).map(f => f.label.toLowerCase());
  if (keyFields.length > 0) {
    parts.push(`with ${keyFields.join(', ')}`);
  }
  
  // Add view capabilities
  const viewTypes = views.map(v => v.type);
  if (viewTypes.includes('chart')) {
    parts.push('and visualize trends');
  } else if (viewTypes.includes('cards')) {
    parts.push('in an organized card view');
  }
  
  return parts.join(' ') + '.';
}

// Extract fields from answers with flexible fallback strategy
function extractFieldsFromAnswers(answers: Record<string, string | string[]>, questions: ProbeQuestion[], category: TrackerCategory): string[] {
  console.log(`\n🔍 extractFieldsFromAnswers:`);
  console.log(`   Category: ${category}`);
  console.log(`   Answer keys: [${Object.keys(answers).join(', ')}]`);
  console.log(`   Question IDs: [${questions.map(q => `${q.id}(${q.category})`).join(', ')}]`);
  
  const allValidFields = getAllValidFieldsForCategory(category);
  console.log(`   Valid fields for ${category}: [${allValidFields.join(', ')}]`);
  
  // Strategy 1: Look for standard field question ID
  let selectedFields = answers['q_fields'] as string[];
  console.log(`   Strategy 1 (q_fields): ${selectedFields ? JSON.stringify(selectedFields) : 'NOT FOUND'}`);
  if (selectedFields && Array.isArray(selectedFields) && selectedFields.length > 0) {
    console.log(`   ✅ Using Strategy 1: ${selectedFields.join(', ')}`);
    return selectedFields;
  }

  // Strategy 2: Look for any data category question
  const dataQuestion = questions.find(q => q.category === 'data');
  console.log(`   Strategy 2 (data category): dataQuestion=${dataQuestion?.id || 'NOT FOUND'}`);
  if (dataQuestion && answers[dataQuestion.id]) {
    selectedFields = answers[dataQuestion.id] as string[];
    console.log(`   Strategy 2 result: ${JSON.stringify(selectedFields)}`);
    if (selectedFields && Array.isArray(selectedFields) && selectedFields.length > 0) {
      console.log(`   ✅ Using Strategy 2: ${selectedFields.join(', ')}`);
      return selectedFields;
    }
  }

  // Strategy 3: Fuzzy ID matching - look for any question ID containing 'field' or 'data'
  console.log(`   Strategy 3 (fuzzy ID matching):`);
  for (const question of questions) {
    const idLower = question.id.toLowerCase();
    if (idLower.includes('field') || idLower.includes('data') || idLower.includes('track')) {
      const answer = answers[question.id];
      console.log(`      Found fuzzy match: ${question.id} -> ${JSON.stringify(answer)}`);
      if (answer && Array.isArray(answer) && answer.length > 0) {
        console.log(`   ✅ Using Strategy 3: ${answer.join(', ')}`);
        return answer;
      }
    }
  }

  // Strategy 4: Look for any array answer containing valid field names
  console.log(`   Strategy 4 (valid field name matching):`);
  for (const [questionId, answer] of Object.entries(answers)) {
    console.log(`      Checking ${questionId}: ${JSON.stringify(answer)}`);
    if (Array.isArray(answer) && answer.length > 0) {
      // Check if answers are valid field names
      const validMatches = answer.filter(a => allValidFields.includes(a));
      console.log(`      Valid field matches: ${validMatches.join(', ')}`);
      if (validMatches.length > 0) {
        console.log(`   ✅ Using Strategy 4: ${validMatches.join(', ')}`);
        return validMatches;
      }
    }
  }

  // Strategy 5: Use option IDs from data-category questions as field mapping
  console.log(`   Strategy 5 (option ID to field mapping):`);
  const dataQuestions = questions.filter(q => q.category === 'data');
  for (const question of dataQuestions) {
    const answer = answers[question.id];
    if (answer && Array.isArray(answer) && answer.length > 0) {
      // Map answer option IDs to valid fields if needed
      const mappedFields: string[] = [];
      for (const optId of answer) {
        // Check if it's a valid field directly
        if (allValidFields.includes(optId)) {
          mappedFields.push(optId);
        } else {
          // Try to find matching option and use its ID
          const option = question.options?.find(o => o.id === optId || o.label === optId);
          if (option && allValidFields.includes(option.id)) {
            mappedFields.push(option.id);
          } else if (optId.length > 0) {
            // Use as-is if non-empty
            mappedFields.push(optId);
          }
        }
      }
      if (mappedFields.length > 0) {
        console.log(`   ✅ Using Strategy 5: ${mappedFields.join(', ')}`);
        return mappedFields;
      }
    }
  }

  // Final fallback: use defaults
  const defaults = getDefaultFields(category);
  console.log(`   ⚠️ FALLBACK: Using defaults: ${defaults.join(', ')}`);
  return defaults;
}

// Extract views from answers with flexible fallback strategy
function extractViewsFromAnswers(answers: Record<string, string | string[]>, questions: ProbeQuestion[]): string[] {
  console.log(`\n🔍 extractViewsFromAnswers:`);
  console.log(`   Answer keys: [${Object.keys(answers).join(', ')}]`);
  console.log(`   Question IDs: [${questions.map(q => `${q.id}(${q.category})`).join(', ')}]`);
  
  const viewTypes = ['table', 'chart', 'charts', 'cards', 'graph', 'list', 'summary', 'calendar'];
  const viewTypeMapping: Record<string, string> = {
    'table': 'table',
    'tables': 'table',
    'list': 'table',
    'chart': 'chart',
    'charts': 'chart',
    'graph': 'chart',
    'graphs': 'chart',
    'cards': 'cards',
    'card': 'cards',
    'calendar': 'chart',
    'summary': 'chart',
  };
  
  // Strategy 1: Look for standard visualization question ID
  let selectedViews = answers['q_visualization'] as string[];
  console.log(`   Strategy 1 (q_visualization): ${selectedViews ? JSON.stringify(selectedViews) : 'NOT FOUND'}`);
  if (selectedViews && Array.isArray(selectedViews) && selectedViews.length > 0) {
    const normalized = normalizeViewTypes(selectedViews, viewTypeMapping);
    console.log(`   ✅ Using Strategy 1: ${normalized.join(', ')}`);
    return normalized;
  }

  // Strategy 2: Look for any UI category question
  const uiQuestion = questions.find(q => q.category === 'ui');
  console.log(`   Strategy 2 (ui category): uiQuestion=${uiQuestion?.id || 'NOT FOUND'}`);
  if (uiQuestion && answers[uiQuestion.id]) {
    selectedViews = answers[uiQuestion.id] as string[];
    console.log(`   Strategy 2 result: ${JSON.stringify(selectedViews)}`);
    if (selectedViews && Array.isArray(selectedViews) && selectedViews.length > 0) {
      const normalized = normalizeViewTypes(selectedViews, viewTypeMapping);
      console.log(`   ✅ Using Strategy 2: ${normalized.join(', ')}`);
      return normalized;
    }
  }

  // Strategy 3: Fuzzy ID matching for view-related questions
  console.log(`   Strategy 3 (fuzzy ID matching for views):`);
  for (const question of questions) {
    const idLower = question.id.toLowerCase();
    if (idLower.includes('view') || idLower.includes('visual') || idLower.includes('display')) {
      const answer = answers[question.id];
      console.log(`      Found fuzzy match: ${question.id} -> ${JSON.stringify(answer)}`);
      if (answer && Array.isArray(answer) && answer.length > 0) {
        const normalized = normalizeViewTypes(answer, viewTypeMapping);
        console.log(`   ✅ Using Strategy 3: ${normalized.join(', ')}`);
        return normalized;
      }
    }
  }

  // Strategy 4: Look for view-related answers anywhere
  console.log(`   Strategy 4 (scanning for view types):`);
  for (const [questionId, answer] of Object.entries(answers)) {
    console.log(`      Checking ${questionId}: ${JSON.stringify(answer)}`);
    if (Array.isArray(answer)) {
      const viewMatches = answer.filter(a => 
        viewTypes.includes(a.toLowerCase()) || Object.keys(viewTypeMapping).includes(a.toLowerCase())
      );
      if (viewMatches.length > 0) {
        const normalized = normalizeViewTypes(viewMatches, viewTypeMapping);
        console.log(`   ✅ Using Strategy 4: ${normalized.join(', ')}`);
        return normalized;
      }
    }
  }

  // Final fallback: use table only
  console.log(`   ⚠️ FALLBACK: Using default ['table']`);
  return ['table'];
}

// Normalize view type names to standard types
function normalizeViewTypes(views: string[], mapping: Record<string, string>): string[] {
  const normalized = new Set<string>();
  for (const view of views) {
    const lower = view.toLowerCase();
    if (mapping[lower]) {
      normalized.add(mapping[lower]);
    } else if (['table', 'chart', 'cards'].includes(lower)) {
      normalized.add(lower);
    }
  }
  // Ensure at least table is included
  if (normalized.size === 0) {
    normalized.add('table');
  }
  return Array.from(normalized);
}

// Validate selected fields and provide fallbacks
function validateSelectedFields(selectedFields: string[], category: TrackerCategory): string[] {
  const allValidFields = getAllValidFieldsForCategory(category);
  const validFields = selectedFields.filter(field => allValidFields.includes(field));

  if (validFields.length === 0) {
    return getDefaultFields(category);
  }

  // Ensure we have at least 2 fields for a usable app
  if (validFields.length < 2) {
    const defaults = getDefaultFields(category);
    return [...validFields, ...defaults.slice(0, 2 - validFields.length)];
  }

  return validFields;
}

// Validate selected views and provide fallbacks
function validateSelectedViews(selectedViews: string[]): string[] {
  const validViewTypes = ['table', 'chart', 'cards'];
  const validViews = selectedViews.filter(view => validViewTypes.includes(view));

  if (validViews.length === 0) {
    return ['table'];
  }

  return validViews;
}

// Get all valid field names for a category (including template fields)
function getAllValidFieldsForCategory(category: TrackerCategory): string[] {
  const template = CATEGORY_TEMPLATES[category];
  if (!template) return [];

  // Include both template fields and some common variations
  const allFields = new Set([...template.fields]);

  // Add common field name variations
  const commonFields = ['name', 'value', 'date', 'notes', 'description', 'category', 'completed', 'status'];
  commonFields.forEach(field => allFields.add(field));

  return Array.from(allFields);
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
