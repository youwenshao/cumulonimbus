
import { RuntimeManager } from './manager';
import { RuntimeEnvironment, RuntimeEnvironmentConfig } from './types';

export class PoolManager {
  private manager: RuntimeManager;
  private pool: RuntimeEnvironment[] = [];
  private minSize: number;
  private maxSize: number;
  private defaultConfig: RuntimeEnvironmentConfig;

  constructor(
    manager: RuntimeManager,
    minSize: number = 2,
    maxSize: number = 10,
    defaultConfig: RuntimeEnvironmentConfig
  ) {
    this.manager = manager;
    this.minSize = minSize;
    this.maxSize = maxSize;
    this.defaultConfig = defaultConfig;
    
    // Run cleanup every 15 minutes
    setInterval(() => this.cleanup(), 15 * 60 * 1000);
  }

  /**
   * Initializes the pool
   */
  async initialize() {
    const currentSize = this.pool.length;
    if (currentSize < this.minSize) {
      const needed = this.minSize - currentSize;
      const promises = Array(needed).fill(null).map(() => this.createWarmContainer());
      const newContainers = await Promise.all(promises);
      this.pool.push(...newContainers);
    }
  }

  /**
   * Creates a single warm container
   */
  private async createWarmContainer(): Promise<RuntimeEnvironment> {
    // Use a generic ID for warm containers until claimed
    const config = { ...this.defaultConfig, appId: 'warm-pool' };
    const env = await this.manager.createEnvironment(config);
    return env;
  }

  /**
   * Acquires a container from the pool or creates a new one
   */
  async acquire(appId: string): Promise<RuntimeEnvironment> {
    let env: RuntimeEnvironment;

    if (this.pool.length > 0) {
      env = this.pool.shift()!;
      // Update the appId tag/metadata? 
      // In a real system, we might need to rename the container or update labels, 
      // but Docker labels are immutable at creation. 
      // We'll just track it logically here.
      env.appId = appId;
      env.lastUsed = new Date();
      
      // Replenish pool asynchronously
      this.replenish();
    } else {
      // Create on demand if pool is empty
      env = await this.manager.createEnvironment({
        ...this.defaultConfig,
        appId
      });
    }

    return env;
  }

  /**
   * Replenishes the pool to minimum size
   */
  private async replenish() {
    if (this.pool.length < this.minSize) {
      try {
        const env = await this.createWarmContainer();
        this.pool.push(env);
      } catch (error) {
        console.error('Failed to replenish pool:', error);
      }
    }
  }

  /**
   * Releases a container back to the pool? 
   * Usually we don't reuse containers across different apps for security (isolation).
   * So we destroy it.
   */
  async release(env: RuntimeEnvironment) {
    await this.manager.destroyEnvironment(env.id);
  }

  /**
   * Cleans up stale environments
   */
  async cleanup(maxAgeMs: number = 3600000) { // 1 hour
    try {
      const envs = await this.manager.listEnvironments();
      const now = Date.now();
      
      for (const env of envs) {
        // Skip warm pool containers
        if (env.appId === 'warm-pool') continue;
        
        // Check age (using createdAt as proxy for lastUsed for now)
        const age = now - env.createdAt.getTime();
        
        if (age > maxAgeMs) {
          console.log(`Cleaning up stale environment ${env.id} (${env.appId})`);
          await this.manager.destroyEnvironment(env.id);
        }
      }
      
      // Also ensure pool is replenished
      await this.replenish();
      
    } catch (error) {
      console.error('Cleanup failed:', error);
    }
  }
}
