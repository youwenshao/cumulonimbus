/**
 * Migration Module Index
 * Utilities for migrating between scaffolder versions
 */

export {
  migrateConversation,
  migrateApp,
  convertV1SchemasToV2,
  convertV1LayoutToV2,
  inferReadiness,
  getPhaseFromReadiness,
  type MigrationResult,
  type MigrationStats,
} from './v1-to-v2';
