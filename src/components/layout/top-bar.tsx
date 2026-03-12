'use client';

import { usePathname } from 'next/navigation';
import { useSyncExternalStore } from 'react';
import { useTheme } from 'next-themes';
import { Sun, Moon, Search, Circle } from 'lucide-react';
import { NotificationBell } from '@/components/agents/notification-bell';

/** Map pathname segments to human-readable breadcrumb labels */
const routeLabels: Record<string, string> = {
  '': 'The Office',
  applications: 'The War Room',
  research: 'The Library',
  communications: 'The Mail Room',
  preparation: 'The Briefing Room',
  contacts: 'The Rolodex',
  'cover-letters': 'The Print Shop',
  analytics: 'The Situation Room',
  agents: 'The Basement',
  'follow-ups': 'Follow-Ups',
};

const subscribe = () => () => {};
const getSnapshot = () => true;
const getServerSnapshot = () => false;

function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const mounted = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  if (!mounted) {
    return <div className="h-8 w-8" />;
  }

  return (
    <button
      type="button"
      onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
      className="flex items-center justify-center h-8 w-8 rounded-full text-parchment/70 hover:text-gold hover:bg-ivory/5 transition-colors duration-150"
      aria-label="Toggle theme"
    >
      <Sun className="h-4 w-4 hidden dark:block" />
      <Moon className="h-4 w-4 block dark:hidden" />
    </button>
  );
}

export function TopBar() {
  const pathname = usePathname();

  // Build breadcrumb from pathname
  const segments = pathname.split('/').filter(Boolean);
  const currentRoute = segments[0] || '';
  const pageLabel = routeLabels[currentRoute] || currentRoute.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

  // Open the command palette via keyboard shortcut dispatch
  const openCommandPalette = () => {
    const event = new KeyboardEvent('keydown', {
      key: 'k',
      metaKey: true,
      bubbles: true,
    });
    document.dispatchEvent(event);
  };

  return (
    <header className="flex items-center justify-between h-14 px-6 bg-navy/50 backdrop-blur-sm border-b border-gold/10 shrink-0">
      {/* Left: Breadcrumb */}
      <div className="flex items-center gap-2 min-w-0">
        <h1 className="font-heading text-base font-semibold text-ivory truncate">
          {pageLabel}
        </h1>
        {segments.length > 1 && (
          <>
            <span className="text-slate/50 text-sm">/</span>
            <span className="text-parchment/60 text-sm truncate">
              {segments.slice(1).join(' / ')}
            </span>
          </>
        )}
      </div>

      {/* Center: Intercom (Command Palette Trigger) */}
      <button
        type="button"
        onClick={openCommandPalette}
        className="hidden sm:flex items-center gap-2 px-4 py-1.5 rounded-full border border-gold/30 bg-boardroom/50 text-parchment/50 text-sm hover:border-gold/50 hover:text-parchment/70 transition-all duration-200 min-w-[220px] max-w-[320px]"
      >
        <Search className="h-3.5 w-3.5 text-gold/60 shrink-0" />
        <span className="truncate">Speak to the CEO...</span>
        <kbd className="ml-auto text-[10px] font-data text-slate/50 border border-ivory/10 rounded px-1 py-0.5 shrink-0">
          &#8984;K
        </kbd>
      </button>

      {/* Right: Actions */}
      <div className="flex items-center gap-1">
        {/* Live Notification Bell */}
        <NotificationBell />

        {/* System Status */}
        <div
          className="flex items-center justify-center h-8 w-8"
          title="System online"
        >
          <Circle className="h-2 w-2 fill-emerald text-emerald" />
        </div>

        {/* Theme Toggle */}
        <ThemeToggle />
      </div>
    </header>
  );
}
