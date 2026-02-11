'use client';

import { useState, useMemo } from 'react';
import { 
  FileText, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  AlertTriangle,
  Server,
  Calendar,
  Download,
  RefreshCw,
  Filter,
  Search
} from 'lucide-react';

interface LogEntry {
  id: string;
  timestamp: string;
  server: string;
  operation: 'backup' | 'restore' | 'cleanup' | 'verify';
  status: 'success' | 'failed' | 'warning';
  duration: number;
  message: string;
  details?: string;
}

// Mock data for now - in production this would come from an API
const mockLogs: LogEntry[] = [
  {
    id: '1',
    timestamp: '2026-02-10T14:30:00Z',
    server: 'servertest',
    operation: 'backup',
    status: 'success',
    duration: 45,
    message: 'Hourly backup completed successfully',
    details: '2.4 GB compressed to 1.8 GB'
  },
  {
    id: '2',
    timestamp: '2026-02-10T13:30:00Z',
    server: 'main-server',
    operation: 'backup',
    status: 'success',
    duration: 120,
    message: 'Hourly backup completed successfully',
    details: '8.1 GB compressed to 6.2 GB'
  },
  {
    id: '3',
    timestamp: '2026-02-10T12:45:00Z',
    server: 'servertest',
    operation: 'cleanup',
    status: 'warning',
    duration: 5,
    message: 'Retention policy cleanup completed with warnings',
    details: '3 old snapshots removed, 1 failed to delete'
  },
  {
    id: '4',
    timestamp: '2026-02-10T12:30:00Z',
    server: 'pvp-server',
    operation: 'backup',
    status: 'failed',
    duration: 0,
    message: 'Backup failed - insufficient disk space',
    details: 'Required: 4.2 GB, Available: 1.1 GB'
  },
  {
    id: '5',
    timestamp: '2026-02-10T11:30:00Z',
    server: 'main-server',
    operation: 'verify',
    status: 'success',
    duration: 180,
    message: 'Integrity check completed',
    details: 'All checksums verified'
  },
  {
    id: '6',
    timestamp: '2026-02-10T10:30:00Z',
    server: 'servertest',
    operation: 'restore',
    status: 'success',
    duration: 95,
    message: 'Restore completed successfully',
    details: 'Rolled back to 2026-02-09 22:00:00'
  },
];

const operationLabels: Record<string, string> = {
  backup: 'Backup',
  restore: 'Restore',
  cleanup: 'Cleanup',
  verify: 'Verify',
};

const operationColors: Record<string, string> = {
  backup: 'bg-blue-500/10 text-blue-500',
  restore: 'bg-purple-500/10 text-purple-500',
  cleanup: 'bg-orange-500/10 text-orange-500',
  verify: 'bg-cyan-500/10 text-cyan-500',
};

const statusIcons = {
  success: CheckCircle2,
  failed: AlertCircle,
  warning: AlertTriangle,
};

const statusColors = {
  success: 'text-primary',
  failed: 'text-destructive',
  warning: 'text-yellow-500',
};

const statusBgColors = {
  success: 'bg-primary/10',
  failed: 'bg-destructive/10',
  warning: 'bg-yellow-500/10',
};

export default function LogsPage() {
  const [logs] = useState<LogEntry[]>(mockLogs);
  const [isLoading, setIsLoading] = useState(false);
  const [filterServer, setFilterServer] = useState('');
  const [filterOperation, setFilterOperation] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLog, setSelectedLog] = useState<LogEntry | null>(null);

  const servers = Array.from(new Set(logs.map(log => log.server)));
  const operations = Array.from(new Set(logs.map(log => log.operation)));

  const filteredLogs = useMemo(() => {
    let filtered = logs;

    if (filterServer) {
      filtered = filtered.filter(log => log.server === filterServer);
    }

    if (filterOperation) {
      filtered = filtered.filter(log => log.operation === filterOperation);
    }

    if (filterStatus) {
      filtered = filtered.filter(log => log.status === filterStatus);
    }

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(log => 
        log.message.toLowerCase().includes(query) ||
        log.server.toLowerCase().includes(query) ||
        log.details?.toLowerCase().includes(query)
      );
    }

    return filtered;
  }, [logs, filterServer, filterOperation, filterStatus, searchQuery]);

  const handleRefresh = () => {
    setIsLoading(true);
    // In production, this would fetch from an API
    setTimeout(() => {
      setIsLoading(false);
    }, 1000);
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatDuration = (seconds: number) => {
    if (seconds < 60) return `${seconds}s`;
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return secs > 0 ? `${mins}m ${secs}s` : `${mins}m`;
  };

  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-8 flex items-end justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Logs</h1>
          <p className="text-muted-foreground mt-2">View backup and restore operation history</p>
        </div>
        <button
          onClick={handleRefresh}
          disabled={isLoading}
          className="flex items-center gap-2 px-4 py-2 border border-border rounded-lg text-foreground hover:bg-muted transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Filters */}
      <div className="bg-card border border-border rounded-lg p-4 mb-6">
        <div className="flex flex-col lg:flex-row gap-4">
          {/* Search */}
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search logs..."
              className="w-full pl-10 pr-4 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-foreground text-sm"
            />
          </div>

          {/* Server Filter */}
          <div className="lg:w-48">
            <select
              value={filterServer}
              onChange={(e) => setFilterServer(e.target.value)}
              className="w-full px-4 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-foreground text-sm"
            >
              <option value="">All Servers</option>
              {servers.map(server => (
                <option key={server} value={server}>{server}</option>
              ))}
            </select>
          </div>

          {/* Operation Filter */}
          <div className="lg:w-48">
            <select
              value={filterOperation}
              onChange={(e) => setFilterOperation(e.target.value)}
              className="w-full px-4 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-foreground text-sm"
            >
              <option value="">All Operations</option>
              {operations.map(op => (
                <option key={op} value={op}>{operationLabels[op]}</option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div className="lg:w-48">
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="w-full px-4 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-foreground text-sm"
            >
              <option value="">All Statuses</option>
              <option value="success">Success</option>
              <option value="failed">Failed</option>
              <option value="warning">Warning</option>
            </select>
          </div>
        </div>
      </div>

      {/* Logs Table */}
      <div className="bg-card border border-border rounded-lg overflow-hidden">
        {isLoading ? (
          <div className="p-8 space-y-4">
            {[1, 2, 3, 4, 5].map(i => (
              <div key={i} className="h-16 bg-muted rounded animate-pulse" />
            ))}
          </div>
        ) : filteredLogs.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-muted/50 border-b border-border">
                <tr>
                  <th className="text-left px-6 py-3 text-xs font-medium text-muted-foreground uppercase">Time</th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-muted-foreground uppercase">Server</th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-muted-foreground uppercase">Operation</th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-muted-foreground uppercase">Status</th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-muted-foreground uppercase">Duration</th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-muted-foreground uppercase">Message</th>
                  <th className="text-right px-6 py-3 text-xs font-medium text-muted-foreground uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredLogs.map((log) => {
                  const StatusIcon = statusIcons[log.status];
                  return (
                    <tr 
                      key={log.id} 
                      className="hover:bg-muted/30 transition-colors cursor-pointer"
                      onClick={() => setSelectedLog(log)}
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Clock className="w-4 h-4" />
                          <span className="text-sm">{formatTimestamp(log.timestamp)}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <Server className="w-4 h-4 text-muted-foreground" />
                          <span className="text-sm text-foreground font-medium">{log.server}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${operationColors[log.operation]}`}>
                          {operationLabels[log.operation]}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium ${statusBgColors[log.status]} ${statusColors[log.status]}`}>
                          <StatusIcon className="w-3.5 h-3.5" />
                          <span className="capitalize">{log.status}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm text-muted-foreground font-mono">
                          {formatDuration(log.duration)}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-sm text-foreground truncate max-w-xs">{log.message}</p>
                        {log.details && (
                          <p className="text-xs text-muted-foreground truncate max-w-xs mt-0.5">{log.details}</p>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            // Export log functionality
                          }}
                          className="p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors"
                        >
                          <Download className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-16">
            <FileText className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-50" />
            <h3 className="text-lg font-medium text-foreground mb-2">No logs found</h3>
            <p className="text-muted-foreground">
              {searchQuery || filterServer || filterOperation || filterStatus
                ? 'Try adjusting your filters'
                : 'No backup operations have been logged yet'}
            </p>
          </div>
        )}
      </div>

      {/* Stats Summary */}
      <div className="mt-6 grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-card border border-border rounded-lg p-4">
          <p className="text-xs text-muted-foreground uppercase">Total Operations</p>
          <p className="text-2xl font-bold text-foreground mt-1">{filteredLogs.length}</p>
        </div>
        <div className="bg-card border border-border rounded-lg p-4">
          <p className="text-xs text-muted-foreground uppercase">Success Rate</p>
          <p className="text-2xl font-bold text-primary mt-1">
            {filteredLogs.length > 0
              ? `${Math.round((filteredLogs.filter(l => l.status === 'success').length / filteredLogs.length) * 100)}%`
              : '0%'}
          </p>
        </div>
        <div className="bg-card border border-border rounded-lg p-4">
          <p className="text-xs text-muted-foreground uppercase">Failed</p>
          <p className="text-2xl font-bold text-destructive mt-1">
            {filteredLogs.filter(l => l.status === 'failed').length}
          </p>
        </div>
        <div className="bg-card border border-border rounded-lg p-4">
          <p className="text-xs text-muted-foreground uppercase">Avg Duration</p>
          <p className="text-2xl font-bold text-foreground mt-1 font-mono">
            {filteredLogs.length > 0
              ? formatDuration(Math.round(filteredLogs.reduce((sum, l) => sum + l.duration, 0) / filteredLogs.length))
              : '0s'}
          </p>
        </div>
      </div>

      {/* Log Detail Modal */}
      {selectedLog && (
        <div 
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onClick={() => setSelectedLog(null)}
        >
          <div 
            className="bg-card border border-border rounded-lg max-w-lg w-full p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${statusBgColors[selectedLog.status]}`}>
                  {(() => {
                    const Icon = statusIcons[selectedLog.status];
                    return <Icon className={`w-5 h-5 ${statusColors[selectedLog.status]}`} />;
                  })()}
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-foreground">{operationLabels[selectedLog.operation]}</h2>
                  <p className="text-sm text-muted-foreground">{formatTimestamp(selectedLog.timestamp)}</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedLog(null)}
                className="p-2 text-muted-foreground hover:text-foreground rounded-lg hover:bg-muted transition-colors"
              >
                ×
              </button>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-muted/30 rounded-lg p-3">
                  <p className="text-xs text-muted-foreground uppercase mb-1">Server</p>
                  <p className="text-sm font-medium text-foreground">{selectedLog.server}</p>
                </div>
                <div className="bg-muted/30 rounded-lg p-3">
                  <p className="text-xs text-muted-foreground uppercase mb-1">Duration</p>
                  <p className="text-sm font-medium text-foreground font-mono">{formatDuration(selectedLog.duration)}</p>
                </div>
              </div>

              <div className="bg-muted/30 rounded-lg p-3">
                <p className="text-xs text-muted-foreground uppercase mb-1">Status</p>
                <div className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium ${statusBgColors[selectedLog.status]} ${statusColors[selectedLog.status]}`}>
                  {(() => {
                    const Icon = statusIcons[selectedLog.status];
                    return <Icon className="w-3.5 h-3.5" />;
                  })()}
                  <span className="capitalize">{selectedLog.status}</span>
                </div>
              </div>

              <div className="bg-muted/30 rounded-lg p-3">
                <p className="text-xs text-muted-foreground uppercase mb-1">Message</p>
                <p className="text-sm text-foreground">{selectedLog.message}</p>
              </div>

              {selectedLog.details && (
                <div className="bg-muted/30 rounded-lg p-3">
                  <p className="text-xs text-muted-foreground uppercase mb-1">Details</p>
                  <p className="text-sm text-foreground">{selectedLog.details}</p>
                </div>
              )}
            </div>

            <div className="mt-6">
              <button
                onClick={() => setSelectedLog(null)}
                className="w-full px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}