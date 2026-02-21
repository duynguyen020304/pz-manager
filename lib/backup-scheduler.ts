export interface SchedulerStatus {
  isRunning: boolean;
  lastCheck: Date | null;
  totalChecks: number;
  lastError: string | null;
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
}

export const backupScheduler = BackupScheduler.getInstance();
