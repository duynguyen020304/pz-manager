'use client';

import { useState } from 'react';
import { ServerModsConfig } from '@/types';
import { 
  Package, 
  Puzzle, 
  Map, 
  ChevronDown, 
  ChevronRight,
  ExternalLink
} from 'lucide-react';

interface ModListProps {
  mods: ServerModsConfig;
  isLoading?: boolean;
  initiallyExpanded?: boolean;
}

export function ModList({ mods, isLoading, initiallyExpanded = false }: ModListProps) {
  const [isExpanded, setIsExpanded] = useState(initiallyExpanded);

  if (isLoading) {
    return (
      <div className="mt-4 pt-4 border-t border-border/50">
        <div className="flex items-center gap-2 text-muted-foreground">
          <div className="w-4 h-4 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
          <span className="text-sm">Loading mods...</span>
        </div>
      </div>
    );
  }

  const totalMods = mods.mods.length + mods.workshopItems.length;
  const hasMods = totalMods > 0;
  const hasMaps = mods.maps.length > 0 && !(mods.maps.length === 1 && mods.maps[0] === 'Muldraugh, KY');

  if (!hasMods && !hasMaps) {
    return (
      <div className="mt-4 pt-4 border-t border-border/50">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Puzzle className="w-4 h-4" />
          <span className="text-sm">No mods installed</span>
        </div>
      </div>
    );
  }

  return (
    <div className="mt-4 pt-4 border-t border-border/50">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center gap-2 text-sm font-medium text-foreground hover:text-primary transition-colors w-full"
      >
        {isExpanded ? (
          <ChevronDown className="w-4 h-4" />
        ) : (
          <ChevronRight className="w-4 h-4" />
        )}
        <Package className="w-4 h-4" />
        <span>
          {totalMods > 0 
            ? `${totalMods} mod${totalMods !== 1 ? 's' : ''}` 
            : 'No mods'}
          {hasMaps && ` • ${mods.maps.length} map${mods.maps.length !== 1 ? 's' : ''}`}
        </span>
      </button>

      {isExpanded && (
        <div className="mt-3 space-y-4 pl-6">
          {/* Workshop Mods */}
          {mods.workshopItems.length > 0 && (
            <div>
              <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2 flex items-center gap-1">
                <Package className="w-3 h-3" />
                Workshop Mods
              </h4>
              <div className="space-y-1.5">
                {mods.workshopItems.map((mod) => (
                  <a
                    key={mod.workshopId}
                    href={`https://steamcommunity.com/sharedfiles/filedetails/?id=${mod.workshopId}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-between text-sm px-2 py-1.5 rounded bg-muted/50 hover:bg-muted transition-colors group"
                  >
                    <span className="text-foreground">{mod.name}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground font-mono">
                        {mod.workshopId}
                      </span>
                      <ExternalLink className="w-3 h-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* Mod IDs */}
          {mods.mods.length > 0 && (
            <div>
              <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2 flex items-center gap-1">
                <Puzzle className="w-3 h-3" />
                Mod IDs
              </h4>
              <div className="flex flex-wrap gap-1.5">
                {mods.mods.map((modId) => (
                  <span
                    key={modId}
                    className="text-xs px-2 py-1 rounded bg-accent/10 text-accent font-mono"
                  >
                    {modId}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Maps */}
          {hasMaps && (
            <div>
              <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2 flex items-center gap-1">
                <Map className="w-3 h-3" />
                Maps
              </h4>
              <div className="flex flex-wrap gap-1.5">
                {mods.maps.map((map) => (
                  <span
                    key={map}
                    className="text-xs px-2 py-1 rounded bg-primary/10 text-primary"
                  >
                    {map}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function ModSummary({ mods }: { mods: ServerModsConfig }) {
  const totalMods = mods.mods.length + mods.workshopItems.length;
  const hasMaps = mods.maps.length > 0 && !(mods.maps.length === 1 && mods.maps[0] === 'Muldraugh, KY');

  return (
    <div className="flex items-center gap-3 text-sm text-muted-foreground">
      <div className="flex items-center gap-1.5">
        <Package className="w-4 h-4" />
        <span>{totalMods} mod{totalMods !== 1 ? 's' : ''}</span>
      </div>
      {hasMaps && (
        <>
          <span className="text-border">•</span>
          <div className="flex items-center gap-1.5">
            <Map className="w-4 h-4" />
            <span>{mods.maps.length} map{mods.maps.length !== 1 ? 's' : ''}</span>
          </div>
        </>
      )}
    </div>
  );
}
