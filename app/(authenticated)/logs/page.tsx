'use client';

import { useState, useMemo } from 'react';
import {
  FileText,
  Clock,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Server,
  Download,
  RefreshCw,
  Search,
  MessageSquare,
  Sword,
  User,
  Activity,
  Play,
  Square,
  Database,
  ChevronDown,
  ChevronRight,
  FolderOpen
} from 'lucide-react';
import {
  useLogs,
  useLogStats,
  useIngestAllLogs,
  useStartLogWatching,
  useStopLogWatching,
  useWatchStatus,
  useServers,
  useRunningServers
} from '@/hooks/use-api';
import type { UnifiedLogEntry, LogFilters } from '@/types';

// Log source configuration
const LOG_SOURCES = {
  backup: { label: 'Backup', icon: Database, color: 'text-blue-500' },
  player: { label: 'Player', icon: User, color: 'text-green-500' },
  server: { label: 'Server', icon: Server, color: 'text-purple-500' },
  chat: { label: 'Chat', icon: MessageSquare, color: 'text-yellow-500' },
  pvp: { label: 'PvP', icon: Sword, color: 'text-red-500' },
  skill: { label: 'Skills', icon: Activity, color: 'text-cyan-500' },
};

const LEVEL_COLORS = {
  INFO: 'text-primary',
  ERROR: 'text-destructive',
  WARN: 'text-yellow-500',
  DEBUG: 'text-muted-foreground',
};

const LEVEL_BG_COLORS = {
  INFO: 'bg-primary/10',
  ERROR: 'bg-destructive/10',
  WARN: 'bg-yellow-500/10',
  DEBUG: 'bg-muted/10',
};

const STATUS_ICONS = {
  INFO: CheckCircle2,
  ERROR: AlertCircle,
  WARN: AlertTriangle,
  DEBUG: Activity,
};

export default function LogsPage() {
  // State for filters
  const [source, setSource] = useState<string>('backup');
  const [filterServer, setFilterServer] = useState('');
  const [filterLevel, setFilterLevel] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLog, setSelectedLog] = useState<UnifiedLogEntry | null>(null);
  const [page, setPage] = useState(0);
  const [showWatchedFiles, setShowWatchedFiles] = useState(false);
  const [watchedServers, setWatchedServers] = useState<string[]>([]);
  const [showServerSelector, setShowServerSelector] = useState(false);
  const limit = 50;

  // Queries
  const { data: serversData } = useServers();
  const { data: runningServersData } = useRunningServers();
  const { data: watchStatus } = useWatchStatus();
  const { data: statsData } = useLogStats(filterServer || undefined);

  // Get running servers
  const runningServers = runningServersData?.running || [];

  // Build filters
  const filters: LogFilters = useMemo(() => ({
    source,
    server: filterServer || undefined,
    level: filterLevel || undefined,
    username: searchQuery || undefined,
    limit,
    offset: page * limit,
  }), [source, filterServer, filterLevel, searchQuery, page]);

  const { data: logsData, isLoading, refetch, isRefetching } = useLogs(filters);

  // Mutations
  const ingestMutation = useIngestAllLogs();
  const startWatchMutation = useStartLogWatching();
  const stopWatchMutation = useStopLogWatching();

  // Get servers for filter dropdown
  const servers = serversData?.map(s => s.name) || [];

  // Get logs and pagination from response
  const logsDataResult = logsData;
  const pagination = logsData?.pagination;
  const stats = statsData;

  // Filter logs client-side by search query (for message content)
  const filteredLogs = useMemo(() => {
    const logs = logsDataResult?.logs || [];
    if (!searchQuery) return logs;
    const query = searchQuery.toLowerCase();
    return logs.filter(log =>
      log.message?.toLowerCase().includes(query) ||
      log.username?.toLowerCase().includes(query) ||
      log.server?.toLowerCase().includes(query)
    );
  }, [logsDataResult, searchQuery]);

  // Handle manual refresh
  const handleRefresh = () => {
    refetch();
  };

  // Handle ingest all logs
  const handleIngestAll = async () => {
    await ingestMutation.mutateAsync(servers);
  };

  // Handle server selection for watching
  const handleToggleServerWatch = (serverName: string) => {
    setWatchedServers(prev => {
      if (prev.includes(serverName)) {
        return prev.filter(s => s !== serverName);
      }
      return [...prev, serverName];
    });
  };

  // Handle "watch running" quick select
  const handleWatchRunning = () => {
    if (runningServers.length > 0) {
      setWatchedServers(runningServers);
    } else {
      setWatchedServers(servers);
    }
  };

  // Handle "watch all" quick select
  const handleWatchAll = () => {
    setWatchedServers(servers);
  };

  // Handle start/stop watching
  const handleToggleWatching = async () => {
    if (watchStatus && watchStatus.activeCount > 0) {
      await stopWatchMutation.mutateAsync();
    } else {
      // If specific servers selected, watch those; otherwise watch running or all
      if (watchedServers.length > 0) {
        await startWatchMutation.mutateAsync({ servers: watchedServers });
      } else if (runningServers.length > 0) {
        // Default to watching running servers if any are running
        await startWatchMutation.mutateAsync({ servers: runningServers });
      } else {
        // Fall back to all servers
        await startWatchMutation.mutateAsync({ servers: servers });
      }
    }
  };

  // Filter handlers that also reset page
  const handleSetSource = (value: string) => {
    setSource(value);
    setPage(0);
  };
  const handleSetFilterServer = (value: string) => {
    setFilterServer(value);
    setPage(0);
  };
  const handleSetFilterLevel = (value: string) => {
    setFilterLevel(value);
    setPage(0);
  };
  const handleSetSearchQuery = (value: string) => {
    setSearchQuery(value);
    setPage(0);
  };

  // Format timestamp
  const formatTimestamp = (date: Date | string) => {
    const d = new Date(date);
    return d.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8 flex items-end justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Logs</h1>
          <p className="text-muted-foreground mt-2">View backup operations, player events, chat, and server activity</p>
        </div>
        <div className="flex gap-2 items-center">
          {/* Server Selector for Watching */}
          <div className="relative">
            <button
              onClick={() => setShowServerSelector(!showServerSelector)}
              disabled={watchStatus && watchStatus.activeCount > 0}
              className="flex items-center gap-2 px-3 py-2 border border-border rounded-lg text-foreground hover:bg-muted transition-colors disabled:opacity-50 text-sm"
            >
              <Server className="w-4 h-4" />
              {watchedServers.length > 0 
                ? `${watchedServers.length} selected` 
                : runningServers.length > 0 
                  ? `Running (${runningServers.length})`
                  : 'Select Servers'
              }
              <ChevronDown className="w-3 h-3" />
            </button>
            
            {/* Server Selector Dropdown */}
            {showServerSelector && (
              <div className="absolute right-0 top-full mt-2 w-64 bg-card border border-border rounded-lg shadow-lg z-50 p-2">
                <div className="text-xs text-muted-foreground px-2 py-1 mb-1">Select servers to watch</div>
                
                {/* Quick Select Options */}
                <div className="flex gap-1 px-2 mb-2">
                  <button
                    onClick={handleWatchRunning}
                    disabled={runningServers.length === 0}
                    className="text-xs px-2 py-1 bg-green-500/10 text-green-500 rounded hover:bg-green-500/20 disabled:opacity-50"
                  >
                    Running ({runningServers.length})
                  </button>
                  <button
                    onClick={handleWatchAll}
                    className="text-xs px-2 py-1 bg-blue-500/10 text-blue-500 rounded hover:bg-blue-500/20"
                  >
                    All ({servers.length})
                  </button>
                </div>
                
                <div className="border-t border-border pt-2 mt-2">
                  {servers.map(server => {
                    const isRunning = runningServers.includes(server);
                    const isSelected = watchedServers.includes(server);
                    return (
                      <label
                        key={server}
                        className="flex items-center gap-2 px-2 py-1.5 hover:bg-muted rounded cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleToggleServerWatch(server)}
                          className="rounded border-border"
                        />
                        <span className="text-sm text-foreground flex-1">{server}</span>
                        {isRunning && (
                          <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                        )}
                      </label>
                    );
                  })}
                </div>
                
                {servers.length === 0 && (
                  <div className="text-xs text-muted-foreground px-2 py-4 text-center">
                    No servers configured
                  </div>
                )}
              </div>
            )}
          </div>
          
          <button
            onClick={handleToggleWatching}
            disabled={startWatchMutation.isPending || stopWatchMutation.isPending}
            className={`flex items-center gap-2 px-4 py-2 border border-border rounded-lg text-foreground hover:bg-muted transition-colors disabled:opacity-50 ${watchStatus && watchStatus.activeCount > 0 ? 'text-yellow-500' : ''}`}
          >
            {watchStatus && watchStatus.activeCount > 0 ? (
              <>
                <Square className="w-4 h-4" />
                Stop Watching
              </>
            ) : (
              <>
                <Play className="w-4 h-4" />
                Start Watching
              </>
            )}
          </button>
          <button
            onClick={handleIngestAll}
            disabled={ingestMutation.isPending}
            className="flex items-center gap-2 px-4 py-2 border border-border rounded-lg text-foreground hover:bg-muted transition-colors disabled:opacity-50"
          >
            <Database className={`w-4 h-4 ${ingestMutation.isPending ? 'animate-pulse' : ''}`} />
            Ingest All
          </button>
          <button
            onClick={handleRefresh}
            disabled={isLoading || isRefetching}
            className="flex items-center gap-2 px-4 py-2 border border-border rounded-lg text-foreground hover:bg-muted transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${isRefetching ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* Log Source Tabs */}
      <div className="mb-4 flex gap-2 overflow-x-auto pb-2">
        {Object.entries(LOG_SOURCES).map(([key, config]) => {
          const Icon = config.icon;
          const isActive = source === key;
          return (
            <button
              key={key}
              onClick={() => handleSetSource(key)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition-colors whitespace-nowrap ${
                isActive
                  ? 'bg-primary/10 border-primary text-primary'
                  : 'bg-card border-border text-muted-foreground hover:text-foreground hover:bg-muted'
              }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? 'text-primary' : config.color}`} />
              {config.label}
            </button>
          );
        })}
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
              onChange={(e) => handleSetSearchQuery(e.target.value)}
              placeholder="Search logs..."
              className="w-full pl-10 pr-4 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-foreground text-sm"
            />
          </div>

          {/* Server Filter */}
          <div className="lg:w-48">
            <select
              value={filterServer}
              onChange={(e) => handleSetFilterServer(e.target.value)}
              className="w-full px-4 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-foreground text-sm"
            >
              <option value="">All Servers</option>
              {servers.map(server => (
                <option key={server} value={server}>{server}</option>
              ))}
            </select>
          </div>

          {/* Level Filter */}
          <div className="lg:w-48">
            <select
              value={filterLevel}
              onChange={(e) => handleSetFilterLevel(e.target.value)}
              className="w-full px-4 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-foreground text-sm"
            >
              <option value="">All Levels</option>
              <option value="INFO">Info</option>
              <option value="WARN">Warning</option>
              <option value="ERROR">Error</option>
              <option value="DEBUG">Debug</option>
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
                  <th className="text-left px-6 py-3 text-xs font-medium text-muted-foreground uppercase">Source</th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-muted-foreground uppercase">Server</th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-muted-foreground uppercase">Event</th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-muted-foreground uppercase">Level</th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-muted-foreground uppercase">Message</th>
                  <th className="text-right px-6 py-3 text-xs font-medium text-muted-foreground uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredLogs.map((log) => {
                  const StatusIcon = STATUS_ICONS[log.level] || CheckCircle2;
                  const sourceConfig = LOG_SOURCES[log.source as keyof typeof LOG_SOURCES];
                  return (
                    <tr
                      key={log.id}
                      className="hover:bg-muted/30 transition-colors cursor-pointer"
                      onClick={() => setSelectedLog(log)}
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Clock className="w-4 h-4" />
                          <span className="text-sm">{formatTimestamp(log.time)}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          {sourceConfig && (
                            <>
                              <sourceConfig.icon className={`w-4 h-4 ${sourceConfig.color}`} />
                              <span className="text-sm text-foreground font-medium">{sourceConfig.label}</span>
                            </>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <Server className="w-4 h-4 text-muted-foreground" />
                          <span className="text-sm text-foreground">{log.server || '-'}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm text-muted-foreground">{log.eventType}</span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium ${LEVEL_BG_COLORS[log.level]} ${LEVEL_COLORS[log.level]}`}>
                          <StatusIcon className="w-3.5 h-3.5" />
                          <span>{log.level}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-sm text-foreground truncate max-w-xs">{log.message}</p>
                        {log.username && (
                          <p className="text-xs text-muted-foreground mt-0.5">by {log.username}</p>
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
              {searchQuery || filterServer || filterLevel
                ? 'Try adjusting your filters'
                : 'No logs have been ingested yet. Click "Ingest All" to parse log files.'}
            </p>
          </div>
        )}
      </div>

      {/* Pagination */}
      {pagination && pagination.total > limit && (
        <div className="mt-4 flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Showing {page * limit + 1} to {Math.min((page + 1) * limit, pagination.total)} of {pagination.total} entries
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => setPage(p => Math.max(0, p - 1))}
              disabled={page === 0}
              className="px-4 py-2 border border-border rounded-lg text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-muted transition-colors"
            >
              Previous
            </button>
            <button
              onClick={() => setPage(p => p + 1)}
              disabled={!pagination.hasMore}
              className="px-4 py-2 border border-border rounded-lg text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-muted transition-colors"
            >
              Next
            </button>
          </div>
        </div>
      )}

      {/* Stats Summary */}
      {stats && (
        <div className="mt-6 grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-4">
          <div className="bg-card border border-border rounded-lg p-4">
            <p className="text-xs text-muted-foreground uppercase">Total Events</p>
            <p className="text-2xl font-bold text-foreground mt-1">{stats.totalEvents.toLocaleString()}</p>
          </div>
          <div className="bg-card border border-border rounded-lg p-4">
            <p className="text-xs text-muted-foreground uppercase">Players</p>
            <p className="text-2xl font-bold text-green-500 mt-1">{stats.uniquePlayers}</p>
          </div>
          <div className="bg-card border border-border rounded-lg p-4">
            <p className="text-xs text-muted-foreground uppercase">Logins</p>
            <p className="text-2xl font-bold text-blue-500 mt-1">{stats.loginCount}</p>
          </div>
          <div className="bg-card border border-border rounded-lg p-4">
            <p className="text-xs text-muted-foreground uppercase">Deaths</p>
            <p className="text-2xl font-bold text-red-500 mt-1">{stats.deathCount}</p>
          </div>
          <div className="bg-card border border-border rounded-lg p-4">
            <p className="text-xs text-muted-foreground uppercase">Chat</p>
            <p className="text-2xl font-bold text-yellow-500 mt-1">{stats.chatCount}</p>
          </div>
          <div className="bg-card border border-border rounded-lg p-4">
            <p className="text-xs text-muted-foreground uppercase">Errors</p>
            <p className="text-2xl font-bold text-destructive mt-1">{stats.errorCount}</p>
          </div>
          <div className="bg-card border border-border rounded-lg p-4">
            <p className="text-xs text-muted-foreground uppercase">Warnings</p>
            <p className="text-2xl font-bold text-yellow-500 mt-1">{stats.warningCount}</p>
          </div>
        </div>
      )}

      {/* Watch Status */}
      {watchStatus && watchStatus.activeCount > 0 && (
        <div className="mt-4 bg-green-500/10 border border-green-500/20 rounded-lg p-4">
          <button
            onClick={() => setShowWatchedFiles(!showWatchedFiles)}
            className="flex items-center gap-3 w-full"
          >
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            <p className="text-sm text-green-500 flex-1 text-left">
              Real-time watching active: {watchStatus.activeCount} file{watchStatus.activeCount !== 1 ? 's' : ''} monitored
            </p>
            {showWatchedFiles ? (
              <ChevronDown className="w-4 h-4 text-green-500" />
            ) : (
              <ChevronRight className="w-4 h-4 text-green-500" />
            )}
          </button>
          
          {showWatchedFiles && (
            <div className="mt-3 pt-3 border-t border-green-500/20 max-h-64 overflow-y-auto">
              <div className="space-y-1">
                {watchStatus.watchers
                  .filter(w => w.isActive)
                  .map((watcher, idx) => (
                    <div
                      key={idx}
                      className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/30 rounded px-2 py-1"
                    >
                      <FolderOpen className="w-3 h-3 text-green-500 flex-shrink-0" />
                      <span className="truncate font-mono" title={watcher.filePath}>
                        {watcher.filePath}
                      </span>
                      {watcher.serverName && watcher.serverName !== 'unknown' && (
                        <span className="text-green-500 ml-auto flex-shrink-0">
                          [{watcher.serverName}]
                        </span>
                      )}
                    </div>
                  ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Log Detail Modal */}
      {selectedLog && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onClick={() => setSelectedLog(null)}
        >
          <div
            className="bg-card border border-border rounded-lg max-w-lg w-full p-6 max-h-[80vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${LEVEL_BG_COLORS[selectedLog.level]}`}>
                  {(() => {
                    const Icon = STATUS_ICONS[selectedLog.level];
                    return <Icon className={`w-5 h-5 ${LEVEL_COLORS[selectedLog.level]}`} />;
                  })()}
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-foreground capitalize">{selectedLog.eventType}</h2>
                  <p className="text-sm text-muted-foreground">{formatTimestamp(selectedLog.time)}</p>
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
                  <p className="text-xs text-muted-foreground uppercase mb-1">Source</p>
                  <p className="text-sm font-medium text-foreground capitalize">{selectedLog.source}</p>
                </div>
                <div className="bg-muted/30 rounded-lg p-3">
                  <p className="text-xs text-muted-foreground uppercase mb-1">Server</p>
                  <p className="text-sm font-medium text-foreground">{selectedLog.server || '-'}</p>
                </div>
              </div>

              {selectedLog.username && (
                <div className="bg-muted/30 rounded-lg p-3">
                  <p className="text-xs text-muted-foreground uppercase mb-1">Username</p>
                  <p className="text-sm font-medium text-foreground">{selectedLog.username}</p>
                </div>
              )}

              <div className="bg-muted/30 rounded-lg p-3">
                <p className="text-xs text-muted-foreground uppercase mb-1">Level</p>
                <div className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium ${LEVEL_BG_COLORS[selectedLog.level]} ${LEVEL_COLORS[selectedLog.level]}`}>
                  {(() => {
                    const Icon = STATUS_ICONS[selectedLog.level];
                    return <Icon className="w-3.5 h-3.5" />;
                  })()}
                  <span>{selectedLog.level}</span>
                </div>
              </div>

              <div className="bg-muted/30 rounded-lg p-3">
                <p className="text-xs text-muted-foreground uppercase mb-1">Message</p>
                <p className="text-sm text-foreground">{selectedLog.message}</p>
              </div>

              {selectedLog.details && Object.keys(selectedLog.details).length > 0 && (
                <div className="bg-muted/30 rounded-lg p-3">
                  <p className="text-xs text-muted-foreground uppercase mb-1">Details</p>
                  <pre className="text-xs text-foreground overflow-x-auto">
                    {JSON.stringify(selectedLog.details, null, 2)}
                  </pre>
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
