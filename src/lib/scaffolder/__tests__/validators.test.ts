/**
 * Unit tests for the validation system
 */

import { 
  fieldValidator, 
  viewValidator, 
  specValidator,
  runtimeValidator 
} from '../validators';
import type { ProjectSpec, FieldDefinition, ViewDefinition } from '../validators/types';

describe('FieldValidator', () => {
  describe('validateField', () => {
    it('should validate a correct field definition', () => {
      const field: FieldDefinition = {
        name: 'amount',
        label: 'Amount',
        type: 'number',
        required: true,
      };
      
      const result = fieldValidator.validateField(field);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject empty field name', () => {
      const field: FieldDefinition = {
        name: '',
        label: 'Amount',
        type: 'number',
      };
      
      const result = fieldValidator.validateField(field);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('name is required'))).toBe(true);
    });

    it('should reject invalid field name format', () => {
      const field: FieldDefinition = {
        name: '123invalid',
        label: 'Invalid Field',
        type: 'text',
      };
      
      const result = fieldValidator.validateField(field);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('Must start with a letter'))).toBe(true);
    });

    it('should reject reserved field names', () => {
      const field: FieldDefinition = {
        name: 'id',
        label: 'ID',
        type: 'text',
      };
      
      const result = fieldValidator.validateField(field);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('reserved name'))).toBe(true);
    });

    it('should validate select field with options', () => {
      const field: FieldDefinition = {
        name: 'status',
        label: 'Status',
        type: 'select',
        options: ['Active', 'Inactive'],
      };
      
      const result = fieldValidator.validateField(field);
      expect(result.valid).toBe(true);
    });

    it('should reject select field without options', () => {
      const field: FieldDefinition = {
        name: 'status',
        label: 'Status',
        type: 'select',
        options: [],
      };
      
      const result = fieldValidator.validateField(field);
      expect(result.valid).toBe(false);
    });

    it('should warn about select with single option', () => {
      const field: FieldDefinition = {
        name: 'status',
        label: 'Status',
        type: 'select',
        options: ['Only One'],
      };
      
      const result = fieldValidator.validateField(field);
      expect(result.valid).toBe(true);
      expect(result.warnings.some(w => w.includes('only one option'))).toBe(true);
    });

    it('should validate number field min/max', () => {
      const field: FieldDefinition = {
        name: 'age',
        label: 'Age',
        type: 'number',
        validation: { min: 0, max: 120 },
      };
      
      const result = fieldValidator.validateField(field);
      expect(result.valid).toBe(true);
    });

    it('should reject invalid min/max range', () => {
      const field: FieldDefinition = {
        name: 'age',
        label: 'Age',
        type: 'number',
        validation: { min: 100, max: 10 },
      };
      
      const result = fieldValidator.validateField(field);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('cannot be greater than max'))).toBe(true);
    });
  });

  describe('validateFieldSet', () => {
    it('should validate a correct field set', () => {
      const fields: FieldDefinition[] = [
        { name: 'name', label: 'Name', type: 'text', required: true },
        { name: 'date', label: 'Date', type: 'date' },
      ];
      
      const result = fieldValidator.validateFieldSet(fields);
      expect(result.valid).toBe(true);
    });

    it('should detect duplicate field names', () => {
      const fields: FieldDefinition[] = [
        { name: 'name', label: 'Name', type: 'text' },
        { name: 'name', label: 'Another Name', type: 'text' },
      ];
      
      const result = fieldValidator.validateFieldSet(fields);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('Duplicate field names'))).toBe(true);
    });

    it('should warn about no required fields', () => {
      const fields: FieldDefinition[] = [
        { name: 'name', label: 'Name', type: 'text' },
        { name: 'notes', label: 'Notes', type: 'textarea' },
      ];
      
      const result = fieldValidator.validateFieldSet(fields);
      expect(result.valid).toBe(true);
      expect(result.warnings.some(w => w.includes('No required fields'))).toBe(true);
    });

    it('should warn about missing date field', () => {
      const fields: FieldDefinition[] = [
        { name: 'name', label: 'Name', type: 'text', required: true },
        { name: 'amount', label: 'Amount', type: 'number' },
      ];
      
      const result = fieldValidator.validateFieldSet(fields);
      expect(result.warnings.some(w => w.includes('No date field'))).toBe(true);
    });
  });
});

describe('ViewValidator', () => {
  const sampleFields: FieldDefinition[] = [
    { name: 'name', label: 'Name', type: 'text', required: true },
    { name: 'amount', label: 'Amount', type: 'number' },
    { name: 'date', label: 'Date', type: 'date' },
    { name: 'category', label: 'Category', type: 'select', options: ['A', 'B', 'C'] },
  ];

  describe('validateView', () => {
    it('should validate a correct table view', () => {
      const view: ViewDefinition = {
        type: 'table',
        title: 'All Items',
        config: {
          columns: ['name', 'amount', 'date'],
          sortBy: 'date',
          sortOrder: 'desc',
        },
      };
      
      const result = viewValidator.validateView(view, sampleFields);
      expect(result.valid).toBe(true);
    });

    it('should validate a correct chart view', () => {
      const view: ViewDefinition = {
        type: 'chart',
        title: 'Amount by Category',
        config: {
          chartType: 'pie',
          yAxis: 'amount',
          groupBy: 'category',
          aggregation: 'sum',
        },
      };
      
      const result = viewValidator.validateView(view, sampleFields);
      expect(result.valid).toBe(true);
    });

    it('should reject chart with non-existent yAxis field', () => {
      const view: ViewDefinition = {
        type: 'chart',
        title: 'Invalid Chart',
        config: {
          chartType: 'bar',
          yAxis: 'nonExistent',
        },
      };
      
      const result = viewValidator.validateView(view, sampleFields);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('does not exist'))).toBe(true);
    });

    it('should validate cards view with titleField', () => {
      const view: ViewDefinition = {
        type: 'cards',
        title: 'Item Cards',
        config: {
          titleField: 'name',
          subtitleField: 'category',
          layout: 'grid',
        },
      };
      
      const result = viewValidator.validateView(view, sampleFields);
      expect(result.valid).toBe(true);
    });

    it('should reject cards view without titleField', () => {
      const view: ViewDefinition = {
        type: 'cards',
        title: 'Item Cards',
        config: {
          layout: 'grid',
        },
      };
      
      const result = viewValidator.validateView(view, sampleFields);
      expect(result.valid).toBe(false);
    });
  });
});

describe('SpecValidator', () => {
  const validSpec: ProjectSpec = {
    name: 'Test App',
    description: 'A test application',
    category: 'expense',
    dataStore: {
      name: 'entries',
      label: 'Entries',
      fields: [
        { name: 'amount', label: 'Amount', type: 'number', required: true },
        { name: 'category', label: 'Category', type: 'select', options: ['Food', 'Transport'] },
        { name: 'date', label: 'Date', type: 'date', required: true },
      ],
    },
    views: [
      { type: 'table', title: 'All Entries', config: { columns: ['amount', 'category', 'date'] } },
      { type: 'chart', title: 'By Category', config: { chartType: 'pie', yAxis: 'amount', groupBy: 'category' } },
    ],
    features: { allowEdit: true, allowDelete: true },
  };

  describe('validateSpec', () => {
    it('should validate a correct spec', () => {
      const result = specValidator.validateSpec(validSpec);
      expect(result.valid).toBe(true);
    });

    it('should reject spec without name', () => {
      const invalidSpec = { ...validSpec, name: '' };
      const result = specValidator.validateSpec(invalidSpec);
      expect(result.valid).toBe(false);
    });

    it('should reject spec without fields', () => {
      const invalidSpec = {
        ...validSpec,
        dataStore: { ...validSpec.dataStore, fields: [] },
      };
      const result = specValidator.validateSpec(invalidSpec);
      expect(result.valid).toBe(false);
    });

    it('should warn about missing views', () => {
      const specNoViews = { ...validSpec, views: [] };
      const result = specValidator.validateSpec(specNoViews);
      expect(result.valid).toBe(true);
      expect(result.warnings.some(w => w.includes('No views'))).toBe(true);
    });
  });

  describe('isValid', () => {
    it('should return true for valid spec', () => {
      expect(specValidator.isValid(validSpec)).toBe(true);
    });

    it('should return false for invalid spec', () => {
      const invalidSpec = { ...validSpec, name: '' };
      expect(specValidator.isValid(invalidSpec)).toBe(false);
    });
  });
});

describe('RuntimeValidator', () => {
  const validSpec: ProjectSpec = {
    name: 'Test App',
    description: 'A test application',
    category: 'expense',
    dataStore: {
      name: 'entries',
      label: 'Entries',
      fields: [
        { name: 'amount', label: 'Amount', type: 'number', required: true },
        { name: 'category', label: 'Category', type: 'select', options: ['Food', 'Transport'] },
        { name: 'date', label: 'Date', type: 'date' },
      ],
    },
    views: [
      { type: 'table', title: 'All Entries', config: { columns: ['amount', 'category', 'date'] } },
      { type: 'chart', title: 'By Category', config: { chartType: 'pie', yAxis: 'amount', groupBy: 'category' } },
    ],
  };

  describe('validateBeforeGeneration', () => {
    it('should validate a correct spec for runtime', async () => {
      const result = await runtimeValidator.validateBeforeGeneration(validSpec);
      expect(result.valid).toBe(true);
    });

    it('should detect non-numeric yAxis with sum aggregation', async () => {
      const invalidSpec: ProjectSpec = {
        ...validSpec,
        views: [
          {
            type: 'chart',
            title: 'Invalid Chart',
            config: {
              chartType: 'bar',
              yAxis: 'category', // Not numeric
              aggregation: 'sum',
            },
          },
        ],
      };
      
      const result = await runtimeValidator.validateBeforeGeneration(invalidSpec);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('non-numeric'))).toBe(true);
    });
  });

  describe('validateSerializable', () => {
    it('should confirm spec is serializable', () => {
      const result = runtimeValidator.validateSerializable(validSpec);
      expect(result.valid).toBe(true);
    });
  });
});
