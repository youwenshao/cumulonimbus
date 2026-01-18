import type { ProjectSpec, BlueprintState } from './types';
import { buildSpecFromAnswers } from './blueprint';
import { validateComplete, isSpecValid, getValidationSummary } from './validators';
import { CompilationError, ValidationError } from '@/lib/error-handling/scaffolder-errors';

export interface AppConfig {
  id: string;
  name: string;
  description: string;
  spec: ProjectSpec;
  primitives: PrimitiveConfig[];
  createdAt: Date;
}

export interface PrimitiveConfig {
  id: string;
  type: 'data-store' | 'input-mechanism' | 'view-layer';
  config: Record<string, unknown>;
}

// Compile the final spec from blueprint state
export function compileSpec(state: BlueprintState): ProjectSpec {
  if (state.phase !== 'picture' && state.phase !== 'plan') {
    throw new CompilationError('Cannot compile spec before picture phase', state);
  }
  
  return buildSpecFromAnswers(state);
}

// Convert ProjectSpec to primitive configurations for the runtime
export function specToPrimitives(spec: ProjectSpec): PrimitiveConfig[] {
  const primitives: PrimitiveConfig[] = [];

  // Data store primitive
  primitives.push({
    id: `ds_${spec.dataStore.name}`,
    type: 'data-store',
    config: {
      schema: spec.dataStore.fields.map(f => ({
        name: f.name,
        type: f.type,
        required: f.required,
        options: f.options,
        defaultValue: f.defaultValue,
      })),
    },
  });

  // Input mechanism (form) primitive
  primitives.push({
    id: 'form_main',
    type: 'input-mechanism',
    config: {
      dataStoreId: `ds_${spec.dataStore.name}`,
      fields: spec.dataStore.fields,
      submitLabel: 'Add Entry',
    },
  });

  // View layer primitives
  spec.views.forEach((view, index) => {
    primitives.push({
      id: `view_${index}`,
      type: 'view-layer',
      config: {
        viewType: view.type,
        title: view.title,
        dataStoreId: `ds_${spec.dataStore.name}`,
        ...view.config,
      },
    });
  });

  return primitives;
}

// Generate the final app configuration
export function generateAppConfig(state: BlueprintState): AppConfig {
  const spec = compileSpec(state);
  const primitives = specToPrimitives(spec);

  return {
    id: generateId(),
    name: spec.name,
    description: spec.description,
    spec,
    primitives,
    createdAt: new Date(),
  };
}

function generateId(): string {
  return Math.random().toString(36).substring(2, 15);
}

/**
 * Validate a project spec using the comprehensive validation system
 * Returns validation result with errors and warnings
 */
export function validateSpec(spec: ProjectSpec): { 
  valid: boolean; 
  errors: string[]; 
  warnings?: string[];
} {
  // Quick validation for basic checks
  if (!spec) {
    return { valid: false, errors: ['No specification provided'], warnings: [] };
  }

  // Fix: Check for empty views before using the comprehensive validation system
  if (!spec.views || spec.views.length === 0) {
    return { valid: false, errors: ['At least one view is required'], warnings: [] };
  }

  // Use the comprehensive validation system
  const result = isSpecValid(spec);
  
  if (result) {
    // Spec is valid, but let's get any warnings
    const summary = getValidationSummary(spec);
    const warnings: string[] = [];
    
    // Extract warnings from summary if present
    if (summary.includes('warning')) {
      const warningMatch = summary.match(/(\d+) warning\(s\)/);
      if (warningMatch) {
        // Parse warnings from summary (they're listed after "warning(s):")
        const warningSection = summary.split('warning(s):')[1];
        if (warningSection) {
          const warningLines = warningSection.trim().split('\n')
            .filter(line => line.trim().match(/^\d+\./))
            .map(line => line.replace(/^\s*\d+\.\s*/, '').trim());
          warnings.push(...warningLines);
        }
      }
    }
    
    return { valid: true, errors: [], warnings };
  }

  // Spec is invalid, get detailed errors
  const errors: string[] = [];
  const warnings: string[] = [];
  
  // Basic checks
  if (!spec.name || spec.name.trim().length === 0) {
    errors.push('App name is required');
  }

  if (!spec.dataStore?.fields || spec.dataStore.fields.length === 0) {
    errors.push('At least one field is required');
  }

  if (!spec.views || spec.views.length === 0) {
    errors.push('At least one view is required');
  }

  // Check for duplicate field names
  const fieldNames = spec.dataStore?.fields?.map(f => f.name) || [];
  const duplicates = fieldNames.filter((name, index) => fieldNames.indexOf(name) !== index);
  if (duplicates.length > 0) {
    errors.push(`Duplicate field names: ${duplicates.join(', ')}`);
  }

  // Field-level validation
  if (spec.dataStore?.fields) {
    for (const field of spec.dataStore.fields) {
      if (!field.name) {
        errors.push('Field name is required');
      }
      if (!field.type) {
        errors.push(`Field "${field.name || 'unnamed'}" is missing type`);
      }
      if (field.type === 'select' && (!field.options || field.options.length === 0)) {
        errors.push(`Select field "${field.name}" must have options`);
      }
    }
  }

  // View-level validation
  if (spec.views) {
    for (const view of spec.views) {
      if (!view.type) {
        errors.push('View type is required');
      }
      if (!view.title) {
        warnings.push('View title is missing');
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Comprehensive async validation (includes runtime checks)
 */
export async function validateSpecComplete(spec: ProjectSpec): Promise<{
  valid: boolean;
  errors: string[];
  warnings: string[];
}> {
  const result = await validateComplete(spec);
  return {
    valid: result.valid,
    errors: result.errors,
    warnings: result.warnings,
  };
}

/**
 * Validate spec and throw if invalid
 */
export function assertValidSpec(spec: ProjectSpec): void {
  const result = validateSpec(spec);
  if (!result.valid) {
    throw new ValidationError(result.errors, result.warnings || [], 'build');
  }
}
