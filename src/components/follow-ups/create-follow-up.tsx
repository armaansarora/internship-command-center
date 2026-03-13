// @ts-nocheck
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Plus } from 'lucide-react';
import { toast } from 'sonner';
import { createFollowUp } from '@/lib/follow-up-actions';
import { suggestFollowUpDays } from '@/lib/tier-utils';

interface CreateFollowUpProps {
  applicationId: number;
  tier: string;
  status: string;
}

export function CreateFollowUp({
  applicationId,
  tier,
  status,
}: CreateFollowUpProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const suggestedDays = suggestFollowUpDays(tier, status);
  const suggestedDate = new Date();
  suggestedDate.setDate(suggestedDate.getDate() + suggestedDays);
  const defaultDate = suggestedDate.toISOString().split('T')[0];

  async function handleSubmit(formData: FormData) {
    setSubmitting(true);
    setError(null);
    formData.set('applicationId', String(applicationId));
    const result = await createFollowUp(formData);
    setSubmitting(false);

    if ('error' in result) {
      setError(result.error);
      toast.error('Failed to create follow-up', { description: result.error });
      return;
    }

    toast.success('Follow-up scheduled');
    setOpen(false);
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline" className="gap-1.5">
          <Plus className="h-3.5 w-3.5" />
          Add Follow-Up
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Schedule Follow-Up</DialogTitle>
        </DialogHeader>
        <form action={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="dueAt">Due Date</Label>
            <Input
              id="dueAt"
              name="dueAt"
              type="date"
              defaultValue={defaultDate}
              required
              className="bg-background border-border"
            />
            <p className="text-xs text-muted-foreground">
              Suggested: {suggestedDays} days based on tier and status
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="note">Note (optional)</Label>
            <Textarea
              id="note"
              name="note"
              placeholder="e.g., Send thank-you email..."
              className="bg-background border-border min-h-[60px]"
            />
          </div>

          {error && <p className="text-sm text-red-400">{error}</p>}

          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? 'Scheduling...' : 'Schedule'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
