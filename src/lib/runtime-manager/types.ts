
export interface RuntimeEnvironmentConfig {
  appId: string;
  image?: string; // Default to node:18-alpine or similar
  resources?: {
    memory?: number; // In MB
    cpu?: number; // In CPU shares or quota
    disk?: number; // In MB (if supported by storage driver)
  };
  envVars?: Record<string, string>;
}

export interface RuntimeEnvironment {
  id: string; // Container ID
  appId: string;
  status: 'created' | 'running' | 'stopped' | 'error';
  url?: string; // Access URL if exposed
  createdAt: Date;
  lastUsed: Date;
}

export interface ExecutionResult {
  success: boolean;
  logs: string[];
  error?: string;
}

export interface RuntimeStats {
  memoryUsage: number;
  cpuUsage: number;
  uptime: number;
}
