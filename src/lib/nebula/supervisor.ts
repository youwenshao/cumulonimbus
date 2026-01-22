import { Worker } from 'worker_threads';
import path from 'path';
import { NebulaWorkerInfo, WorkerMessage, SupervisorMessage, DEFAULT_CONFIG } from './types';
import prisma from '@/lib/db';
import { nebulaDbManager } from './db-manager';

class NebulaSupervisor {
  private static instance: NebulaSupervisor;
  private workers: Map<string, { worker: Worker; info: NebulaWorkerInfo }> = new Map();
  private pendingRequests: Map<string, (response: any) => void> = new Map();
  private spawningWorkers: Map<string, Promise<Worker>> = new Map();

  private constructor() {
    this.startWatchdog();
  }

  public static getInstance(): NebulaSupervisor {
    if (!NebulaSupervisor.instance) {
      NebulaSupervisor.instance = new NebulaSupervisor();
    }
    return NebulaSupervisor.instance;
  }

  /**
   * Start or get an existing worker for an app
   */
  public async getWorker(appId: string): Promise<Worker> {
    const existing = this.workers.get(appId);
    if (existing && existing.info.status === 'running') {
      existing.info.lastActivity = Date.now();
      return existing.worker;
    }

    // Check if we are already spawning this worker
    if (this.spawningWorkers.has(appId)) {
      return this.spawningWorkers.get(appId)!;
    }

    const spawnPromise = this.spawnWorker(appId).finally(() => {
      this.spawningWorkers.delete(appId);
    });

    this.spawningWorkers.set(appId, spawnPromise);
    return spawnPromise;
  }

  /**
   * Force restart a worker
   */
  public async restartWorker(appId: string): Promise<Worker> {
    const existing = this.workers.get(appId);
    if (existing) {
      existing.worker.terminate();
      this.workers.delete(appId);
    }
    return this.getWorker(appId);
  }

  /**
   * Spawn a new worker thread for an app
   */
  private async spawnWorker(appId: string): Promise<Worker> {
    // Look up by ID first, then by subdomain
    const app = await prisma.app.findFirst({
      where: {
        OR: [
          { id: appId },
          { subdomain: appId }
        ]
      },
      select: { 
        id: true, 
        subdomain: true, 
        componentFiles: true, 
        generatedCode: true, 
        isAlwaysOn: true,
        name: true,
        description: true,
        data: true
      }
    });

    if (!app || !app.subdomain) {
      throw new Error(`App ${appId} not found or missing subdomain`);
    }

    const workerPath = path.resolve(process.cwd(), 'src/lib/nebula/worker.ts');
    
    const code = (app.componentFiles as any)?.['App.tsx'] || (app.generatedCode as any)?.pageComponent || '';

    const worker = new Worker(workerPath, {
      workerData: {
        appId: app.id,
        subdomain: app.subdomain,
        code,
        appName: app.name,
        appDescription: app.description,
        initialData: app.data
      }
    });

    const info: NebulaWorkerInfo = {
      appId: app.id, // Use the real CUID
      subdomain: app.subdomain,
      status: 'starting',
      lastActivity: Date.now()
    };

    this.workers.set(app.id, { worker, info }); // Store by real CUID

    worker.on('message', (msg: WorkerMessage) => {
      this.handleWorkerMessage(msg);
    });
    worker.on('error', (err) => {
      console.error(`Worker error for app ${app.id}:`, err);
      info.status = 'error';
      info.error = err.message;
    });
    worker.on('exit', (code) => {
      if (code !== 0) {
        console.error(`Worker for app ${app.id} exited with code ${code}`);
      }
      this.workers.delete(app.id);
    });

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error(`Worker start timeout for app ${app.id}`));
      }, 15000);
      
      const onReady = (msg: WorkerMessage) => {
        if (msg.type === 'ready') {
          if (msg.appId === app.id) {
            clearTimeout(timeout);
            info.status = 'running';
            worker.off('message', onReady);
            resolve(worker);
          }
        }
      };
      
      worker.on('message', onReady);
    });
  }

  private handleWorkerMessage(msg: WorkerMessage) {
    const { type, appId, payload, correlationId } = msg;
    const entry = this.workers.get(appId);
    if (entry) {
      entry.info.lastActivity = Date.now();
    }

    if (correlationId && this.pendingRequests.has(correlationId)) {
      const resolve = this.pendingRequests.get(correlationId);
      resolve?.(payload);
      this.pendingRequests.delete(correlationId);
    }

    // Handle other message types like db_query here
    if (type === 'db_query') {
      this.handleDbQuery(appId, correlationId!, payload);
    }
  }

  private async handleDbQuery(appId: string, correlationId: string, payload: { sql: string; params: any[] }) {
    const result = nebulaDbManager.query(appId, payload.sql, payload.params);
    const worker = this.workers.get(appId)?.worker;
    worker?.postMessage({
      type: 'db_result',
      appId,
      correlationId,
      payload: result
    } as SupervisorMessage);
  }

  /**
   * Watchdog to monitor resources and inactivity
   */
  private startWatchdog() {
    setInterval(async () => {
      const now = Date.now();
      for (const [appId, { worker, info }] of this.workers.entries()) {
        // 1. Check inactivity
        const app = await prisma.app.findUnique({
          where: { id: appId },
          select: { isAlwaysOn: true }
        });

        if (!app?.isAlwaysOn && (now - info.lastActivity) > DEFAULT_CONFIG.idleTimeoutMS) {
          console.log(`Sleeping idle app: ${appId}`);
          worker.postMessage({ type: 'stop', appId } as SupervisorMessage);
          info.status = 'sleeping';
          continue;
        }

        // 2. Check memory usage
        try {
          // We can't easily get memory usage per worker thread from Node.js itself
          // without using additional APIs or heap snapshots.
          // For now, we'll use a simplified check based on cumulative worker heap.
          // A more robust implementation would use process.memoryUsage() if we used processes,
          // or v8.getHeapStatistics() for worker-specific heap if available.
          
          // Simplified placeholder: Kill if the worker has been alive too long and not always-on
          if (!app?.isAlwaysOn && (now - info.lastActivity) > DEFAULT_CONFIG.idleTimeoutMS) {
             console.log(`Watchdog: Stopping worker for app ${appId} (idle)`);
             worker.terminate();
             info.status = 'sleeping';
          }
        } catch (err) {
          console.error(`Watchdog error for app ${appId}:`, err);
        }
      }
    }, DEFAULT_CONFIG.checkIntervalMS);
  }

  /**
   * Proxy a request to a worker
   */
  public async request(appId: string, payload: any): Promise<any> {
    const worker = await this.getWorker(appId);
    const correlationId = Math.random().toString(36).substring(7);

    return new Promise((resolve) => {
      this.pendingRequests.set(correlationId, resolve);
      worker.postMessage({
        type: 'request',
        appId,
        correlationId,
        payload
      } as SupervisorMessage);
    });
  }
}

export const nebulaSupervisor = NebulaSupervisor.getInstance();
