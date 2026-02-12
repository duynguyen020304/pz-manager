'use client';

import { AlertTriangle, Info, AlertCircle } from 'lucide-react';
import { type ReactNode } from 'react';

export interface WarningBoxProps {
  title?: string;
  variant?: 'warning' | 'destructive' | 'info';
  children: ReactNode;
  className?: string;
}

const variantStyles = {
  warning: 'bg-yellow-500/10 border border-yellow-500/30 text-yellow-500',
  destructive: 'bg-destructive/10 border border-destructive/30 text-destructive',
  info: 'bg-blue-500/10 border border-blue-500/30 text-blue-500'
};

const variantIcons = {
  warning: AlertTriangle,
  destructive: AlertTriangle,
  info: Info
};

const titleStyles = {
  warning: 'text-yellow-500',
  destructive: 'text-destructive',
  info: 'text-blue-500'
};

const contentStyles = {
  warning: 'text-yellow-500/90',
  destructive: 'text-destructive/90',
  info: 'text-blue-500/90'
};

export function WarningBox({
  title,
  variant = 'warning',
  children,
  className = ''
}: WarningBoxProps) {
  const Icon = variantIcons[variant];

  return (
    <div className={`${variantStyles[variant]} rounded-lg p-4 ${className}`} role="alert">
      <div className="flex items-start gap-3">
        <Icon className="w-6 h-6 flex-shrink-0 mt-0.5" aria-hidden="true" />
        <div className="flex-1">
          {title && (
            <h4 className={`font-medium mb-2 ${titleStyles[variant]}`}>{title}</h4>
          )}
          <div className={`text-sm ${contentStyles[variant]}`}>
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
