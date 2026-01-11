/**
 * Validation system exports
 * Multi-layer validation for app specifications
 */

// Types
export type {
  ValidationResult,
  DetailedValidationResult,
  FieldDefinition,
  ViewDefinition,
  ProjectSpec,
  FieldValidationRules,
  TableConfig,
  ChartConfig,
  CardsConfig,
  DataStoreDefinition,
} from './types';

// Validators
export { FieldValidator, fieldValidator } from './field-validator';
export { ViewValidator, viewValidator } from './view-validator';
export { SpecValidator, specValidator, validateProjectSpec } from './spec-validator';
export { RuntimeValidator, runtimeValidator, validateForRuntime } from './runtime-validator';

/**
 * Perform complete validation of a project spec
 * Combines all validation layers into a single result
 */
import type { ProjectSpec, ValidationResult } from './types';
import { specValidator } from './spec-validator';
import { runtimeValidator } from './runtime-validator';

export async function validateComplete(spec: ProjectSpec): Promise<{
  valid: boolean;
  errors: string[];
  warnings: string[];
  details: {
    specValidation: ValidationResult;
    runtimeValidation: ValidationResult;
  };
}> {
  // Run spec validation (synchronous)
  const specResult = specValidator.validateSpec(spec);
  
  // Run runtime validation (async)
  const runtimeResult = await runtimeValidator.validateBeforeGeneration(spec);
  
  // Combine results
  const allErrors = [...specResult.errors, ...runtimeResult.errors];
  const allWarnings = [...specResult.warnings, ...runtimeResult.warnings];
  
  return {
    valid: allErrors.length === 0,
    errors: allErrors,
    warnings: allWarnings,
    details: {
      specValidation: {
        valid: specResult.valid,
        errors: specResult.errors,
        warnings: specResult.warnings,
      },
      runtimeValidation: runtimeResult,
    },
  };
}

/**
 * Quick validation check
 */
export function isSpecValid(spec: ProjectSpec): boolean {
  return specValidator.isValid(spec);
}

/**
 * Get human-readable validation summary
 */
export function getValidationSummary(spec: ProjectSpec): string {
  return specValidator.getValidationSummary(spec);
}
