/**
 * Unit tests for the Intent Parser
 */

import { getFallbackIntent, CATEGORY_TEMPLATES } from '../parser';
import type { ParsedIntent, TrackerCategory } from '../types';

describe('getFallbackIntent', () => {
  describe('Category Detection', () => {
    it('should detect expense category from expense-related keywords', () => {
      const prompts = [
        'I want to track my expenses',
        'Help me manage my spending',
        'Track money spent daily',
        'Log my purchases',
        'Budget tracking app',
        'Track costs of my business',
        'Payment tracking system',
      ];

      prompts.forEach(prompt => {
        const result = getFallbackIntent(prompt);
        expect(result.category).toBe('expense');
        expect(result.confidence).toBe(0.3); // Fallback confidence
      });
    });

    it('should detect habit category from habit-related keywords', () => {
      const prompts = [
        'Track my habits',
        'Daily routine tracker',
        'Workout logging',
        'Exercise tracker',
        'Gym sessions log',
        'Meditation tracker',
        'Morning routine app',
      ];

      prompts.forEach(prompt => {
        const result = getFallbackIntent(prompt);
        expect(result.category).toBe('habit');
      });
    });

    it('should detect project category', () => {
      const prompts = [
        'Manage my projects',
        'Task tracker',
        'Todo list app',
        'Work management',
        'Assignment tracker',
        'Deadline tracker',
      ];

      prompts.forEach(prompt => {
        const result = getFallbackIntent(prompt);
        expect(result.category).toBe('project');
      });
    });

    it('should detect health category', () => {
      // Only test prompts that have exact health-specific keywords
      // Keywords: 'health', 'fitness', 'weight', 'diet', 'calories', 'sleep', 'water', 'steps'
      const prompts = [
        'Track my health',
        'Weight tracker',
        'Diet tracking',
        'Track my calories',
        'Sleep tracker',
        'Track water intake',
        'Track my steps',
      ];

      prompts.forEach(prompt => {
        const result = getFallbackIntent(prompt);
        expect(result.category).toBe('health');
      });
    });

    it('should detect learning category', () => {
      const prompts = [
        'Learning tracker',
        'Study log',
        'Course progress',
        'Book reading tracker',
        'Skill development',
      ];

      prompts.forEach(prompt => {
        const result = getFallbackIntent(prompt);
        expect(result.category).toBe('learning');
      });
    });

    it('should detect inventory category', () => {
      // Use exact keywords from the inventory pattern
      const prompts = [
        'Inventory management',
        'Stock tracking',
        'Collection tracker',
        'Supplies tracker',
      ];

      prompts.forEach(prompt => {
        const result = getFallbackIntent(prompt);
        expect(result.category).toBe('inventory');
      });
    });

    it('should detect time category', () => {
      const prompts = [
        'Time tracking',
        'Hours logged',
        'Clock in/out',
        'Schedule management',
        'Activity log',
      ];

      prompts.forEach(prompt => {
        const result = getFallbackIntent(prompt);
        expect(result.category).toBe('time');
      });
    });

    it('should fall back to custom for unrecognized prompts', () => {
      const prompts = [
        'Random app',
        'Something unique',
        'My special tracker',
        'XYZ management',
      ];

      prompts.forEach(prompt => {
        const result = getFallbackIntent(prompt);
        expect(result.category).toBe('custom');
      });
    });

    it('should detect custom for calendar/event keywords', () => {
      // Calendar and event keywords trigger custom category
      // But 'schedule' is also in 'time' category, so it might match time first
      const prompts = [
        'Calendar tracker',
        'Event tracker',
        'Appointment tracker',
      ];

      prompts.forEach(prompt => {
        const result = getFallbackIntent(prompt);
        expect(result.category).toBe('custom');
      });
    });
  });

  describe('Entity Extraction', () => {
    it('should extract expense entity', () => {
      const result = getFallbackIntent('Track my expenses');
      expect(result.entities).toContain('expenses');
    });

    it('should extract multiple entities', () => {
      const result = getFallbackIntent('Track expenses, habits, and tasks');
      expect(result.entities).toContain('expenses');
      expect(result.entities).toContain('habits');
    });

    it('should limit entities to 3', () => {
      const result = getFallbackIntent('Track expenses habits tasks ideas notes goals events');
      expect(result.entities.length).toBeLessThanOrEqual(3);
    });

    it('should return items as default entity', () => {
      const result = getFallbackIntent('Something without known entities');
      expect(result.entities).toContain('items');
    });

    it('should dedupe entities', () => {
      const result = getFallbackIntent('expense expense expense tracking');
      const uniqueEntities = new Set(result.entities);
      expect(uniqueEntities.size).toBe(result.entities.length);
    });
  });

  describe('Action Extraction', () => {
    it('should extract track action', () => {
      const result = getFallbackIntent('I want to track my habits');
      expect(result.actions).toContain('track');
    });

    it('should extract manage action', () => {
      const result = getFallbackIntent('Manage my projects');
      expect(result.actions).toContain('manage');
    });

    it('should extract monitor action', () => {
      const result = getFallbackIntent('Monitor my health');
      expect(result.actions).toContain('monitor');
    });

    it('should extract log action', () => {
      const result = getFallbackIntent('Log my workouts');
      expect(result.actions).toContain('log');
    });

    it('should extract record action', () => {
      const result = getFallbackIntent('Record my expenses');
      expect(result.actions).toContain('record');
    });

    it('should extract analyze action', () => {
      const result = getFallbackIntent('Analyze my spending');
      expect(result.actions).toContain('analyze');
    });

    it('should extract visualize action from view', () => {
      const result = getFallbackIntent('View my data');
      expect(result.actions).toContain('visualize');
    });

    it('should extract visualize from chart keyword', () => {
      const result = getFallbackIntent('Chart my progress');
      expect(result.actions).toContain('visualize');
    });

    it('should extract multiple actions', () => {
      const result = getFallbackIntent('Track and manage my expenses, view charts');
      expect(result.actions).toContain('track');
      expect(result.actions).toContain('manage');
      expect(result.actions).toContain('visualize');
    });

    it('should return track as default action', () => {
      const result = getFallbackIntent('Something random');
      expect(result.actions).toContain('track');
    });

    it('should dedupe actions', () => {
      const result = getFallbackIntent('track track tracking');
      const uniqueActions = new Set(result.actions);
      expect(uniqueActions.size).toBe(result.actions.length);
    });
  });

  describe('Name Generation', () => {
    it('should generate name from main entity', () => {
      const result = getFallbackIntent('Track expenses');
      expect(result.suggestedName).toMatch(/Expense/i);
    });

    it('should include Daily prefix for daily keywords', () => {
      const result = getFallbackIntent('Track my daily expenses');
      expect(result.suggestedName).toMatch(/Daily/i);
    });

    it('should include Weekly prefix for weekly keywords', () => {
      const result = getFallbackIntent('Track my weekly habits');
      expect(result.suggestedName).toMatch(/Weekly/i);
    });

    it('should include Monthly prefix for monthly keywords', () => {
      // 'budget' triggers expense category, and monthly prefix
      const result = getFallbackIntent('Track my monthly expenses');
      expect(result.suggestedName).toMatch(/Monthly/i);
    });

    it('should use base category name for simple prompts', () => {
      const result = getFallbackIntent('Expense tracker');
      expect(result.suggestedName.length).toBeGreaterThan(0);
    });

    it('should handle everyday as daily', () => {
      const result = getFallbackIntent('Track everyday expenses');
      expect(result.suggestedName).toMatch(/Daily/i);
    });
  });

  describe('Original Prompt Storage', () => {
    it('should store original prompt', () => {
      const prompt = 'This is my original request';
      const result = getFallbackIntent(prompt);
      expect(result.originalPrompt).toBe(prompt);
    });
  });

  describe('Confidence Score', () => {
    it('should always return 0.3 confidence for fallback', () => {
      const prompts = ['expense tracker', 'random app', 'something weird'];
      prompts.forEach(prompt => {
        const result = getFallbackIntent(prompt);
        expect(result.confidence).toBe(0.3);
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty prompt', () => {
      const result = getFallbackIntent('');
      expect(result.category).toBe('custom');
      expect(result.entities).toContain('items');
      expect(result.actions).toContain('track');
      expect(result.suggestedName.length).toBeGreaterThan(0);
    });

    it('should handle whitespace-only prompt', () => {
      const result = getFallbackIntent('   \n\t  ');
      expect(result.category).toBe('custom');
    });

    it('should handle special characters', () => {
      const result = getFallbackIntent('Track $$$expenses!!! @#%');
      expect(result.category).toBe('expense');
    });

    it('should handle very long prompts', () => {
      const longPrompt = 'expense '.repeat(100);
      const result = getFallbackIntent(longPrompt);
      expect(result.category).toBe('expense');
    });

    it('should be case insensitive', () => {
      const lower = getFallbackIntent('expense tracker');
      const upper = getFallbackIntent('EXPENSE TRACKER');
      const mixed = getFallbackIntent('ExPeNsE TrAcKeR');
      
      expect(lower.category).toBe(upper.category);
      expect(upper.category).toBe(mixed.category);
    });

    it('should handle unicode characters', () => {
      const result = getFallbackIntent('Track expenses 💰💸');
      expect(result.category).toBe('expense');
    });

    it('should prioritize first matching category', () => {
      // Expense keywords come before habit in the pattern list
      const result = getFallbackIntent('expense and habit tracker');
      expect(result.category).toBe('expense');
    });
  });
});

describe('CATEGORY_TEMPLATES', () => {
  const categories: TrackerCategory[] = [
    'expense', 'habit', 'project', 'health', 
    'learning', 'inventory', 'time', 'custom'
  ];

  it('should have templates for all categories', () => {
    categories.forEach(category => {
      expect(CATEGORY_TEMPLATES[category]).toBeDefined();
    });
  });

  it('should have fields array for each category', () => {
    categories.forEach(category => {
      expect(Array.isArray(CATEGORY_TEMPLATES[category].fields)).toBe(true);
      expect(CATEGORY_TEMPLATES[category].fields.length).toBeGreaterThan(0);
    });
  });

  it('should have views array for each category', () => {
    categories.forEach(category => {
      expect(Array.isArray(CATEGORY_TEMPLATES[category].views)).toBe(true);
      expect(CATEGORY_TEMPLATES[category].views.length).toBeGreaterThan(0);
    });
  });

  it('should have reasonable field counts', () => {
    categories.forEach(category => {
      const fieldCount = CATEGORY_TEMPLATES[category].fields.length;
      expect(fieldCount).toBeGreaterThanOrEqual(3);
      expect(fieldCount).toBeLessThanOrEqual(8);
    });
  });

  describe('Expense Template', () => {
    it('should have amount field', () => {
      expect(CATEGORY_TEMPLATES.expense.fields).toContain('amount');
    });

    it('should have date field', () => {
      expect(CATEGORY_TEMPLATES.expense.fields).toContain('date');
    });

    it('should have category field', () => {
      expect(CATEGORY_TEMPLATES.expense.fields).toContain('category');
    });

    it('should include chart view', () => {
      expect(CATEGORY_TEMPLATES.expense.views).toContain('chart');
    });
  });

  describe('Habit Template', () => {
    it('should have completed field', () => {
      expect(CATEGORY_TEMPLATES.habit.fields).toContain('completed');
    });

    it('should have habitName field', () => {
      expect(CATEGORY_TEMPLATES.habit.fields).toContain('habitName');
    });
  });

  describe('Project Template', () => {
    it('should have status field', () => {
      expect(CATEGORY_TEMPLATES.project.fields).toContain('status');
    });

    it('should have priority field', () => {
      expect(CATEGORY_TEMPLATES.project.fields).toContain('priority');
    });

    it('should include cards view', () => {
      expect(CATEGORY_TEMPLATES.project.views).toContain('cards');
    });
  });
});
