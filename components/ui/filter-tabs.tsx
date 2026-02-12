'use client';

export interface FilterTab {
  id: string;
  label: string;
  count: number;
}

export interface FilterTabsProps {
  tabs: FilterTab[];
  activeTab: string | null;
  onChange: (tabId: string | null) => void;
  showAll?: boolean;
  allLabel?: string;
  allCount?: number;
  className?: string;
}

export function FilterTabs({
  tabs,
  activeTab,
  onChange,
  showAll = true,
  allLabel = 'All',
  allCount,
  className = ''
}: FilterTabsProps) {
  return (
    <div className={`flex flex-wrap gap-2 ${className}`} role="tablist">
      {showAll && (
        <button
          onClick={() => onChange(null)}
          className={`px-3 py-1 rounded-full text-sm transition-colors ${
            activeTab === null
              ? 'bg-primary text-primary-foreground'
              : 'bg-muted text-muted-foreground hover:text-foreground'
          }`}
          role="tab"
          aria-selected={activeTab === null}
        >
          {allLabel} {allCount !== undefined && `(${allCount})`}
        </button>
      )}
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onChange(tab.id)}
          className={`px-3 py-1 rounded-full text-sm transition-colors ${
            activeTab === tab.id
              ? 'bg-primary text-primary-foreground'
              : 'bg-muted text-muted-foreground hover:text-foreground'
          }`}
          role="tab"
          aria-selected={activeTab === tab.id}
        >
          {tab.label} ({tab.count})
        </button>
      ))}
    </div>
  );
}
