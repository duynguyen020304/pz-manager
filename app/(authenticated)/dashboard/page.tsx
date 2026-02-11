'use client';

import { useServers, useConfig, useSnapshots, useAllServerStatus } from '@/hooks/use-api';
import { useMemo } from 'react';
import { 
  Server, 
  Clock, 
  HardDrive,
  Archive,
  RotateCcw,
  Plus,
  CheckCircle2,
  Play,
  Calendar,
  TrendingUp,
  Activity,
  Power,
  Loader2,
  ChevronRight
} from 'lucide-react';
import Link from 'next/link';
import { Schedule, Snapshot } from '@/types';
import { ServerStatusDot } from '@/components/ServerStatusBadge';

// Calculate next backup time based on schedule and last backup
function getNextBackupTime(serverName: string, schedules: Schedule[], snapshots: Snapshot[]): Date | null {
  if (!schedules || schedules.length === 0) return null;
  
  // Get last backup time for this server
  const serverSnapshots = snapshots?.filter(s => s.server === serverName) || [];
  const lastBackup = serverSnapshots.length > 0 
    ? new Date(serverSnapshots[0].created)
    : new Date(0);
  
  // Find the most frequent enabled schedule
  const enabledSchedules = schedules.filter(s => s.enabled);
  if (enabledSchedules.length === 0) return null;
  
  // For now, use the first enabled schedule
  // In production, calculate based on cron expression
  const schedule = enabledSchedules[0];
  const now = new Date();
  
  // Simple calculation based on interval keywords
  const intervalMap: Record<string, number> = {
    '5min': 5 * 60 * 1000,
    '10min': 10 * 60 * 1000,
    '30min': 30 * 60 * 1000,
    'hourly': 60 * 60 * 1000,
    'daily': 24 * 60 * 60 * 1000,
    'weekly': 7 * 24 * 60 * 60 * 1000,
  };
  
  const interval = intervalMap[schedule.name] || intervalMap['hourly'];
  const nextBackup = new Date(lastBackup.getTime() + interval);
  
  // If the next backup time has passed, calculate from now
  if (nextBackup < now) {
    const periodsPassed = Math.floor((now.getTime() - lastBackup.getTime()) / interval);
    return new Date(lastBackup.getTime() + (periodsPassed + 1) * interval);
  }
  
  return nextBackup;
}

function formatTimeUntil(date: Date | null): string {
  if (!date) return 'Not scheduled';
  
  const now = new Date();
  const diff = date.getTime() - now.getTime();
  
  if (diff < 0) return 'Overdue';
  
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  
  if (hours > 24) {
    const days = Math.floor(hours / 24);
    return `in ${days}d ${hours % 24}h`;
  }
  if (hours > 0) {
    return `in ${hours}h ${minutes}m`;
  }
  return `in ${minutes}m`;
}

function formatLastBackup(date: Date | null): string {
  if (!date || date.getTime() === 0) return 'Never';
  
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  
  const minutes = Math.floor(diff / (1000 * 60));
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  
  if (days > 0) return `${days}d ago`;
  if (hours > 0) return `${hours}h ago`;
  if (minutes > 0) return `${minutes}m ago`;
  return 'Just now';
}

function formatCronToHumanReadable(interval: string): string {
  const cronMap: Record<string, string> = {
    '*/5 * * * *': 'Every 5 min',
    '*/10 * * * *': 'Every 10 min', 
    '*/30 * * * *': 'Every 30 min',
    '0 * * * *': 'Hourly',
    '0 0 * * *': 'Daily',
    '0 0 * * 0': 'Weekly',
    '@hourly': 'Hourly',
    '@daily': 'Daily',
    '@weekly': 'Weekly',
  };
  return cronMap[interval] || interval;
}

export default function DashboardPage() {
  const { data: servers, isLoading: serversLoading } = useServers();
  const { data: config, isLoading: configLoading } = useConfig();
  const { data: serverStatuses, isLoading: statusLoading } = useAllServerStatus();
  
  // Get snapshots for the first server to calculate next backup times
  const firstServer = servers?.[0]?.name || '';
  const { data: snapshots } = useSnapshots(firstServer);

  const enabledSchedules = config?.schedules.filter(s => s.enabled) || [];
  
  // Calculate total storage (mock for now - would need API endpoint)
  const totalStorage = useMemo(() => {
    // This would ideally come from an API endpoint
    return '2.4 GB';
  }, []);

  // Calculate total retention count
  const totalRetention = enabledSchedules.reduce((sum, s) => sum + s.retention, 0);
  
  // Calculate running servers count
  const runningServersCount = useMemo(() => {
    return serverStatuses?.filter(s => s.state === 'running').length || 0;
  }, [serverStatuses]);

  return (
    <div className="max-w-7xl mx-auto space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
          <p className="text-muted-foreground mt-1">
            Overview of your Project Zomboid backup system
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-2 px-3 py-1.5 bg-primary/10 text-primary rounded-full text-sm">
            <span className="w-2 h-2 bg-primary rounded-full animate-pulse" />
            System Online
          </span>
        </div>
      </div>

      {/* Stats Row - Bento Grid Top */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <StatCard
          title="Total Servers"
          value={servers?.length || 0}
          icon={Server}
          loading={serversLoading}
          trend="Active"
          trendUp={true}
        />
        <StatCard
          title="Running Servers"
          value={`${runningServersCount} / ${servers?.length || 0}`}
          icon={Activity}
          loading={serversLoading || statusLoading}
          trend={runningServersCount > 0 ? 'Online' : 'Offline'}
          trendUp={runningServersCount > 0}
          status={runningServersCount > 0 ? 'online' : 'offline'}
        />
        <StatCard
          title="Active Schedules"
          value={enabledSchedules.length}
          icon={Clock}
          loading={configLoading}
          trend="Running"
          trendUp={true}
        />
        <StatCard
          title="Storage Used"
          value={totalStorage}
          icon={HardDrive}
          loading={configLoading}
          trend="Healthy"
          trendUp={true}
        />
        <StatCard
          title="Retention Count"
          value={totalRetention}
          icon={Archive}
          loading={configLoading}
          trend="Snapshots"
          trendUp={false}
        />
      </div>

      {/* Main Content Grid - Bento Grid Middle */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Servers Table - 50% */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between h-7">
            <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
              <Server className="w-5 h-5 text-primary" />
              Servers
            </h2>
            <Link 
              href="/servers" 
              className="text-sm text-primary hover:text-primary/80 transition-colors flex items-center gap-1"
            >
              View all <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
          
          <div className="bg-card border border-border rounded-lg overflow-hidden">
            {serversLoading ? (
              <div className="p-6 space-y-4">
                {[1, 2, 3].map(i => (
                  <div key={i} className="h-16 bg-muted rounded animate-pulse" />
                ))}
              </div>
            ) : servers && servers.length > 0 ? (
              <table className="w-full">
                <thead className="bg-muted/50 border-b border-border">
                  <tr>
                    <th className="text-left px-6 py-3 text-sm font-semibold text-foreground/70 uppercase tracking-wide">Server</th>
                    <th className="text-left px-6 py-3 text-sm font-semibold text-foreground/70 uppercase tracking-wide">Status</th>
                    <th className="text-left px-6 py-3 text-sm font-semibold text-foreground/70 uppercase tracking-wide">Last Backup</th>
                    <th className="text-left px-6 py-3 text-sm font-semibold text-foreground/70 uppercase tracking-wide">Next Backup</th>
                    <th className="text-right px-6 py-3 text-sm font-semibold text-foreground/70 uppercase tracking-wide">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {servers.map((server) => {
                    const nextBackup = getNextBackupTime(server.name, config?.schedules || [], snapshots || []);
                    const lastBackup = snapshots?.find(s => s.server === server.name)?.created || null;
                    const status = serverStatuses?.find(s => s.name === server.name);
                    const isRunning = status?.state === 'running';
                    const isStarting = status?.state === 'starting';
                    const isStopping = status?.state === 'stopping';
                    const isLoading = isStarting || isStopping;
                    
                    return (
                      <tr key={server.name} className="hover:bg-muted/30 transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className={`w-2.5 h-2.5 rounded-full ${server.valid ? 'bg-primary' : 'bg-yellow-500'}`} />
                            <div className="space-y-1">
                              <p className="font-medium text-foreground">{server.name}</p>
                              <div className="flex items-center gap-2">
                                {server.hasIni && (
                                  <span className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded">INI</span>
                                )}
                                {server.hasDb && (
                                  <span className="text-[10px] bg-secondary/10 text-secondary px-1.5 py-0.5 rounded">DB</span>
                                )}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            {status ? (
                              <>
                                <ServerStatusDot status={status} />
                                <span className="text-sm text-muted-foreground capitalize">{status.state}</span>
                              </>
                            ) : (
                              <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2 text-sm">
                            <CheckCircle2 className="w-4 h-4 text-primary" />
                            <span className="text-muted-foreground">
                              {formatLastBackup(lastBackup ? new Date(lastBackup) : null)}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2 text-sm">
                            <Clock className="w-4 h-4 text-muted-foreground" />
                            <span className="text-foreground">{formatTimeUntil(nextBackup)}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <Link 
                            href="/servers"
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-primary/10 hover:bg-primary/20 text-primary rounded-md text-sm font-medium transition-colors"
                          >
                            {isLoading ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : isRunning ? (
                              <Power className="w-4 h-4" />
                            ) : (
                              <Play className="w-4 h-4" />
                            )}
                            <span>Manage</span>
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            ) : (
              <div className="text-center py-12">
                <Server className="w-12 h-12 mx-auto mb-3 text-muted-foreground opacity-50" />
                <p className="text-muted-foreground">No servers configured</p>
                <Link 
                  href="/servers" 
                  className="text-primary hover:underline mt-2 inline-block"
                >
                  Add a server
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* Quick Actions - 25% */}
        <div className="lg:col-span-1 space-y-4">
          <div className="flex items-center justify-between h-7">
            <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-primary" />
              Quick Actions
            </h2>
          </div>
          
          <div className="space-y-3">
            <QuickActionButton
              href="/rollback"
              icon={RotateCcw}
              label="Restore Backup"
              description="Rollback to a previous snapshot"
              variant="primary"
            />
            <QuickActionButton
              href="/servers"
              icon={Plus}
              label="Add Server"
              description="Configure a new server for backups"
              variant="secondary"
            />
            <QuickActionButton
              href="/schedules"
              icon={Calendar}
              label="Edit Schedules"
              description="Manage backup intervals"
              variant="outline"
            />
          </div>
        </div>

        {/* Active Schedules - 25% */}
        <div className="lg:col-span-1 space-y-4">
          <div className="flex items-center justify-between h-7">
            <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
              <Clock className="w-5 h-5 text-primary" />
              Active Schedules
            </h2>
          </div>
          
          <div className="bg-card border border-border rounded-lg p-5">
            {configLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map(i => (
                  <div key={i} className="h-12 bg-muted rounded animate-pulse" />
                ))}
              </div>
            ) : enabledSchedules.length > 0 ? (
              <div className="space-y-3">
                {enabledSchedules.slice(0, 4).map((schedule) => (
                  <div key={schedule.name} className="flex items-center justify-between p-2 rounded-lg bg-muted/30">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-primary rounded-full" />
                      <span className="text-sm text-foreground capitalize">{schedule.name}</span>
                    </div>
                    <span className="text-xs text-muted-foreground">{formatCronToHumanReadable(schedule.interval)}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">No active schedules</p>
            )}
            <div className="mt-4 flex justify-center">
              <Link 
                href="/schedules"
                className="text-sm text-primary hover:text-primary/80 transition-colors flex items-center gap-1"
              >
                Manage schedules <ChevronRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ 
  title, 
  value, 
  icon: Icon, 
  loading,
  trend,
  trendUp,
  status = 'neutral'
}: { 
  title: string; 
  value: string | number; 
  icon: React.ElementType;
  loading?: boolean;
  trend?: string;
  trendUp?: boolean;
  status?: 'online' | 'offline' | 'neutral';
}) {
  const iconColorClass = status === 'offline' 
    ? 'text-muted-foreground bg-muted' 
    : status === 'online' 
    ? 'text-primary bg-primary/10' 
    : 'text-primary bg-primary/10';
  
  return (
    <div className="bg-card border border-border rounded-lg p-5 hover:border-primary/20 transition-colors">
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <p className="text-sm text-muted-foreground">{title}</p>
          {loading ? (
            <div className="h-8 w-20 bg-muted rounded mt-2 animate-pulse" />
          ) : (
            <p className="text-2xl font-bold text-foreground mt-1">{value}</p>
          )}
          {trend && !loading && (
            <div className="flex items-center gap-1 mt-2">
              <span className={`text-xs ${trendUp ? 'text-primary' : 'text-muted-foreground'}`}>
                {trend}
              </span>
            </div>
          )}
        </div>
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${iconColorClass}`}>
          <Icon className="w-5 h-5" />
        </div>
      </div>
    </div>
  );
}

function QuickActionButton({
  href,
  icon: Icon,
  label,
  description,
  variant
}: {
  href: string;
  icon: React.ElementType;
  label: string;
  description: string;
  variant: 'primary' | 'secondary' | 'outline';
}) {
  const variantClasses = {
    primary: 'bg-primary/5 text-primary border-primary/30 hover:bg-primary/10 hover:border-primary/50',
    secondary: 'bg-secondary/5 text-secondary border-secondary/30 hover:bg-secondary/10 hover:border-secondary/50',
    outline: 'bg-transparent text-foreground border-border hover:bg-muted'
  };

  return (
    <Link
      href={href}
      className={`flex items-center gap-3 p-4 rounded-lg border transition-all hover:scale-[1.02] active:scale-[0.98] ${variantClasses[variant]}`}
    >
      <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
        variant === 'primary' ? 'bg-primary/10' : 
        variant === 'secondary' ? 'bg-secondary/10' : 
        'bg-muted'
      }`}>
        <Icon className="w-5 h-5" strokeWidth={2} />
      </div>
      <div className="flex-1 min-w-0">
        <span className="font-medium block">{label}</span>
        <span className="text-xs text-muted-foreground">
          {description}
        </span>
      </div>
    </Link>
  );
}