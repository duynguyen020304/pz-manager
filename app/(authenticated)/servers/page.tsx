'use client';

import { useServers, useDetectServers, useAddServer, useRemoveServer, useAllServerStatus, useServerMods } from '@/hooks/use-api';
import { useState } from 'react';
import { 
  Server, 
  Plus, 
  Trash2, 
  CheckCircle2, 
  AlertCircle, 
  FileText, 
  Database,
  RefreshCw,
  X,
  Search,
  Play,
  Power,
  Terminal,
  Loader2
} from 'lucide-react';
import { Server as ServerType } from '@/types';
import { ServerStatusBadge } from '@/components/ServerStatusBadge';
import { ServerStartModal } from '@/components/ServerStartModal';
import { StopConfirmModal } from '@/components/StopConfirmModal';
import { ConsoleModal } from '@/components/ConsoleModal';
import { ModList } from '@/components/ModList';

export default function ServersPage() {
  const { data: servers, isLoading } = useServers();
  const { data: detectedServers, refetch: detectServers, isLoading: isDetecting } = useDetectServers();
  const { data: serverStatuses } = useAllServerStatus();
  const addServer = useAddServer();
  const removeServer = useRemoveServer();
  
  const [showAddModal, setShowAddModal] = useState(false);
  const [newServerName, setNewServerName] = useState('');
  const [serverToDelete, setServerToDelete] = useState<string | null>(null);
  const [serverToStart, setServerToStart] = useState<string | null>(null);
  const [serverToStop, setServerToStop] = useState<string | null>(null);
  const [serverForConsole, setServerForConsole] = useState<string | null>(null);

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

  const getServerStatus = (name: string) => {
    return serverStatuses?.find(s => s.name === name);
  };

  return (
    <div className="max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Servers</h1>
          <p className="text-muted-foreground mt-2">
            Manage your Project Zomboid servers
          </p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 bg-primary hover:bg-primary/90 text-primary-foreground px-4 py-2 rounded-md transition-colors"
        >
          <Plus className="w-5 h-5" />
          Add Server
        </button>
      </div>

      {/* Servers List */}
      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-24 bg-card border border-border rounded-lg animate-pulse" />
          ))}
        </div>
      ) : servers && servers.length > 0 ? (
        <div className="space-y-4">
          {servers.map((server) => (
            <ServerCard
              key={server.name}
              server={server}
              status={getServerStatus(server.name)}
              onDelete={() => setServerToDelete(server.name)}
              onStart={() => setServerToStart(server.name)}
              onStop={() => setServerToStop(server.name)}
              onConsole={() => setServerForConsole(server.name)}
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-16 bg-card border border-border rounded-lg">
          <Server className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-50" />
          <h3 className="text-lg font-medium text-foreground mb-2">No servers configured</h3>
          <p className="text-muted-foreground mb-4">
            Add your first Project Zomboid server to start managing backups
          </p>
          <button
            onClick={() => setShowAddModal(true)}
            className="bg-primary hover:bg-primary/90 text-primary-foreground px-4 py-2 rounded-md transition-colors"
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
          onDetect={detectServers}
          detectedServers={detectedServers}
          isDetecting={isDetecting}
          isAdding={addServer.isPending}
          newServerName={newServerName}
          setNewServerName={setNewServerName}
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
    </div>
  );
}

function ServerCard({
  server,
  status,
  onDelete,
  onStart,
  onStop,
  onConsole
}: {
  server: ServerType;
  status?: {
    name: string;
    state: 'stopped' | 'starting' | 'running' | 'stopping';
    pid?: number;
    tmuxSession?: string;
    uptime?: string;
    ports?: {
      defaultPort: number;
      udpPort: number;
      rconPort: number;
    };
    startedAt?: Date;
  };
  onDelete: () => void;
  onStart: () => void;
  onStop: () => void;
  onConsole: () => void;
}) {
  const { data: mods, isLoading: isLoadingMods } = useServerMods(server.name);
  const isRunning = status?.state === 'running';
  const isStarting = status?.state === 'starting';
  const isStopping = status?.state === 'stopping';
  const isStopped = status?.state === 'stopped' || !status;
  const isLoading = isStarting || isStopping;

  return (
    <div className="bg-card border border-border rounded-lg p-6 hover:border-primary/30 transition-colors">
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-4 flex-1">
          <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
            server.valid ? 'bg-green-500/10' : 'bg-yellow-500/10'
          }`}>
            {server.valid ? (
              <CheckCircle2 className="w-6 h-6 text-green-500" />
            ) : (
              <AlertCircle className="w-6 h-6 text-yellow-500" />
            )}
          </div>
          
          <div className="flex-1">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-lg font-semibold text-foreground">{server.name}</h3>
                <p className="text-sm text-muted-foreground mt-1">{server.path}</p>
                
                <div className="flex items-center gap-2 mt-3">
                  {server.valid && (
                    <span className="inline-flex items-center gap-1 text-xs bg-green-500/10 text-green-500 px-2 py-1 rounded">
                      <CheckCircle2 className="w-3 h-3" />
                      Valid
                    </span>
                  )}
                  {server.hasIni && (
                    <span className="inline-flex items-center gap-1 text-xs bg-primary/10 text-primary px-2 py-1 rounded">
                      <FileText className="w-3 h-3" />
                      Config
                    </span>
                  )}
                  {server.hasDb && (
                    <span className="inline-flex items-center gap-1 text-xs bg-accent/10 text-accent px-2 py-1 rounded">
                      <Database className="w-3 h-3" />
                      Database
                    </span>
                  )}
                </div>
              </div>
              
              {/* Status Badge */}
              <div className="ml-4">
                {status ? (
                  <ServerStatusBadge status={status} />
                ) : (
                  <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border bg-muted border-border text-muted-foreground">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span className="text-sm">Loading...</span>
                  </span>
                )}
              </div>
            </div>
            
            {/* Server Details when running */}
            {isRunning && status && (
              <div className="mt-4 pt-4 border-t border-border/50">
                <div className="grid grid-cols-3 gap-4 text-sm">
                  {status.pid && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <span className="text-xs uppercase tracking-wide">PID:</span>
                      <span className="font-mono text-foreground">{status.pid}</span>
                    </div>
                  )}
                  {status.uptime && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <span className="text-xs uppercase tracking-wide">Uptime:</span>
                      <span className="text-foreground">{status.uptime}</span>
                    </div>
                  )}
                  {status.ports && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <span className="text-xs uppercase tracking-wide">Ports:</span>
                      <span className="font-mono text-foreground">{status.ports.defaultPort}/{status.ports.udpPort}</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Mods */}
            <ModList 
              mods={mods ?? { serverName: server.name, mods: [], workshopItems: [], maps: ['Muldraugh, KY'] }} 
              isLoading={isLoadingMods} 
            />
          </div>
        </div>
        
        <div className="flex items-center gap-2 ml-4">
          {/* Start/Stop Buttons */}
          <div className="flex items-center gap-1 bg-muted/50 rounded-lg p-1">
            {(isStopped || isStarting) && (
              <button
                onClick={onStart}
                disabled={isStarting}
                className="flex items-center gap-1 px-3 py-2 bg-green-500 hover:bg-green-600 text-white rounded-md text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                title="Start Server"
              >
                {isStarting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <Play className="w-4 h-4" />
                    <span>Start</span>
                  </>
                )}
              </button>
            )}
            
            {(isRunning || isStopping) && (
              <button
                onClick={onStop}
                disabled={isStopping}
                className="flex items-center gap-1 px-3 py-2 bg-destructive hover:bg-destructive/90 text-destructive-foreground rounded-md text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                title="Stop Server"
              >
                {isStopping ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <Power className="w-4 h-4" />
                    <span>Stop</span>
                  </>
                )}
              </button>
            )}

            <button
              onClick={onConsole}
              disabled={!isRunning}
              className="p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              title={isRunning ? "Open Console" : "Console available when server is running"}
            >
              <Terminal className="w-4 h-4" />
            </button>
          </div>
          
          <button
            onClick={onDelete}
            className="p-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-md transition-colors"
            title="Remove Server"
          >
            <Trash2 className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
}

function AddServerModal({
  onClose,
  onAdd,
  onDetect,
  detectedServers,
  isDetecting,
  isAdding,
  newServerName,
  setNewServerName
}: {
  onClose: () => void;
  onAdd: (name: string) => void;
  onDetect: () => void;
  detectedServers?: ServerType[];
  isDetecting: boolean;
  isAdding: boolean;
  newServerName: string;
  setNewServerName: (name: string) => void;
}) {
  const [activeTab, setActiveTab] = useState<'detect' | 'manual'>('detect');

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-card border border-border rounded-lg max-w-2xl w-full max-h-[80vh] flex flex-col">
        <div className="flex items-center justify-between p-6 border-b border-border">
          <h2 className="text-xl font-semibold text-foreground">Add Server</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto flex-1">
          {/* Tabs */}
          <div className="flex gap-4 mb-6">
            <button
              onClick={() => setActiveTab('detect')}
              className={`flex items-center gap-2 px-4 py-2 rounded-md transition-colors ${
                activeTab === 'detect' 
                  ? 'bg-primary text-primary-foreground' 
                  : 'bg-muted text-muted-foreground hover:text-foreground'
              }`}
            >
              <Search className="w-4 h-4" />
              Auto-detect
            </button>
            <button
              onClick={() => setActiveTab('manual')}
              className={`flex items-center gap-2 px-4 py-2 rounded-md transition-colors ${
                activeTab === 'manual' 
                  ? 'bg-primary text-primary-foreground' 
                  : 'bg-muted text-muted-foreground hover:text-foreground'
              }`}
            >
              <Plus className="w-4 h-4" />
              Manual
            </button>
          </div>

          {activeTab === 'detect' ? (
            <div>
              <div className="flex items-center justify-between mb-4">
                <p className="text-muted-foreground">
                  Scanning: /root/Zomboid/Saves/Multiplayer
                </p>
                <button
                  onClick={() => onDetect()}
                  disabled={isDetecting}
                  className="flex items-center gap-2 text-primary hover:text-primary/80 disabled:opacity-50"
                >
                  <RefreshCw className={`w-4 h-4 ${isDetecting ? 'animate-spin' : ''}`} />
                  {isDetecting ? 'Scanning...' : 'Scan again'}
                </button>
              </div>

              {!detectedServers && !isDetecting && (
                <div className="text-center py-8 text-muted-foreground">
                  <Search className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>Click &quot;Scan again&quot; to find available servers</p>
                </div>
              )}

              {isDetecting && (
                <div className="text-center py-8">
                  <RefreshCw className="w-12 h-12 mx-auto mb-3 animate-spin text-primary" />
                  <p className="text-muted-foreground">Scanning for servers...</p>
                </div>
              )}

              {detectedServers && detectedServers.length === 0 && !isDetecting && (
                <div className="text-center py-8 text-muted-foreground">
                  <AlertCircle className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>No unconfigured servers found</p>
                </div>
              )}

              {detectedServers && detectedServers.length > 0 && (
                <div className="space-y-2">
                  {detectedServers.map((server) => (
                    <div
                      key={server.name}
                      className="flex items-center justify-between p-4 bg-muted/50 rounded-md"
                    >
                      <div className="flex items-center gap-3">
                        {server.valid ? (
                          <CheckCircle2 className="w-5 h-5 text-green-500" />
                        ) : (
                          <AlertCircle className="w-5 h-5 text-yellow-500" />
                        )}
                        <span className="font-medium text-foreground">{server.name}</span>
                      </div>
                      <button
                        onClick={() => onAdd(server.name)}
                        disabled={isAdding}
                        className="bg-primary hover:bg-primary/90 text-primary-foreground px-3 py-1 rounded-md text-sm transition-colors disabled:opacity-50"
                      >
                        {isAdding ? 'Adding...' : 'Add'}
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Server Name
                </label>
                <input
                  type="text"
                  value={newServerName}
                  onChange={(e) => setNewServerName(e.target.value)}
                  placeholder="Enter server name"
                  className="w-full px-4 py-2 bg-background border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary text-foreground"
                />
                <p className="text-xs text-muted-foreground mt-2">
                  Alphanumeric characters, hyphens, and underscores only
                </p>
              </div>
              <button
                onClick={() => onAdd(newServerName)}
                disabled={!newServerName || isAdding}
                className="w-full bg-primary hover:bg-primary/90 text-primary-foreground py-2 rounded-md transition-colors disabled:opacity-50"
              >
                {isAdding ? 'Adding...' : 'Add Server'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function DeleteConfirmModal({
  serverName,
  onClose,
  onConfirm,
  isDeleting
}: {
  serverName: string;
  onClose: () => void;
  onConfirm: () => void;
  isDeleting: boolean;
}) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-card border border-border rounded-lg max-w-md w-full p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-destructive/10 rounded-full flex items-center justify-center">
            <AlertCircle className="w-5 h-5 text-destructive" />
          </div>
          <h2 className="text-xl font-semibold text-foreground">Remove Server?</h2>
        </div>
        
        <p className="text-muted-foreground mb-6">
          Are you sure you want to remove <strong className="text-foreground">{serverName}</strong>? 
          This will not delete any backup data, only remove it from management.
        </p>
        
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 border border-border rounded-md text-foreground hover:bg-muted transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={isDeleting}
            className="flex-1 px-4 py-2 bg-destructive hover:bg-destructive/90 text-destructive-foreground rounded-md transition-colors disabled:opacity-50"
          >
            {isDeleting ? 'Removing...' : 'Remove'}
          </button>
        </div>
      </div>
    </div>
  );
}
