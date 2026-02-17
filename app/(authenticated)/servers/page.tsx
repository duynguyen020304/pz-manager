'use client';

import { useState } from 'react';
import {
  useServers,
  useDetectServers,
  useAddServer,
  useRemoveServer,
  useAllServerStatus,
  useServerConfig,
  useUpdateServerConfig,
  useServerSandboxVars,
  useApplyDifficultyPreset,
  useUpdateServerSandboxVars,
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
  DeleteConfirmModal,
  ModManagerModal,
  ServerListView,
  QuickConfigPanel,
  AdvancedSettingsDrawer,
  SandboxVarsEditor,
  ViewModeToggle,
} from '@/components/servers';
import type { ViewMode } from '@/components/servers/view-mode-toggle';
import type { QuickConfig, SandboxQuickConfig } from '@/components/servers/quick-config-panel';
import { parseBooleanValue, parseNumberValue, booleanToString } from '@/lib/ini-utils';
import { SandboxVars } from '@/lib/sandbox-vars-types';

export default function ServersPage() {
  const { data: servers, isLoading } = useServers();
  const {
    data: detectedServers,
    refetch: detectServers,
    isLoading: isDetecting,
  } = useDetectServers();
  const { data: serverStatuses } = useAllServerStatus();
  const addServer = useAddServer();
  const removeServer = useRemoveServer();

  // View mode state
  const [viewMode, setViewMode] = useState<ViewMode>('grid');

  // Modal states
  const [showAddModal, setShowAddModal] = useState(false);
  const [newServerName, setNewServerName] = useState('');
  const [serverToDelete, setServerToDelete] = useState<string | null>(null);
  const [serverToStart, setServerToStart] = useState<string | null>(null);
  const [serverToStop, setServerToStop] = useState<string | null>(null);
  const [serverForConsole, setServerForConsole] = useState<string | null>(null);
  const [serverForRollback, setServerForRollback] = useState<string | null>(null);
  const [serverForMods, setServerForMods] = useState<string | null>(null);
  const [serverForQuickConfig, setServerForQuickConfig] = useState<string | null>(null);
  const [serverForAdvancedConfig, setServerForAdvancedConfig] = useState<string | null>(null);
  const [serverForSandboxEditor, setServerForSandboxEditor] = useState<string | null>(null);
  const [hasDetectedBefore, setHasDetectedBefore] = useState(false);

  // Config hooks for the currently selected server
  const { data: serverConfig, isLoading: isLoadingConfig } = useServerConfig(
    serverForQuickConfig || serverForAdvancedConfig || ''
  );
  const { data: sandboxVars } = useServerSandboxVars(
    serverForQuickConfig || ''
  );
  const updateConfig = useUpdateServerConfig();
  const applyDifficultyPreset = useApplyDifficultyPreset();
  const updateSandboxVars = useUpdateServerSandboxVars();

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

  // Convert full INI config to QuickConfig format
  const getQuickConfigFromIni = (config: Record<string, string> | undefined): QuickConfig => {
    if (!config) {
      return {
        xms: 8,
        xmx: 12,
        maxPlayers: 16,
        public: true,
        pvp: true,
        safehouse: true,
        lootRespawn: false,
      };
    }

    return {
      xms: parseNumberValue(config.Xms?.replace('G', '').replace('g', '').replace('M', '').replace('m', ''), 8),
      xmx: parseNumberValue(config.Xmx?.replace('G', '').replace('g', '').replace('M', '').replace('m', ''), 12),
      maxPlayers: parseNumberValue(config.MaxPlayers, 16),
      public: parseBooleanValue(config.Public),
      pvp: parseBooleanValue(config.PVP),
      safehouse: parseBooleanValue(config.PlayerSafehouse),
      lootRespawn: parseBooleanValue(config.LootRespawn),
    };
  };

  // Convert SandboxVars to SandboxQuickConfig format
  const getSandboxQuickConfigFromVars = (vars: SandboxVars | undefined): SandboxQuickConfig => {
    if (!vars) {
      return {
        preset: 'apocalypse',
        starterKit: true,
        nutrition: true,
      };
    }

    return {
      preset: null, // We'll detect this later if needed
      starterKit: vars.StarterKit ?? true,
      nutrition: vars.Nutrition ?? true,
    };
  };

  // Convert QuickConfig back to INI updates
  const getIniUpdatesFromQuickConfig = (quickConfig: QuickConfig): Record<string, string> => {
    return {
      Xms: `${quickConfig.xms}G`,
      Xmx: `${quickConfig.xmx}G`,
      MaxPlayers: String(quickConfig.maxPlayers),
      Public: booleanToString(quickConfig.public),
      PVP: booleanToString(quickConfig.pvp),
      PlayerSafehouse: booleanToString(quickConfig.safehouse),
      LootRespawn: booleanToString(quickConfig.lootRespawn),
    };
  };

  const handleSaveQuickConfig = async (quickConfig: QuickConfig & { sandbox?: SandboxQuickConfig }) => {
    if (!serverForQuickConfig) return;

    // Save INI config
    const updates = getIniUpdatesFromQuickConfig(quickConfig);
    await updateConfig.mutateAsync({
      serverName: serverForQuickConfig,
      updates,
    });

    // Save Sandbox config if present
    if (quickConfig.sandbox) {
      const { sandbox } = quickConfig;

      // Apply difficulty preset if selected
      if (sandbox.preset) {
        await applyDifficultyPreset.mutateAsync({
          serverName: serverForQuickConfig,
          presetId: sandbox.preset,
        });
      }

      // Apply individual sandbox toggles
      const sandboxUpdates: Partial<SandboxVars> = {};
      if (sandbox.starterKit !== undefined) {
        sandboxUpdates.StarterKit = sandbox.starterKit;
      }
      if (sandbox.nutrition !== undefined) {
        sandboxUpdates.Nutrition = sandbox.nutrition;
      }

      if (Object.keys(sandboxUpdates).length > 0) {
        await updateSandboxVars.mutateAsync({
          serverName: serverForQuickConfig,
          updates: sandboxUpdates,
        });
      }
    }

    setServerForQuickConfig(null);
  };

  const handleSaveAdvancedConfig = async (config: Record<string, string>) => {
    if (!serverForAdvancedConfig) return;

    await updateConfig.mutateAsync({
      serverName: serverForAdvancedConfig,
      config,
    });
    setServerForAdvancedConfig(null);
  };

  const handleResetConfig = async () => {
    if (!serverForAdvancedConfig) return;
    // This would need a reset API endpoint
    // For now, just clear the advanced config modal
    setServerForAdvancedConfig(null);
  };

  return (
    <div className="w-full">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Servers</h1>
          <p className="text-sm text-muted-foreground mt-1">Manage your Project Zomboid servers</p>
        </div>
        <div className="flex items-center gap-3">
          <ViewModeToggle mode={viewMode} onChange={setViewMode} />
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center justify-center gap-2 bg-primary hover:bg-primary/90 text-primary-foreground px-4 py-2 rounded-lg transition-all duration-200 hover:shadow-md"
          >
            <Plus className="w-4 h-4" />
            Add Server
          </button>
        </div>
      </div>

      {/* Servers List - Grid or List View */}
      {isLoading ? (
        viewMode === 'grid' ? (
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
            <ServerCardSkeleton count={3} />
          </div>
        ) : (
          <div className="space-y-2">
            <ServerCardSkeleton count={3} />
          </div>
        )
      ) : servers && servers.length > 0 ? (
        viewMode === 'grid' ? (
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
                onManageMods={() => setServerForMods(server.name)}
                onQuickConfig={() => setServerForQuickConfig(server.name)}
              />
            ))}
          </div>
        ) : (
          <ServerListView
            servers={servers}
            statuses={serverStatuses?.reduce((acc, status) => {
              acc[status.name] = status;
              return acc;
            }, {} as Record<string, typeof serverStatuses[0]>) || {}}
            onStart={(name: string) => setServerToStart(name)}
            onStop={(name: string) => setServerToStop(name)}
            onConsole={(name: string) => setServerForConsole(name)}
            onRollback={(name: string) => setServerForRollback(name)}
            onDelete={(name: string) => setServerToDelete(name)}
            onQuickConfig={(name: string) => setServerForQuickConfig(name)}
          />
        )
      ) : (
        <div className="text-center py-12 bg-card border border-border rounded-xl">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-muted/50 flex items-center justify-center">
            <Server className="w-8 h-8 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-medium text-foreground mb-1">No servers configured</h3>
          <p className="text-sm text-muted-foreground mb-4 max-w-md mx-auto">Add your first server to start managing backups and operations.</p>
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

      {/* Mod Manager Modal */}
      {serverForMods && (
        <ModManagerModal
          serverName={serverForMods}
          onClose={() => setServerForMods(null)}
        />
      )}

      {/* Quick Config Panel */}
      {serverForQuickConfig && (
        <QuickConfigPanel
          serverName={serverForQuickConfig}
          isOpen={true}
          onClose={() => setServerForQuickConfig(null)}
          onSave={handleSaveQuickConfig}
          onOpenAdvanced={() => {
            setServerForAdvancedConfig(serverForQuickConfig);
            setServerForQuickConfig(null);
          }}
          onOpenSandboxAdvanced={() => {
            setServerForSandboxEditor(serverForQuickConfig);
            setServerForQuickConfig(null);
          }}
          initialConfig={getQuickConfigFromIni(serverConfig)}
          initialSandboxConfig={getSandboxQuickConfigFromVars(sandboxVars?.config)}
          systemRam={64} // TODO: Get from system info API
        />
      )}

      {/* Sandbox Vars Editor */}
      {serverForSandboxEditor && (
        <SandboxVarsEditor
          serverName={serverForSandboxEditor}
          isOpen={true}
          onClose={() => setServerForSandboxEditor(null)}
          onBack={() => {
            setServerForQuickConfig(serverForSandboxEditor);
            setServerForSandboxEditor(null);
          }}
        />
      )}

      {/* Advanced Settings Drawer */}
      {serverForAdvancedConfig && (
        <AdvancedSettingsDrawer
          serverName={serverForAdvancedConfig}
          isOpen={true}
          onClose={() => setServerForAdvancedConfig(null)}
          config={serverConfig || {}}
          onSave={handleSaveAdvancedConfig}
          onReset={handleResetConfig}
          onBack={() => {
            setServerForQuickConfig(serverForAdvancedConfig);
            setServerForAdvancedConfig(null);
          }}
          isLoading={isLoadingConfig}
        />
      )}
    </div>
  );
}
