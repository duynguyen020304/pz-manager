'use client';

import { useServers, useSnapshots, useDeleteSnapshot } from '@/hooks/use-api';
import { useState } from 'react';
import {
  Server,
  HardDrive,
  Clock,
  Trash2,
  AlertTriangle,
  FileArchive,
  RotateCcw
} from 'lucide-react';
import { Snapshot } from '@/types';
import { RollbackModal } from '@/components/rollback';

export default function BackupsPage() {
  const [selectedServer, setSelectedServer] = useState<string>('');
  const [selectedSchedule, setSelectedSchedule] = useState<string>('');
  const [snapshotToDelete, setSnapshotToDelete] = useState<Snapshot | null>(null);
  const [rollbackServer, setRollbackServer] = useState<string | null>(null);
  const [rollbackSnapshot, setRollbackSnapshot] = useState<string | null>(null);
  
  const { data: servers, isLoading: serversLoading } = useServers();
  const { data: snapshots, isLoading: snapshotsLoading } = useSnapshots(
    selectedServer,
    selectedSchedule || undefined
  );
  const deleteSnapshot = useDeleteSnapshot();

  const handleDelete = async () => {
    if (!snapshotToDelete) return;

    try {
      await deleteSnapshot.mutateAsync(snapshotToDelete.path);
      setSnapshotToDelete(null);
    } catch (error) {
      console.error('Failed to delete snapshot:', error);
      // Could show user-facing error message here
    }
  };

  const schedules = ['5min', '10min', '30min', 'hourly', 'daily', 'weekly'];

  return (
    <div className="max-w-7xl mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-foreground">Backups</h1>
            <p className="text-muted-foreground mt-2">
              Browse and manage backup snapshots
            </p>
          </div>

          {/* Filters */}
          <div className="bg-card border border-border rounded-lg p-4 mb-6">
            <div className="flex flex-col sm:flex-row gap-4">
              {/* Server Select */}
              <div className="flex-1">
                <label className="block text-sm font-medium text-foreground mb-2">
                  Server
                </label>
                <select
                  value={selectedServer}
                  onChange={(e) => setSelectedServer(e.target.value)}
                  className="w-full px-4 py-2 bg-background border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary text-foreground"
                >
                  <option value="">Select a server...</option>
                  {servers?.map((server) => (
                    <option key={server.name} value={server.name}>
                      {server.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Schedule Filter */}
              <div className="flex-1">
                <label className="block text-sm font-medium text-foreground mb-2">
                  Schedule
                </label>
                <select
                  value={selectedSchedule}
                  onChange={(e) => setSelectedSchedule(e.target.value)}
                  className="w-full px-4 py-2 bg-background border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary text-foreground"
                >
                  <option value="">All schedules</option>
                  {schedules.map((schedule) => (
                    <option key={schedule} value={schedule}>
                      {schedule}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Snapshots Table */}
          <div className="bg-card border border-border rounded-lg overflow-hidden">
            {!selectedServer ? (
              <div className="text-center py-16">
                <Server className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-50" />
                <h3 className="text-lg font-medium text-foreground mb-2">Select a server</h3>
                <p className="text-muted-foreground">Choose a server to view its backups</p>
              </div>
            ) : snapshotsLoading ? (
              <div className="p-8 space-y-4">
                {[1, 2, 3, 4, 5].map(i => (
                  <div key={i} className="h-12 bg-muted rounded animate-pulse" />
                ))}
              </div>
            ) : snapshots && snapshots.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-muted/50 border-b border-border">
                    <tr>
                      <th className="text-left px-6 py-3 text-sm font-medium text-muted-foreground">Timestamp</th>
                      <th className="text-left px-6 py-3 text-sm font-medium text-muted-foreground">Schedule</th>
                      <th className="text-left px-6 py-3 text-sm font-medium text-muted-foreground">Size</th>
                      <th className="text-left px-6 py-3 text-sm font-medium text-muted-foreground">Files</th>
                      <th className="text-right px-6 py-3 text-sm font-medium text-muted-foreground">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {snapshots.map((snapshot) => (
                      <tr key={snapshot.path} className="hover:bg-muted/30 transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <Clock className="w-4 h-4 text-muted-foreground" />
                            <span className="text-foreground font-medium">
                              {snapshot.formattedTimestamp}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-primary/10 text-primary">
                            {snapshot.schedule}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <HardDrive className="w-4 h-4" />
                            {snapshot.formattedSize}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-muted-foreground">
                          {snapshot.fileCount.toLocaleString()}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => {
                                setRollbackServer(selectedServer);
                                setRollbackSnapshot(snapshot.path);
                              }}
                              className="p-2 text-muted-foreground hover:text-accent hover:bg-accent/10 rounded-md transition-colors"
                              title="Rollback to this snapshot"
                            >
                              <RotateCcw className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => setSnapshotToDelete(snapshot)}
                              className="p-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-md transition-colors"
                              title="Delete snapshot"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-16">
                <FileArchive className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-50" />
                <h3 className="text-lg font-medium text-foreground mb-2">No backups found</h3>
                <p className="text-muted-foreground">
                  No snapshots available for this server{selectedSchedule && ` with schedule "${selectedSchedule}"`}
                </p>
              </div>
            )}
          </div>

          {/* Summary */}
          {selectedServer && snapshots && snapshots.length > 0 && (
            <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-card border border-border rounded-lg p-4">
                <p className="text-sm text-muted-foreground">Total Snapshots</p>
                <p className="text-2xl font-bold text-foreground">{snapshots.length}</p>
              </div>
              <div className="bg-card border border-border rounded-lg p-4">
                <p className="text-sm text-muted-foreground">Total Size</p>
                <p className="text-2xl font-bold text-foreground">
                  {formatBytes(snapshots.reduce((sum, s) => sum + s.size, 0))}
                </p>
              </div>
              <div className="bg-card border border-border rounded-lg p-4">
                <p className="text-sm text-muted-foreground">Latest Backup</p>
                <p className="text-lg font-bold text-foreground">
                  {snapshots[0]?.formattedTimestamp || 'N/A'}
                </p>
              </div>
            </div>
          )}

      {/* Delete Confirmation Modal */}
      {snapshotToDelete && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-card border border-border rounded-lg max-w-md w-full p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-destructive/10 rounded-full flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-destructive" />
              </div>
              <h2 className="text-xl font-semibold text-foreground">Delete Snapshot?</h2>
            </div>

            <div className="space-y-3 mb-6">
              <p className="text-muted-foreground">
                Are you sure you want to delete this snapshot?
              </p>
              <div className="bg-muted/50 rounded-lg p-4 space-y-2 text-sm">
                <p><strong className="text-foreground">Date:</strong> {snapshotToDelete.formattedTimestamp}</p>
                <p><strong className="text-foreground">Schedule:</strong> {snapshotToDelete.schedule}</p>
                <p><strong className="text-foreground">Size:</strong> {snapshotToDelete.formattedSize}</p>
              </div>
              <p className="text-sm text-destructive">
                This action cannot be undone.
              </p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setSnapshotToDelete(null)}
                className="flex-1 px-4 py-2 border border-border rounded-md text-foreground hover:bg-muted transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={deleteSnapshot.isPending}
                className="flex-1 px-4 py-2 bg-destructive hover:bg-destructive/90 text-destructive-foreground rounded-md transition-colors disabled:opacity-50"
              >
                {deleteSnapshot.isPending ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Rollback Modal */}
      {rollbackServer && (
        <RollbackModal
          isOpen={true}
          onClose={() => {
            setRollbackServer(null);
            setRollbackSnapshot(null);
          }}
          initialServer={rollbackServer}
          initialSnapshot={rollbackSnapshot}
        />
      )}
    </div>
  );
}

function formatBytes(bytes: number): string {
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let size = bytes;
  let unitIndex = 0;
  
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }
  
  return `${size.toFixed(2)} ${units[unitIndex]}`;
}
