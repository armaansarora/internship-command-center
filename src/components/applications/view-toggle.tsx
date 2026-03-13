// @ts-nocheck
'use client';

import { LayoutGrid, Table2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ViewToggleProps {
  view: 'table' | 'cards';
  onViewChange: (view: 'table' | 'cards') => void;
}

export function ViewToggle({ view, onViewChange }: ViewToggleProps) {
  return (
    <div className="inline-flex items-center rounded-lg border border-border bg-muted/50 p-0.5">
      <button
        onClick={() => onViewChange('table')}
        className={cn(
          'inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-all duration-200',
          view === 'table'
            ? 'bg-background text-foreground shadow-sm'
            : 'text-muted-foreground hover:text-foreground'
        )}
      >
        <Table2 className="h-4 w-4" />
        <span className="hidden sm:inline">Table</span>
      </button>
      <button
        onClick={() => onViewChange('cards')}
        className={cn(
          'inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-all duration-200',
          view === 'cards'
            ? 'bg-background text-foreground shadow-sm'
            : 'text-muted-foreground hover:text-foreground'
        )}
      >
        <LayoutGrid className="h-4 w-4" />
        <span className="hidden sm:inline">Cards</span>
      </button>
    </div>
  );
}
