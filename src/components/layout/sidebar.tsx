'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTheme } from 'next-themes';
import {
  LayoutDashboard,
  Briefcase,
  Users,
  FileText,
  Bell,
  Sun,
  Moon,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const navItems = [
  { href: '/', label: 'Overview', icon: LayoutDashboard },
  { href: '/applications', label: 'Applications', icon: Briefcase },
  { href: '/contacts', label: 'Contacts', icon: Users },
  { href: '/cover-letters', label: 'Cover Letter Lab', icon: FileText },
  { href: '/follow-ups', label: 'Follow-Ups', icon: Bell },
];

function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();

  return (
    <button
      type="button"
      onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
      className="flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-sidebar-accent/50 transition-colors duration-150 w-full"
      aria-label="Toggle theme"
    >
      <Sun className="h-4 w-4 hidden dark:block" />
      <Moon className="h-4 w-4 block dark:hidden" />
      <span className="hidden dark:inline">Light mode</span>
      <span className="inline dark:hidden">Dark mode</span>
    </button>
  );
}

export function AppSidebar({ footer }: { footer?: React.ReactNode } = {}) {
  const pathname = usePathname();

  return (
    <aside className="hidden md:flex w-64 flex-col border-r border-sidebar-border bg-sidebar">
      {/* Brand area */}
      <div className="px-6 py-5">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg gradient-brand">
            <span className="text-sm font-bold text-white">IC</span>
          </div>
          <div>
            <h1 className="text-sm font-semibold text-foreground tracking-tight">
              Command Center
            </h1>
            <p className="text-[11px] text-muted-foreground leading-tight">
              Internship Tracker
            </p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 space-y-0.5">
        {navItems.map((item) => {
          const isActive =
            item.href === '/'
              ? pathname === '/'
              : pathname.startsWith(item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors duration-150 relative',
                isActive
                  ? 'bg-primary/10 text-primary border-l-2 border-primary -ml-px'
                  : 'text-muted-foreground hover:text-foreground hover:bg-sidebar-accent/50'
              )}
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="px-3 pb-2">
        <ThemeToggle />
      </div>
      <div className="px-6 py-4 border-t border-sidebar-border">
        <p className="text-xs text-muted-foreground">Armaan Arora</p>
        <p className="text-xs text-muted-foreground">NYU Schack &apos;28</p>
        {footer && <div className="mt-3">{footer}</div>}
      </div>
    </aside>
  );
}
