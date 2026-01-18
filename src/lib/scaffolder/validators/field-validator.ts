/**
 * Field-level validation for app specifications
 * Validates individual field definitions for correctness
 */

import type { FieldDefinition, ValidationResult } from './types';

// Valid field types
const VALID_FIELD_TYPES = [
  'text', 'number', 'date', 'select', 'textarea', 
  'checkbox', 'email', 'url', 'time'
] as const;

// Reserved field names that shouldn't be used
const RESERVED_FIELD_NAMES = [
  'id', 'createdAt', 'updatedAt', 'deletedAt', 'userId', 
  'appId', 'type', 'class', 'constructor', 'prototype'
];

// Field name pattern (must start with letter, alphanumeric and underscore only)
const FIELD_NAME_PATTERN = /^[a-zA-Z][a-zA-Z0-9_]*$/;

export class FieldValidator {
  /**
   * Validate a single field definition
   */
  validateField(field: FieldDefinition, index?: number): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    const fieldRef = index !== undefined ? `Field #${index + 1}` : `Field "${field.name}"`;

    // Required properties validation
    if (!field.name || field.name.trim().length === 0) {
      errors.push(`${fieldRef}: Field name is required`);
    } else {
      // Name format validation
      if (!FIELD_NAME_PATTERN.test(field.name)) {
        errors.push(
          `${fieldRef}: Invalid field name "${field.name}". ` +
          `Must start with a letter and contain only letters, numbers, and underscores.`
        );
      }

      // Reserved name check
      if (RESERVED_FIELD_NAMES.includes(field.name.toLowerCase())) {
        errors.push(`${fieldRef}: "${field.name}" is a reserved name and cannot be used`);
      }

      // Name length check
      if (field.name.length > 50) {
        errors.push(`${fieldRef}: Field name must be 50 characters or less`);
      }
    }

    // Label validation
    if (!field.label || field.label.trim().length === 0) {
      warnings.push(`${fieldRef}: Label is missing. Using field name as label.`);
    } else if (field.label.length > 100) {
      errors.push(`${fieldRef}: Label must be 100 characters or less`);
    }

    // Type validation
    if (!field.type) {
      errors.push(`${fieldRef}: Field type is required`);
    } else if (!VALID_FIELD_TYPES.includes(field.type as typeof VALID_FIELD_TYPES[number])) {
      errors.push(
        `${fieldRef}: Invalid field type "${field.type}". ` +
        `Valid types: ${VALID_FIELD_TYPES.join(', ')}`
      );
    }

    // Type-specific validation
    if (field.type === 'select') {
      this.validateSelectField(field, fieldRef, errors, warnings);
    }

    if (field.type === 'number') {
      this.validateNumberField(field, fieldRef, errors, warnings);
    }

    if (field.type === 'text' || field.type === 'textarea') {
      this.validateTextField(field, fieldRef, errors, warnings);
    }

    // Validation rules validation
    if (field.validation) {
      this.validateValidationRules(field, fieldRef, errors, warnings);
    }

    // Default value validation
    if (field.defaultValue !== undefined) {
      this.validateDefaultValue(field, fieldRef, errors, warnings);
    }

    // Placeholder validation
    if (field.placeholder && field.placeholder.length > 200) {
      warnings.push(`${fieldRef}: Placeholder is very long (${field.placeholder.length} chars)`);
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Validate select field specifics
   */
  private validateSelectField(
    field: FieldDefinition,
    fieldRef: string,
    errors: string[],
    warnings: string[]
  ): void {
    if (!field.options || !Array.isArray(field.options)) {
      errors.push(`${fieldRef}: Select field must have options array`);
      return;
    }

    if (field.options.length === 0) {
      errors.push(`${fieldRef}: Select field must have at least one option`);
    } else if (field.options.length === 1) {
      warnings.push(`${fieldRef}: Select field has only one option. Consider using a different field type.`);
    }

    if (field.options.length > 100) {
      warnings.push(`${fieldRef}: Select field has many options (${field.options.length}). Consider using a search/autocomplete.`);
    }

    // Check for duplicate options
    const uniqueOptions = new Set(field.options.map(o => o.toLowerCase()));
    if (uniqueOptions.size !== field.options.length) {
      warnings.push(`${fieldRef}: Select field has duplicate options`);
    }

    // Check for empty options
    if (field.options.some(o => !o || o.trim().length === 0)) {
      errors.push(`${fieldRef}: Select options cannot be empty`);
    }
  }

  /**
   * Validate number field specifics
   */
  private validateNumberField(
    field: FieldDefinition,
    fieldRef: string,
    errors: string[],
    warnings: string[]
  ): void {
    if (field.validation) {
      const { min, max } = field.validation;

      if (min !== undefined && max !== undefined) {
        if (min > max) {
          errors.push(`${fieldRef}: min value (${min}) cannot be greater than max value (${max})`);
        } else if (min === max) {
          warnings.push(`${fieldRef}: min equals max (${min}). Field will only accept one value.`);
        }
      }

      if (min !== undefined && !Number.isFinite(min)) {
        errors.push(`${fieldRef}: min must be a valid number`);
      }

      if (max !== undefined && !Number.isFinite(max)) {
        errors.push(`${fieldRef}: max must be a valid number`);
      }
    }
  }

  /**
   * Validate text/textarea field specifics
   */
  private validateTextField(
    field: FieldDefinition,
    fieldRef: string,
    errors: string[],
    warnings: string[]
  ): void {
    if (field.validation) {
      const { minLength, maxLength } = field.validation;

      if (minLength !== undefined && maxLength !== undefined) {
        if (minLength > maxLength) {
          errors.push(`${fieldRef}: minLength (${minLength}) cannot be greater than maxLength (${maxLength})`);
        }
      }

      if (minLength !== undefined && minLength < 0) {
        errors.push(`${fieldRef}: minLength cannot be negative`);
      }

      if (maxLength !== undefined && maxLength < 1) {
        errors.push(`${fieldRef}: maxLength must be at least 1`);
      }

      // Pattern validation
      if (field.validation.pattern) {
        try {
          new RegExp(field.validation.pattern);
        } catch {
          errors.push(`${fieldRef}: Invalid regex pattern "${field.validation.pattern}"`);
        }
      }
    }
  }

  /**
   * Validate validation rules
   */
  private validateValidationRules(
    field: FieldDefinition,
    fieldRef: string,
    errors: string[],
    warnings: string[]
  ): void {
    const rules = field.validation!;

    // Check for incompatible rules with field type
    if (field.type !== 'number') {
      if (rules.min !== undefined || rules.max !== undefined) {
        warnings.push(`${fieldRef}: min/max rules are typically used with number fields`);
      }
    }

    if (field.type !== 'text' && field.type !== 'textarea') {
      if (rules.minLength !== undefined || rules.maxLength !== undefined || rules.pattern !== undefined) {
        warnings.push(`${fieldRef}: text validation rules may not apply to ${field.type} fields`);
      }
    }
  }

  /**
   * Validate default value against field type
   */
  private validateDefaultValue(
    field: FieldDefinition,
    fieldRef: string,
    errors: string[],
    warnings: string[]
  ): void {
    const value = field.defaultValue;

    switch (field.type) {
      case 'number':
        if (typeof value !== 'number' || !Number.isFinite(value)) {
          errors.push(`${fieldRef}: Default value for number field must be a valid number`);
        }
        break;

      case 'boolean':
        if (typeof value !== 'boolean') {
          warnings.push(`${fieldRef}: Default value for checkbox should be boolean`);
        }
        break;

      case 'select':
        if (field.options && typeof value === 'string' && !field.options.includes(value)) {
          warnings.push(`${fieldRef}: Default value "${value}" is not in the options list`);
        }
        break;

      case 'date':
        if (typeof value === 'string' && value !== '' && isNaN(Date.parse(value))) {
          errors.push(`${fieldRef}: Default value is not a valid date`);
        }
        break;
    }
  }

  /**
   * Validate multiple fields together (relationships)
   */
  validateFieldSet(fields: FieldDefinition[]): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check for empty field set
    if (!fields || fields.length === 0) {
      errors.push('At least one field is required');
      return { valid: false, errors, warnings };
    }

    // Validate each field individually
    const fieldResults = fields.map((field, index) => this.validateField(field, index));
    for (const result of fieldResults) {
      errors.push(...result.errors);
      warnings.push(...result.warnings);
    }

    // Check for duplicate field names
    const names = fields.map(f => f.name?.toLowerCase()).filter(Boolean);
    const duplicates = names.filter((n, i) => names.indexOf(n) !== i);
    if (duplicates.length > 0) {
      errors.push(`Duplicate field names: ${Array.from(new Set(duplicates)).join(', ')}`);
    }

    // Check for duplicate labels
    const labels = fields.map(f => f.label?.toLowerCase()).filter(Boolean);
    const dupLabels = labels.filter((l, i) => labels.indexOf(l) !== i);
    if (dupLabels.length > 0) {
      warnings.push(`Duplicate field labels: ${Array.from(new Set(dupLabels)).join(', ')}`);
    }

    // Check for at least one required field
    if (!fields.some(f => f.required)) {
      warnings.push('No required fields defined. Consider making key fields required.');
    }

    // Check field count
    if (fields.length > 20) {
      warnings.push(`Many fields defined (${fields.length}). Consider simplifying the form.`);
    }

    // Category-specific checks
    const hasDateField = fields.some(f => f.type === 'date');
    const hasNumberField = fields.some(f => f.type === 'number');
    
    if (!hasDateField) {
      warnings.push('No date field. Time-based tracking and filtering will be limited.');
    }

    if (!hasNumberField) {
      warnings.push('No number field. Charts and aggregations will be limited.');
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }
}

// Export singleton instance
export const fieldValidator = new FieldValidator();
