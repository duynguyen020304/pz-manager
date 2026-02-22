'use client';

import { usePathname } from 'next/navigation';
import { User, ChevronRight, Home, Menu, X } from 'lucide-react';
import Link from 'next/link';
import { useSidebar } from '@/components/providers/sidebar-provider';
import { ThemeToggle } from '@/components/theme-toggle';
import { useTranslations } from 'next-intl';
import { LanguageSwitcher } from './language-switcher';

export function TopHeader() {
  const pathname = usePathname();
  const { isMobileMenuOpen, toggleMobileMenu } = useSidebar();
  const t = useTranslations();
  const tb = useTranslations('breadcrumbs');
  const tc = useTranslations('common');

  // Breadcrumb mapping using translations
  const getBreadcrumbName = (path: string): string => {
    switch (path) {
      case '/dashboard': return tb('dashboard');
      case '/servers': return tb('servers');
      case '/schedules': return tb('schedules');
      case '/logs': return tb('logs');
      case '/settings': return tb('settings');
      case '/accounts': return t('navigation.accounts');
      case '/roles': return t('navigation.roles');
      case '/tokens': return t('navigation.tokens');
      case '/monitor': return t('navigation.monitor');
      case '/backups': return t('navigation.backups');
      case '/rollback': return t('navigation.rollback');
      default: return tc('page');
    }
  };

  // Generate breadcrumbs
  const breadcrumbs = pathname === '/dashboard'
    ? [{ name: tb('dashboard'), href: '/dashboard' }]
    : [
        { name: tb('home'), href: '/dashboard' },
        { name: getBreadcrumbName(pathname), href: pathname }
      ];

  return (
    <header className="h-16 border-b border-border bg-card/50 backdrop-blur-sm flex items-center justify-between px-4 lg:px-6 sticky top-0 z-30">
      {/* Left section: Hamburger + Breadcrumbs */}
      <div className="flex items-center gap-3">
        {/* Mobile hamburger menu */}
        <button
          onClick={toggleMobileMenu}
          className="lg:hidden p-2 rounded-md hover:bg-muted transition-colors"
          aria-label={isMobileMenuOpen ? tc('close') : tc('open')}
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

      {/* Right section: Language Switcher + Theme Toggle + User profile */}
      <div className="flex items-center gap-2">
        <LanguageSwitcher />
        <ThemeToggle />
        <button
          className="p-2 rounded-md text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          aria-label={t('navigation.accounts')}
        >
          <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
            <User className="w-4 h-4 text-primary" />
          </div>
        </button>
      </div>
    </header>
  );
}
