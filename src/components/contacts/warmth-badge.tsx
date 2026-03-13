// @ts-nocheck
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { WarmthLevel } from '@/lib/contacts';

const warmthStyles: Record<WarmthLevel, string> = {
  hot: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
  warm: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  cold: 'bg-zinc-500/20 text-zinc-400 border-zinc-500/30',
};

const warmthLabels: Record<WarmthLevel, string> = {
  hot: 'Hot',
  warm: 'Warm',
  cold: 'Cold',
};

export function WarmthBadge({ level }: { level: WarmthLevel }) {
  return (
    <Badge variant="outline" className={cn('text-xs font-medium', warmthStyles[level])}>
      {warmthLabels[level]}
    </Badge>
  );
}
