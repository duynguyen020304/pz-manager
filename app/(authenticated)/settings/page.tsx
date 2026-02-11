'use client';

import { 
  useConfig, 
  useUpdateSchedule, 
  useUpdateCompression, 
  useUpdateIntegrity,
  useUpdateAutoRollback
} from '@/hooks/use-api';
import { useState } from 'react';
import { BackupConfig, Schedule } from '@/types';
import { 
  Settings, 
  Clock, 
  Server, 
  Sliders, 
  CheckCircle2,
  AlertCircle,
  Loader2,
  ToggleLeft,
  ToggleRight,
  ChevronLeft,
  ChevronRight,
  Shield,
  Archive,
  RotateCcw,
  Skull
} from 'lucide-react';

const tabs = [
  { id: 'schedules', name: 'Schedules', icon: Clock, description: 'Manage backup schedules' },
  { id: 'servers', name: 'Servers', icon: Server, description: 'Configure server list' },
  { id: 'settings', name: 'Settings', icon: Sliders, description: 'Compression and integrity' },
  { id: 'rollback', name: 'Rollback', icon: RotateCcw, description: 'Automatic rollback on player death' },
];

const retentionOptions = [6, 12, 24, 48, 72, 30, 90];
const compressionLevels = [1, 3, 5, 7, 9];

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
        {activeTab === 'settings' && <SettingsTab config={config} />}
        {activeTab === 'rollback' && <RollbackTab config={config} />}
      </div>
    </div>
  );
}

// Schedules Tab
function SchedulesTab({ config }: { config: BackupConfig }) {
  const updateSchedule = useUpdateSchedule();

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

  return (
    <div className="p-6">
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-foreground">Backup Schedules</h2>
        <p className="text-muted-foreground">Configure when backups are created and how long they are kept</p>
      </div>

      <div className="space-y-4">
        {config.schedules.map((schedule: Schedule) => (
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
                  <h3 className="font-medium text-foreground capitalize">{schedule.name}</h3>
                  <p className="text-sm text-muted-foreground">{schedule.interval}</p>
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
                    <div className="text-sm opacity-70">{schedule.interval}</div>
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
