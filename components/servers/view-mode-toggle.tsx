'use client';

import React from 'react';
import { LayoutGrid, List } from 'lucide-react';

type ViewMode = 'grid' | 'list';

interface ViewModeToggleProps {
  mode: ViewMode;
  onChange: (mode: ViewMode) => void;
}

export function ViewModeToggle({ mode, onChange }: ViewModeToggleProps) {
  return (
    <div className="flex p-1 bg-muted rounded-lg">
      <button
        onClick={() => onChange('grid')}
        className={`p-2 rounded transition-all ${
          mode === 'grid'
            ? 'bg-card shadow-sm text-foreground'
            : 'text-muted-foreground hover:text-foreground'
        }`}
        aria-label="Grid view"
        aria-pressed={mode === 'grid'}
      >
        <LayoutGrid className="w-4 h-4" />
      </button>
      <button
        onClick={() => onChange('list')}
        className={`p-2 rounded transition-all ${
          mode === 'list'
            ? 'bg-card shadow-sm text-foreground'
            : 'text-muted-foreground hover:text-foreground'
        }`}
        aria-label="List view"
        aria-pressed={mode === 'list'}
      >
        <List className="w-4 h-4" />
      </button>
    </div>
  );
}

export type { ViewMode };
export default ViewModeToggle;
