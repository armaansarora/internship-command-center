'use client';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import type { CoverLetter } from '@/db/schema';

interface VersionCompareProps {
  versionA: CoverLetter;
  versionB: CoverLetter;
  onClose: () => void;
}

export function VersionCompare({
  versionA,
  versionB,
  onClose,
}: VersionCompareProps) {
  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Compare Versions</DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-4 overflow-auto flex-1 min-h-0">
          <VersionColumn version={versionA} label="Version A" />
          <VersionColumn version={versionB} label="Version B" />
        </div>
      </DialogContent>
    </Dialog>
  );
}

function VersionColumn({
  version,
  label,
}: {
  version: CoverLetter;
  label: string;
}) {
  const generatedDate =
    version.generatedAt instanceof Date
      ? version.generatedAt
      : new Date(version.generatedAt as unknown as number);

  return (
    <div className="space-y-3 min-w-0">
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-muted-foreground">
            {label}
          </span>
          {version.isActive && (
            <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30 text-xs">
              Active
            </Badge>
          )}
        </div>
        <p className="text-sm font-medium">{version.company}</p>
        <p className="text-xs text-muted-foreground">
          {version.role} &middot;{' '}
          {format(generatedDate, 'MMM d, yyyy h:mm a')}
        </p>
      </div>

      <div className="rounded-lg border border-border bg-background p-4 text-sm leading-relaxed whitespace-pre-wrap">
        {version.content}
      </div>
    </div>
  );
}
