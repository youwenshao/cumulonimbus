/**
 * Runtime validation before app generation
 * Checks for issues that would cause problems during runtime
 */

import type { ProjectSpec, ValidationResult, ChartConfig, CardsConfig } from './types';

export class RuntimeValidator {
  /**
   * Validate spec before generating an app
   * Catches issues that would cause runtime errors
   */
  async validateBeforeGeneration(spec: ProjectSpec): Promise<ValidationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Validate chart configurations
    this.validateChartConfigs(spec, errors, warnings);

    // Validate cards configurations
    this.validateCardsConfigs(spec, errors, warnings);

    // Validate table configurations
    this.validateTableConfigs(spec, errors, warnings);

    // Validate data integrity
    this.validateDataIntegrity(spec, errors, warnings);

    // Validate feature combinations
    this.validateFeatureCombinations(spec, errors, warnings);

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Validate chart configurations for runtime safety
   */
  private validateChartConfigs(
    spec: ProjectSpec,
    errors: string[],
    warnings: string[]
  ): void {
    if (!spec.views || !spec.dataStore?.fields) return;

    const fieldNames = spec.dataStore.fields.map(f => f.name);
    const numericFields = spec.dataStore.fields.filter(f => f.type === 'number').map(f => f.name);

    for (const view of spec.views) {
      if (view.type !== 'chart') continue;
      
      const config = view.config as ChartConfig;
      
      // Check yAxis field exists
      if (config.yAxis && !fieldNames.includes(config.yAxis)) {
        errors.push(
          `Chart "${view.title}" references non-existent Y-axis field "${config.yAxis}"`
        );
      }

      // Check yAxis is numeric for sum/average
      if (config.yAxis && config.aggregation && ['sum', 'average'].includes(config.aggregation)) {
        if (!numericFields.includes(config.yAxis)) {
          errors.push(
            `Chart "${view.title}" uses ${config.aggregation} on non-numeric field "${config.yAxis}"`
          );
        }
      }

      // Check xAxis field exists
      if (config.xAxis && !fieldNames.includes(config.xAxis)) {
        errors.push(
          `Chart "${view.title}" references non-existent X-axis field "${config.xAxis}"`
        );
      }

      // Check groupBy field exists
      if (config.groupBy && !fieldNames.includes(config.groupBy)) {
        warnings.push(
          `Chart "${view.title}" references non-existent groupBy field "${config.groupBy}"`
        );
      }

      // Pie charts need valid data structure
      if (config.chartType === 'pie') {
        if (!config.groupBy && !config.xAxis) {
          warnings.push(
            `Pie chart "${view.title}" has no category field. Will show single segment.`
          );
        }
      }
    }
  }

  /**
   * Validate cards configurations for runtime safety
   */
  private validateCardsConfigs(
    spec: ProjectSpec,
    errors: string[],
    warnings: string[]
  ): void {
    if (!spec.views || !spec.dataStore?.fields) return;

    const fieldNames = spec.dataStore.fields.map(f => f.name);

    for (const view of spec.views) {
      if (view.type !== 'cards') continue;
      
      const config = view.config as CardsConfig;
      
      // Check titleField exists
      if (!config.titleField) {
        errors.push(`Cards view "${view.title}" is missing required titleField`);
      } else if (!fieldNames.includes(config.titleField)) {
        errors.push(
          `Cards view "${view.title}" references non-existent title field "${config.titleField}"`
        );
      }

      // Check subtitleField exists if specified
      if (config.subtitleField && !fieldNames.includes(config.subtitleField)) {
        warnings.push(
          `Cards view "${view.title}" references non-existent subtitle field "${config.subtitleField}"`
        );
      }
    }
  }

  /**
   * Validate table configurations for runtime safety
   */
  private validateTableConfigs(
    spec: ProjectSpec,
    errors: string[],
    warnings: string[]
  ): void {
    if (!spec.views || !spec.dataStore?.fields) return;

    const fieldNames = spec.dataStore.fields.map(f => f.name);

    for (const view of spec.views) {
      if (view.type !== 'table') continue;
      
      const config = view.config as { columns?: string[]; sortBy?: string };
      
      // Check columns exist
      if (config.columns) {
        const missingColumns = config.columns.filter(c => !fieldNames.includes(c));
        if (missingColumns.length > 0) {
          warnings.push(
            `Table "${view.title}" references non-existent columns: ${missingColumns.join(', ')}`
          );
        }
      }

      // Check sortBy field exists
      if (config.sortBy && !fieldNames.includes(config.sortBy)) {
        warnings.push(
          `Table "${view.title}" sorts by non-existent field "${config.sortBy}"`
        );
      }
    }
  }

  /**
   * Validate data integrity rules
   */
  private validateDataIntegrity(
    spec: ProjectSpec,
    errors: string[],
    warnings: string[]
  ): void {
    if (!spec.dataStore?.fields) return;

    // Check for circular dependencies in default values (not really applicable here but good to have)
    
    // Check select field options are valid
    for (const field of spec.dataStore.fields) {
      if (field.type === 'select' && field.options) {
        // Check for options that might cause issues
        for (const option of field.options) {
          if (option.length > 100) {
            warnings.push(
              `Field "${field.name}" has very long option: "${option.substring(0, 20)}..."`
            );
          }
          if (option.includes('\n') || option.includes('\r')) {
            errors.push(
              `Field "${field.name}" has option with newline characters`
            );
          }
        }
      }

      // Check number validation ranges are reasonable
      if (field.type === 'number' && field.validation) {
        const { min, max } = field.validation;
        if (min !== undefined && max !== undefined) {
          const range = max - min;
          if (range > 1e15) {
            warnings.push(
              `Field "${field.name}" has extremely large range. Consider narrowing.`
            );
          }
        }
      }

      // Check text validation patterns are safe
      if (field.validation?.pattern) {
        try {
          // Test pattern doesn't cause catastrophic backtracking
          const testString = 'a'.repeat(100);
          const start = Date.now();
          new RegExp(field.validation.pattern).test(testString);
          if (Date.now() - start > 100) {
            warnings.push(
              `Field "${field.name}" has potentially slow regex pattern`
            );
          }
        } catch {
          errors.push(
            `Field "${field.name}" has invalid regex pattern`
          );
        }
      }
    }
  }

  /**
   * Validate feature combinations
   */
  private validateFeatureCombinations(
    spec: ProjectSpec,
    errors: string[],
    warnings: string[]
  ): void {
    // Currently no critical feature combinations to check
    // This is a placeholder for future feature validation
    
    // Example: If we add authentication features
    // if (spec.features?.requireAuth && !spec.features?.userField) {
    //   errors.push('Authentication requires a user field');
    // }
  }

  /**
   * Validate that spec can be serialized/deserialized safely
   */
  validateSerializable(spec: ProjectSpec): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    try {
      const serialized = JSON.stringify(spec);
      const deserialized = JSON.parse(serialized);
      
      // Check size
      const sizeKB = serialized.length / 1024;
      if (sizeKB > 100) {
        warnings.push(`Spec is large (${sizeKB.toFixed(1)}KB). This may impact performance.`);
      }
      
      // Verify key properties survived serialization
      if (deserialized.name !== spec.name) {
        errors.push('Spec serialization failed: name mismatch');
      }
      if (deserialized.dataStore?.fields?.length !== spec.dataStore?.fields?.length) {
        errors.push('Spec serialization failed: field count mismatch');
      }
    } catch (e) {
      errors.push(`Spec cannot be serialized: ${e instanceof Error ? e.message : 'unknown error'}`);
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }
}

// Export singleton instance
export const runtimeValidator = new RuntimeValidator();

// Export convenient validation function
export async function validateForRuntime(spec: ProjectSpec): Promise<ValidationResult> {
  return runtimeValidator.validateBeforeGeneration(spec);
}
