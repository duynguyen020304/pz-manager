import { spawn } from 'child_process';

async function execCommand(command: string, args: string[]): Promise<{ stdout: string; stderr: string }> {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args);
    let stdout = '';
    let stderr = '';

    child.stdout?.on('data', (data) => {
      stdout += data.toString();
    });

    child.stderr?.on('data', (data) => {
      stderr += data.toString();
    });

    child.on('close', (code) => {
      if (code === 0) {
        resolve({ stdout, stderr });
      } else {
        const error = new Error(`Command failed with exit code ${code}`);
        (error as Error & { stderr: string }).stderr = stderr;
        reject(error);
      }
    });

    child.on('error', (error) => {
      (error as Error & { stderr: string }).stderr = stderr;
      reject(error);
    });
  });
}

export interface SchedulerStatus {
  isRunning: boolean;
  lastCheck: Date | null;
  totalChecks: number;
  lastError: string | null;
}

export interface TimerStatus {
  exists: boolean;
  active: boolean;
  nextRun: Date | null;
}

class BackupScheduler {
  private static instance: BackupScheduler;
  private intervalId: NodeJS.Timeout | null = null;
  private status: SchedulerStatus = {
    isRunning: false,
    lastCheck: null,
    totalChecks: 0,
    lastError: null,
  };

  private constructor() {}

  public static getInstance(): BackupScheduler {
    if (!BackupScheduler.instance) {
      BackupScheduler.instance = new BackupScheduler();
    }
    return BackupScheduler.instance;
  }

  public async start(): Promise<void> {
    if (this.status.isRunning) {
      console.log('[BackupScheduler] Already running');
      return;
    }

    try {
      if (!process.getuid || process.getuid() !== 0) {
        throw new Error('Backup scheduler requires root permissions');
      }

      const intervalMs = 30 * 1000;
      this.intervalId = setInterval(() => this.checkSchedules(), intervalMs);
      this.checkSchedules();

      this.status.isRunning = true;
      console.log('[BackupScheduler] Started with 30s polling interval');
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      this.status.lastError = errorMsg;
      console.error('[BackupScheduler] Failed to start:', errorMsg);
      throw error;
    }
  }

  public stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }

    this.status.isRunning = false;
    console.log('[BackupScheduler] Stopped');
  }

  private async checkSchedules(): Promise<void> {
    try {
      this.status.lastCheck = new Date();
      this.status.totalChecks++;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      this.status.lastError = errorMsg;
      console.error('[BackupScheduler] Error checking schedules:', errorMsg);
    }
  }

  public getStatus(): SchedulerStatus {
    return { ...this.status };
  }

  public async getTimerStatus(scheduleName: string): Promise<TimerStatus> {
    const timerName = `zomboid-backup@${scheduleName}.timer`;

    try {
      const { stdout } = await execCommand('systemctl', [
        'show',
        timerName,
        '--property=ActiveState',
        '--property=SubState',
        '--property=NextElapseUSecRealtime',
      ]);

      const lines = stdout.split('\n').filter((line: string) => line.length > 0);
      const properties = new Map<string, string>();

      for (const line of lines) {
        const [key, value] = line.split('=', 2);
        if (key && value !== undefined) {
          properties.set(key, value);
        }
      }

      const activeState = properties.get('ActiveState');
      const isActive = activeState === 'active';
      const nextElapseUSec = properties.get('NextElapseUSecRealtime');
      let nextRun: Date | null = null;

      if (nextElapseUSec && nextElapseUSec !== '' && nextElapseUSec !== '0' && nextElapseUSec !== '0us' && nextElapseUSec !== 'infinity') {
        if (/^\d+us$/.test(nextElapseUSec)) {
          const us = BigInt(nextElapseUSec.replace('us', ''));
          nextRun = new Date(Number(us / BigInt(1000)));
        } else {
          const parsed = new Date(nextElapseUSec);
          if (!isNaN(parsed.getTime())) {
            nextRun = parsed;
          }
        }
      }

      return {
        exists: true,
        active: isActive,
        nextRun,
      };
    } catch (error) {
      if (error instanceof Error && 'stderr' in error) {
        const stderr = (error as { stderr?: string }).stderr;
        if (stderr?.includes('Load failed') || stderr?.includes('not loaded')) {
          return {
            exists: false,
            active: false,
            nextRun: null,
          };
        }
      }

      console.error('[BackupScheduler] Failed to query timer status:', error);
      return {
        exists: false,
        active: false,
        nextRun: null,
      };
    }
  }
}

export const backupScheduler = BackupScheduler.getInstance();
