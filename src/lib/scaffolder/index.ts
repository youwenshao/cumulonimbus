/**
 * V1 Scaffolder (Deprecated)
 * 
 * @deprecated This module is deprecated in favor of scaffolder-v2.
 * The V2 scaffolder uses a multi-agent architecture with:
 * - Architect: Coordinates the pipeline
 * - Coordinator: Schema design
 * - Designer: UI layout
 * - Coder: Code generation
 * - Advisor: Intent analysis
 * - Automator: Workflows
 * 
 * Use '@/lib/scaffolder-v2' for new development.
 * Existing V1 apps will continue to work but should be migrated.
 * Run `npm run migrate:v2` to migrate V1 data to V2 format.
 * 
 * @see src/lib/scaffolder-v2 for the V2 implementation
 * @see docs/migration-guide.md for migration instructions
 */

export * from './types';
export * from './parser';
export * from './probe';
export * from './blueprint';
export * from './compiler';
export * from './plan-generator';
export * from './code-generator';
