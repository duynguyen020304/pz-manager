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
      <div className="mt-2 pt-2 border-t border-border/50">
        <div className="flex items-center gap-2 text-muted-foreground">
          <div className="w-3.5 h-3.5 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
          <span className="text-xs">Loading mods...</span>
        </div>
      </div>
    );
  }

  const totalMods = mods.mods.length + mods.workshopItems.length;
  const hasMods = totalMods > 0;
  const hasMaps = mods.maps.length > 0 && !(mods.maps.length === 1 && mods.maps[0] === 'Muldraugh, KY');

  if (!hasMods && !hasMaps) {
    return (
      <div className="mt-2 pt-2 border-t border-border/50">
        <div className="flex items-center gap-1.5 text-muted-foreground">
          <Puzzle className="w-3.5 h-3.5" />
          <span className="text-xs">No mods</span>
        </div>
      </div>
    );
  }

  return (
    <div className="mt-2 pt-2 border-t border-border/50">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors w-full"
      >
        {isExpanded ? (
          <ChevronDown className="w-3.5 h-3.5" />
        ) : (
          <ChevronRight className="w-3.5 h-3.5" />
        )}
        <Package className="w-3.5 h-3.5" />
        <span>
          {totalMods > 0 
            ? `${totalMods} mod${totalMods !== 1 ? 's' : ''}` 
            : 'No mods'}
          {hasMaps && ` • ${mods.maps.length} map${mods.maps.length !== 1 ? 's' : ''}`}
        </span>
      </button>

      {isExpanded && (
        <div className="mt-2 space-y-3 pl-5">
          {/* Workshop Mods */}
          {mods.workshopItems.length > 0 && (
            <div>
              <h4 className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide mb-1.5 flex items-center gap-1">
                <Package className="w-3 h-3" />
                Workshop Mods
              </h4>
              <div className="space-y-1">
                {mods.workshopItems.map((mod) => (
                  <a
                    key={mod.workshopId}
                    href={`https://steamcommunity.com/sharedfiles/filedetails/?id=${mod.workshopId}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-between text-xs px-2 py-1 rounded bg-muted/50 hover:bg-muted transition-colors group"
                  >
                    <span className="text-foreground truncate">{mod.name}</span>
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      <span className="text-[10px] text-muted-foreground font-mono">
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
              <h4 className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide mb-1.5 flex items-center gap-1">
                <Puzzle className="w-3 h-3" />
                Mod IDs
              </h4>
              <div className="flex flex-wrap gap-1">
                {mods.mods.map((modId) => (
                  <span
                    key={modId}
                    className="text-[10px] px-1.5 py-0.5 rounded bg-accent/10 text-accent font-mono"
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
              <h4 className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide mb-1.5 flex items-center gap-1">
                <Map className="w-3 h-3" />
                Maps
              </h4>
              <div className="flex flex-wrap gap-1">
                {mods.maps.map((map) => (
                  <span
                    key={map}
                    className="text-[10px] px-1.5 py-0.5 rounded bg-primary/10 text-primary"
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
    <div className="flex items-center gap-2 text-xs text-muted-foreground">
      <div className="flex items-center gap-1">
        <Package className="w-3.5 h-3.5" />
        <span>{totalMods} mod{totalMods !== 1 ? 's' : ''}</span>
      </div>
      {hasMaps && (
        <>
          <span className="text-border">•</span>
          <div className="flex items-center gap-1">
            <Map className="w-3.5 h-3.5" />
            <span>{mods.maps.length} map{mods.maps.length !== 1 ? 's' : ''}</span>
          </div>
        </>
      )}
    </div>
  );
}
