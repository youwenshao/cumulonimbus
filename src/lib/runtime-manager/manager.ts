
import Docker from 'dockerode';
import * as fs from 'fs-extra';
import * as path from 'path';
import * as tar from 'tar-fs';
import { RuntimeEnvironment, RuntimeEnvironmentConfig, ExecutionResult, RuntimeStats } from './types';

export class RuntimeManager {
  private docker: Docker;
  private basePath: string;

  constructor(basePath: string = '/tmp/cumulonimbus-runtime') {
    this.docker = new Docker();
    this.basePath = basePath;
    fs.ensureDirSync(this.basePath);
  }

  /**
   * Creates a new isolated environment (container) for an app
   */
  async createEnvironment(config: RuntimeEnvironmentConfig): Promise<RuntimeEnvironment> {
    try {
      const { appId, resources } = config;
      const containerName = `cn-app-${appId}-${Date.now()}`;
      
      // Resource limits
      const hostConfig: Docker.HostConfig = {
        Memory: (resources?.memory || 512) * 1024 * 1024, // Default 512MB
        NanoCpus: (resources?.cpu || 1) * 1e9, // Default 1 CPU
        NetworkMode: 'bridge', // Isolate network
        // Security options
        SecurityOpt: ['no-new-privileges'],
        ReadonlyRootfs: false,
        // Mount npm cache for performance
        Binds: [
          // specific to macos/linux, assumes user has a cache dir
          `${process.env.HOME}/.npm-docker-cache:/root/.npm` 
        ],
        // Automatic recovery
        RestartPolicy: {
          Name: 'on-failure',
          MaximumRetryCount: 3
        },
        // Expose internal port 3000 to a random host port
        PublishAllPorts: true
      };

      // Ensure cache dir exists on host
      await fs.ensureDir(`${process.env.HOME}/.npm-docker-cache`);

      const container = await this.docker.createContainer({
        Image: config.image || 'node:20-alpine',
        Cmd: ['/bin/sh', '-c', 'tail -f /dev/null'], // Keep alive for now
        name: containerName,
        HostConfig: hostConfig,
        Env: Object.entries(config.envVars || {}).map(([k, v]) => `${k}=${v}`),
        Labels: {
          'com.cumulonimbus.appId': appId,
          'com.cumulonimbus.type': 'runtime',
        },
        WorkingDir: '/app',
        ExposedPorts: {
          '3000/tcp': {}
        }
      });

      await container.start();

      // Get assigned port
      const info = await container.inspect();
      const ports = info.NetworkSettings.Ports;
      const hostPort = ports['3000/tcp']?.[0]?.HostPort;
      const url = hostPort ? `http://localhost:${hostPort}` : undefined;

      return {
        id: container.id,
        appId,
        status: 'running',
        createdAt: new Date(),
        lastUsed: new Date(),
        url
      };
    } catch (error) {
      console.error('Failed to create environment:', error);
      throw error;
    }
  }

  /**
   * Gets environment by appId
   */
  async getEnvironmentByAppId(appId: string): Promise<RuntimeEnvironment | null> {
    const containers = await this.docker.listContainers({
      filters: {
        label: [
          'com.cumulonimbus.type=runtime',
          `com.cumulonimbus.appId=${appId}`
        ]
      }
    });

    if (containers.length === 0) return null;

    const c = containers[0];
    const ports = c.Ports.filter(p => p.PrivatePort === 3000);
    const hostPort = ports[0]?.PublicPort;

    return {
      id: c.Id,
      appId: c.Labels['com.cumulonimbus.appId'],
      status: c.State as any,
      createdAt: new Date(c.Created * 1000),
      lastUsed: new Date(c.Created * 1000),
      url: hostPort ? `http://localhost:${hostPort}` : undefined
    };
  }

  /**
   * Deploys code to the environment and installs dependencies
   */
  async deployCode(containerId: string, files: Record<string, string>): Promise<ExecutionResult> {
    const container = this.docker.getContainer(containerId);
    const tmpDir = path.join(this.basePath, containerId);
    
    try {
      // 1. Prepare files locally
      await fs.ensureDir(tmpDir);
      
      for (const [filename, content] of Object.entries(files)) {
        const filePath = path.join(tmpDir, filename);
        await fs.ensureDir(path.dirname(filePath));
        await fs.writeFile(filePath, content);
      }

      // Ensure package.json exists
      if (!files['package.json']) {
        const defaultPackageJson = {
          name: 'app',
          version: '1.0.0',
          private: true,
          dependencies: {
            'react': '^18.2.0',
            'react-dom': '^18.2.0',
            'typescript': '^5.0.0',
            '@types/react': '^18.0.0',
            '@types/node': '^20.0.0'
          },
          scripts: {
            "start": "ts-node index.ts" // Assumption, can be customized
          }
        };
        await fs.writeJson(path.join(tmpDir, 'package.json'), defaultPackageJson);
      }

      // 2. Copy files to container
      const pack = tar.pack(tmpDir);
      await container.putArchive(pack, {
        path: '/app'
      });

      // 3. Install dependencies
      const exec = await container.exec({
        Cmd: ['npm', 'install'],
        AttachStdout: true,
        AttachStderr: true
      });

      const stream = await exec.start({ Detach: false, Tty: false });
      
      // Wait for stream to finish and collect logs
      const logs = await this.streamToString(stream);
      
      // Check exit code
      const inspect = await exec.inspect();
      if (inspect.ExitCode !== 0) {
        return {
          success: false,
          logs: [logs],
          error: `npm install failed with exit code ${inspect.ExitCode}`
        };
      }

      return {
        success: true,
        logs: [logs]
      };

    } catch (error: any) {
      return {
        success: false,
        logs: [],
        error: error.message
      };
    } finally {
      // Cleanup temp files
      await fs.remove(tmpDir);
    }
  }

  /**
   * Helper to convert stream to string
   */
  private async streamToString(stream: NodeJS.ReadableStream): Promise<string> {
    return new Promise((resolve, reject) => {
      let data = '';
      stream.on('data', chunk => data += chunk.toString());
      stream.on('end', () => resolve(data));
      stream.on('error', reject);
    });
  }

  /**
   * Executes a command in the container
   */
  async executeCommand(containerId: string, command: string[]): Promise<ExecutionResult> {
    try {
      const container = this.docker.getContainer(containerId);
      const exec = await container.exec({
        Cmd: command,
        AttachStdout: true,
        AttachStderr: true
      });

      const stream = await exec.start({ Detach: false, Tty: false });
      const logs = await this.streamToString(stream);
      const inspect = await exec.inspect();

      return {
        success: inspect.ExitCode === 0,
        logs: [logs],
        error: inspect.ExitCode !== 0 ? `Command failed with code ${inspect.ExitCode}` : undefined
      };
    } catch (error: any) {
      return {
        success: false,
        logs: [],
        error: error.message
      };
    }
  }

  /**
   * Lists all active environments
   */
  async listEnvironments(): Promise<RuntimeEnvironment[]> {
    const containers = await this.docker.listContainers({
      all: true,
      filters: {
        label: ['com.cumulonimbus.type=runtime']
      }
    });

    return containers.map(c => {
      const ports = c.Ports.filter(p => p.PrivatePort === 3000);
      const hostPort = ports[0]?.PublicPort;
      
      return {
        id: c.Id,
        appId: c.Labels['com.cumulonimbus.appId'],
        status: c.State as any, // running, exited, etc
        createdAt: new Date(c.Created * 1000),
        lastUsed: new Date(c.Created * 1000), // Approximation, real tracking needs DB
        url: hostPort ? `http://localhost:${hostPort}` : undefined
      };
    });
  }

  /**
   * Terminates an environment
   */
  async destroyEnvironment(containerId: string): Promise<void> {
    try {
      const container = this.docker.getContainer(containerId);
      await container.stop();
      await container.remove();
    } catch (error) {
      console.error(`Failed to destroy environment ${containerId}:`, error);
      // Ignore if already stopped/removed
    }
  }

  /**
   * Gets current stats for an environment
   */
  async getStats(containerId: string): Promise<RuntimeStats> {
    const container = this.docker.getContainer(containerId);
    const stats = await container.stats({ stream: false });
    
    // Calculate CPU usage %
    // Docker stats return accumulated usage, so we need to calculate delta if we had previous stats
    // But for single snapshot, we can use the pre_cpu_stats if available
    let cpuUsage = 0;
    if (stats.cpu_stats && stats.precpu_stats) {
      const cpuDelta = stats.cpu_stats.cpu_usage.total_usage - stats.precpu_stats.cpu_usage.total_usage;
      const systemDelta = stats.cpu_stats.system_cpu_usage - stats.precpu_stats.system_cpu_usage;
      if (systemDelta > 0 && stats.cpu_stats.online_cpus) {
        cpuUsage = (cpuDelta / systemDelta) * stats.cpu_stats.online_cpus * 100;
      }
    }

    // Inspect to get start time/uptime
    const info = await container.inspect();
    const startedAt = new Date(info.State.StartedAt).getTime();
    const uptime = info.State.Running ? (Date.now() - startedAt) / 1000 : 0;

    return {
      memoryUsage: stats.memory_stats?.usage || 0,
      cpuUsage,
      uptime
    };
  }

  /**
   * Starts the application in background
   */
  async startApp(containerId: string, startCommand: string = 'npm start'): Promise<void> {
    const container = this.docker.getContainer(containerId);
    
    // Run command in background, piping output to log file
    const cmd = `${startCommand} > /app/app.log 2>&1 &`;
    
    const exec = await container.exec({
      Cmd: ['/bin/sh', '-c', cmd],
    });
    
    await exec.start({ Detach: true });
  }

  /**
   * Gets application logs
   */
  async getAppLogs(containerId: string, tail: number = 100): Promise<string> {
    const container = this.docker.getContainer(containerId);
    
    try {
      const exec = await container.exec({
        Cmd: ['tail', '-n', tail.toString(), '/app/app.log'],
        AttachStdout: true,
        AttachStderr: true
      });
      
      const stream = await exec.start({ Detach: false, Tty: false });
      return await this.streamToString(stream);
    } catch (error) {
      return ''; // Log file might not exist yet
    }
  }

  /**
   * Updates resource limits for a running container
   */
  async updateResources(containerId: string, resources: { memory?: number; cpu?: number }): Promise<void> {
    const container = this.docker.getContainer(containerId);
    await container.update({
      Memory: resources.memory ? resources.memory * 1024 * 1024 : undefined,
      NanoCpus: resources.cpu ? resources.cpu * 1e9 : undefined,
    });
  }
}
