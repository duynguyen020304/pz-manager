'use client';

import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, X, AlertCircle } from 'lucide-react';
import type { ModEntry } from '@/types';

interface SortableModItemProps {
  mod: ModEntry;
  onRemove: (workshopId: string) => void;
  isRemoving?: boolean;
}

export function SortableModItem({ mod, onRemove, isRemoving }: SortableModItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id: mod.workshopId });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center gap-3 p-3 bg-muted/30 rounded-lg border border-transparent transition-all ${
        isDragging 
          ? 'border-primary/50 bg-card shadow-lg opacity-90 z-50' 
          : 'hover:border-primary/30'
      }`}
    >
      <button
        className="cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground transition-colors p-1"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="w-4 h-4" />
      </button>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground font-mono bg-muted px-1.5 py-0.5 rounded">
            #{mod.order + 1}
          </span>
          <span className="font-medium text-foreground truncate">
            {mod.name}
          </span>
          {!mod.isValid && (
            <AlertCircle className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />
          )}
        </div>
        <div className="flex items-center gap-2 mt-0.5">
          <span className="text-xs text-muted-foreground font-mono">
            ID: {mod.workshopId}
          </span>
          <span className="text-xs text-muted-foreground">|</span>
          <span className="text-xs text-muted-foreground font-mono">
            {mod.modId}
          </span>
        </div>
        {mod.validationMessage && !mod.isValid && (
          <p className="text-xs text-amber-500 mt-1">{mod.validationMessage}</p>
        )}
      </div>

      <button
        onClick={() => onRemove(mod.workshopId)}
        disabled={isRemoving}
        className="text-muted-foreground hover:text-destructive transition-colors p-1.5 hover:bg-muted rounded-lg disabled:opacity-50"
        title="Remove mod"
      >
        {isRemoving ? (
          <div className="w-4 h-4 border-2 border-destructive border-t-transparent rounded-full animate-spin" />
        ) : (
          <X className="w-4 h-4" />
        )}
      </button>
    </div>
  );
}
