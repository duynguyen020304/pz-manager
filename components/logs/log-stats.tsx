'use client';

import { useState } from 'react';
import {
  ChevronDown,
  ChevronUp,
  User,
  MessageSquare,
  Sword,
  AlertCircle,
  AlertTriangle,
  FileText
} from 'lucide-react';

interface LogStatsProps {
  stats: {
    totalEvents: number;
    uniquePlayers: number;
    loginCount: number;
    deathCount: number;
    chatCount: number;
    errorCount: number;
    warningCount: number;
  } | undefined;
  isLoading?: boolean;
}

interface StatItemProps {
  label: string;
  value: number | string;
  icon: React.ElementType;
  color: string;
  bgColor: string;
}

function StatItem({ label, value, icon: Icon, color, bgColor }: StatItemProps) {
  return (
    <div className="bg-muted/30 rounded-lg p-3 flex items-center gap-3">
      <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${bgColor}`}>
        <Icon className={`w-4 h-4 ${color}`} />
      </div>
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground uppercase tracking-wide">{label}</p>
        <p className={`text-lg font-bold ${color}`}>{value}</p>
      </div>
    </div>
  );
}

export function LogStats({ stats, isLoading }: LogStatsProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  if (!stats && !isLoading) return null;

  const keyStats = stats ? [
    { label: 'Total', value: stats.totalEvents.toLocaleString(), icon: FileText, color: 'text-foreground', bgColor: 'bg-muted' },
    { label: 'Players', value: stats.uniquePlayers, icon: User, color: 'text-green-500', bgColor: 'bg-green-500/10' },
    { label: 'Errors', value: stats.errorCount, icon: AlertCircle, color: 'text-destructive', bgColor: 'bg-destructive/10' },
  ] : [];

  const expandedStats = stats ? [
    { label: 'Logins', value: stats.loginCount, icon: User, color: 'text-blue-500', bgColor: 'bg-blue-500/10' },
    { label: 'Deaths', value: stats.deathCount, icon: Sword, color: 'text-red-500', bgColor: 'bg-red-500/10' },
    { label: 'Chat', value: stats.chatCount, icon: MessageSquare, color: 'text-yellow-500', bgColor: 'bg-yellow-500/10' },
    { label: 'Warnings', value: stats.warningCount, icon: AlertTriangle, color: 'text-yellow-500', bgColor: 'bg-yellow-500/10' },
  ] : [];

  if (isLoading) {
    return (
      <div className="grid grid-cols-3 gap-2">
        {[1, 2, 3].map(i => (
          <div key={i} className="bg-muted/30 rounded-lg p-3 animate-pulse">
            <div className="h-8 w-8 rounded-lg bg-muted mb-2" />
            <div className="h-4 w-12 bg-muted rounded" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-3 gap-2">
        {keyStats.map((stat) => (
          <StatItem key={stat.label} {...stat} />
        ))}
      </div>

      {expandedStats.length > 0 && (
        <>
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="flex items-center justify-center gap-1 w-full py-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            {isExpanded ? (
              <>
                <ChevronUp className="w-3 h-3" />
                Show less
              </>
            ) : (
              <>
                <ChevronDown className="w-3 h-3" />
                Show more ({expandedStats.length})
              </>
            )}
          </button>

          {isExpanded && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {expandedStats.map((stat) => (
                <StatItem key={stat.label} {...stat} />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
