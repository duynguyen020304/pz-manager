'use client';

import { usePathname } from 'next/navigation';
import { User, ChevronRight, Home, Menu, X } from 'lucide-react';
import Link from 'next/link';
import { useSidebar } from '@/components/providers/sidebar-provider';
import { ThemeToggle } from '@/components/theme-toggle';

const breadcrumbMap: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/servers': 'Servers',
  '/schedules': 'Schedules',
  '/logs': 'Logs',
  '/settings': 'Settings',
};

export function TopHeader() {
  const pathname = usePathname();
  const { isMobileMenuOpen, toggleMobileMenu } = useSidebar();

  // Generate breadcrumbs
  const breadcrumbs = pathname === '/dashboard'
    ? [{ name: 'Dashboard', href: '/dashboard' }]
    : [
        { name: 'Home', href: '/dashboard' },
        { name: breadcrumbMap[pathname] || 'Page', href: pathname }
      ];

  return (
    <header className="h-16 border-b border-border bg-card/50 backdrop-blur-sm flex items-center justify-between px-4 lg:px-6 sticky top-0 z-30">
      {/* Left section: Hamburger + Breadcrumbs */}
      <div className="flex items-center gap-3">
        {/* Mobile hamburger menu */}
        <button
          onClick={toggleMobileMenu}
          className="lg:hidden p-2 rounded-md hover:bg-muted transition-colors"
          aria-label={isMobileMenuOpen ? 'Close menu' : 'Open menu'}
        >
          {isMobileMenuOpen ? (
            <X className="w-5 h-5 text-foreground" />
          ) : (
            <Menu className="w-5 h-5 text-foreground" />
          )}
        </button>

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
      </div>

      {/* Right section: Theme Toggle + User profile */}
      <div className="flex items-center gap-2">
        <ThemeToggle />
        <button
          className="p-2 rounded-md text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          aria-label="User profile"
        >
          <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
            <User className="w-4 h-4 text-primary" />
          </div>
        </button>
      </div>
    </header>
  );
}