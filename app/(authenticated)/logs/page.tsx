'use client';

import { useState, useMemo } from 'react';
import {
  FileText,
  RefreshCw,
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
import { LogCard, LogCardSkeleton } from '@/components/logs/log-card';
import { LogFilters as LogFiltersComponent, ActiveFilters } from '@/components/logs/log-filters';
import { LogStats } from '@/components/logs/log-stats';
import { LogDetailSheet } from '@/components/logs/log-detail-sheet';

export default function LogsPage() {
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

  const { data: serversData } = useServers();
  const { data: runningServersData } = useRunningServers();
  const { data: watchStatus } = useWatchStatus();
  const { data: statsData } = useLogStats(filterServer || undefined);

  const runningServers = runningServersData?.running || [];

  const filters: LogFilters = useMemo(() => ({
    source,
    server: filterServer || undefined,
    level: filterLevel || undefined,
    username: searchQuery || undefined,
    limit,
    offset: page * limit,
  }), [source, filterServer, filterLevel, searchQuery, page]);

  const { data: logsData, isLoading, refetch, isRefetching } = useLogs(filters);

  const ingestMutation = useIngestAllLogs();
  const startWatchMutation = useStartLogWatching();
  const stopWatchMutation = useStopLogWatching();

  const servers = serversData?.map(s => s.name) || [];
  const logsDataResult = logsData;
  const pagination = logsData?.pagination;
  const stats = statsData;

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

  const handleRefresh = () => {
    refetch();
  };

  const handleIngestAll = async () => {
    await ingestMutation.mutateAsync(servers);
  };

  const handleToggleServerWatch = (serverName: string) => {
    setWatchedServers(prev => {
      if (prev.includes(serverName)) {
        return prev.filter(s => s !== serverName);
      }
      return [...prev, serverName];
    });
  };

  const handleWatchRunning = () => {
    if (runningServers.length > 0) {
      setWatchedServers(runningServers);
    } else {
      setWatchedServers(servers);
    }
  };

  const handleWatchAll = () => {
    setWatchedServers(servers);
  };

  const handleToggleWatching = async () => {
    if (watchStatus && watchStatus.activeCount > 0) {
      await stopWatchMutation.mutateAsync();
    } else {
      if (watchedServers.length > 0) {
        await startWatchMutation.mutateAsync({ servers: watchedServers });
      } else if (runningServers.length > 0) {
        await startWatchMutation.mutateAsync({ servers: runningServers });
      } else {
        await startWatchMutation.mutateAsync({ servers: servers });
      }
    }
  };

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

  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-6">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Logs</h1>
            <p className="text-sm text-muted-foreground mt-1 hidden sm:block">
              View backup operations, player events, chat, and server activity
            </p>
          </div>
          
          <div className="flex flex-wrap gap-2">
            <div className="relative">
              <button
                onClick={() => setShowServerSelector(!showServerSelector)}
                disabled={watchStatus && watchStatus.activeCount > 0}
                className="flex items-center gap-2 px-3 py-2 border border-border rounded-lg text-foreground hover:bg-muted transition-colors disabled:opacity-50 text-sm"
              >
                <span className="hidden sm:inline">Server:</span>
                {watchedServers.length > 0 
                  ? `${watchedServers.length}` 
                  : runningServers.length > 0 
                    ? `${runningServers.length} running`
                    : 'All'
                }
                <ChevronDown className="w-3 h-3" />
              </button>
              
              {showServerSelector && (
                <div className="absolute right-0 top-full mt-2 w-64 bg-card border border-border rounded-lg shadow-lg z-50 p-2">
                  <div className="text-xs text-muted-foreground px-2 py-1 mb-1">Select servers to watch</div>
                  
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
                  
                  <div className="border-t border-border pt-2 mt-2 max-h-48 overflow-y-auto">
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
                          <span className="text-sm text-foreground flex-1 truncate">{server}</span>
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
              className={`flex items-center gap-2 px-3 py-2 border border-border rounded-lg text-foreground hover:bg-muted transition-colors disabled:opacity-50 text-sm ${watchStatus && watchStatus.activeCount > 0 ? 'text-yellow-500' : ''}`}
            >
              {watchStatus && watchStatus.activeCount > 0 ? (
                <>
                  <Square className="w-4 h-4" />
                  <span className="hidden sm:inline">Stop</span>
                </>
              ) : (
                <>
                  <Play className="w-4 h-4" />
                  <span className="hidden sm:inline">Watch</span>
                </>
              )}
            </button>
            
            <button
              onClick={handleIngestAll}
              disabled={ingestMutation.isPending}
              className="flex items-center gap-2 px-3 py-2 border border-border rounded-lg text-foreground hover:bg-muted transition-colors disabled:opacity-50 text-sm"
            >
              <Database className={`w-4 h-4 ${ingestMutation.isPending ? 'animate-pulse' : ''}`} />
              <span className="hidden sm:inline">Ingest</span>
            </button>
            
            <button
              onClick={handleRefresh}
              disabled={isLoading || isRefetching}
              className="flex items-center gap-2 px-3 py-2 border border-border rounded-lg text-foreground hover:bg-muted transition-colors disabled:opacity-50 text-sm"
            >
              <RefreshCw className={`w-4 h-4 ${isRefetching ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Refresh</span>
            </button>
          </div>
        </div>

        <LogFiltersComponent
          source={source}
          filterServer={filterServer}
          filterLevel={filterLevel}
          searchQuery={searchQuery}
          servers={servers}
          onSourceChange={handleSetSource}
          onServerChange={handleSetFilterServer}
          onLevelChange={handleSetFilterLevel}
          onSearchChange={handleSetSearchQuery}
        />

        <ActiveFilters
          source={source}
          filterServer={filterServer}
          filterLevel={filterLevel}
          searchQuery={searchQuery}
          onSourceChange={handleSetSource}
          onServerChange={handleSetFilterServer}
          onLevelChange={handleSetFilterLevel}
          onSearchChange={handleSetSearchQuery}
        />
      </div>

      <div className="space-y-3 mb-6">
        {isLoading ? (
          <>
            <LogCardSkeleton />
            <LogCardSkeleton />
            <LogCardSkeleton />
          </>
        ) : filteredLogs.length > 0 ? (
          filteredLogs.map((log) => (
            <LogCard
              key={log.id}
              log={log}
              onClick={() => setSelectedLog(log)}
            />
          ))
        ) : (
          <div className="text-center py-12 bg-card border border-border rounded-lg">
            <FileText className="w-12 h-12 mx-auto mb-3 text-muted-foreground opacity-50" />
            <h3 className="text-base font-medium text-foreground mb-1">No logs found</h3>
            <p className="text-sm text-muted-foreground">
              {searchQuery || filterServer || filterLevel
                ? 'Try adjusting your filters'
                : 'No logs have been ingested yet. Click "Ingest" to parse log files.'}
            </p>
          </div>
        )}
      </div>

      {pagination && pagination.total > limit && (
        <div className="flex items-center justify-between gap-2 mb-6">
          <p className="text-xs sm:text-sm text-muted-foreground">
            {page * limit + 1}-{Math.min((page + 1) * limit, pagination.total)} of {pagination.total}
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => setPage(p => Math.max(0, p - 1))}
              disabled={page === 0}
              className="px-3 py-1.5 border border-border rounded-lg text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-muted transition-colors"
            >
              Previous
            </button>
            <button
              onClick={() => setPage(p => p + 1)}
              disabled={!pagination.hasMore}
              className="px-3 py-1.5 border border-border rounded-lg text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-muted transition-colors"
            >
              Next
            </button>
          </div>
        </div>
      )}

      <div className="mb-6">
        <LogStats stats={stats} isLoading={!stats} />
      </div>

      {watchStatus && watchStatus.activeCount > 0 && (
        <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-3 sm:p-4">
          <button
            onClick={() => setShowWatchedFiles(!showWatchedFiles)}
            className="flex items-center gap-3 w-full"
          >
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            <p className="text-sm text-green-500 flex-1 text-left">
              Watching {watchStatus.activeCount} file{watchStatus.activeCount !== 1 ? 's' : ''}
            </p>
            {showWatchedFiles ? (
              <ChevronDown className="w-4 h-4 text-green-500" />
            ) : (
              <ChevronRight className="w-4 h-4 text-green-500" />
            )}
          </button>
          
          {showWatchedFiles && (
            <div className="mt-3 pt-3 border-t border-green-500/20 max-h-32 sm:max-h-48 overflow-y-auto">
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

      <LogDetailSheet
        log={selectedLog}
        onClose={() => setSelectedLog(null)}
      />
    </div>
  );
}
