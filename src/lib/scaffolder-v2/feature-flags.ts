/**
 * Feature Flags for Scaffolder V2
 * Controls rollout and feature availability
 */

import prisma from '@/lib/db';
import type { FeatureFlags } from './types';

/**
 * Default scaffolder version from environment
 */
export const SCAFFOLDER_VERSION = process.env.SCAFFOLDER_VERSION || 'v1';

/**
 * Default feature flags
 */
const DEFAULT_FLAGS: FeatureFlags = {
  scaffolderV2Enabled: false,
  livePreviewEnabled: true,
  multiEntityEnabled: false,
  advancedLayoutsEnabled: false,
};

/**
 * Check if a user should use scaffolder v2
 */
export async function shouldUseV2(userId: string): Promise<boolean> {
  // First check environment variable for global override
  if (SCAFFOLDER_VERSION === 'v2') {
    return true;
  }
  
  if (SCAFFOLDER_VERSION === 'v1-only') {
    return false;
  }

  // Check user-specific feature flag
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { 
        id: true,
        // featureFlags will be added to schema
      },
    });

    if (!user) {
      return false;
    }

    // For now, check if user is in beta group based on email patterns
    // This is a temporary solution until we add proper feature flags to the schema
    const betaEmails = process.env.V2_BETA_EMAILS?.split(',') || [];
    
    // Get user email
    const fullUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { email: true },
    });

    if (fullUser?.email && betaEmails.includes(fullUser.email)) {
      return true;
    }

    return false;
  } catch (error) {
    console.error('Error checking v2 feature flag:', error);
    return false;
  }
}

/**
 * Get all feature flags for a user
 */
export async function getFeatureFlags(userId: string): Promise<FeatureFlags> {
  const flags = { ...DEFAULT_FLAGS };

  try {
    // Check environment overrides
    if (SCAFFOLDER_VERSION === 'v2') {
      flags.scaffolderV2Enabled = true;
    }

    if (process.env.LIVE_PREVIEW_ENABLED === 'true') {
      flags.livePreviewEnabled = true;
    }

    if (process.env.MULTI_ENTITY_ENABLED === 'true') {
      flags.multiEntityEnabled = true;
    }

    if (process.env.ADVANCED_LAYOUTS_ENABLED === 'true') {
      flags.advancedLayoutsEnabled = true;
    }

    // Check user-specific flags
    const isV2User = await shouldUseV2(userId);
    if (isV2User) {
      flags.scaffolderV2Enabled = true;
    }

    return flags;
  } catch (error) {
    console.error('Error getting feature flags:', error);
    return DEFAULT_FLAGS;
  }
}

/**
 * Check if a specific feature is enabled
 */
export async function isFeatureEnabled(
  userId: string,
  feature: keyof FeatureFlags
): Promise<boolean> {
  const flags = await getFeatureFlags(userId);
  return flags[feature];
}

/**
 * Get percentage of users to roll out v2 to (for gradual rollout)
 */
export function getV2RolloutPercentage(): number {
  const percentage = parseInt(process.env.V2_ROLLOUT_PERCENTAGE || '0', 10);
  // Fix: Check for NaN and default to 0
  const validPercentage = isNaN(percentage) ? 0 : percentage;
  return Math.min(100, Math.max(0, validPercentage));
}

/**
 * Check if user should be in v2 based on rollout percentage
 * Uses consistent hashing based on user ID for stable assignment
 */
export function isUserInRollout(userId: string): boolean {
  const percentage = getV2RolloutPercentage();
  
  if (percentage === 0) return false;
  if (percentage >= 100) return true;

  // Simple hash function for consistent assignment
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    const char = userId.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  
  // Convert to 0-100 range
  const bucket = Math.abs(hash) % 100;
  return bucket < percentage;
}
