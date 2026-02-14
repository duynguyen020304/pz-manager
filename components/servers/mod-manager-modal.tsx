'use client';

import { useState } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy
} from '@dnd-kit/sortable';
import { X, Plus, Save, AlertCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SortableModItem } from './sortable-mod-item';
import { useServerModEntries, useAddMod, useUpdateModOrder, useRemoveMod } from '@/hooks/use-api';
import type { ModEntry } from '@/types';

interface ModManagerModalProps {
  serverName: string;
  onClose: () => void;
}

export function ModManagerModal({ serverName, onClose }: ModManagerModalProps) {
  const [workshopUrl, setWorkshopUrl] = useState('');
  const [localMods, setLocalMods] = useState<ModEntry[]>([]);
  const [hasChanges, setHasChanges] = useState(false);

  const { data: mods, isLoading: isLoadingMods, error: loadError } = useServerModEntries(serverName);
  const addMod = useAddMod(serverName);
  const updateModOrder = useUpdateModOrder(serverName);
  const removeMod = useRemoveMod(serverName);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates
    })
  );

  const handleAddMod = async () => {
    if (!workshopUrl.trim()) return;

    try {
      await addMod.mutateAsync(workshopUrl);
      setWorkshopUrl('');
    } catch (error) {
      console.error('Failed to add mod:', error);
    }
  };

  const handleRemoveMod = async (workshopId: string) => {
    try {
      await removeMod.mutateAsync(workshopId);
    } catch (error) {
      console.error('Failed to remove mod:', error);
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = displayMods.findIndex((item) => item.workshopId === active.id);
      const newIndex = displayMods.findIndex((item) => item.workshopId === over.id);
      const newItems = arrayMove(displayMods, oldIndex, newIndex).map((item, index) => ({
        ...item,
        order: index
      }));
      setLocalMods(newItems);
      setHasChanges(true);
    }
  };

  const handleSaveOrder = async () => {
    try {
      await updateModOrder.mutateAsync(displayMods);
      setHasChanges(false);
    } catch (error) {
      console.error('Failed to save order:', error);
    }
  };

  const isAdding = addMod.isPending;
  const isSaving = updateModOrder.isPending;

  const displayMods = hasChanges ? localMods : (mods ?? []);
  const addError = addMod.error ? (addMod.error as Error).message : null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 animate-fade-in">
      <div className="bg-card border border-border rounded-xl max-w-2xl w-full max-h-[85vh] flex flex-col animate-scale-in">
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h2 className="text-lg font-semibold text-foreground">
            Manage Mods - {serverName}
          </h2>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground transition-colors p-1.5 hover:bg-muted rounded-lg"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4 overflow-y-auto flex-1 space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">
              Add Mod from Workshop
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={workshopUrl}
                onChange={(e) => setWorkshopUrl(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddMod()}
                placeholder="https://steamcommunity.com/sharedfiles/filedetails/?id=..."
                className="flex-1 px-3 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 text-foreground text-sm transition-all placeholder:text-muted-foreground"
                disabled={isAdding}
              />
              <Button
                onClick={handleAddMod}
                disabled={!workshopUrl.trim() || isAdding}
                size="sm"
              >
                {isAdding ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Plus className="w-4 h-4" />
                )}
                Add
              </Button>
            </div>
            {addError && (
              <p className="text-xs text-destructive flex items-center gap-1 mt-1">
                <AlertCircle className="w-3 h-3" />
                {addError}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-foreground">
                Installed Mods ({displayMods.length})
              </label>
              <span className="text-xs text-muted-foreground">
                Drag to reorder load order
              </span>
            </div>

            {isLoadingMods ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            ) : loadError ? (
              <p className="text-sm text-destructive text-center py-4">
                Failed to load mods
              </p>
            ) : displayMods.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <p className="text-sm">No mods installed</p>
                <p className="text-xs mt-1">
                  Add a mod using the URL above
                </p>
              </div>
            ) : (
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
              >
                <SortableContext
                  items={displayMods.map((m) => m.workshopId)}
                  strategy={verticalListSortingStrategy}
                >
                  <div className="space-y-2">
                    {displayMods.map((mod) => (
                      <SortableModItem
                        key={mod.workshopId}
                        mod={mod}
                        onRemove={handleRemoveMod}
                        isRemoving={removeMod.isPending}
                      />
                    ))}
                  </div>
                </SortableContext>
              </DndContext>
            )}
          </div>
        </div>

        <div className="flex items-center justify-between p-4 border-t border-border">
          <p className="text-xs text-muted-foreground">
            {hasChanges && 'Order changed - save to apply'}
          </p>
          <div className="flex gap-2">
            <Button variant="secondary" onClick={onClose}>
              Cancel
            </Button>
            <Button
              onClick={handleSaveOrder}
              disabled={!hasChanges || isSaving}
            >
              {isSaving ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : hasChanges ? (
                <Save className="w-4 h-4 mr-2" />
              ) : null}
              Save Order
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
