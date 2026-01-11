/**
 * Comprehensive spec validation
 * Combines field, view, and cross-validation into a complete validation suite
 */

import type { ProjectSpec, ValidationResult, DetailedValidationResult } from './types';
import { fieldValidator } from './field-validator';
import { viewValidator } from './view-validator';

// App name constraints
const MIN_APP_NAME_LENGTH = 2;
const MAX_APP_NAME_LENGTH = 100;

// Description constraints
const MAX_DESCRIPTION_LENGTH = 500;

// Data store name pattern
const DATA_STORE_NAME_PATTERN = /^[a-zA-Z][a-zA-Z0-9_]*$/;

export class SpecValidator {
  /**
   * Perform comprehensive validation of a project spec
   */
  validateSpec(spec: ProjectSpec): DetailedValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    const fieldResults = new Map<string, ValidationResult>();
    const viewResults = new Map<string, ValidationResult>();

    // Validate basic spec properties
    this.validateBasicProperties(spec, errors, warnings);

    // Validate data store
    const dataStoreResult = this.validateDataStore(spec, errors, warnings);
    
    // Validate fields if data store exists
    let fieldsResult: ValidationResult = { valid: true, errors: [], warnings: [] };
    if (spec.dataStore?.fields) {
      fieldsResult = fieldValidator.validateFieldSet(spec.dataStore.fields);
      errors.push(...fieldsResult.errors);
      warnings.push(...fieldsResult.warnings);
      
      // Store individual field results
      spec.dataStore.fields.forEach((field, index) => {
        fieldResults.set(field.name || `field_${index}`, fieldValidator.validateField(field, index));
      });
    }

    // Validate views
    let viewsResult: ValidationResult = { valid: true, errors: [], warnings: [] };
    if (spec.views && spec.dataStore?.fields) {
      viewsResult = viewValidator.validateViewSet(spec.views, spec.dataStore.fields);
      errors.push(...viewsResult.errors);
      warnings.push(...viewsResult.warnings);
      
      // Store individual view results
      spec.views.forEach((view, index) => {
        viewResults.set(view.title || `view_${index}`, viewValidator.validateView(view, spec.dataStore.fields, index));
      });
    }

    // Cross-validation
    const crossResult = this.crossValidate(spec);
    errors.push(...crossResult.errors);
    warnings.push(...crossResult.warnings);

    // Validate features
    if (spec.features) {
      this.validateFeatures(spec.features, warnings);
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
      fieldResults,
      viewResults,
      crossValidationResults: crossResult,
    };
  }

  /**
   * Validate basic spec properties (name, description, category)
   */
  private validateBasicProperties(
    spec: ProjectSpec,
    errors: string[],
    warnings: string[]
  ): void {
    // App name validation
    if (!spec.name || spec.name.trim().length === 0) {
      errors.push('App name is required');
    } else {
      const name = spec.name.trim();
      if (name.length < MIN_APP_NAME_LENGTH) {
        errors.push(`App name must be at least ${MIN_APP_NAME_LENGTH} characters`);
      }
      if (name.length > MAX_APP_NAME_LENGTH) {
        errors.push(`App name must be ${MAX_APP_NAME_LENGTH} characters or less`);
      }
    }

    // Description validation
    if (!spec.description || spec.description.trim().length === 0) {
      warnings.push('App description is empty. A description helps users understand the app.');
    } else if (spec.description.length > MAX_DESCRIPTION_LENGTH) {
      warnings.push(`App description is very long (${spec.description.length} chars). Consider shortening.`);
    }

    // Category validation
    const validCategories = ['expense', 'habit', 'project', 'health', 'learning', 'inventory', 'time', 'custom'];
    if (spec.category && !validCategories.includes(spec.category)) {
      warnings.push(`Unknown category "${spec.category}". Using as custom category.`);
    }
  }

  /**
   * Validate data store configuration
   */
  private validateDataStore(
    spec: ProjectSpec,
    errors: string[],
    warnings: string[]
  ): ValidationResult {
    const result: ValidationResult = { valid: true, errors: [], warnings: [] };

    if (!spec.dataStore) {
      errors.push('Data store configuration is required');
      result.valid = false;
      return result;
    }

    // Data store name
    if (!spec.dataStore.name || spec.dataStore.name.trim().length === 0) {
      warnings.push('Data store name is missing. Using default.');
    } else if (!DATA_STORE_NAME_PATTERN.test(spec.dataStore.name)) {
      errors.push(
        `Invalid data store name "${spec.dataStore.name}". ` +
        'Must start with a letter and contain only letters, numbers, and underscores.'
      );
    }

    // Data store label
    if (!spec.dataStore.label || spec.dataStore.label.trim().length === 0) {
      warnings.push('Data store label is missing. Using name as label.');
    }

    // Fields array
    if (!spec.dataStore.fields || !Array.isArray(spec.dataStore.fields)) {
      errors.push('Data store must have a fields array');
      result.valid = false;
    } else if (spec.dataStore.fields.length === 0) {
      errors.push('Data store must have at least one field');
      result.valid = false;
    }

    return result;
  }

  /**
   * Cross-validate relationships between spec components
   */
  private crossValidate(spec: ProjectSpec): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!spec.dataStore?.fields || !spec.views) {
      return { valid: true, errors, warnings };
    }

    const fieldNames = spec.dataStore.fields.map(f => f.name);
    const numericFields = spec.dataStore.fields.filter(f => f.type === 'number').map(f => f.name);
    const dateFields = spec.dataStore.fields.filter(f => f.type === 'date').map(f => f.name);
    const selectFields = spec.dataStore.fields.filter(f => f.type === 'select').map(f => f.name);

    // Check chart views have appropriate fields
    const chartViews = spec.views.filter(v => v.type === 'chart');
    for (const chartView of chartViews) {
      const config = chartView.config as { yAxis?: string; chartType?: string; groupBy?: string };
      
      // Charts need numeric fields for meaningful data
      if (numericFields.length === 0) {
        warnings.push(
          `Chart view "${chartView.title}" exists but no numeric fields are defined. ` +
          'Add a number field for meaningful chart data.'
        );
      }

      // Line/area charts work best with date fields
      if ((config.chartType === 'line' || config.chartType === 'area') && dateFields.length === 0) {
        warnings.push(
          `${config.chartType} chart "${chartView.title}" typically works best with date data. ` +
          'Consider adding a date field.'
        );
      }

      // Pie charts work best with select fields for grouping
      if (config.chartType === 'pie' && !config.groupBy && selectFields.length === 0) {
        warnings.push(
          `Pie chart "${chartView.title}" works best with categorical data. ` +
          'Consider adding a select field for grouping.'
        );
      }
    }

    // Check cards views have appropriate title fields
    const cardViews = spec.views.filter(v => v.type === 'cards');
    for (const cardView of cardViews) {
      const config = cardView.config as { titleField?: string };
      if (config.titleField) {
        const titleField = spec.dataStore.fields.find(f => f.name === config.titleField);
        if (titleField && titleField.type === 'checkbox') {
          warnings.push(
            `Cards view "${cardView.title}" uses a checkbox field as title. ` +
            'Consider using a text field for more descriptive titles.'
          );
        }
      }
    }

    // Check if required fields have sensible defaults for views
    const requiredFields = spec.dataStore.fields.filter(f => f.required);
    if (requiredFields.length === 0 && spec.views.length > 0) {
      warnings.push(
        'No required fields defined. Users might submit incomplete data.'
      );
    }

    // Category-specific cross-validation
    this.validateCategorySpecificRules(spec, errors, warnings);

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Validate category-specific rules
   */
  private validateCategorySpecificRules(
    spec: ProjectSpec,
    errors: string[],
    warnings: string[]
  ): void {
    if (!spec.category || !spec.dataStore?.fields) return;

    const fieldNames = spec.dataStore.fields.map(f => f.name.toLowerCase());
    const fieldTypes = new Map(spec.dataStore.fields.map(f => [f.name.toLowerCase(), f.type]));

    switch (spec.category) {
      case 'expense':
        // Expense trackers should have amount and category
        if (!fieldNames.some(n => n.includes('amount') || n.includes('cost') || n.includes('price'))) {
          warnings.push('Expense tracker missing amount/cost field. Consider adding one.');
        }
        if (!fieldNames.some(n => n.includes('category') || n.includes('type'))) {
          warnings.push('Expense tracker missing category field. Consider adding one for better organization.');
        }
        break;

      case 'habit':
        // Habit trackers should have date and completion status
        if (!fieldNames.some(n => n.includes('date'))) {
          warnings.push('Habit tracker missing date field. Consider adding one to track progress over time.');
        }
        if (!fieldNames.some(n => n.includes('complete') || n.includes('done') || n.includes('status'))) {
          warnings.push('Habit tracker missing completion field. Consider adding a checkbox field.');
        }
        break;

      case 'project':
        // Project trackers should have status and due date
        if (!fieldNames.some(n => n.includes('status') || n.includes('state'))) {
          warnings.push('Project tracker missing status field. Consider adding one to track progress.');
        }
        if (!fieldNames.some(n => n.includes('due') || n.includes('deadline'))) {
          warnings.push('Project tracker missing due date field. Consider adding one.');
        }
        break;

      case 'health':
        // Health trackers should have date and a metric value
        if (!fieldNames.some(n => n.includes('date'))) {
          warnings.push('Health tracker missing date field. Essential for tracking progress.');
        }
        const hasNumericMetric = Array.from(fieldTypes.entries()).some(
          ([name, type]) => type === 'number' && !name.includes('id')
        );
        if (!hasNumericMetric) {
          warnings.push('Health tracker missing numeric metric field. Consider adding one for measurements.');
        }
        break;

      case 'time':
        // Time trackers should have duration or start/end times
        if (!fieldNames.some(n => n.includes('duration') || n.includes('hours') || n.includes('time'))) {
          warnings.push('Time tracker missing duration field. Consider adding one.');
        }
        break;
    }
  }

  /**
   * Validate features configuration
   */
  private validateFeatures(
    features: NonNullable<ProjectSpec['features']>,
    warnings: string[]
  ): void {
    // Check for potentially conflicting features
    if (features.allowDelete && !features.allowEdit) {
      warnings.push('Delete is allowed but edit is not. Users cannot fix mistakes before deleting.');
    }

    // Export without edit might be okay, but worth noting
    if (features.allowExport && !features.allowEdit) {
      warnings.push('Export is allowed but edit is not. Exported data may contain errors.');
    }
  }

  /**
   * Quick validation check (returns simple valid/invalid)
   */
  isValid(spec: ProjectSpec): boolean {
    const result = this.validateSpec(spec);
    return result.valid;
  }

  /**
   * Get human-readable validation summary
   */
  getValidationSummary(spec: ProjectSpec): string {
    const result = this.validateSpec(spec);
    
    if (result.valid && result.warnings.length === 0) {
      return '✅ Specification is valid with no warnings.';
    }
    
    const lines: string[] = [];
    
    if (!result.valid) {
      lines.push(`❌ Validation failed with ${result.errors.length} error(s):`);
      result.errors.forEach((e, i) => lines.push(`   ${i + 1}. ${e}`));
    } else {
      lines.push('✅ Specification is valid.');
    }
    
    if (result.warnings.length > 0) {
      lines.push(`⚠️ ${result.warnings.length} warning(s):`);
      result.warnings.forEach((w, i) => lines.push(`   ${i + 1}. ${w}`));
    }
    
    return lines.join('\n');
  }
}

// Export singleton instance
export const specValidator = new SpecValidator();

// Export convenient validation function
export function validateProjectSpec(spec: ProjectSpec): DetailedValidationResult {
  return specValidator.validateSpec(spec);
}
