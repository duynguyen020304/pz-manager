'use client';

import { usePathname } from 'next/navigation';
import { Search, User, ChevronRight, Home } from 'lucide-react';
import Link from 'next/link';

const breadcrumbMap: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/servers': 'Servers',
  '/schedules': 'Schedules',
  '/logs': 'Logs',
  '/settings': 'Settings',
};

export function TopHeader() {
  const pathname = usePathname();
  
  // Generate breadcrumbs
  const breadcrumbs = pathname === '/dashboard' 
    ? [{ name: 'Dashboard', href: '/dashboard' }]
    : [
        { name: 'Home', href: '/dashboard' },
        { name: breadcrumbMap[pathname] || 'Page', href: pathname }
      ];

  return (
    <header className="h-16 border-b border-border bg-card/50 backdrop-blur-sm flex items-center justify-between px-6 sticky top-0 z-30">
      {/* Breadcrumbs */}
      <nav className="flex items-center gap-2 text-sm">
        {breadcrumbs.map((crumb, index) => (
          <div key={crumb.href} className="flex items-center gap-2">
            {index > 0 && (
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
            )}
            {index === breadcrumbs.length - 1 ? (
              <span className="font-medium text-foreground">{crumb.name}</span>
            ) : (
              <Link 
                href={crumb.href}
                className="text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
              >
                {index === 0 && <Home className="w-4 h-4" />}
                {crumb.name}
              </Link>
            )}
          </div>
        ))}
      </nav>

      {/* Right section */}
      <div className="flex items-center gap-4">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search..."
            className="w-56 pl-10 pr-4 py-1.5 bg-background border border-border rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
          />
        </div>

        {/* User profile */}
        <button className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-muted transition-colors">
          <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
            <User className="w-4 h-4 text-primary" />
          </div>
          <div className="hidden sm:block text-left">
            <p className="text-sm font-medium text-foreground">Admin</p>
            <p className="text-xs text-muted-foreground">Administrator</p>
          </div>
        </button>
      </div>
    </header>
  );
}