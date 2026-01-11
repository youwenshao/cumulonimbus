/**
 * Unit tests for the Question Engine
 */

import { 
  questionEngine, 
  generateQuestions, 
  validateQuestionAnswer 
} from '../question-engine';
import type { ParsedIntent, Question } from '../types';

describe('QuestionEngine', () => {
  describe('generateAdaptiveQuestions', () => {
    it('should generate questions for expense category', () => {
      const intent: ParsedIntent = {
        category: 'expense',
        entities: ['expenses'],
        actions: ['track'],
        relationships: [],
        suggestedName: 'Expense Tracker',
        confidence: 0.8,
      };

      const questions = questionEngine.generateAdaptiveQuestions(intent);
      
      expect(questions.length).toBeGreaterThan(0);
      expect(questions.length).toBeLessThanOrEqual(5);
      expect(questions.some(q => q.id === 'q_fields')).toBe(true);
    });

    it('should generate questions for habit category', () => {
      const intent: ParsedIntent = {
        category: 'habit',
        entities: ['habits'],
        actions: ['track'],
        relationships: [],
        suggestedName: 'Habit Tracker',
        confidence: 0.8,
      };

      const questions = questionEngine.generateAdaptiveQuestions(intent);
      
      expect(questions.length).toBeGreaterThan(0);
      expect(questions.some(q => q.category === 'data')).toBe(true);
    });

    it('should generate questions for project category', () => {
      const intent: ParsedIntent = {
        category: 'project',
        entities: ['tasks'],
        actions: ['manage'],
        relationships: [],
        suggestedName: 'Task Manager',
        confidence: 0.8,
      };

      const questions = questionEngine.generateAdaptiveQuestions(intent);
      
      expect(questions.length).toBeGreaterThan(0);
    });

    it('should generate fallback questions for custom category', () => {
      const intent: ParsedIntent = {
        category: 'custom',
        entities: ['items'],
        actions: ['track'],
        relationships: [],
        suggestedName: 'Custom Tracker',
        confidence: 0.5,
      };

      const questions = questionEngine.generateAdaptiveQuestions(intent);
      
      expect(questions.length).toBeGreaterThan(0);
    });

    it('should filter questions based on previous answers', () => {
      const intent: ParsedIntent = {
        category: 'expense',
        entities: ['expenses'],
        actions: ['track'],
        relationships: [],
        suggestedName: 'Expense Tracker',
        confidence: 0.8,
      };

      // First call without answers
      const questionsFirst = questionEngine.generateAdaptiveQuestions(intent);
      
      // Mark first question as answered
      const previousAnswers = {
        [questionsFirst[0].id]: questionsFirst[0].options.map(o => o.id),
      };

      // Second call with answers
      const questionsSecond = questionEngine.generateAdaptiveQuestions(intent, previousAnswers);
      
      // The answered question should be marked
      expect(questionsSecond.some(q => q.id === questionsFirst[0].id && q.answered)).toBe(true);
    });

    it('should sort questions by priority', () => {
      const intent: ParsedIntent = {
        category: 'expense',
        entities: ['expenses'],
        actions: ['track'],
        relationships: [],
        suggestedName: 'Expense Tracker',
        confidence: 0.8,
      };

      const questions = questionEngine.generateAdaptiveQuestions(intent);
      
      // First question should be highest priority (q_fields is priority 5)
      expect(questions[0].id).toBe('q_fields');
    });
  });

  describe('validateAnswer', () => {
    it('should accept valid multiple choice answer', () => {
      const question: Question = {
        id: 'q_fields',
        question: 'What fields?',
        type: 'multiple',
        category: 'data',
        options: [
          { id: 'field1', label: 'Field 1' },
          { id: 'field2', label: 'Field 2' },
          { id: 'field3', label: 'Field 3' },
        ],
        answered: false,
      };

      const result = questionEngine.validateAnswer(question, ['field1', 'field2']);
      expect(result.valid).toBe(true);
    });

    it('should reject empty multiple choice answer', () => {
      const question: Question = {
        id: 'q_fields',
        question: 'What fields?',
        type: 'multiple',
        category: 'data',
        options: [
          { id: 'field1', label: 'Field 1' },
        ],
        answered: false,
      };

      const result = questionEngine.validateAnswer(question, []);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('at least one');
    });

    it('should require minimum fields for q_fields question', () => {
      const question: Question = {
        id: 'q_fields',
        question: 'What fields?',
        type: 'multiple',
        category: 'data',
        options: [
          { id: 'field1', label: 'Field 1' },
          { id: 'field2', label: 'Field 2' },
          { id: 'field3', label: 'Field 3' },
        ],
        answered: false,
      };

      const result = questionEngine.validateAnswer(question, ['field1']);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('at least 2 fields');
    });

    it('should warn about missing date field', () => {
      const question: Question = {
        id: 'q_fields',
        question: 'What fields?',
        type: 'multiple',
        category: 'data',
        options: [
          { id: 'name', label: 'Name' },
          { id: 'amount', label: 'Amount' },
          { id: 'date', label: 'Date' },
        ],
        answered: false,
      };

      const result = questionEngine.validateAnswer(question, ['name', 'amount']);
      expect(result.valid).toBe(true);
      expect(result.warning).toContain('date field');
    });
  });

  describe('getNextQuestion', () => {
    it('should return next unanswered question', () => {
      const questions: Question[] = [
        { id: 'q1', question: 'Q1?', type: 'single', category: 'data', options: [], answered: false },
        { id: 'q2', question: 'Q2?', type: 'single', category: 'data', options: [], answered: false },
      ];

      const answers = { q1: 'answer1' };
      const next = questionEngine.getNextQuestion(questions, answers);
      
      expect(next?.id).toBe('q2');
    });

    it('should return null when all questions answered', () => {
      const questions: Question[] = [
        { id: 'q1', question: 'Q1?', type: 'single', category: 'data', options: [], answered: false },
      ];

      const answers = { q1: 'answer1' };
      const next = questionEngine.getNextQuestion(questions, answers);
      
      expect(next).toBeNull();
    });
  });

  describe('areAllQuestionsAnswered', () => {
    it('should return true when all questions answered', () => {
      const questions: Question[] = [
        { id: 'q1', question: 'Q1?', type: 'single', category: 'data', options: [], answered: false },
        { id: 'q2', question: 'Q2?', type: 'single', category: 'data', options: [], answered: false },
      ];

      const answers = { q1: 'answer1', q2: 'answer2' };
      const allAnswered = questionEngine.areAllQuestionsAnswered(questions, answers);
      
      expect(allAnswered).toBe(true);
    });

    it('should return false when some questions unanswered', () => {
      const questions: Question[] = [
        { id: 'q1', question: 'Q1?', type: 'single', category: 'data', options: [], answered: false },
        { id: 'q2', question: 'Q2?', type: 'single', category: 'data', options: [], answered: false },
      ];

      const answers = { q1: 'answer1' };
      const allAnswered = questionEngine.areAllQuestionsAnswered(questions, answers);
      
      expect(allAnswered).toBe(false);
    });
  });
});

describe('generateQuestions helper', () => {
  it('should be a convenient wrapper for questionEngine', () => {
    const intent: ParsedIntent = {
      category: 'expense',
      entities: [],
      actions: [],
      relationships: [],
      suggestedName: 'Test',
      confidence: 0.5,
    };

    const questions = generateQuestions(intent);
    expect(Array.isArray(questions)).toBe(true);
    expect(questions.length).toBeGreaterThan(0);
  });
});

describe('validateQuestionAnswer helper', () => {
  it('should be a convenient wrapper for questionEngine.validateAnswer', () => {
    const question: Question = {
      id: 'q_test',
      question: 'Test?',
      type: 'multiple',
      category: 'data',
      options: [{ id: 'opt1', label: 'Option 1' }],
      answered: false,
    };

    const result = validateQuestionAnswer(question, ['opt1']);
    expect(result.valid).toBe(true);
  });
});
