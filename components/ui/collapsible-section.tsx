'use client';

import React from 'react';
import { ChevronDown, ChevronUp, LucideIcon } from 'lucide-react';

interface CollapsibleSectionProps {
  title: string;
  icon?: LucideIcon;
  description?: string;
  defaultExpanded?: boolean;
  badge?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

export function CollapsibleSection({
  title,
  icon: Icon,
  description,
  defaultExpanded = false,
  badge,
  children,
  className = '',
}: CollapsibleSectionProps) {
  const [isExpanded, setIsExpanded] = React.useState(defaultExpanded);

  return (
    <div className={`border border-border rounded-lg overflow-hidden bg-card ${className}`}>
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center gap-3 p-4 hover:bg-muted/30 transition-colors text-left"
        aria-expanded={isExpanded}
      >
        {Icon && (
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
            <Icon className="w-5 h-5 text-primary" />
          </div>
        )}

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="font-medium text-foreground">{title}</h3>
            {badge}
          </div>
          {description && (
            <p className="text-sm text-muted-foreground truncate">{description}</p>
          )}
        </div>

        <div className="flex-shrink-0">
          {isExpanded ? (
            <ChevronUp className="w-5 h-5 text-muted-foreground" />
          ) : (
            <ChevronDown className="w-5 h-5 text-muted-foreground" />
          )}
        </div>
      </button>

      <div
        className={`overflow-hidden transition-all duration-200 ${
          isExpanded ? 'max-h-[2000px] opacity-100' : 'max-h-0 opacity-0'
        }`}
      >
        <div className="p-4 pt-0 border-t border-border">{children}</div>
      </div>
    </div>
  );
}

export default CollapsibleSection;
