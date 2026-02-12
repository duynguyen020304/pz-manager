'use client';

import { useState } from 'react';
import { Server as ServerType } from '@/types';
import { Button } from '@/components/ui/button';
import {
  CheckCircle2,
  AlertCircle,
  Search,
  Plus,
  RefreshCw,
  X
} from 'lucide-react';

interface AddServerModalProps {
  onClose: () => void;
  onAdd: (name: string) => void;
  onDetect: () => void;
  detectedServers?: ServerType[];
  isDetecting: boolean;
  isAdding: boolean;
  newServerName: string;
  setNewServerName: (name: string) => void;
  hasDetectedBefore?: boolean;
}

export function AddServerModal({
  onClose,
  onAdd,
  onDetect,
  detectedServers,
  isDetecting,
  isAdding,
  newServerName,
  setNewServerName,
  hasDetectedBefore = false
}: AddServerModalProps) {
  const [activeTab, setActiveTab] = useState<'detect' | 'manual'>(
    hasDetectedBefore ? 'manual' : 'detect'
  );

  const detectedCount = detectedServers?.length ?? 0;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 animate-fade-in">
      <div className="bg-card border border-border rounded-xl max-w-2xl w-full max-h-[90vh] flex flex-col animate-scale-in">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h2 className="text-lg font-semibold text-foreground">Add Server</h2>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground transition-colors p-1.5 hover:bg-muted rounded-lg"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4 overflow-y-auto flex-1">
          {/* Tabs */}
          <div className="flex gap-2 mb-4 p-1 bg-muted/50 rounded-lg">
            <button
              onClick={() => setActiveTab('detect')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-md transition-all duration-200 flex-1 text-sm ${
                activeTab === 'detect'
                  ? 'bg-card text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Search className="w-4 h-4" />
              Auto-Detect
              {detectedCount > 0 && (
                <span className="ml-1.5 bg-primary text-primary-foreground text-xs px-1.5 py-0.5 rounded-full font-medium">
                  {detectedCount}
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveTab('manual')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-md transition-all duration-200 flex-1 text-sm ${
                activeTab === 'manual'
                  ? 'bg-card text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Plus className="w-4 h-4" />
              Manual Entry
            </button>
          </div>

          {activeTab === 'detect' ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-muted-foreground text-xs">
                  Scanning: /root/Zomboid/Saves/Multiplayer
                </p>
                <Button
                  onClick={() => onDetect()}
                  disabled={isDetecting}
                  variant="secondary"
                  size="sm"
                  leftIcon={<RefreshCw className={`w-3.5 h-3.5 ${isDetecting ? 'animate-spin' : ''}`} />}
                >
                  {isDetecting ? 'Scanning...' : 'Scan'}
                </Button>
              </div>

              {!detectedServers && !isDetecting && (
                <div className="text-center py-8 text-muted-foreground">
                  <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-muted/50 flex items-center justify-center">
                    <Search className="w-6 h-6 opacity-50" />
                  </div>
                  <p className="text-sm font-medium mb-1">No scan yet</p>
                  <p className="text-xs">Click &quot;Scan&quot; to find available servers</p>
                </div>
              )}

              {isDetecting && (
                <div className="text-center py-8">
                  <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-primary/10 flex items-center justify-center">
                    <RefreshCw className="w-6 h-6 text-primary animate-spin" />
                  </div>
                  <p className="text-sm font-medium text-foreground mb-1">Scanning for servers...</p>
                  <p className="text-xs text-muted-foreground">Checking /root/Zomboid/Saves/Multiplayer</p>
                </div>
              )}

              {detectedServers && detectedServers.length === 0 && !isDetecting && (
                <div className="text-center py-8 text-muted-foreground">
                  <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-muted/50 flex items-center justify-center">
                    <AlertCircle className="w-6 h-6 opacity-50" />
                  </div>
                  <p className="text-sm font-medium text-foreground mb-1">No servers found</p>
                  <p className="text-xs">All available servers are already configured</p>
                </div>
              )}

              {detectedServers && detectedServers.length > 0 && (
                <div className="space-y-2">
                  {detectedServers.map((server) => (
                    <div
                      key={server.name}
                      className="flex items-center justify-between p-3 bg-muted/30 rounded-lg border border-transparent hover:border-primary/30 transition-all duration-200"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        {server.valid ? (
                          <div className="w-8 h-8 rounded-lg bg-green-500/10 flex items-center justify-center flex-shrink-0">
                            <CheckCircle2 className="w-4 h-4 text-green-500" />
                          </div>
                        ) : (
                          <div className="w-8 h-8 rounded-lg bg-yellow-500/10 flex items-center justify-center flex-shrink-0">
                            <AlertCircle className="w-4 h-4 text-yellow-500" />
                          </div>
                        )}
                        <div className="min-w-0">
                          <p className="font-medium text-foreground text-sm truncate">{server.name}</p>
                          <p className="text-xs text-muted-foreground truncate">{server.path}</p>
                        </div>
                      </div>
                      <Button
                        onClick={() => onAdd(server.name)}
                        disabled={isAdding}
                        size="sm"
                      >
                        {isAdding ? 'Adding...' : 'Add'}
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">
                  Server Name
                </label>
                <input
                  type="text"
                  value={newServerName}
                  onChange={(e) => setNewServerName(e.target.value)}
                  placeholder="Enter server name"
                  className="w-full px-3 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary text-foreground text-sm transition-all duration-200"
                />
                <p className="text-xs text-muted-foreground mt-1.5">
                  Alphanumeric characters, hyphens, and underscores only
                </p>
              </div>
              <Button
                onClick={() => onAdd(newServerName)}
                disabled={!newServerName || isAdding}
                className="w-full"
                size="md"
                leftIcon={isAdding ? undefined : <Plus className="w-4 h-4" />}
                isLoading={isAdding}
              >
                Add Server
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
