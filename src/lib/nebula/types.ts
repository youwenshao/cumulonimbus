/**
 * Nebula Hosting System Types
 */

export type AppStatus = 'running' | 'sleeping' | 'suspended' | 'starting' | 'error';

export interface NebulaWorkerInfo {
  appId: string;
  subdomain: string;
  status: AppStatus;
  lastActivity: number;
  memoryUsage?: number;
  cpuUsage?: number;
  error?: string;
}

export interface WorkerMessage {
  type: 'ready' | 'response' | 'error' | 'status' | 'db_query';
  appId: string;
  payload?: any;
  correlationId?: string;
}

export interface SupervisorMessage {
  type: 'start' | 'request' | 'stop' | 'db_result';
  appId: string;
  payload?: any;
  correlationId?: string;
}

export interface NebulaConfig {
  maxMemoryMB: number;
  idleTimeoutMS: number;
  checkIntervalMS: number;
  storagePath: string;
}

export const DEFAULT_CONFIG: NebulaConfig = {
  maxMemoryMB: 128,
  idleTimeoutMS: 5 * 60 * 1000, // 5 minutes
  checkIntervalMS: 30 * 1000,   // 30 seconds
  storagePath: './.nebula/apps',
};
