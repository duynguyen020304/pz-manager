'use client';

import { ServerStatus } from '@/types';
import { 
  CheckCircle2, 
  XCircle, 
  Loader2, 
  Activity,
  Clock,
  Hash,
  Terminal
} from 'lucide-react';

interface ServerStatusBadgeProps {
  status: ServerStatus;
  showDetails?: boolean;
}

export function ServerStatusBadge({ status, showDetails = false }: ServerStatusBadgeProps) {
  const getStatusConfig = () => {
    switch (status.state) {
      case 'running':
        return {
          icon: CheckCircle2,
          color: 'text-green-500',
          bgColor: 'bg-green-500/10',
          borderColor: 'border-green-500/30',
          label: 'Running'
        };
      case 'starting':
        return {
          icon: Loader2,
          color: 'text-blue-500',
          bgColor: 'bg-blue-500/10',
          borderColor: 'border-blue-500/30',
          label: 'Starting...'
        };
      case 'stopping':
        return {
          icon: Loader2,
          color: 'text-yellow-500',
          bgColor: 'bg-yellow-500/10',
          borderColor: 'border-yellow-500/30',
          label: 'Stopping...'
        };
      case 'stopped':
      default:
        return {
          icon: XCircle,
          color: 'text-muted-foreground',
          bgColor: 'bg-muted',
          borderColor: 'border-border',
          label: 'Stopped'
        };
    }
  };

  const config = getStatusConfig();
  const Icon = config.icon;
  const isLoading = status.state === 'starting' || status.state === 'stopping';

  return (
    <div className={`inline-flex flex-col ${showDetails ? 'gap-2' : ''}`}>
      <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full border ${config.bgColor} ${config.borderColor}`}>
        <Icon className={`w-4 h-4 ${config.color} ${isLoading ? 'animate-spin' : ''}`} />
        <span className={`text-sm font-medium ${config.color}`}>
          {config.label}
        </span>
      </div>
      
      {showDetails && status.state === 'running' && (
        <div className="space-y-1.5 mt-1">
          {status.pid && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Hash className="w-3 h-3" />
              <span>PID: {status.pid}</span>
            </div>
          )}
          {status.uptime && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Clock className="w-3 h-3" />
              <span>Uptime: {status.uptime}</span>
            </div>
          )}
          {status.tmuxSession && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Terminal className="w-3 h-3" />
              <span>Session: {status.tmuxSession}</span>
            </div>
          )}
          {status.ports && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Activity className="w-3 h-3" />
              <span>Ports: {status.ports.defaultPort}/{status.ports.udpPort}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function ServerStatusDot({ status }: { status: ServerStatus }) {
  const getColor = () => {
    switch (status.state) {
      case 'running':
        return 'bg-green-500';
      case 'starting':
        return 'bg-blue-500 animate-pulse';
      case 'stopping':
        return 'bg-yellow-500 animate-pulse';
      case 'stopped':
      default:
        return 'bg-muted-foreground/30';
    }
  };

  return (
    <div className={`w-2.5 h-2.5 rounded-full ${getColor()}`} title={status.state} />
  );
}