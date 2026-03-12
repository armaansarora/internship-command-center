'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';

const floors = [
  { href: '/', floor: '90F', label: 'The Office', subtitle: 'Dashboard' },
  { href: '/applications', floor: '85F', label: 'The War Room', subtitle: 'Pipeline' },
  { href: '/research', floor: '80F', label: 'The Library', subtitle: 'Research' },
  { href: '/communications', floor: '75F', label: 'The Mail Room', subtitle: 'Communications' },
  { href: '/preparation', floor: '70F', label: 'The Briefing Room', subtitle: 'Preparation' },
  { href: '/contacts', floor: '65F', label: 'The Rolodex', subtitle: 'Network' },
  { href: '/cover-letters', floor: '60F', label: 'The Print Shop', subtitle: 'Cover Letters' },
  { href: '/analytics', floor: '55F', label: 'The Situation Room', subtitle: 'Analytics' },
  { href: '/agents', floor: 'B1', label: 'The Basement', subtitle: 'Agent Operations' },
];

export function AppSidebar({ footer }: { footer?: React.ReactNode } = {}) {
  const pathname = usePathname();

  return (
    <aside className="hidden md:flex w-[260px] flex-col bg-navy text-ivory select-none">
      {/* Avatar & Identity */}
      <div className="px-6 pt-6 pb-4 flex flex-col items-center text-center">
        <div className="h-16 w-16 rounded-full border-2 border-gold flex items-center justify-center bg-boardroom shadow-[0_0_20px_rgba(201,168,76,0.15)]">
          <span className="font-heading text-xl font-bold text-gold">AA</span>
        </div>
        <h2 className="mt-3 font-heading text-base font-semibold text-ivory tracking-wide">
          Armaan Arora
        </h2>
        <p className="text-[11px] font-sans uppercase tracking-[0.15em] text-parchment/70">
          Chairman
        </p>
      </div>

      {/* Elevator Shaft Divider */}
      <div className="mx-6 border-t border-gold/20" />

      {/* Floor Navigation */}
      <nav className="flex-1 px-3 py-3 space-y-0.5 overflow-y-auto">
        {floors.map((item) => {
          const isActive =
            item.href === '/'
              ? pathname === '/'
              : pathname.startsWith(item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'group flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-sans transition-all duration-200 relative',
                isActive
                  ? 'bg-gold/15 text-gold'
                  : 'text-parchment/80 hover:text-ivory hover:bg-ivory/5'
              )}
            >
              {/* Illuminated dot for active floor */}
              {isActive && (
                <span className="absolute left-0 top-1/2 -translate-y-1/2 h-1.5 w-1.5 rounded-full bg-gold shadow-[0_0_6px_rgba(201,168,76,0.6)]" />
              )}

              {/* Floor number */}
              <span
                className={cn(
                  'font-data text-xs w-8 text-right shrink-0 tabular-nums',
                  isActive ? 'text-gold font-medium' : 'text-slate group-hover:text-parchment'
                )}
              >
                {item.floor}
              </span>

              {/* Vertical line separator */}
              <span
                className={cn(
                  'w-px h-5 shrink-0',
                  isActive ? 'bg-gold/40' : 'bg-ivory/10 group-hover:bg-ivory/20'
                )}
              />

              {/* Label */}
              <div className="min-w-0">
                <span className="block truncate text-[13px] leading-tight">
                  {item.label}
                </span>
                <span
                  className={cn(
                    'block text-[10px] leading-tight mt-0.5',
                    isActive ? 'text-gold/60' : 'text-slate/60'
                  )}
                >
                  {item.subtitle}
                </span>
              </div>
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="px-3 pb-2">
        {footer && <div className="px-3 py-2">{footer}</div>}
      </div>
      <div className="px-6 py-3 border-t border-gold/10 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="font-heading text-sm font-semibold text-gold tracking-wide">AA</span>
          <span className="text-[10px] text-slate font-data">v2.0</span>
        </div>
      </div>
    </aside>
  );
}
