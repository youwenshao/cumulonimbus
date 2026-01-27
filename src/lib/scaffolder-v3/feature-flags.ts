/**
 * V3 Scaffolder Feature Flags
 * Control which features are enabled
 */

export interface V3FeatureFlags {
  /** Whether V3 scaffolder is enabled */
  enabled: boolean;
  /** Whether V3 is the default mode for new apps */
  defaultMode: boolean;
  /** List of user IDs allowed to use V3 (empty = all users) */
  allowedUsers: string[];
  /** Tool-specific flags */
  tools: {
    writeFile: boolean;
    editFile: boolean;
    deleteFile: boolean;
    renameFile: boolean;
    readFile: boolean;
    listFiles: boolean;
    grep: boolean;
    codeSearch: boolean;
    addDependency: boolean;
    setChatSummary: boolean;
    updateTodos: boolean;
  };
}

/**
 * Default feature flags
 */
export const V3_FEATURES: V3FeatureFlags = {
  enabled: true,
  defaultMode: false, // Don't make default yet
  allowedUsers: [], // Empty = all users
  tools: {
    writeFile: true,
    editFile: true,
    deleteFile: true,
    renameFile: true,
    readFile: true,
    listFiles: true,
    grep: true,
    codeSearch: true,
    addDependency: true,
    setChatSummary: true,
    updateTodos: true,
  },
};

/**
 * Check if V3 is enabled for a user
 */
export function isV3EnabledForUser(userId: string): boolean {
  if (!V3_FEATURES.enabled) return false;
  if (V3_FEATURES.allowedUsers.length === 0) return true;
  return V3_FEATURES.allowedUsers.includes(userId);
}

/**
 * Check if a specific tool is enabled
 */
export function isToolEnabled(toolName: keyof V3FeatureFlags['tools']): boolean {
  return V3_FEATURES.tools[toolName] ?? false;
}

/**
 * Get all enabled tools
 */
export function getEnabledTools(): string[] {
  return Object.entries(V3_FEATURES.tools)
    .filter(([, enabled]) => enabled)
    .map(([name]) => name);
}
