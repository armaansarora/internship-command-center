// @ts-nocheck
'use client';

import { useState } from 'react';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { updateApplicationNotes } from '@/lib/actions';

interface NotesEditorProps {
  applicationId: number;
  currentNotes: string | null;
}

export function NotesEditor({ applicationId, currentNotes }: NotesEditorProps) {
  const [notes, setNotes] = useState(currentNotes || '');
  const [saved, setSaved] = useState(false);
  const isDirty = notes !== (currentNotes || '');

  async function handleSave() {
    const formData = new FormData();
    formData.set('id', String(applicationId));
    formData.set('notes', notes);
    const result = await updateApplicationNotes(formData);
    if ('error' in result) {
      toast.error('Failed to save notes', { description: result.error });
    } else if (result.success) {
      toast.success('Notes saved', { id: 'notes-save' });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium">Notes</label>
        {saved && (
          <span className="text-xs text-emerald-400 animate-in fade-in">
            Saved
          </span>
        )}
      </div>
      <Textarea
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        placeholder="Add notes about this application..."
        className="min-h-[120px] bg-background border-border resize-y"
      />
      {isDirty && (
        <Button size="sm" onClick={handleSave}>
          Save Notes
        </Button>
      )}
    </div>
  );
}
