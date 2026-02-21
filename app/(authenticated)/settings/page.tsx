'use client';

import {
  useConfig,
  useSchedules,
  useUpdateSchedule,
  useTriggerBackup,
  useUpdateCompression,
  useUpdateIntegrity,
  useUpdateAutoRollback
} from '@/hooks/use-api';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { BackupConfig, Schedule, ScheduleWithStatus, MonitorConfig, MonitorConfigInput } from '@/types';
import {
  Settings,
  Clock,
  Server,
  Sliders,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Loader2,
  ToggleLeft,
  ToggleRight,
  ChevronLeft,
  ChevronRight,
  Shield,
  Archive,
  RotateCcw,
  Skull,
  Activity,
  Play
} from 'lucide-react';

const tabs = [
  { id: 'schedules', name: 'Schedules', icon: Clock, description: 'Manage backup schedules' },
  { id: 'servers', name: 'Servers', icon: Server, description: 'Configure server list' },
  { id: 'monitoring', name: 'Monitoring', icon: Activity, description: 'System performance monitoring' },
  { id: 'settings', name: 'Settings', icon: Sliders, description: 'Compression and integrity' },
  { id: 'rollback', name: 'Rollback', icon: RotateCcw, description: 'Automatic rollback on player death' },
];

const retentionOptions = [6, 12, 24, 48, 72, 30, 90];
const compressionLevels = [1, 3, 5, 7, 9];

// Map cron intervals to human-readable labels
const intervalLabels: Record<string, string> = {
  '*/5 * * * *': 'Every 5 min',
  '*/10 * * * *': 'Every 10 min',
  '*/30 * * * *': 'Every 30 min',
  '0 * * * *': 'Hourly',
  '0 0 * * *': 'Daily',
  '0 1 * * *': 'Daily',
  '0 2 * * *': 'Daily',
  '0 3 * * *': 'Daily',
  '0 4 * * *': 'Daily',
  '0 0 * * 0': 'Weekly',
  '0 1 * * 0': 'Weekly',
  '0 2 * * 0': 'Weekly',
  '0 3 * * 0': 'Weekly',
  '0 4 * * 0': 'Weekly',
  '@hourly': 'Hourly',
  '@daily': 'Daily',
  '@weekly': 'Weekly',
};

function formatInterval(interval: string): string {
  return intervalLabels[interval] || interval;
}

export default function ConfigPage() {
  const [activeTab, setActiveTab] = useState('schedules');
  const { data: config, isLoading } = useConfig();
  
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!config) {
    return (
      <div className="text-center py-16">
        <AlertCircle className="w-16 h-16 mx-auto mb-4 text-destructive" />
        <h2 className="text-xl font-bold text-foreground">Failed to load configuration</h2>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
          <Settings className="w-8 h-8 text-primary" />
          Settings
        </h1>
        <p className="text-muted-foreground mt-2">
          Manage backup schedules, servers, and system settings
        </p>
      </div>

          {/* Tab Navigation */}
          <div className="flex flex-wrap gap-2 mb-6">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition-all ${
                    activeTab === tab.id
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'bg-card text-muted-foreground border-border hover:border-primary/30 hover:text-foreground'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span className="font-medium">{tab.name}</span>
                </button>
              );
            })}
          </div>

      {/* Tab Content */}
      <div className="bg-card border border-border rounded-lg">
        {activeTab === 'schedules' && <SchedulesTab config={config} />}
        {activeTab === 'servers' && <ServersTab config={config} />}
        {activeTab === 'monitoring' && <MonitoringTab />}
        {activeTab === 'settings' && <SettingsTab config={config} />}
        {activeTab === 'rollback' && <RollbackTab config={config} />}
      </div>
    </div>
  );
}

// Schedules Tab
function SchedulesTab({ config }: { config: BackupConfig }) {
  const { data: schedulesWithStatus } = useSchedules();
  const updateSchedule = useUpdateSchedule();
  const triggerBackup = useTriggerBackup();
  const [triggeredJobId, setTriggeredJobId] = useState<{ [key: string]: string | null }>({});

  const handleToggle = async (name: string, enabled: boolean) => {
    try {
      await updateSchedule.mutateAsync({ name, updates: { enabled } });
    } catch (error) {
      console.error('Failed to update schedule:', error);
    }
  };

  const handleRetentionChange = async (name: string, direction: 'up' | 'down') => {
    const schedule = config.schedules.find((s: Schedule) => s.name === name);
    if (!schedule) return;

    const currentIndex = retentionOptions.indexOf(schedule.retention);
    let newIndex;

    if (direction === 'up') {
      newIndex = Math.min(currentIndex + 1, retentionOptions.length - 1);
    } else {
      newIndex = Math.max(currentIndex - 1, 0);
    }

    const newRetention = retentionOptions[newIndex];

    if (newRetention !== schedule.retention) {
      try {
        await updateSchedule.mutateAsync({ name, updates: { retention: newRetention } });
      } catch (error) {
        console.error('Failed to update retention:', error);
      }
    }
  };

  const handleTriggerBackup = async (scheduleName: string) => {
    try {
      const result = await triggerBackup.mutateAsync(scheduleName);
      setTriggeredJobId((prev) => ({ ...prev, [scheduleName]: result.jobId }));
      setTimeout(() => {
        setTriggeredJobId((prev) => ({ ...prev, [scheduleName]: null }));
      }, 5000);
    } catch (error) {
      console.error('Failed to trigger backup:', error);
    }
  };

  const schedulesToDisplay = schedulesWithStatus || config.schedules.map((s: Schedule) => ({
    ...s,
    status: { exists: false, active: false, nextRun: null }
  }));

  return (
    <div className="p-6">
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-foreground">Backup Schedules</h2>
        <p className="text-muted-foreground">Configure when backups are created and how long they are kept</p>
      </div>

      <div className="space-y-4">
        {schedulesToDisplay.map((schedule: ScheduleWithStatus) => (
          <div
            key={schedule.name}
            className={`p-4 rounded-lg border transition-colors ${
              schedule.enabled
                ? 'bg-muted/30 border-border'
                : 'bg-muted/10 border-border/50 opacity-60'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <button
                  onClick={() => handleToggle(schedule.name, !schedule.enabled)}
                  className="flex-shrink-0"
                >
                  {schedule.enabled ? (
                    <ToggleRight className="w-8 h-8 text-green-500" />
                  ) : (
                    <ToggleLeft className="w-8 h-8 text-muted-foreground" />
                  )}
                </button>

                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-medium text-foreground capitalize">{schedule.name}</h3>
                    {schedule.enabled && schedule.status.active && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-green-500/10 text-green-600 border border-green-500/20">
                        Active
                      </span>
                    )}
                    {schedule.enabled && !schedule.status.active && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-yellow-500/10 text-yellow-600 border border-yellow-500/20">
                        Inactive
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">{formatInterval(schedule.interval)}</p>
                  {schedule.status.nextRun && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Next run: {new Date(schedule.status.nextRun).toLocaleString()}
                    </p>
                  )}
                  {!schedule.status.exists && schedule.enabled && (
                    <p className="text-xs text-yellow-600 mt-1">Timer not yet created</p>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-4">
                <div className="text-right">
                  <p className="text-sm text-muted-foreground">Retention</p>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleRetentionChange(schedule.name, 'down')}
                      className="p-1 hover:bg-muted rounded"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <span className="font-medium text-foreground w-16 text-center">
                      {schedule.retention}
                    </span>
                    <button
                      onClick={() => handleRetentionChange(schedule.name, 'up')}
                      className="p-1 hover:bg-muted rounded"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                <button
                  onClick={() => handleTriggerBackup(schedule.name)}
                  disabled={triggerBackup.isPending || !schedule.enabled}
                  className="flex items-center gap-2 px-3 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {triggerBackup.isPending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Play className="w-4 h-4" />
                  )}
                  <span className="text-sm font-medium">Backup Now</span>
                </button>
                {triggeredJobId[schedule.name] && (
                  <div className="flex items-center gap-2 text-xs text-green-600">
                    <CheckCircle2 className="w-3 h-3" />
                    <span>Started: {triggeredJobId[schedule.name]!.slice(0, 12)}...</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// Servers Tab
function ServersTab({ config }: { config: BackupConfig }) {
  return (
    <div className="p-6">
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-foreground">Configured Servers</h2>
        <p className="text-muted-foreground">Manage which servers are included in backups</p>
      </div>

      {config.servers.length === 0 ? (
        <div className="text-center py-12">
          <Server className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-50" />
          <h3 className="text-lg font-medium text-foreground mb-2">No servers configured</h3>
          <p className="text-muted-foreground mb-4">Add servers from the Servers page</p>
        </div>
      ) : (
        <div className="space-y-3">
          {config.servers.map((serverName: string) => (
            <div 
              key={serverName}
              className="flex items-center justify-between p-4 bg-muted/30 rounded-lg border border-border"
            >
              <div className="flex items-center gap-3">
                <Server className="w-5 h-5 text-primary" />
                <span className="font-medium text-foreground">{serverName}</span>
              </div>
              <CheckCircle2 className="w-5 h-5 text-green-500" />
            </div>
          ))}
        </div>
      )}

      <div className="mt-6 p-4 bg-muted/30 rounded-lg border border-border">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-muted-foreground flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm text-muted-foreground">
              To add or remove servers, use the <a href="/servers" className="text-primary hover:underline">Servers</a> page.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

// Settings Tab
function SettingsTab({ config }: { config: BackupConfig }) {
  const updateCompression = useUpdateCompression();
  const updateIntegrity = useUpdateIntegrity();

  const handleToggleCompression = async () => {
    try {
      await updateCompression.mutateAsync({ 
        enabled: !config.compression.enabled 
      });
    } catch (error) {
      console.error('Failed to update compression:', error);
    }
  };

  const handleCompressionLevelChange = async (direction: 'up' | 'down') => {
    const currentIndex = compressionLevels.indexOf(config.compression.level);
    let newIndex;
    
    if (direction === 'up') {
      newIndex = Math.min(currentIndex + 1, compressionLevels.length - 1);
    } else {
      newIndex = Math.max(currentIndex - 1, 0);
    }
    
    const newLevel = compressionLevels[newIndex];
    
    if (newLevel !== config.compression.level) {
      try {
        await updateCompression.mutateAsync({ level: newLevel });
      } catch (error) {
        console.error('Failed to update compression level:', error);
      }
    }
  };

  const handleToggleVerifyBackup = async () => {
    try {
      await updateIntegrity.mutateAsync({ 
        verifyAfterBackup: !config.integrity.verifyAfterBackup 
      });
    } catch (error) {
      console.error('Failed to update integrity:', error);
    }
  };

  const handleToggleVerifyRestore = async () => {
    try {
      await updateIntegrity.mutateAsync({ 
        verifyAfterRestore: !config.integrity.verifyAfterRestore 
      });
    } catch (error) {
      console.error('Failed to update integrity:', error);
    }
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-foreground">Backup Settings</h2>
        <p className="text-muted-foreground">Configure compression and integrity verification</p>
      </div>

      <div className="space-y-6">
        {/* Compression Settings */}
        <div className="p-4 bg-muted/30 rounded-lg border border-border">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                <Archive className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h3 className="font-medium text-foreground">Compression</h3>
                <p className="text-sm text-muted-foreground">Compress backups to save disk space</p>
              </div>
            </div>
            <button onClick={handleToggleCompression}>
              {config.compression.enabled ? (
                <ToggleRight className="w-8 h-8 text-green-500" />
              ) : (
                <ToggleLeft className="w-8 h-8 text-muted-foreground" />
              )}
            </button>
          </div>

          {config.compression.enabled && (
            <div className="mt-4 pt-4 border-t border-border">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Compression Level</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Higher levels = smaller files but slower backups
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleCompressionLevelChange('down')}
                    className="p-1 hover:bg-muted rounded"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <span className="font-medium text-foreground w-12 text-center">
                    {config.compression.level}
                  </span>
                  <button
                    onClick={() => handleCompressionLevelChange('up')}
                    className="p-1 hover:bg-muted rounded"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
              <div className="mt-2">
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-primary transition-all"
                    style={{ width: `${(config.compression.level / 9) * 100}%` }}
                  />
                </div>
                <div className="flex justify-between text-xs text-muted-foreground mt-1">
                  <span>Fast</span>
                  <span>Balanced</span>
                  <span>Max Compression</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Integrity Settings */}
        <div className="p-4 bg-muted/30 rounded-lg border border-border">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-accent/10 rounded-lg flex items-center justify-center">
              <Shield className="w-5 h-5 text-accent" />
            </div>
            <div>
              <h3 className="font-medium text-foreground">Integrity Verification</h3>
              <p className="text-sm text-muted-foreground">Verify backup integrity with checksums</p>
            </div>
          </div>

          <div className="space-y-3 mt-4 pt-4 border-t border-border">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-foreground">Verify after backup</p>
                <p className="text-sm text-muted-foreground">Check integrity immediately after creating backup</p>
              </div>
              <button onClick={handleToggleVerifyBackup}>
                {config.integrity.verifyAfterBackup ? (
                  <ToggleRight className="w-8 h-8 text-green-500" />
                ) : (
                  <ToggleLeft className="w-8 h-8 text-muted-foreground" />
                )}
              </button>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-foreground">Verify after restore</p>
                <p className="text-sm text-muted-foreground">Check integrity after restoring from backup</p>
              </div>
              <button onClick={handleToggleVerifyRestore}>
                {config.integrity.verifyAfterRestore ? (
                  <ToggleRight className="w-8 h-8 text-green-500" />
                ) : (
                  <ToggleLeft className="w-8 h-8 text-muted-foreground" />
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Rollback Tab
function RollbackTab({ config }: { config: BackupConfig }) {
  const updateAutoRollback = useUpdateAutoRollback();
  const autoRollback = config.autoRollback || {
    enabled: false,
    schedule: '5min',
    cooldownMinutes: 5,
    notifyPlayers: true
  };

  const handleToggleEnabled = async () => {
    try {
      await updateAutoRollback.mutateAsync({ enabled: !autoRollback.enabled });
    } catch (error) {
      console.error('Failed to update auto-rollback:', error);
    }
  };

  const handleScheduleChange = async (schedule: string) => {
    try {
      await updateAutoRollback.mutateAsync({ schedule });
    } catch (error) {
      console.error('Failed to update schedule:', error);
    }
  };

  const handleCooldownChange = async (direction: 'up' | 'down') => {
    const currentValue = autoRollback.cooldownMinutes;
    const newValue = direction === 'up' ? currentValue + 1 : Math.max(1, currentValue - 1);
    
    if (newValue !== currentValue) {
      try {
        await updateAutoRollback.mutateAsync({ cooldownMinutes: newValue });
      } catch (error) {
        console.error('Failed to update cooldown:', error);
      }
    }
  };

  const handleToggleNotify = async () => {
    try {
      await updateAutoRollback.mutateAsync({ notifyPlayers: !autoRollback.notifyPlayers });
    } catch (error) {
      console.error('Failed to update notify setting:', error);
    }
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-foreground flex items-center gap-2">
          <Skull className="w-6 h-6 text-destructive" />
          Automatic Rollback on Player Death
        </h2>
        <p className="text-muted-foreground mt-2">
          Automatically restore the server to a previous state when a player dies
        </p>
      </div>

      <div className="space-y-6">
        {/* Enable Toggle */}
        <div className="p-4 bg-muted/30 rounded-lg border border-border">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-destructive/10 rounded-lg flex items-center justify-center">
                <RotateCcw className="w-5 h-5 text-destructive" />
              </div>
              <div>
                <h3 className="font-medium text-foreground">Enable Auto-Rollback</h3>
                <p className="text-sm text-muted-foreground">Automatically rollback when a player dies</p>
              </div>
            </div>
            <button onClick={handleToggleEnabled}>
              {autoRollback.enabled ? (
                <ToggleRight className="w-8 h-8 text-green-500" />
              ) : (
                <ToggleLeft className="w-8 h-8 text-muted-foreground" />
              )}
            </button>
          </div>
        </div>

        {autoRollback.enabled && (
          <>
            {/* Schedule Selection */}
            <div className="p-4 bg-muted/30 rounded-lg border border-border">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="font-medium text-foreground">Snapshot Schedule</h3>
                  <p className="text-sm text-muted-foreground">Which backup schedule to use for rollback</p>
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {config.schedules.map((schedule) => (
                  <button
                    key={schedule.name}
                    onClick={() => handleScheduleChange(schedule.name)}
                    className={`p-3 rounded-lg border text-left transition-all ${
                      autoRollback.schedule === schedule.name
                        ? 'bg-primary/10 border-primary text-primary'
                        : 'bg-card border-border hover:border-primary/30'
                    }`}
                  >
                    <div className="font-medium capitalize">{schedule.name}</div>
                    <div className="text-sm opacity-70">{formatInterval(schedule.interval)}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Cooldown Setting */}
            <div className="p-4 bg-muted/30 rounded-lg border border-border">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="font-medium text-foreground">Cooldown Period</h3>
                  <p className="text-sm text-muted-foreground">Minutes to wait before another rollback can occur</p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleCooldownChange('down')}
                    className="p-1 hover:bg-muted rounded"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <span className="font-medium text-foreground w-16 text-center">
                    {autoRollback.cooldownMinutes} min
                  </span>
                  <button
                    onClick={() => handleCooldownChange('up')}
                    className="p-1 hover:bg-muted rounded"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>

            {/* Notify Players */}
            <div className="p-4 bg-muted/30 rounded-lg border border-border">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium text-foreground">Notify Players</h3>
                  <p className="text-sm text-muted-foreground">Send a server message when auto-rollback occurs</p>
                </div>
                <button onClick={handleToggleNotify}>
                  {autoRollback.notifyPlayers ? (
                    <ToggleRight className="w-8 h-8 text-green-500" />
                  ) : (
                    <ToggleLeft className="w-8 h-8 text-muted-foreground" />
                  )}
                </button>
              </div>
            </div>

            {/* Warning */}
            <div className="p-4 bg-destructive/10 rounded-lg border border-destructive/30">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm text-destructive font-medium">Important Warning</p>
                  <p className="text-sm text-destructive/80 mt-1">
                    Auto-rollback will restore the entire server to a previous state when any player dies. 
                    This will undo all progress made since the selected snapshot was taken. 
                    Use with caution and ensure frequent backups are enabled.
                  </p>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// Monitoring Tab
function MonitoringTab() {
  const { data: config, isLoading } = useQuery({
    queryKey: ['monitor-config'],
    queryFn: async (): Promise<MonitorConfig> => {
      const response = await fetch('/api/metrics?type=config');
      if (!response.ok) throw new Error('Failed to fetch config');
      const result = await response.json();
      if (!result.success) throw new Error(result.error);
      return result.data;
    },
  });

  const queryClient = useQueryClient();

  const updateConfig = useMutation({
    mutationFn: async (updates: MonitorConfigInput) => {
      const response = await fetch('/api/metrics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      if (!response.ok) throw new Error('Failed to update config');
      const result = await response.json();
      if (!result.success) throw new Error(result.error);
      return result.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['monitor-config'] });
      queryClient.invalidateQueries({ queryKey: ['metrics'] });
    },
  });

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  if (!config) {
    return (
      <div className="p-6">
        <div className="text-center py-12">
          <AlertCircle className="w-16 h-16 mx-auto mb-4 text-destructive" />
          <h2 className="text-xl font-bold text-foreground">Failed to load monitoring configuration</h2>
        </div>
      </div>
    );
  }

  const handleToggleEnabled = () => {
    updateConfig.mutate({ enabled: !config.enabled });
  };

  const handleIntervalChange = (direction: 'up' | 'down') => {
    const current = config.pollingIntervalSeconds;
    const newValue = direction === 'up' 
      ? Math.min(current + 1, 300)
      : Math.max(current - 1, 1);
    if (newValue !== current) {
      updateConfig.mutate({ pollingIntervalSeconds: newValue });
    }
  };

  const handleRetentionChange = (direction: 'up' | 'down') => {
    const current = config.dataRetentionDays;
    const newValue = direction === 'up'
      ? Math.min(current + 1, 365)
      : Math.max(current - 1, 1);
    if (newValue !== current) {
      updateConfig.mutate({ dataRetentionDays: newValue });
    }
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-foreground">Performance Monitoring</h2>
        <p className="text-muted-foreground">Configure system performance monitoring and spike detection</p>
      </div>

      <div className="space-y-6">
        {/* Enable Toggle */}
        <div className="p-4 bg-muted/30 rounded-lg border border-border">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                <Activity className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h3 className="font-medium text-foreground">Enable Monitoring</h3>
                <p className="text-sm text-muted-foreground">Collect system performance metrics</p>
              </div>
            </div>
            <button onClick={handleToggleEnabled} disabled={updateConfig.isPending}>
              {config.enabled ? (
                <ToggleRight className="w-8 h-8 text-green-500" />
              ) : (
                <ToggleLeft className="w-8 h-8 text-muted-foreground" />
              )}
            </button>
          </div>
        </div>

        {config.enabled && (
          <>
            {/* Polling Interval */}
            <div className="p-4 bg-muted/30 rounded-lg border border-border">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <h3 className="font-medium text-foreground">Polling Interval</h3>
                  <p className="text-sm text-muted-foreground">How often to collect metrics (seconds)</p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleIntervalChange('down')}
                    disabled={updateConfig.isPending}
                    className="p-1 hover:bg-muted rounded disabled:opacity-50"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <span className="font-medium text-foreground w-16 text-center">
                    {config.pollingIntervalSeconds}s
                  </span>
                  <button
                    onClick={() => handleIntervalChange('up')}
                    disabled={updateConfig.isPending}
                    className="p-1 hover:bg-muted rounded disabled:opacity-50"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
              <div className="text-xs text-muted-foreground mt-2">
                Recommended: 5 seconds for real-time monitoring, 30+ seconds for reduced resource usage
              </div>
            </div>

            {/* Data Retention */}
            <div className="p-4 bg-muted/30 rounded-lg border border-border">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <h3 className="font-medium text-foreground">Data Retention</h3>
                  <p className="text-sm text-muted-foreground">How long to keep metric history (days)</p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleRetentionChange('down')}
                    disabled={updateConfig.isPending}
                    className="p-1 hover:bg-muted rounded disabled:opacity-50"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <span className="font-medium text-foreground w-16 text-center">
                    {config.dataRetentionDays} days
                  </span>
                  <button
                    onClick={() => handleRetentionChange('up')}
                    disabled={updateConfig.isPending}
                    className="p-1 hover:bg-muted rounded disabled:opacity-50"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
              <div className="text-xs text-muted-foreground mt-2">
                Older metrics are automatically deleted. Lower values reduce database size.
              </div>
            </div>

            {/* Spike Detection Info */}
            <div className="p-4 bg-muted/30 rounded-lg border border-border">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-yellow-500/10 rounded-lg flex items-center justify-center">
                  <AlertTriangle className="w-5 h-5 text-yellow-500" />
                </div>
                <div>
                  <h3 className="font-medium text-foreground">Spike Detection</h3>
                  <p className="text-sm text-muted-foreground">Automatic detection of performance spikes</p>
                </div>
              </div>
              
              <div className="space-y-3 text-sm">
                <div className="flex justify-between py-2 border-t border-border">
                  <span className="text-muted-foreground">CPU Spike Threshold</span>
                  <span className="font-medium">{config.cpuSpikeThresholdPercent}% change (sustained {config.cpuSpikeSustainedSeconds}s)</span>
                </div>
                <div className="flex justify-between py-2 border-t border-border">
                  <span className="text-muted-foreground">CPU Critical Threshold</span>
                  <span className="font-medium">{config.cpuCriticalThreshold}% absolute</span>
                </div>
                <div className="flex justify-between py-2 border-t border-border">
                  <span className="text-muted-foreground">Memory Spike Threshold</span>
                  <span className="font-medium">{config.memorySpikeThresholdPercent}% change (sustained {config.memorySpikeSustainedSeconds}s)</span>
                </div>
                <div className="flex justify-between py-2 border-t border-border">
                  <span className="text-muted-foreground">Memory Critical Threshold</span>
                  <span className="font-medium">{config.memoryCriticalThreshold}% absolute</span>
                </div>
              </div>

              <div className="mt-4 p-3 bg-yellow-500/5 rounded border border-yellow-500/20">
                <p className="text-xs text-muted-foreground">
                  <strong className="text-yellow-600">Note:</strong> Spike detection is optimized for Project Zomboid servers.{' '}
                  The algorithm uses sustained detection (multiple consecutive samples) to avoid false positives from the game&apos;s{' '}
                  random CPU spikes. Adjust thresholds in database if needed.
                </p>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
