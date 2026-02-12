'use client';

import { useState } from 'react';
import {
  useServers,
  useDetectServers,
  useAddServer,
  useRemoveServer,
  useAllServerStatus
} from '@/hooks/use-api';
import { Server, Plus } from 'lucide-react';
import { ServerStartModal } from '@/components/ServerStartModal';
import { StopConfirmModal } from '@/components/StopConfirmModal';
import { ConsoleModal } from '@/components/ConsoleModal';
import { RollbackModal } from '@/components/rollback';
import {
  ServerCard,
  ServerCardSkeleton,
  AddServerModal,
  DeleteConfirmModal
} from '@/components/servers';

export default function ServersPage() {
  const { data: servers, isLoading } = useServers();
  const {
    data: detectedServers,
    refetch: detectServers,
    isLoading: isDetecting
  } = useDetectServers();
  const { data: serverStatuses } = useAllServerStatus();
  const addServer = useAddServer();
  const removeServer = useRemoveServer();

  const [showAddModal, setShowAddModal] = useState(false);
  const [newServerName, setNewServerName] = useState('');
  const [serverToDelete, setServerToDelete] = useState<string | null>(null);
  const [serverToStart, setServerToStart] = useState<string | null>(null);
  const [serverToStop, setServerToStop] = useState<string | null>(null);
  const [serverForConsole, setServerForConsole] = useState<string | null>(null);
  const [serverForRollback, setServerForRollback] = useState<string | null>(null);
  const [hasDetectedBefore, setHasDetectedBefore] = useState(false);

  const handleAddServer = async (name: string) => {
    try {
      await addServer.mutateAsync(name);
      setShowAddModal(false);
      setNewServerName('');
    } catch (error) {
      console.error('Failed to add server:', error);
    }
  };

  const handleRemoveServer = async (name: string) => {
    try {
      await removeServer.mutateAsync(name);
      setServerToDelete(null);
    } catch (error) {
      console.error('Failed to remove server:', error);
    }
  };

  const handleDetect = () => {
    detectServers();
    setHasDetectedBefore(true);
  };

  const getServerStatus = (name: string) => {
    return serverStatuses?.find((s) => s.name === name);
  };

  return (
    <div className="w-full">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Servers</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage your Project Zomboid servers
          </p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center justify-center gap-2 bg-primary hover:bg-primary/90 text-primary-foreground px-4 py-2 rounded-lg transition-all duration-200 hover:shadow-md"
        >
          <Plus className="w-4 h-4" />
          Add Server
        </button>
      </div>

      {/* Servers List - Responsive Grid */}
      {isLoading ? (
        <ServerCardSkeleton count={3} />
      ) : servers && servers.length > 0 ? (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          {servers.map((server) => (
            <ServerCard
              key={server.name}
              server={server}
              status={getServerStatus(server.name)}
              onDelete={() => setServerToDelete(server.name)}
              onStart={() => setServerToStart(server.name)}
              onStop={() => setServerToStop(server.name)}
              onConsole={() => setServerForConsole(server.name)}
              onRollback={() => setServerForRollback(server.name)}
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-12 bg-card border border-border rounded-xl">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-muted/50 flex items-center justify-center">
            <Server className="w-8 h-8 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-medium text-foreground mb-1">
            No servers configured
          </h3>
          <p className="text-sm text-muted-foreground mb-4 max-w-md mx-auto">
            Add your first server to start managing backups and operations.
          </p>
          <button
            onClick={() => setShowAddModal(true)}
            className="bg-primary hover:bg-primary/90 text-primary-foreground px-4 py-2 rounded-lg transition-all duration-200 hover:shadow-md"
          >
            Add Server
          </button>
        </div>
      )}

      {/* Add Server Modal */}
      {showAddModal && (
        <AddServerModal
          onClose={() => setShowAddModal(false)}
          onAdd={handleAddServer}
          onDetect={handleDetect}
          detectedServers={detectedServers}
          isDetecting={isDetecting}
          isAdding={addServer.isPending}
          newServerName={newServerName}
          setNewServerName={setNewServerName}
          hasDetectedBefore={hasDetectedBefore}
        />
      )}

      {/* Delete Confirmation Modal */}
      {serverToDelete && (
        <DeleteConfirmModal
          serverName={serverToDelete}
          onClose={() => setServerToDelete(null)}
          onConfirm={() => handleRemoveServer(serverToDelete)}
          isDeleting={removeServer.isPending}
        />
      )}

      {/* Start Server Modal */}
      {serverToStart && (
        <ServerStartModal
          serverName={serverToStart}
          isOpen={true}
          onClose={() => setServerToStart(null)}
        />
      )}

      {/* Stop Server Modal */}
      {serverToStop && (
        <StopConfirmModal
          serverName={serverToStop}
          isOpen={true}
          onClose={() => setServerToStop(null)}
        />
      )}

      {/* Console Modal */}
      {serverForConsole && (
        <ConsoleModal
          serverName={serverForConsole}
          isOpen={true}
          onClose={() => setServerForConsole(null)}
        />
      )}

      {/* Rollback Modal */}
      {serverForRollback && (
        <RollbackModal
          isOpen={true}
          onClose={() => setServerForRollback(null)}
          initialServer={serverForRollback}
        />
      )}
    </div>
  );
}
