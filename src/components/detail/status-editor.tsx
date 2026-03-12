'use client';

import { useState } from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { updateApplicationStatus } from '@/lib/actions';
import { STATUS_LABELS } from '@/types';
import type { Status } from '@/types';

const statuses: Status[] = [
  'applied',
  'in_progress',
  'interview',
  'under_review',
  'rejected',
  'offer',
];

interface StatusEditorProps {
  applicationId: number;
  currentStatus: Status;
}

export function StatusEditor({
  applicationId,
  currentStatus,
}: StatusEditorProps) {
  const [saved, setSaved] = useState(false);

  async function handleChange(newStatus: string) {
    const formData = new FormData();
    formData.set('id', String(applicationId));
    formData.set('status', newStatus);
    const result = await updateApplicationStatus(formData);
    if (result.error) {
      toast.error('Failed to update status', { description: result.error });
    } else if (result.success) {
      toast.success(`Status updated to ${STATUS_LABELS[newStatus as Status]}`, { id: 'status-update' });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    }
  }

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium text-muted-foreground">
        Status
      </label>
      <Select defaultValue={currentStatus} onValueChange={handleChange}>
        <SelectTrigger className="w-full bg-background border-border">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {statuses.map((s) => (
            <SelectItem key={s} value={s}>
              {STATUS_LABELS[s]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {saved && (
        <p className="text-xs text-emerald-400 animate-in fade-in">Saved</p>
      )}
    </div>
  );
}
