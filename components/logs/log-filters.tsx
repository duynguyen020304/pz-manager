'use client';

import { useState } from 'react';
import {
  Search,
  ChevronDown,
  ChevronUp,
  Filter,
  X,
  Database,
  User,
  Server,
  MessageSquare,
  Sword,
  Activity
} from 'lucide-react';

const LOG_SOURCES = {
  backup: { label: 'Backup', icon: Database, color: 'text-blue-500' },
  player: { label: 'Player', icon: User, color: 'text-green-500' },
  server: { label: 'Server', icon: Server, color: 'text-purple-500' },
  chat: { label: 'Chat', icon: MessageSquare, color: 'text-yellow-500' },
  pvp: { label: 'PvP', icon: Sword, color: 'text-red-500' },
  skill: { label: 'Skills', icon: Activity, color: 'text-cyan-500' },
};

interface LogFiltersProps {
  source: string;
  filterServer: string;
  filterLevel: string;
  searchQuery: string;
  servers: string[];
  onSourceChange: (value: string) => void;
  onServerChange: (value: string) => void;
  onLevelChange: (value: string) => void;
  onSearchChange: (value: string) => void;
}

export function LogFilters({
  source,
  filterServer,
  filterLevel,
  searchQuery,
  servers,
  onSourceChange,
  onServerChange,
  onLevelChange,
  onSearchChange
}: LogFiltersProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const activeFilterCount = [
    source !== 'backup' ? source : null,
    filterServer || null,
    filterLevel || null,
    searchQuery || null,
  ].filter(Boolean).length;

  const handleClearSearch = () => onSearchChange('');

  return (
    <div className="bg-card border border-border rounded-lg overflow-hidden">
      <div className="p-3">
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Search logs..."
              className="w-full pl-10 pr-8 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-foreground text-sm"
            />
            {searchQuery && (
              <button
                onClick={handleClearSearch}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1 hover:bg-muted rounded"
              >
                <X className="w-3 h-3 text-muted-foreground" />
              </button>
            )}
          </div>
          
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className={`flex items-center justify-center gap-2 px-4 py-2 border border-border rounded-lg transition-colors ${
              isExpanded || activeFilterCount > 1
                ? 'bg-primary/10 border-primary text-primary'
                : 'text-foreground hover:bg-muted'
            }`}
          >
            <Filter className="w-4 h-4" />
            <span className="text-sm">Filters</span>
            {activeFilterCount > 1 && (
              <span className="bg-primary text-primary-foreground text-xs px-1.5 py-0.5 rounded-full">
                {activeFilterCount - 1}
              </span>
            )}
            {isExpanded ? (
              <ChevronUp className="w-4 h-4" />
            ) : (
              <ChevronDown className="w-4 h-4" />
            )}
          </button>
        </div>

        {isExpanded && (
          <div className="mt-3 pt-3 border-t border-border space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <select
                value={filterServer}
                onChange={(e) => onServerChange(e.target.value)}
                className="w-full px-3 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-foreground text-sm"
              >
                <option value="">All Servers</option>
                {servers.map(server => (
                  <option key={server} value={server}>{server}</option>
                ))}
              </select>
              
              <select
                value={filterLevel}
                onChange={(e) => onLevelChange(e.target.value)}
                className="w-full px-3 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-foreground text-sm"
              >
                <option value="">All Levels</option>
                <option value="INFO">Info</option>
                <option value="WARN">Warning</option>
                <option value="ERROR">Error</option>
                <option value="DEBUG">Debug</option>
              </select>
            </div>
          </div>
        )}
      </div>

      <div className="border-t border-border overflow-x-auto">
        <div className="flex gap-1.5 p-2 min-w-0">
          {Object.entries(LOG_SOURCES).map(([key, config]) => {
            const Icon = config.icon;
            const isActive = source === key;
            return (
              <button
                key={key}
                onClick={() => onSourceChange(key)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border transition-colors whitespace-nowrap text-xs sm:text-sm ${
                  isActive
                    ? 'bg-primary/10 border-primary text-primary'
                    : 'bg-transparent border-border text-muted-foreground hover:text-foreground hover:bg-muted'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-primary' : config.color}`} />
                <span className="hidden sm:inline">{config.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export function ActiveFilters({
  source,
  filterServer,
  filterLevel,
  searchQuery,
  onSourceChange,
  onServerChange,
  onLevelChange,
  onSearchChange
}: {
  source: string;
  filterServer: string;
  filterLevel: string;
  searchQuery: string;
  onSourceChange: (value: string) => void;
  onServerChange: (value: string) => void;
  onLevelChange: (value: string) => void;
  onSearchChange: (value: string) => void;
}) {
  const hasFilters = filterServer || filterLevel || searchQuery;
  
  if (!hasFilters) return null;

  return (
    <div className="flex flex-wrap gap-1.5 mb-3">
      {source && source !== 'backup' && (
        <span className="inline-flex items-center gap-1 px-2 py-1 bg-primary/10 text-primary rounded text-xs">
          Source: {LOG_SOURCES[source as keyof typeof LOG_SOURCES]?.label || source}
          <button onClick={() => onSourceChange('backup')}>
            <X className="w-3 h-3" />
          </button>
        </span>
      )}
      {filterServer && (
        <span className="inline-flex items-center gap-1 px-2 py-1 bg-muted text-foreground rounded text-xs">
          Server: {filterServer}
          <button onClick={() => onServerChange('')}>
            <X className="w-3 h-3" />
          </button>
        </span>
      )}
      {filterLevel && (
        <span className="inline-flex items-center gap-1 px-2 py-1 bg-muted text-foreground rounded text-xs">
          Level: {filterLevel}
          <button onClick={() => onLevelChange('')}>
            <X className="w-3 h-3" />
          </button>
        </span>
      )}
      {searchQuery && (
        <span className="inline-flex items-center gap-1 px-2 py-1 bg-muted text-foreground rounded text-xs">
          &quot;{searchQuery}&quot;
          <button onClick={() => onSearchChange('')}>
            <X className="w-3 h-3" />
          </button>
        </span>
      )}
    </div>
  );
}
