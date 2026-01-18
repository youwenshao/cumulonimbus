/**
 * Unit tests for Blueprint State Management
 */

import {
  createBlueprintState,
  updateBlueprintWithIntent,
  updateBlueprintWithQuestions,
  recordAnswer,
  buildSpecFromAnswers,
  generatePreviewHTML,
} from '../blueprint';
import type {
  BlueprintState,
  ParsedIntent,
  ProbeQuestion,
  TrackerCategory,
} from '../types';

describe('createBlueprintState', () => {
  it('should create initial state with parse phase', () => {
    const state = createBlueprintState();
    expect(state.phase).toBe('parse');
  });

  it('should initialize empty questions array', () => {
    const state = createBlueprintState();
    expect(state.questions).toEqual([]);
  });

  it('should initialize empty answers object', () => {
    const state = createBlueprintState();
    expect(state.answers).toEqual({});
  });

  it('should not have intent initially', () => {
    const state = createBlueprintState();
    expect(state.intent).toBeUndefined();
  });

  it('should not have spec initially', () => {
    const state = createBlueprintState();
    expect(state.spec).toBeUndefined();
  });
});

describe('updateBlueprintWithIntent', () => {
  const mockIntent: ParsedIntent = {
    category: 'expense',
    entities: ['expenses', 'receipts'],
    actions: ['track', 'analyze'],
    relationships: ['expenses by category'],
    suggestedName: 'Expense Tracker',
    confidence: 0.85,
  };

  it('should transition to probe phase', () => {
    const state = createBlueprintState();
    const updated = updateBlueprintWithIntent(state, mockIntent);
    expect(updated.phase).toBe('probe');
  });

  it('should store intent', () => {
    const state = createBlueprintState();
    const updated = updateBlueprintWithIntent(state, mockIntent);
    expect(updated.intent).toEqual(mockIntent);
  });

  it('should initialize partial spec with name', () => {
    const state = createBlueprintState();
    const updated = updateBlueprintWithIntent(state, mockIntent);
    expect(updated.spec?.name).toBe('Expense Tracker');
  });

  it('should set spec category', () => {
    const state = createBlueprintState();
    const updated = updateBlueprintWithIntent(state, mockIntent);
    expect(updated.spec?.category).toBe('expense');
  });

  it('should generate description from entities', () => {
    const state = createBlueprintState();
    const updated = updateBlueprintWithIntent(state, mockIntent);
    expect(updated.spec?.description).toContain('expenses');
    expect(updated.spec?.description).toContain('receipts');
  });

  it('should preserve existing questions', () => {
    const state: BlueprintState = {
      ...createBlueprintState(),
      questions: [{ id: 'q1', question: 'Test?', type: 'single', category: 'data', answered: false }],
    };
    const updated = updateBlueprintWithIntent(state, mockIntent);
    expect(updated.questions).toHaveLength(1);
  });

  it('should preserve existing answers', () => {
    const state: BlueprintState = {
      ...createBlueprintState(),
      answers: { q1: 'answer1' },
    };
    const updated = updateBlueprintWithIntent(state, mockIntent);
    expect(updated.answers).toEqual({ q1: 'answer1' });
  });
});

describe('updateBlueprintWithQuestions', () => {
  const mockQuestions: ProbeQuestion[] = [
    { id: 'q_fields', question: 'What fields?', type: 'multiple', category: 'data', answered: false },
    { id: 'q_views', question: 'What views?', type: 'multiple', category: 'ui', answered: false },
  ];

  it('should add questions to state', () => {
    const state = createBlueprintState();
    const updated = updateBlueprintWithQuestions(state, mockQuestions);
    expect(updated.questions).toHaveLength(2);
  });

  it('should replace existing questions', () => {
    const state: BlueprintState = {
      ...createBlueprintState(),
      questions: [{ id: 'old', question: 'Old?', type: 'single', category: 'data', answered: false }],
    };
    const updated = updateBlueprintWithQuestions(state, mockQuestions);
    expect(updated.questions).toHaveLength(2);
    expect(updated.questions.find(q => q.id === 'old')).toBeUndefined();
  });

  it('should preserve other state properties', () => {
    const state: BlueprintState = {
      ...createBlueprintState(),
      phase: 'probe',
      answers: { q1: 'test' },
    };
    const updated = updateBlueprintWithQuestions(state, mockQuestions);
    expect(updated.phase).toBe('probe');
    expect(updated.answers).toEqual({ q1: 'test' });
  });
});

describe('recordAnswer', () => {
  const createStateWithQuestions = (): BlueprintState => ({
    phase: 'probe',
    questions: [
      { id: 'q1', question: 'Q1?', type: 'single', category: 'data', answered: false },
      { id: 'q2', question: 'Q2?', type: 'multiple', category: 'ui', answered: false },
    ],
    answers: {},
  });

  it('should record answer for question', () => {
    const state = createStateWithQuestions();
    const updated = recordAnswer(state, 'q1', 'answer1');
    expect(updated.answers['q1']).toBe('answer1');
  });

  it('should mark question as answered', () => {
    const state = createStateWithQuestions();
    const updated = recordAnswer(state, 'q1', 'answer1');
    const question = updated.questions.find(q => q.id === 'q1');
    expect(question?.answered).toBe(true);
  });

  it('should not mark other questions as answered', () => {
    const state = createStateWithQuestions();
    const updated = recordAnswer(state, 'q1', 'answer1');
    const question = updated.questions.find(q => q.id === 'q2');
    expect(question?.answered).toBe(false);
  });

  it('should record array answers', () => {
    const state = createStateWithQuestions();
    const updated = recordAnswer(state, 'q2', ['opt1', 'opt2']);
    expect(updated.answers['q2']).toEqual(['opt1', 'opt2']);
  });

  it('should transition to picture phase when all answered', () => {
    let state = createStateWithQuestions();
    state = recordAnswer(state, 'q1', 'answer1');
    state = recordAnswer(state, 'q2', ['answer2']);
    expect(state.phase).toBe('picture');
  });

  it('should stay in probe phase when not all answered', () => {
    const state = createStateWithQuestions();
    const updated = recordAnswer(state, 'q1', 'answer1');
    expect(updated.phase).toBe('probe');
  });

  it('should preserve existing answers', () => {
    let state = createStateWithQuestions();
    state = recordAnswer(state, 'q1', 'answer1');
    state = recordAnswer(state, 'q2', ['answer2']);
    expect(state.answers['q1']).toBe('answer1');
    expect(state.answers['q2']).toEqual(['answer2']);
  });

  it('should overwrite previous answer', () => {
    let state = createStateWithQuestions();
    state = recordAnswer(state, 'q1', 'first');
    state = recordAnswer(state, 'q1', 'second');
    expect(state.answers['q1']).toBe('second');
  });

  it('should handle answer for non-existent question', () => {
    const state = createStateWithQuestions();
    const updated = recordAnswer(state, 'nonexistent', 'answer');
    expect(updated.answers['nonexistent']).toBe('answer');
  });
});

describe('buildSpecFromAnswers', () => {
  const createValidState = (): BlueprintState => ({
    phase: 'picture',
    intent: {
      category: 'expense',
      entities: ['expenses'],
      actions: ['track'],
      relationships: [],
      suggestedName: 'My Expense Tracker',
      confidence: 0.8,
    },
    questions: [
      { id: 'q_fields', question: 'Fields?', type: 'multiple', category: 'data', answered: true },
      { id: 'q_visualization', question: 'Views?', type: 'multiple', category: 'ui', answered: true },
    ],
    answers: {
      q_fields: ['amount', 'category', 'date'],
      q_visualization: ['table', 'chart'],
    },
  });

  it('should throw error without intent', () => {
    const state: BlueprintState = {
      phase: 'picture',
      questions: [],
      answers: {},
    };
    expect(() => buildSpecFromAnswers(state)).toThrow('Cannot build spec without parsed intent');
  });

  it('should include app name from intent', () => {
    const state = createValidState();
    const spec = buildSpecFromAnswers(state);
    expect(spec.name).toBe('My Expense Tracker');
  });

  it('should set category from intent', () => {
    const state = createValidState();
    const spec = buildSpecFromAnswers(state);
    expect(spec.category).toBe('expense');
  });

  it('should generate description', () => {
    const state = createValidState();
    const spec = buildSpecFromAnswers(state);
    expect(spec.description).toBeTruthy();
    expect(spec.description.length).toBeGreaterThan(0);
  });

  it('should create field definitions from answers', () => {
    const state = createValidState();
    const spec = buildSpecFromAnswers(state);
    expect(spec.dataStore.fields.length).toBeGreaterThanOrEqual(3);
    expect(spec.dataStore.fields.some(f => f.name === 'amount')).toBe(true);
    expect(spec.dataStore.fields.some(f => f.name === 'category')).toBe(true);
  });

  it('should create view configs from answers', () => {
    const state = createValidState();
    const spec = buildSpecFromAnswers(state);
    expect(spec.views.length).toBeGreaterThanOrEqual(2);
    expect(spec.views.some(v => v.type === 'table')).toBe(true);
    expect(spec.views.some(v => v.type === 'chart')).toBe(true);
  });

  it('should set allow edit feature', () => {
    const state = createValidState();
    const spec = buildSpecFromAnswers(state);
    expect(spec.features.allowEdit).toBe(true);
  });

  it('should set allow delete feature', () => {
    const state = createValidState();
    const spec = buildSpecFromAnswers(state);
    expect(spec.features.allowDelete).toBe(true);
  });

  it('should handle fallback when no field answers', () => {
    const state: BlueprintState = {
      phase: 'picture',
      intent: {
        category: 'expense',
        entities: ['expenses'],
        actions: ['track'],
        relationships: [],
        suggestedName: 'Expense Tracker',
        confidence: 0.8,
      },
      questions: [],
      answers: {},
    };
    const spec = buildSpecFromAnswers(state);
    // Should use default fields
    expect(spec.dataStore.fields.length).toBeGreaterThanOrEqual(2);
  });

  it('should handle fallback when no view answers', () => {
    const state: BlueprintState = {
      phase: 'picture',
      intent: {
        category: 'expense',
        entities: ['expenses'],
        actions: ['track'],
        relationships: [],
        suggestedName: 'Expense Tracker',
        confidence: 0.8,
      },
      questions: [],
      answers: {},
    };
    const spec = buildSpecFromAnswers(state);
    // Should default to table view
    expect(spec.views.some(v => v.type === 'table')).toBe(true);
  });

  it('should create proper number field for amount', () => {
    const state = createValidState();
    const spec = buildSpecFromAnswers(state);
    const amountField = spec.dataStore.fields.find(f => f.name === 'amount');
    expect(amountField?.type).toBe('number');
  });

  it('should create proper date field', () => {
    const state = createValidState();
    const spec = buildSpecFromAnswers(state);
    const dateField = spec.dataStore.fields.find(f => f.name === 'date');
    expect(dateField?.type).toBe('date');
  });

  it('should create select field with options for category', () => {
    const state = createValidState();
    const spec = buildSpecFromAnswers(state);
    const categoryField = spec.dataStore.fields.find(f => f.name === 'category');
    expect(categoryField?.type).toBe('select');
    expect(categoryField?.options).toBeDefined();
    expect(categoryField?.options?.length).toBeGreaterThan(0);
  });

  describe('Different Categories', () => {
    const categories: TrackerCategory[] = ['habit', 'project', 'health', 'learning', 'inventory', 'time', 'custom'];

    categories.forEach(category => {
      it(`should build spec for ${category} category`, () => {
        const state: BlueprintState = {
          phase: 'picture',
          intent: {
            category,
            entities: ['items'],
            actions: ['track'],
            relationships: [],
            suggestedName: `${category} Tracker`,
            confidence: 0.8,
          },
          questions: [],
          answers: {},
        };
        const spec = buildSpecFromAnswers(state);
        expect(spec.category).toBe(category);
        expect(spec.dataStore.fields.length).toBeGreaterThan(0);
      });
    });
  });
});

describe('generatePreviewHTML', () => {
  const mockSpec = {
    name: 'Test App',
    description: 'A test app',
    category: 'expense' as TrackerCategory,
    dataStore: {
      name: 'entries',
      label: 'Entries',
      fields: [
        { name: 'amount', label: 'Amount', type: 'number' as const, required: true },
        { name: 'date', label: 'Date', type: 'date' as const, required: true },
      ],
    },
    views: [
      { type: 'table' as const, title: 'All Entries', config: {} },
      { type: 'chart' as const, title: 'Trends', config: {} },
    ],
    features: { allowEdit: true, allowDelete: true, allowExport: false },
  };

  it('should include app name', () => {
    const html = generatePreviewHTML(mockSpec);
    expect(html).toContain('Test App');
  });

  it('should include description', () => {
    const html = generatePreviewHTML(mockSpec);
    expect(html).toContain('A test app');
  });

  it('should include field labels', () => {
    const html = generatePreviewHTML(mockSpec);
    expect(html).toContain('Amount');
    expect(html).toContain('Date');
  });

  it('should mark required fields', () => {
    const html = generatePreviewHTML(mockSpec);
    expect(html).toContain('*');
  });

  it('should include view titles', () => {
    const html = generatePreviewHTML(mockSpec);
    expect(html).toContain('All Entries');
    expect(html).toContain('Trends');
  });

  it('should include view types', () => {
    const html = generatePreviewHTML(mockSpec);
    expect(html).toContain('TABLE');
    expect(html).toContain('CHART');
  });

  it('should include form section', () => {
    const html = generatePreviewHTML(mockSpec);
    expect(html).toContain('Data Entry Form');
  });

  it('should include submit button', () => {
    const html = generatePreviewHTML(mockSpec);
    expect(html).toContain('Add Entry');
  });

  it('should set correct input types', () => {
    const html = generatePreviewHTML(mockSpec);
    expect(html).toContain('type="number"');
    expect(html).toContain('type="date"');
  });
});
