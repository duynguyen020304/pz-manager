'use client';

import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Activity,
  Cpu,
  HardDrive,
  Network,
  AlertTriangle,
  AlertCircle,
  RefreshCw,
  TrendingUp,
  TrendingDown,
  Minus,
} from 'lucide-react';
import {
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
} from 'recharts';
import { Button } from '@/components/ui/button';
import type {
  SystemMetric,
  SystemSpike,
  TimeSeriesData,
  MonitorConfig,
} from '@/types';

interface MetricsData {
  metrics: SystemMetric | null;
  config: MonitorConfig;
  status: {
    isRunning: boolean;
    lastSample: Date | null;
    totalSamples: number;
    totalSpikes: number;
    lastError: string | null;
  };
}

interface HistoryData {
  timeSeries: TimeSeriesData[];
  meta: {
    startTime: string;
    endTime: string;
    hours: number;
    intervalSeconds: number;
    dataPoints: number;
  };
}

interface SpikesData {
  spikes: SystemSpike[];
  stats: {
    total: number;
    byType: Record<string, number>;
    bySeverity: Record<string, number>;
  };
}

// Fetch functions
async function fetchMetrics(): Promise<MetricsData> {
  const response = await fetch('/api/metrics?type=current');
  if (!response.ok) throw new Error('Failed to fetch metrics');
  const result = await response.json();
  if (!result.success) throw new Error(result.error);
  return result.data;
}

async function fetchHistory(hours: number): Promise<HistoryData> {
  const response = await fetch(`/api/metrics/history?hours=${hours}&interval=60`);
  if (!response.ok) throw new Error('Failed to fetch history');
  const result = await response.json();
  if (!result.success) throw new Error(result.error);
  return result.data;
}

async function fetchSpikes(): Promise<SpikesData> {
  const response = await fetch('/api/metrics/spikes?hours=24&limit=50');
  if (!response.ok) throw new Error('Failed to fetch spikes');
  const result = await response.json();
  if (!result.success) throw new Error(result.error);
  return result.data;
}

// Format bytes to human readable
function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

// Format bytes/sec
function formatBytesPerSec(bytes: number): string {
  if (bytes === 0) return '0 B/s';
  const k = 1024;
  const sizes = ['B/s', 'KB/s', 'MB/s', 'GB/s'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

// Metric Card Component
interface MetricCardProps {
  title: string;
  value: string;
  subtitle?: string;
  icon: React.ReactNode;
  trend?: 'up' | 'down' | 'neutral';
  color: string;
  isLoading?: boolean;
}

function MetricCard({
  title,
  value,
  subtitle,
  icon,
  trend,
  color,
  isLoading,
}: MetricCardProps) {
  return (
    <div className="bg-card border border-border rounded-lg p-6">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-muted-foreground mb-1">{title}</p>
          <div className="flex items-baseline gap-2">
            {isLoading ? (
              <div className="h-8 w-24 bg-muted animate-pulse rounded"></div>
            ) : (
              <>
                <span className="text-2xl font-bold text-foreground">{value}</span>
                {trend && (
                  <span className={`text-sm ${trend === 'up' ? 'text-destructive' : trend === 'down' ? 'text-green-500' : 'text-muted-foreground'}`}>
                    {trend === 'up' ? <TrendingUp className="w-4 h-4" /> : trend === 'down' ? <TrendingDown className="w-4 h-4" /> : <Minus className="w-4 h-4" />}
                  </span>
                )}
              </>
            )}
          </div>
          {subtitle && (
            <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>
          )}
        </div>
        <div className={`p-3 rounded-lg ${color}`}>{icon}</div>
      </div>
    </div>
  );
}

// Spike Badge Component
function SpikeBadge({ severity }: { severity: SystemSpike['severity'] }) {
  const styles = {
    warning: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20',
    critical: 'bg-destructive/10 text-destructive border-destructive/20',
  };

  const icons = {
    warning: AlertTriangle,
    critical: AlertCircle,
  };

  const Icon = icons[severity];

  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium border ${styles[severity]}`}
    >
      <Icon className="w-3 h-3" />
      {severity.charAt(0).toUpperCase() + severity.slice(1)}
    </span>
  );
}

export default function MonitorPage() {
  const queryClient = useQueryClient();
  const [historyHours, setHistoryHours] = useState(1);

  // Queries
  const { data: metricsData, isLoading: metricsLoading } = useQuery({
    queryKey: ['metrics', 'current'],
    queryFn: fetchMetrics,
    refetchInterval: 5000, // Refresh every 5 seconds
  });

  const { data: historyData, isLoading: historyLoading } = useQuery({
    queryKey: ['metrics', 'history', historyHours],
    queryFn: () => fetchHistory(historyHours),
  });

  const { data: spikesData, isLoading: spikesLoading } = useQuery({
    queryKey: ['metrics', 'spikes'],
    queryFn: fetchSpikes,
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  // Manual refresh
  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ['metrics'] });
  };

  const metrics = metricsData?.metrics;
  const status = metricsData?.status;
  const timeSeries = historyData?.timeSeries || [];
  const spikes = spikesData?.spikes || [];

  // Format chart data
  const chartData = timeSeries.map((point) => ({
    ...point,
    time: new Date(point.bucket).toLocaleTimeString(),
  }));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            Performance Monitoring
          </h1>
          <p className="text-muted-foreground mt-1">
            Real-time system performance metrics and spike detection
          </p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <div
              className={`w-2 h-2 rounded-full ${
                status?.isRunning ? 'bg-green-500' : 'bg-destructive'
              }`}
            />
            {status?.isRunning ? 'Monitoring Active' : 'Monitoring Inactive'}
          </div>
          <Button
            variant="secondary"
            size="sm"
            leftIcon={<RefreshCw className="w-4 h-4" />}
            onClick={handleRefresh}
            isLoading={metricsLoading}
          >
            Refresh
          </Button>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="CPU Usage"
          value={
            metrics?.cpuPercent !== null
              ? `${metrics?.cpuPercent?.toFixed(1) || 0}%`
              : 'N/A'
          }
              subtitle={
            metrics?.cpuCores && Array.isArray(metrics.cpuCores)
              ? `${metrics.cpuCores.length} cores`
              : undefined
          }
          icon={<Cpu className="w-5 h-5 text-blue-500" />}
          color="bg-blue-500/10"
          isLoading={metricsLoading}
        />

        <MetricCard
          title="Memory Usage"
          value={
            metrics?.memoryPercent !== null
              ? `${metrics?.memoryPercent?.toFixed(1) || 0}%`
              : 'N/A'
          }
          subtitle={
            metrics?.memoryUsedBytes && metrics?.memoryTotalBytes
              ? `${formatBytes(metrics.memoryUsedBytes)} / ${formatBytes(
                  metrics.memoryTotalBytes
                )}`
              : undefined
          }
          icon={<HardDrive className="w-5 h-5 text-purple-500" />}
          color="bg-purple-500/10"
          isLoading={metricsLoading}
        />

        <MetricCard
          title="Swap Usage"
          value={
            metrics?.swapPercent !== null
              ? `${metrics?.swapPercent?.toFixed(1) || 0}%`
              : 'N/A'
          }
          subtitle={
            metrics?.swapUsedBytes !== null && metrics?.swapUsedBytes !== undefined
              ? formatBytes(metrics.swapUsedBytes)
              : undefined
          }
          icon={<Activity className="w-5 h-5 text-orange-500" />}
          color="bg-orange-500/10"
          isLoading={metricsLoading}
        />

        <MetricCard
          title="Network I/O"
          value={
            metrics?.networkRxSec !== null
              ? formatBytesPerSec(metrics?.networkRxSec || 0)
              : 'N/A'
          }
          subtitle={
            metrics?.networkTxSec !== null
              ? `↑ ${formatBytesPerSec(metrics?.networkTxSec || 0)}`
              : undefined
          }
          icon={<Network className="w-5 h-5 text-green-500" />}
          color="bg-green-500/10"
          isLoading={metricsLoading}
        />
      </div>

      {/* Charts Section */}
      <div className="bg-card rounded-lg p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-foreground">
            Performance History
          </h2>
          <div className="flex items-center gap-2">
            {[
              { label: '1h', value: 1 },
              { label: '6h', value: 6 },
              { label: '24h', value: 24 },
            ].map((option) => (
              <button
                key={option.value}
                onClick={() => setHistoryHours(option.value)}
                className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
                  historyHours === option.value
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-muted-foreground hover:bg-muted/80'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        {historyLoading ? (
          <div className="h-64 bg-muted animate-pulse rounded" />
        ) : chartData.length > 0 ? (
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="colorCpu" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorMemory" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#a855f7" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#a855f7" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis
                  dataKey="time"
                  stroke="#ffffff"
                  fontSize={12}
                  tickLine={false}
                />
                <YAxis
                  stroke="#ffffff"
                  fontSize={12}
                  tickLine={false}
                  label={{
                    value: 'Usage %',
                    angle: -90,
                    position: 'insideLeft',
                    fill: '#ffffff',
                  }}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '6px',
                  }}
                  labelStyle={{ color: 'hsl(var(--foreground))' }}
                />
                <Area
                  type="monotone"
                  dataKey="avgCpu"
                  name="CPU %"
                  stroke="#3b82f6"
                  fillOpacity={1}
                  fill="url(#colorCpu)"
                  strokeWidth={2}
                />
                <Area
                  type="monotone"
                  dataKey="avgMemory"
                  name="Memory %"
                  stroke="#a855f7"
                  fillOpacity={1}
                  fill="url(#colorMemory)"
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="h-64 flex items-center justify-center text-muted-foreground">
            No historical data available
          </div>
        )}
      </div>

      {/* Spikes Section */}
      <div className="bg-card border border-border rounded-lg">
        <div className="p-6 border-b border-border">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-foreground">
                Recent Spike Events
              </h2>
              <p className="text-sm text-muted-foreground mt-1">
                Detected performance spikes in the last 24 hours
              </p>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right">
                <p className="text-2xl font-bold text-foreground">
                  {spikesData?.stats.total || 0}
                </p>
                <p className="text-xs text-muted-foreground">Total spikes</p>
              </div>
            </div>
          </div>

          {/* Stats */}
          {spikesData?.stats && (
            <div className="flex flex-wrap gap-4 mt-4 pt-4 border-t border-border">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-yellow-500" />
                <span className="text-sm text-muted-foreground">
                  Warning: {spikesData.stats.bySeverity.warning || 0}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-destructive" />
                <span className="text-sm text-muted-foreground">
                  Critical: {spikesData.stats.bySeverity.critical || 0}
                </span>
              </div>
            </div>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-muted/50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Time
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Metric
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Severity
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Change
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Duration
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {spikesLoading ? (
                [...Array(3)].map((_, i) => (
                  <tr key={i}>
                    {[...Array(5)].map((_, j) => (
                      <td key={j} className="px-6 py-4">
                        <div className="h-4 w-24 bg-muted animate-pulse rounded" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : spikes.length > 0 ? (
                spikes.slice(0, 10).map((spike) => (
                  <tr
                    key={spike.time.toString()}
                    className="hover:bg-muted/50 transition-colors"
                  >
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-foreground">
                      {new Date(spike.time).toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-foreground capitalize">
                      {spike.metricType.replace('_', ' ')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <SpikeBadge severity={spike.severity} />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <span
                        className={
                          spike.changePercent > 0
                            ? 'text-destructive'
                            : 'text-green-500'
                        }
                      >
                        {spike.changePercent > 0 ? '+' : ''}
                        {spike.changePercent.toFixed(1)}%
                      </span>
                      <span className="text-muted-foreground ml-2">
                        ({spike.previousValue.toFixed(1)}% →{' '}
                        {spike.currentValue.toFixed(1)}%)
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                      {spike.sustainedForSeconds}s
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td
                    colSpan={5}
                    className="px-6 py-8 text-center text-muted-foreground"
                  >
                    No spike events detected in the last 24 hours
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
