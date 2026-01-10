import type { ProjectSpec, BlueprintState } from './types';
import { buildSpecFromAnswers } from './blueprint';

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
    throw new Error('Cannot compile spec before picture phase');
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

// Validate a project spec
export function validateSpec(spec: ProjectSpec): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

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

  return {
    valid: errors.length === 0,
    errors,
  };
}
