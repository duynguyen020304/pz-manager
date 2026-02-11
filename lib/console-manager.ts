import { exec } from 'child_process';
import { promisify } from 'util';
import { existsSync, unlinkSync, appendFileSync, readFileSync } from 'fs';
import { join } from 'path';

const execAsync = promisify(exec);

// Console capture state for reference counting
interface ConsoleCaptureState {
  logPath: string;
  clients: number;
  startedAt: Date;
}

const activeCaptures = new Map<string, ConsoleCaptureState>();

// Log file directory
const LOG_DIR = '/tmp';
const LOG_PREFIX = 'pz-console-';
const LOG_SUFFIX = '.log';

/**
 * Get the log file path for a server
 */
export function getLogPath(serverName: string): string {
  const sanitizedName = serverName.replace(/[^a-zA-Z0-9_-]/g, '_');
  return join(LOG_DIR, `${LOG_PREFIX}${sanitizedName}${LOG_SUFFIX}`);
}

/**
 * Get the tmux session name for a server
 */
function getTmuxSession(serverName: string): string {
  return `pz-${serverName}`;
}

/**
 * Check if console capture is currently active for a server
 */
export function isCapturing(serverName: string): boolean {
  return activeCaptures.has(serverName);
}

/**
 * Start console capture using tmux pipe-pane
 * This uses reference counting - capture only stops when all clients disconnect
 */
export async function startConsoleCapture(serverName: string): Promise<string> {
  const session = getTmuxSession(serverName);
  const logPath = getLogPath(serverName);

  // Check if session exists
  try {
    await execAsync(`tmux has-session -t ${session}`);
  } catch {
    throw new Error(`Server ${serverName} is not running (tmux session ${session} not found)`);
  }

  // Check if already capturing
  const existing = activeCaptures.get(serverName);
  if (existing) {
    existing.clients++;
    return existing.logPath;
  }

  // Start new capture
  // First, capture existing buffer
  try {
    const initialBuffer = await execAsync(
      `tmux capture-pane -t ${session} -S -1000 -p`
    );
    // Write initial buffer to log file
    appendFileSync(logPath, `=== CONSOLE SESSION STARTED AT ${new Date().toISOString()} ===\n`);
    appendFileSync(logPath, initialBuffer.stdout);
  } catch {
    // Ignore errors capturing initial buffer
  }

  // Start pipe-pane to capture new output
  await execAsync(
    `tmux pipe-pane -t ${session} "cat >> ${logPath}"`
  );

  // Track the capture
  activeCaptures.set(serverName, {
    logPath,
    clients: 1,
    startedAt: new Date()
  });

  return logPath;
}

/**
 * Stop console capture for a server
 * Uses reference counting - only stops when last client disconnects
 */
export async function stopConsoleCapture(serverName: string): Promise<void> {
  const state = activeCaptures.get(serverName);
  if (!state) {
    return; // Not capturing
  }

  state.clients--;

  // Only stop if no more clients
  if (state.clients <= 0) {
    const session = getTmuxSession(serverName);

    try {
      // Stop pipe-pane by setting empty command
      await execAsync(`tmux pipe-pane -t ${session} ""`);
    } catch {
      // Session might be gone, ignore error
    }

    // Clean up state
    activeCaptures.delete(serverName);

    // Optionally clean up log file after a delay
    // (In case client reconnects quickly)
    setTimeout(() => {
      const currentState = activeCaptures.get(serverName);
      if (!currentState) {
        try {
          unlinkSync(state.logPath);
        } catch {
          // File already gone or can't delete
        }
      }
    }, 60000); // 1 minute
  }
}

/**
 * Get a console snapshot using tmux capture-pane
 * This is useful for getting historical data on initial load
 */
export async function getConsoleSnapshot(serverName: string, lines: number = 100): Promise<string> {
  const session = getTmuxSession(serverName);

  // Check if session exists
  try {
    await execAsync(`tmux has-session -t ${session}`);
  } catch {
    throw new Error(`Server ${serverName} is not running`);
  }

  try {
    // Capture the last N lines from the tmux buffer
    const { stdout } = await execAsync(
      `tmux capture-pane -t ${session} -S -${lines} -p`
    );
    return stdout;
  } catch (error) {
    throw new Error(`Failed to capture console: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Get the current size of the log file
 */
export function getLogFileSize(serverName: string): number {
  const logPath = getLogPath(serverName);
  if (!existsSync(logPath)) {
    return 0;
  }
  try {
    const stats = readFileSync(logPath);
    return stats.length;
  } catch {
    return 0;
  }
}

/**
 * Get console capture state for a server
 */
export function getConsoleState(serverName: string): ConsoleCaptureState | null {
  return activeCaptures.get(serverName) || null;
}

/**
 * Get all active console captures
 */
export function getActiveCaptures(): string[] {
  return Array.from(activeCaptures.keys());
}
