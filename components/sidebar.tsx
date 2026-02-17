'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Server,
  Clock,
  FileText,
  Settings,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Shield,
  User,
  Users,
  UserCog,
  Activity,
  X
} from 'lucide-react';
import { logout } from '@/lib/api';
import { useRouter } from 'next/navigation';
import { useSidebar } from '@/components/providers/sidebar-provider';

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Servers', href: '/servers', icon: Server },
  { name: 'Monitor', href: '/monitor', icon: Activity },
  { name: 'Schedules', href: '/schedules', icon: Clock },
  { name: 'Logs', href: '/logs', icon: FileText },
  { name: 'Accounts', href: '/accounts', icon: Users },
  { name: 'Roles', href: '/roles', icon: UserCog },
  { name: 'Settings', href: '/settings', icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
  const { isCollapsed, toggle, isMobileMenuOpen, setMobileMenuOpen } = useSidebar();
  const router = useRouter();

  const shouldShowCollapsed = !isMobileMenuOpen && isCollapsed;

  const handleLogout = async () => {
    try {
      await logout();
      router.push('/');
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  return (
    <>
      {/* Mobile overlay */}
      {isMobileMenuOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/50 z-40"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`inset-y-0 left-0 z-50 bg-card border-r border-border transition-all duration-300 ease-in-out shrink-0 ${
          shouldShowCollapsed ? 'w-16' : 'w-60'
        } static translate-x-0 max-lg:fixed max-lg:-translate-x-full ${
          isMobileMenuOpen ? '!translate-x-0' : ''
        }`}
      >
        <div className="h-full flex flex-col">
          {/* Logo */}
          <div className={`p-3 border-b border-border transition-all duration-300 ${shouldShowCollapsed ? 'px-3' : 'px-6'}`}>
            <div className={`flex items-center ${shouldShowCollapsed ? 'justify-center' : 'justify-between'}`}>
              <div className={`flex items-center gap-3 ${shouldShowCollapsed ? 'justify-center' : ''}`}>
                <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center flex-shrink-0">
                  <Shield className="w-5 h-5 text-primary-foreground" />
                </div>
                {!shouldShowCollapsed && (
                  <div>
                    <h1 className="text-lg font-bold text-foreground leading-tight">
                      Zomboid
                    </h1>
                    <p className="text-[10px] text-muted-foreground">
                      Backup Manager
                    </p>
                  </div>
                )}
              </div>
              {isMobileMenuOpen && (
                <button
                  onClick={() => setMobileMenuOpen(false)}
                  className="lg:hidden p-2 rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
                  aria-label="Close sidebar"
                >
                  <X className="w-5 h-5" />
                </button>
              )}
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-3 space-y-1">
            {navigation.map((item) => {
              const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
              const Icon = item.icon;
              
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                  title={shouldShowCollapsed ? item.name : undefined}
                  className={`flex items-center rounded-md transition-all duration-200 group relative min-h-[44px] ${
                    shouldShowCollapsed ? 'justify-center px-2' : 'justify-start gap-3 px-4'
                  } ${
                    isActive
                      ? 'bg-primary/10 text-primary border border-primary/20'
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground border border-transparent'
                  }`}
                >
                  <Icon className="w-5 h-5 flex-shrink-0" />
                  {!shouldShowCollapsed && (
                    <span className="font-medium text-sm leading-none">{item.name}</span>
                  )}
                  {shouldShowCollapsed && (
                    <div className="absolute left-full ml-2 px-2 py-1 bg-card border border-border rounded-md text-xs text-foreground opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-50 pointer-events-none">
                      {item.name}
                    </div>
                  )}
                </Link>
              );
            })}
          </nav>

          {/* Footer - User profile with collapse and logout */}
          <div className="p-3 border-t border-border">
            {shouldShowCollapsed ? (
              <div className="flex flex-col items-center gap-2">
                {/* Collapse button */}
                <button
                  onClick={toggle}
                  className="w-full flex justify-center py-2 rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
                  title="Expand sidebar"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
                {/* User avatar */}
                <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                  <User className="w-4 h-4 text-primary" />
                </div>
                {/* Logout button */}
                <button
                  onClick={handleLogout}
                  className="w-full flex justify-center py-2 rounded-md text-muted-foreground hover:bg-destructive/10 hover:text-destructive group relative"
                  title="Logout"
                >
                  <LogOut className="w-4 h-4" />
                  <div className="absolute left-full ml-2 px-2 py-1 bg-card border border-border rounded-md text-xs text-foreground opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-50 pointer-events-none">
                    Logout
                  </div>
                </button>
              </div>
            ) : (
              <div className="flex items-center justify-between">
                {/* User profile section */}
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                    <User className="w-4 h-4 text-primary" />
                  </div>
                  <span className="font-medium text-sm text-foreground">Admin</span>
                </div>

                {/* Action buttons */}
                <div className="flex items-center gap-1">
                  {/* Collapse button - icon only */}
                  <button
                    onClick={toggle}
                    className="p-2 rounded-md text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                    title="Collapse sidebar"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>

                  {/* Logout button - icon only */}
                  <button
                    onClick={handleLogout}
                    className="p-2 rounded-md text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
                    title="Logout"
                  >
                    <LogOut className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </aside>
    </>
  );
}