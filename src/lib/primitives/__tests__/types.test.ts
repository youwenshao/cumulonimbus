/**
 * Unit tests for Primitives Types
 * Tests type guards and data validation utilities
 */

import type { DataRecord, FieldConfig, ViewConfig, ChartConfig, TableConfig } from '../types';

// Since types.ts only contains type definitions, we'll create helper functions
// that validate data against these types and test those.

// Type guard functions for runtime validation
function isValidFieldType(type: string): type is FieldConfig['type'] {
  return ['text', 'number', 'date', 'boolean', 'select', 'textarea'].includes(type);
}

function isValidChartType(type: string): type is ChartConfig['chartType'] {
  return ['line', 'bar', 'pie', 'area'].includes(type);
}

function isValidViewType(type: string): type is ViewConfig['type'] {
  return ['table', 'chart', 'cards'].includes(type);
}

function isValidSortOrder(order: string): order is TableConfig['sortOrder'] {
  return order === 'asc' || order === 'desc';
}

function isValidAggregation(agg: string): agg is ChartConfig['aggregation'] {
  return ['sum', 'count', 'average'].includes(agg);
}

function isValidDataRecord(record: unknown): record is DataRecord {
  if (typeof record !== 'object' || record === null) return false;
  const r = record as Record<string, unknown>;
  return (
    typeof r.id === 'string' &&
    typeof r.createdAt === 'string' &&
    typeof r.updatedAt === 'string'
  );
}

function validateFieldConfig(config: unknown): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  if (typeof config !== 'object' || config === null) {
    return { valid: false, errors: ['Config must be an object'] };
  }
  
  const c = config as Record<string, unknown>;
  
  if (typeof c.name !== 'string' || c.name.length === 0) {
    errors.push('name is required and must be a non-empty string');
  }
  
  if (typeof c.label !== 'string' || c.label.length === 0) {
    errors.push('label is required and must be a non-empty string');
  }
  
  if (typeof c.type !== 'string' || !isValidFieldType(c.type)) {
    errors.push('type must be one of: text, number, date, boolean, select, textarea');
  }
  
  if (c.type === 'select') {
    if (!Array.isArray(c.options) || c.options.length === 0) {
      errors.push('select type requires options array');
    }
  }
  
  return { valid: errors.length === 0, errors };
}

describe('Field Type Validation', () => {
  describe('isValidFieldType', () => {
    it('should accept text type', () => {
      expect(isValidFieldType('text')).toBe(true);
    });

    it('should accept number type', () => {
      expect(isValidFieldType('number')).toBe(true);
    });

    it('should accept date type', () => {
      expect(isValidFieldType('date')).toBe(true);
    });

    it('should accept boolean type', () => {
      expect(isValidFieldType('boolean')).toBe(true);
    });

    it('should accept select type', () => {
      expect(isValidFieldType('select')).toBe(true);
    });

    it('should accept textarea type', () => {
      expect(isValidFieldType('textarea')).toBe(true);
    });

    it('should reject invalid types', () => {
      expect(isValidFieldType('invalid')).toBe(false);
      expect(isValidFieldType('')).toBe(false);
      expect(isValidFieldType('string')).toBe(false);
      expect(isValidFieldType('integer')).toBe(false);
    });
  });
});

describe('Chart Type Validation', () => {
  describe('isValidChartType', () => {
    it('should accept line chart', () => {
      expect(isValidChartType('line')).toBe(true);
    });

    it('should accept bar chart', () => {
      expect(isValidChartType('bar')).toBe(true);
    });

    it('should accept pie chart', () => {
      expect(isValidChartType('pie')).toBe(true);
    });

    it('should accept area chart', () => {
      expect(isValidChartType('area')).toBe(true);
    });

    it('should reject invalid chart types', () => {
      expect(isValidChartType('scatter')).toBe(false);
      expect(isValidChartType('donut')).toBe(false);
      expect(isValidChartType('')).toBe(false);
    });
  });
});

describe('View Type Validation', () => {
  describe('isValidViewType', () => {
    it('should accept table view', () => {
      expect(isValidViewType('table')).toBe(true);
    });

    it('should accept chart view', () => {
      expect(isValidViewType('chart')).toBe(true);
    });

    it('should accept cards view', () => {
      expect(isValidViewType('cards')).toBe(true);
    });

    it('should reject invalid view types', () => {
      expect(isValidViewType('list')).toBe(false);
      expect(isValidViewType('grid')).toBe(false);
      expect(isValidViewType('kanban')).toBe(false);
    });
  });
});

describe('Sort Order Validation', () => {
  describe('isValidSortOrder', () => {
    it('should accept asc', () => {
      expect(isValidSortOrder('asc')).toBe(true);
    });

    it('should accept desc', () => {
      expect(isValidSortOrder('desc')).toBe(true);
    });

    it('should reject invalid orders', () => {
      expect(isValidSortOrder('ascending')).toBe(false);
      expect(isValidSortOrder('descending')).toBe(false);
      expect(isValidSortOrder('')).toBe(false);
    });
  });
});

describe('Aggregation Validation', () => {
  describe('isValidAggregation', () => {
    it('should accept sum', () => {
      expect(isValidAggregation('sum')).toBe(true);
    });

    it('should accept count', () => {
      expect(isValidAggregation('count')).toBe(true);
    });

    it('should accept average', () => {
      expect(isValidAggregation('average')).toBe(true);
    });

    it('should reject invalid aggregations', () => {
      expect(isValidAggregation('avg')).toBe(false);
      expect(isValidAggregation('max')).toBe(false);
      expect(isValidAggregation('min')).toBe(false);
    });
  });
});

describe('DataRecord Validation', () => {
  describe('isValidDataRecord', () => {
    it('should accept valid record', () => {
      const record = {
        id: 'abc123',
        createdAt: '2024-01-15T10:00:00Z',
        updatedAt: '2024-01-15T10:00:00Z',
        amount: 100,
        category: 'Food',
      };
      expect(isValidDataRecord(record)).toBe(true);
    });

    it('should reject record without id', () => {
      const record = {
        createdAt: '2024-01-15T10:00:00Z',
        updatedAt: '2024-01-15T10:00:00Z',
      };
      expect(isValidDataRecord(record)).toBe(false);
    });

    it('should reject record without createdAt', () => {
      const record = {
        id: 'abc123',
        updatedAt: '2024-01-15T10:00:00Z',
      };
      expect(isValidDataRecord(record)).toBe(false);
    });

    it('should reject record without updatedAt', () => {
      const record = {
        id: 'abc123',
        createdAt: '2024-01-15T10:00:00Z',
      };
      expect(isValidDataRecord(record)).toBe(false);
    });

    it('should reject null', () => {
      expect(isValidDataRecord(null)).toBe(false);
    });

    it('should reject undefined', () => {
      expect(isValidDataRecord(undefined)).toBe(false);
    });

    it('should reject primitive types', () => {
      expect(isValidDataRecord('string')).toBe(false);
      expect(isValidDataRecord(123)).toBe(false);
      expect(isValidDataRecord(true)).toBe(false);
    });

    it('should reject array', () => {
      expect(isValidDataRecord([])).toBe(false);
    });
  });
});

describe('FieldConfig Validation', () => {
  describe('validateFieldConfig', () => {
    it('should validate correct text field', () => {
      const config = {
        name: 'title',
        label: 'Title',
        type: 'text',
        required: true,
      };
      const result = validateFieldConfig(config);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should validate correct number field', () => {
      const config = {
        name: 'amount',
        label: 'Amount',
        type: 'number',
        required: true,
      };
      const result = validateFieldConfig(config);
      expect(result.valid).toBe(true);
    });

    it('should validate correct select field with options', () => {
      const config = {
        name: 'category',
        label: 'Category',
        type: 'select',
        options: ['A', 'B', 'C'],
      };
      const result = validateFieldConfig(config);
      expect(result.valid).toBe(true);
    });

    it('should reject select field without options', () => {
      const config = {
        name: 'category',
        label: 'Category',
        type: 'select',
      };
      const result = validateFieldConfig(config);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('options'))).toBe(true);
    });

    it('should reject empty options array for select', () => {
      const config = {
        name: 'category',
        label: 'Category',
        type: 'select',
        options: [],
      };
      const result = validateFieldConfig(config);
      expect(result.valid).toBe(false);
    });

    it('should reject missing name', () => {
      const config = {
        label: 'Title',
        type: 'text',
      };
      const result = validateFieldConfig(config);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('name'))).toBe(true);
    });

    it('should reject empty name', () => {
      const config = {
        name: '',
        label: 'Title',
        type: 'text',
      };
      const result = validateFieldConfig(config);
      expect(result.valid).toBe(false);
    });

    it('should reject missing label', () => {
      const config = {
        name: 'title',
        type: 'text',
      };
      const result = validateFieldConfig(config);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('label'))).toBe(true);
    });

    it('should reject invalid type', () => {
      const config = {
        name: 'title',
        label: 'Title',
        type: 'invalid',
      };
      const result = validateFieldConfig(config);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('type'))).toBe(true);
    });

    it('should reject null config', () => {
      const result = validateFieldConfig(null);
      expect(result.valid).toBe(false);
    });

    it('should reject undefined config', () => {
      const result = validateFieldConfig(undefined);
      expect(result.valid).toBe(false);
    });

    it('should validate field with placeholder', () => {
      const config = {
        name: 'title',
        label: 'Title',
        type: 'text',
        placeholder: 'Enter title...',
      };
      const result = validateFieldConfig(config);
      expect(result.valid).toBe(true);
    });

    it('should validate field with default value', () => {
      const config = {
        name: 'count',
        label: 'Count',
        type: 'number',
        defaultValue: 0,
      };
      const result = validateFieldConfig(config);
      expect(result.valid).toBe(true);
    });
  });
});

describe('Complex Scenarios', () => {
  describe('Full Form Configuration', () => {
    it('should validate complete form with multiple fields', () => {
      const fields = [
        { name: 'title', label: 'Title', type: 'text', required: true },
        { name: 'amount', label: 'Amount', type: 'number', required: true },
        { name: 'date', label: 'Date', type: 'date', required: true },
        { name: 'category', label: 'Category', type: 'select', options: ['A', 'B'] },
        { name: 'completed', label: 'Completed', type: 'boolean', required: false },
        { name: 'notes', label: 'Notes', type: 'textarea', required: false },
      ];

      const results = fields.map(f => validateFieldConfig(f));
      const allValid = results.every(r => r.valid);
      expect(allValid).toBe(true);
    });
  });

  describe('Data Record Processing', () => {
    it('should handle records with various field types', () => {
      const records = [
        {
          id: '1',
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-01T00:00:00Z',
          title: 'Test',
          amount: 100,
          date: '2024-01-01',
          completed: true,
        },
        {
          id: '2',
          createdAt: '2024-01-02T00:00:00Z',
          updatedAt: '2024-01-02T00:00:00Z',
          title: null,
          amount: 0,
          date: '',
          completed: false,
        },
      ];

      const validRecords = records.filter(isValidDataRecord);
      expect(validRecords).toHaveLength(2);
    });
  });
});

describe('Edge Cases', () => {
  describe('Type Coercion', () => {
    it('should handle numeric strings as values', () => {
      const record = {
        id: '123',
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
        amount: '100', // String instead of number
      };
      expect(isValidDataRecord(record)).toBe(true);
    });
  });

  describe('Unicode and Special Characters', () => {
    it('should handle unicode in field values', () => {
      const record = {
        id: 'unicode-test',
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
        title: '日本語タイトル 🎉',
        notes: 'Émoji: 👍💯',
      };
      expect(isValidDataRecord(record)).toBe(true);
    });

    it('should handle special characters in field name validation', () => {
      const config = {
        name: 'field_name_with_underscore',
        label: 'Field Label',
        type: 'text',
      };
      const result = validateFieldConfig(config);
      expect(result.valid).toBe(true);
    });
  });

  describe('Large Values', () => {
    it('should handle very long strings', () => {
      const record = {
        id: 'long-string-test',
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
        content: 'x'.repeat(10000),
      };
      expect(isValidDataRecord(record)).toBe(true);
    });

    it('should handle very large numbers', () => {
      const record = {
        id: 'large-number-test',
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
        amount: Number.MAX_SAFE_INTEGER,
      };
      expect(isValidDataRecord(record)).toBe(true);
    });
  });

  describe('Empty and Null Values', () => {
    it('should handle null field values', () => {
      const record = {
        id: 'null-test',
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
        title: null,
        amount: null,
      };
      expect(isValidDataRecord(record)).toBe(true);
    });

    it('should handle undefined field values', () => {
      const record = {
        id: 'undefined-test',
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
        title: undefined,
      };
      expect(isValidDataRecord(record)).toBe(true);
    });
  });
});
