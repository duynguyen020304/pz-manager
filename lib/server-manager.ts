import { exec } from 'child_process';
import { promisify } from 'util';
import { ServerStatus, ServerJob, PZInstallation } from '@/types';
import { loadConfig } from './config-manager';

const execAsync = promisify(exec);

// In-memory job store (replace with Redis/DB for production)
const jobs = new Map<string, ServerJob>();

// Status cache to reduce system calls
const statusCache = new Map<string, { status: ServerStatus; timestamp: number }>();
const STATUS_CACHE_TTL = 5000; // 5 seconds

// Server startup timeout constants (in seconds)
const PROCESS_SPAWN_TIMEOUT = 240;  // 4 minutes - wait for PID to appear
const PORT_BINDING_TIMEOUT = 120;   // 2 minutes - wait for port to bind
const POLL_INTERVAL_MS = 1000;      // 1 second between checks

// Default PZ installation
const DEFAULT_INSTALLATION: PZInstallation = {
  id: 'default',
  name: 'Default (v42.13)',
  path: '/opt/pzserver',
  version: '42.13.1'
};

// Base port configuration
const BASE_PORTS = {
  defaultPort: 16261,
  udpPort: 16262,
  rconPort: 27015
};

// Port increment per server index
const PORT_INCREMENT = 10;

/**
 * Calculate ports for a server based on its index in the config
 */
function calculatePorts(serverName: string, servers: string[]): { defaultPort: number; udpPort: number; rconPort: number } {
  const index = servers.indexOf(serverName);
  if (index === -1) {
    // Server not in config, use base ports (shouldn't happen)
    return BASE_PORTS;
  }
  
  return {
    defaultPort: BASE_PORTS.defaultPort + (index * PORT_INCREMENT),
    udpPort: BASE_PORTS.udpPort + (index * PORT_INCREMENT),
    rconPort: BASE_PORTS.rconPort + (index * PORT_INCREMENT)
  };
}

/**
 * Check if a tmux session exists
 */
async function tmuxSessionExists(sessionName: string): Promise<boolean> {
  try {
    await execAsync(`tmux has-session -t ${sessionName}`);
    return true;
  } catch {
    return false;
  }
}

/**
 * Find the PID of a running Project Zomboid server
 */
async function findServerPid(serverName: string): Promise<number | null> {
  try {
    const { stdout } = await execAsync(
      `pgrep -f "ProjectZomboid64.*-servername ${serverName}" || true`
    );
    const pid = parseInt(stdout.trim(), 10);
    return isNaN(pid) ? null : pid;
  } catch {
    return null;
  }
}

/**
 * Get process uptime in human-readable format
 */
async function getProcessUptime(pid: number): Promise<string | null> {
  try {
    const { stdout } = await execAsync(`ps -o etime= -p ${pid}`);
    const uptime = stdout.trim();
    // Convert ps etime format to readable format
    // etime format: [[dd-]hh:]mm:ss
    return uptime;
  } catch {
    return null;
  }
}

/**
 * Check if a port is bound
 */
async function isPortBound(port: number): Promise<boolean> {
  try {
    const { stdout } = await execAsync(`ss -ulnp | grep :${port} || true`);
    return stdout.trim().length > 0;
  } catch {
    return false;
  }
}

/**
 * Get the status of a single server
 */
export async function getServerStatus(serverName: string): Promise<ServerStatus> {
  const now = Date.now();
  
  // Check cache first
  const cached = statusCache.get(serverName);
  if (cached && (now - cached.timestamp) < STATUS_CACHE_TTL) {
    return cached.status;
  }
  
  const config = await loadConfig();
  const tmuxSession = `pz-${serverName}`;
  const hasSession = await tmuxSessionExists(tmuxSession);
  const pid = await findServerPid(serverName);
  const ports = calculatePorts(serverName, config.servers);
  
  let state: ServerStatus['state'] = 'stopped';
  let uptime: string | undefined;
  let startedAt: Date | undefined;
  
  // Check for active jobs
  const activeJob = Array.from(jobs.values()).find(
    job => job.serverName === serverName && 
    (job.status === 'pending' || job.status === 'running')
  );
  
  if (activeJob) {
    state = activeJob.operation === 'start' ? 'starting' : 'stopping';
  } else if (pid && hasSession) {
    state = 'running';
    uptime = await getProcessUptime(pid) || undefined;
    // Estimate startedAt from uptime (rough approximation)
    startedAt = new Date();
  }
  
  const status: ServerStatus = {
    name: serverName,
    state,
    pid: pid || undefined,
    tmuxSession: hasSession ? tmuxSession : undefined,
    uptime,
    ports,
    startedAt
  };
  
  // Update cache
  statusCache.set(serverName, { status, timestamp: now });
  
  return status;
}

/**
 * Get status for all configured servers
 */
export async function getAllServerStatus(): Promise<ServerStatus[]> {
  const config = await loadConfig();
  const statuses = await Promise.all(
    config.servers.map(name => getServerStatus(name))
  );
  return statuses;
}

/**
 * Clear the status cache for a server
 */
function clearStatusCache(serverName: string): void {
  statusCache.delete(serverName);
}

/**
 * Start a server asynchronously
 */
export async function startServer(
  serverName: string, 
  options?: { debug?: boolean; installationId?: string }
): Promise<string> {
  const jobId = `start-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  
  const job: ServerJob = {
    id: jobId,
    serverName,
    operation: 'start',
    status: 'pending',
    progress: 0,
    message: 'Initializing server start...',
    startedAt: new Date()
  };
  
  jobs.set(jobId, job);
  
  // Start the async process
  executeStartJob(jobId, serverName, options);
  
  return jobId;
}

/**
 * Execute the start job asynchronously
 */
async function executeStartJob(
  jobId: string, 
  serverName: string, 
  options?: { debug?: boolean; installationId?: string }
): Promise<void> {
  const job = jobs.get(jobId);
  if (!job) return;
  
  try {
    const config = await loadConfig();
    const tmuxSession = `pz-${serverName}`;
    const installation = DEFAULT_INSTALLATION; // TODO: Support multiple installations
    
    // Stage 1: Check if already running (10%)
    job.status = 'running';
    job.progress = 10;
    job.message = 'Checking if server is already running...';
    
    const existingStatus = await getServerStatus(serverName);
    if (existingStatus.state === 'running') {
      throw new Error(`Server ${serverName} is already running (PID: ${existingStatus.pid})`);
    }
    
    // Stage 2: Create tmux session (20%)
    job.progress = 20;
    job.message = 'Creating tmux session...';
    
    // Kill existing session if present (cleanup)
    if (await tmuxSessionExists(tmuxSession)) {
      await execAsync(`tmux kill-session -t ${tmuxSession} || true`);
    }
    
    // Create new detached session
    await execAsync(`tmux new-session -d -s ${tmuxSession}`);
    
    // Stage 3: Start the server (40%)
    job.progress = 40;
    job.message = 'Starting Project Zomboid server...';
    
    const startScript = `${installation.path}/start-server.sh`;
    const debugFlag = options?.debug ? ' -debug' : '';
    const command = `${startScript} -servername ${serverName} -nosteam${debugFlag}`;
    
    // Send the command to tmux
    await execAsync(`tmux send-keys -t ${tmuxSession} "${command}" Enter`);
    
    // Stage 4: Wait for process to spawn (60%)
    job.progress = 60;
    job.message = 'Waiting for server to initialize...';

    // Wait up to PROCESS_SPAWN_TIMEOUT seconds for process to appear
    let pid: number | null = null;
    for (let i = 0; i < PROCESS_SPAWN_TIMEOUT; i++) {
      await new Promise(resolve => setTimeout(resolve, POLL_INTERVAL_MS));
      pid = await findServerPid(serverName);
      if (pid) break;
    }

    if (!pid) {
      throw new Error(`Server process failed to start within ${PROCESS_SPAWN_TIMEOUT} seconds`);
    }
    
    // Stage 5: Verify port binding (80%)
    job.progress = 80;
    job.message = 'Verifying server is accepting connections...';

    const ports = calculatePorts(serverName, config.servers);
    let portBound = false;

    // Wait up to PORT_BINDING_TIMEOUT seconds for port binding
    for (let i = 0; i < PORT_BINDING_TIMEOUT; i++) {
      await new Promise(resolve => setTimeout(resolve, POLL_INTERVAL_MS));
      portBound = await isPortBound(ports.defaultPort);
      if (portBound) break;
    }

    if (!portBound) {
      throw new Error(`Server started but port ${ports.defaultPort} is not bound after ${PORT_BINDING_TIMEOUT} seconds`);
    }
    
    // Stage 6: Complete (100%)
    job.progress = 100;
    job.status = 'completed';
    job.message = 'Server started successfully!';
    job.completedAt = new Date();
    job.result = {
      pid,
      tmuxSession
    };
    
    // Clear cache so next status check gets fresh data
    clearStatusCache(serverName);
    
  } catch (error) {
    job.status = 'failed';
    job.message = 'Failed to start server';
    job.error = error instanceof Error ? error.message : 'Unknown error';
    job.completedAt = new Date();
    console.error('Start server error:', error);
    
    // Clean up tmux session on failure
    try {
      const tmuxSession = `pz-${serverName}`;
      await execAsync(`tmux kill-session -t ${tmuxSession} || true`);
    } catch {
      // Ignore cleanup errors
    }
  }
}

/**
 * Stop a server asynchronously
 */
export async function stopServer(serverName: string): Promise<string> {
  const jobId = `stop-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  
  const job: ServerJob = {
    id: jobId,
    serverName,
    operation: 'stop',
    status: 'pending',
    progress: 0,
    message: 'Initializing server shutdown...',
    startedAt: new Date()
  };
  
  jobs.set(jobId, job);
  
  // Start the async process
  executeStopJob(jobId, serverName);
  
  return jobId;
}

/**
 * Execute the stop job asynchronously
 */
async function executeStopJob(jobId: string, serverName: string): Promise<void> {
  const job = jobs.get(jobId);
  if (!job) return;
  
  try {
    const tmuxSession = `pz-${serverName}`;
    
    // Check if server is running
    const status = await getServerStatus(serverName);
    if (status.state === 'stopped') {
      throw new Error(`Server ${serverName} is not running`);
    }
    
    job.status = 'running';
    
    // Stage 1: Send save command (20%)
    job.progress = 20;
    job.message = 'Saving game state...';
    
    if (await tmuxSessionExists(tmuxSession)) {
      await execAsync(`tmux send-keys -t ${tmuxSession} "save" Enter`);
    }
    
    // Wait for save to complete
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    // Stage 2: Send quit command (50%)
    job.progress = 50;
    job.message = 'Sending quit command...';
    
    if (await tmuxSessionExists(tmuxSession)) {
      await execAsync(`tmux send-keys -t ${tmuxSession} "quit" Enter`);
    }
    
    // Stage 3: Wait for graceful shutdown (80%)
    job.progress = 80;
    job.message = 'Waiting for graceful shutdown...';
    
    // Wait up to 15 seconds for process to terminate
    for (let i = 0; i < 15; i++) {
      await new Promise(resolve => setTimeout(resolve, 1000));
      const pid = await findServerPid(serverName);
      if (!pid) break;
    }
    
    // Stage 4: Kill tmux session if still running
    const pid = await findServerPid(serverName);
    if (pid) {
      job.message = 'Force stopping server...';
      try {
        process.kill(pid, 'SIGTERM');
        await new Promise(resolve => setTimeout(resolve, 2000));
      } catch {
        // Process might already be gone
      }
    }
    
    // Kill tmux session
    if (await tmuxSessionExists(tmuxSession)) {
      await execAsync(`tmux kill-session -t ${tmuxSession} || true`);
    }
    
    // Stage 5: Complete (100%)
    job.progress = 100;
    job.status = 'completed';
    job.message = 'Server stopped successfully';
    job.completedAt = new Date();
    
    // Clear cache
    clearStatusCache(serverName);
    
  } catch (error) {
    job.status = 'failed';
    job.message = 'Failed to stop server';
    job.error = error instanceof Error ? error.message : 'Unknown error';
    job.completedAt = new Date();
    console.error('Stop server error:', error);
  }
}

/**
 * Get job status by ID
 */
export function getServerJobStatus(jobId: string): ServerJob | null {
  return jobs.get(jobId) || null;
}

/**
 * Get available PZ installations
 */
export function getPZInstallations(): PZInstallation[] {
  return [DEFAULT_INSTALLATION];
}
