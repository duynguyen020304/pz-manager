'use client';

import { CheckCircle2, type LucideIcon } from 'lucide-react';
import { type ReactNode } from 'react';

export interface SelectableCardProps {
  children: ReactNode;
  selected: boolean;
  onClick: () => void;
  disabled?: boolean;
  className?: string;
  icon?: LucideIcon;
  iconColor?: string;
  iconBg?: string;
}

export function SelectableCard({
  children,
  selected,
  onClick,
  disabled = false,
  className = '',
  icon: Icon,
  iconColor,
  iconBg
}: SelectableCardProps) {
  const baseStyles = 'w-full flex items-center gap-4 p-4 rounded-lg border transition-all text-left';
  const stateStyles = selected
    ? 'border-primary bg-primary/5'
    : 'border-border hover:border-primary/30 hover:bg-muted/30';
  const disabledStyles = disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer';

  return (
    <button
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
      className={`${baseStyles} ${stateStyles} ${disabledStyles} ${className}`}
      aria-pressed={selected}
      aria-disabled={disabled}
    >
      {Icon && (
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${iconBg || 'bg-muted/50'}`}>
          <Icon className={`w-5 h-5 ${iconColor || 'text-foreground'}`} />
        </div>
      )}
      {children}
      {selected && <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0" />}
    </button>
  );
}
