
import { RuntimeManager } from './manager';
import { PoolManager } from './pool';

// Singleton instance
let runtimeManager: RuntimeManager;
let poolManager: PoolManager;

export function getRuntimeManager() {
  if (!runtimeManager) {
    runtimeManager = new RuntimeManager();
  }
  return runtimeManager;
}

export function getPoolManager() {
  if (!poolManager) {
    const manager = getRuntimeManager();
    poolManager = new PoolManager(manager, 2, 5, {
      appId: 'default',
      resources: {
        memory: 512,
        cpu: 1
      }
    });
    // Initialize pool in background
    poolManager.initialize().catch(console.error);
  }
  return poolManager;
}
