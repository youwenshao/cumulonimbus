/**
 * Unit tests for the Spec Compiler
 */

import {
  compileSpec,
  specToPrimitives,
  generateAppConfig,
  validateSpec,
  validateSpecComplete,
  assertValidSpec,
} from '../compiler';
import type { BlueprintState, ProjectSpec, TrackerCategory } from '../types';
import { CompilationError, ValidationError } from '@/lib/error-handling/scaffolder-errors';

// Helper to create a valid state for compilation
function createValidState(): BlueprintState {
  return {
    phase: 'picture',
    intent: {
      category: 'expense',
      entities: ['expenses'],
      actions: ['track'],
      relationships: [],
      suggestedName: 'Test App',
      confidence: 0.8,
    },
    questions: [],
    answers: {
      q_fields: ['amount', 'category', 'date'],
      q_visualization: ['table'],
    },
  };
}

// Helper to create a valid spec
function createValidSpec(): ProjectSpec {
  return {
    name: 'Test App',
    description: 'A test application',
    category: 'expense',
    dataStore: {
      name: 'entries',
      label: 'Entries',
      fields: [
        { name: 'amount', label: 'Amount', type: 'number', required: true },
        { name: 'category', label: 'Category', type: 'select', required: true, options: ['Food', 'Transport'] },
        { name: 'date', label: 'Date', type: 'date', required: true },
      ],
    },
    views: [
      { type: 'table', title: 'All Entries', config: { columns: ['amount', 'category', 'date'] } },
    ],
    features: { allowEdit: true, allowDelete: true, allowExport: false },
  };
}

describe('compileSpec', () => {
  it('should compile spec from picture phase state', () => {
    const state = createValidState();
    const spec = compileSpec(state);
    expect(spec).toBeDefined();
    expect(spec.name).toBeTruthy();
  });

  it('should compile spec from plan phase state', () => {
    const state = { ...createValidState(), phase: 'plan' as const };
    const spec = compileSpec(state);
    expect(spec).toBeDefined();
  });

  it('should throw error for parse phase', () => {
    const state = { ...createValidState(), phase: 'parse' as const };
    expect(() => compileSpec(state)).toThrow(CompilationError);
  });

  it('should throw error for probe phase', () => {
    const state = { ...createValidState(), phase: 'probe' as const };
    expect(() => compileSpec(state)).toThrow(CompilationError);
  });

  it('should throw error for complete phase', () => {
    const state = { ...createValidState(), phase: 'complete' as const };
    expect(() => compileSpec(state)).toThrow(CompilationError);
  });
});

describe('specToPrimitives', () => {
  const spec = createValidSpec();

  it('should create data store primitive', () => {
    const primitives = specToPrimitives(spec);
    const dataStore = primitives.find(p => p.type === 'data-store');
    expect(dataStore).toBeDefined();
    expect(dataStore?.id).toBe('ds_entries');
  });

  it('should create input mechanism primitive', () => {
    const primitives = specToPrimitives(spec);
    const form = primitives.find(p => p.type === 'input-mechanism');
    expect(form).toBeDefined();
    expect(form?.id).toBe('form_main');
  });

  it('should create view layer primitive for each view', () => {
    const primitives = specToPrimitives(spec);
    const views = primitives.filter(p => p.type === 'view-layer');
    expect(views.length).toBe(1);
    expect(views[0].id).toBe('view_0');
  });

  it('should include data store reference in form', () => {
    const primitives = specToPrimitives(spec);
    const form = primitives.find(p => p.type === 'input-mechanism');
    expect(form?.config.dataStoreId).toBe('ds_entries');
  });

  it('should include fields in form config', () => {
    const primitives = specToPrimitives(spec);
    const form = primitives.find(p => p.type === 'input-mechanism');
    expect(form?.config.fields).toHaveLength(3);
  });

  it('should include view type in view config', () => {
    const primitives = specToPrimitives(spec);
    const view = primitives.find(p => p.type === 'view-layer');
    expect(view?.config.viewType).toBe('table');
  });

  it('should include view title in view config', () => {
    const primitives = specToPrimitives(spec);
    const view = primitives.find(p => p.type === 'view-layer');
    expect(view?.config.title).toBe('All Entries');
  });

  it('should handle multiple views', () => {
    const specWithMultipleViews = {
      ...spec,
      views: [
        { type: 'table' as const, title: 'Table', config: {} },
        { type: 'chart' as const, title: 'Chart', config: {} },
        { type: 'cards' as const, title: 'Cards', config: {} },
      ],
    };
    const primitives = specToPrimitives(specWithMultipleViews);
    const views = primitives.filter(p => p.type === 'view-layer');
    expect(views.length).toBe(3);
    expect(views[0].id).toBe('view_0');
    expect(views[1].id).toBe('view_1');
    expect(views[2].id).toBe('view_2');
  });

  it('should include schema in data store config', () => {
    const primitives = specToPrimitives(spec);
    const dataStore = primitives.find(p => p.type === 'data-store');
    expect(dataStore?.config.schema).toHaveLength(3);
    const amountSchema = dataStore?.config.schema.find((s: { name: string }) => s.name === 'amount');
    expect(amountSchema?.type).toBe('number');
    expect(amountSchema?.required).toBe(true);
  });
});

describe('generateAppConfig', () => {
  it('should generate app config with ID', () => {
    const state = createValidState();
    const config = generateAppConfig(state);
    expect(config.id).toBeTruthy();
    expect(typeof config.id).toBe('string');
  });

  it('should include app name', () => {
    const state = createValidState();
    const config = generateAppConfig(state);
    expect(config.name).toBeTruthy();
  });

  it('should include description', () => {
    const state = createValidState();
    const config = generateAppConfig(state);
    expect(config.description).toBeTruthy();
  });

  it('should include spec', () => {
    const state = createValidState();
    const config = generateAppConfig(state);
    expect(config.spec).toBeDefined();
    expect(config.spec.dataStore).toBeDefined();
  });

  it('should include primitives', () => {
    const state = createValidState();
    const config = generateAppConfig(state);
    expect(config.primitives).toBeInstanceOf(Array);
    expect(config.primitives.length).toBeGreaterThan(0);
  });

  it('should include createdAt timestamp', () => {
    const state = createValidState();
    const config = generateAppConfig(state);
    expect(config.createdAt).toBeInstanceOf(Date);
  });

  it('should generate unique IDs', () => {
    const state = createValidState();
    const config1 = generateAppConfig(state);
    const config2 = generateAppConfig(state);
    expect(config1.id).not.toBe(config2.id);
  });
});

describe('validateSpec', () => {
  describe('Valid Specs', () => {
    it('should validate a correct spec', () => {
      const spec = createValidSpec();
      const result = validateSpec(spec);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });

  describe('Invalid Specs', () => {
    it('should reject null spec', () => {
      const result = validateSpec(null as unknown as ProjectSpec);
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should reject spec without name', () => {
      const spec = { ...createValidSpec(), name: '' };
      const result = validateSpec(spec);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('name'))).toBe(true);
    });

    it('should reject spec without fields', () => {
      const spec = {
        ...createValidSpec(),
        dataStore: { ...createValidSpec().dataStore, fields: [] },
      };
      const result = validateSpec(spec);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('field'))).toBe(true);
    });

    it('should reject spec with duplicate field names', () => {
      const spec = {
        ...createValidSpec(),
        dataStore: {
          ...createValidSpec().dataStore,
          fields: [
            { name: 'amount', label: 'Amount 1', type: 'number' as const, required: true },
            { name: 'amount', label: 'Amount 2', type: 'number' as const, required: true },
          ],
        },
      };
      const result = validateSpec(spec);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('Duplicate'))).toBe(true);
    });

    it('should reject field without name', () => {
      const spec = {
        ...createValidSpec(),
        dataStore: {
          ...createValidSpec().dataStore,
          fields: [
            { name: '', label: 'Amount', type: 'number' as const, required: true },
          ],
        },
      };
      const result = validateSpec(spec);
      expect(result.valid).toBe(false);
    });

    it('should reject field without type', () => {
      const spec = {
        ...createValidSpec(),
        dataStore: {
          ...createValidSpec().dataStore,
          fields: [
            { name: 'amount', label: 'Amount', type: '' as 'text', required: true },
          ],
        },
      };
      const result = validateSpec(spec);
      expect(result.valid).toBe(false);
    });

    it('should reject select field without options', () => {
      const spec = {
        ...createValidSpec(),
        dataStore: {
          ...createValidSpec().dataStore,
          fields: [
            { name: 'status', label: 'Status', type: 'select' as const, required: true, options: [] },
          ],
        },
      };
      const result = validateSpec(spec);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('options'))).toBe(true);
    });

    it('should handle spec without views', () => {
      const spec = { ...createValidSpec(), views: [] };
      const result = validateSpec(spec);
      // Note: Empty views may result in warning, not error in current implementation
      // The comprehensive validator might accept empty views with warning
      // Testing actual behavior:
      if (!result.valid) {
        expect(result.errors.some(e => e.toLowerCase().includes('view'))).toBe(true);
      } else {
        // If valid, should have a warning about views
        expect(result.warnings?.some(w => w.toLowerCase().includes('view'))).toBe(true);
      }
    });

    it('should reject view without type', () => {
      const spec = {
        ...createValidSpec(),
        views: [{ type: '' as 'table', title: 'Test', config: {} }],
      };
      const result = validateSpec(spec);
      expect(result.valid).toBe(false);
    });
  });

  describe('Warnings', () => {
    it('should warn about missing view title', () => {
      const spec = {
        ...createValidSpec(),
        views: [{ type: 'table' as const, title: '', config: {} }],
      };
      const result = validateSpec(spec);
      expect(result.warnings?.some(w => w.includes('title'))).toBe(true);
    });
  });
});

describe('validateSpecComplete', () => {
  it('should return valid for correct spec', async () => {
    const spec = createValidSpec();
    const result = await validateSpecComplete(spec);
    expect(result.valid).toBe(true);
  });

  it('should return errors and warnings', async () => {
    const spec = { ...createValidSpec(), name: '' };
    const result = await validateSpecComplete(spec);
    expect(result.errors).toBeInstanceOf(Array);
    expect(result.warnings).toBeInstanceOf(Array);
  });
});

describe('assertValidSpec', () => {
  it('should not throw for valid spec', () => {
    const spec = createValidSpec();
    expect(() => assertValidSpec(spec)).not.toThrow();
  });

  it('should throw ValidationError for invalid spec', () => {
    const spec = { ...createValidSpec(), name: '' };
    expect(() => assertValidSpec(spec)).toThrow(ValidationError);
  });

  it('should throw with error messages', () => {
    const spec = { ...createValidSpec(), name: '' };
    try {
      assertValidSpec(spec);
      fail('Should have thrown');
    } catch (error) {
      expect(error).toBeInstanceOf(ValidationError);
      const validationError = error as ValidationError;
      expect(validationError.validationErrors.length).toBeGreaterThan(0);
    }
  });
});

describe('Edge Cases', () => {
  it('should handle spec with many fields', () => {
    const manyFields = Array.from({ length: 20 }, (_, i) => ({
      name: `field${i}`,
      label: `Field ${i}`,
      type: 'text' as const,
      required: i < 5,
    }));
    const spec = {
      ...createValidSpec(),
      dataStore: { ...createValidSpec().dataStore, fields: manyFields },
    };
    const result = validateSpec(spec);
    expect(result.valid).toBe(true);
  });

  it('should handle spec with many views', () => {
    const manyViews = Array.from({ length: 10 }, (_, i) => ({
      type: 'table' as const,
      title: `View ${i}`,
      config: {},
    }));
    const spec = { ...createValidSpec(), views: manyViews };
    const result = validateSpec(spec);
    expect(result.valid).toBe(true);
  });

  it('should handle very long field names', () => {
    const spec = {
      ...createValidSpec(),
      dataStore: {
        ...createValidSpec().dataStore,
        fields: [
          { name: 'a'.repeat(100), label: 'Long Field', type: 'text' as const, required: false },
        ],
      },
    };
    const result = validateSpec(spec);
    // Should not crash
    expect(typeof result.valid).toBe('boolean');
  });

  it('should handle special characters in field names', () => {
    const spec = {
      ...createValidSpec(),
      dataStore: {
        ...createValidSpec().dataStore,
        fields: [
          { name: 'field_with_underscore', label: 'Field', type: 'text' as const, required: false },
        ],
      },
    };
    const result = validateSpec(spec);
    // Underscores should be valid
    expect(result.valid).toBe(true);
  });
});
