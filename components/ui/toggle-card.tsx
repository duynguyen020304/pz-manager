'use client';

import React from 'react';
import { LucideIcon } from 'lucide-react';

interface ToggleCardProps {
  label: string;
  description?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  icon?: LucideIcon;
  disabled?: boolean;
  className?: string;
}

export function ToggleCard({
  label,
  description,
  checked,
  onChange,
  icon: Icon,
  disabled = false,
  className = '',
}: ToggleCardProps) {
  const handleClick = () => {
    if (disabled) return;
    onChange(!checked);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (disabled) return;
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onChange(!checked);
    }
  };

  return (
    <div
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      role="switch"
      aria-checked={checked}
      aria-disabled={disabled}
      tabIndex={disabled ? -1 : 0}
      className={`flex items-center gap-3 p-3 bg-card border rounded-lg cursor-pointer transition-all hover:border-primary/30 focus:outline-none focus:ring-2 focus:ring-primary/50 ${
        disabled ? 'opacity-50 cursor-not-allowed' : ''
      } ${checked ? 'border-primary/30' : 'border-border'} ${className}`}
    >
      {/* Icon */}
      {Icon && (
        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
          <Icon className="w-5 h-5 text-primary" />
        </div>
      )}

      {/* Label and description */}
      <div className="flex-1 min-w-0">
        <div className="font-medium text-sm text-foreground truncate">{label}</div>
        {description && (
          <div className="text-xs text-muted-foreground truncate">{description}</div>
        )}
      </div>

      {/* iOS-style toggle switch */}
      <div
        className={`relative w-12 h-7 rounded-full transition-colors duration-200 flex-shrink-0 ${
          checked ? 'bg-primary' : 'bg-muted'
        }`}
      >
        <div
          className={`absolute top-1 w-5 h-5 rounded-full bg-card shadow-md transition-transform duration-200 ${
            checked ? 'translate-x-6' : 'translate-x-1'
          }`}
        />
      </div>
    </div>
  );
}

export default ToggleCard;
