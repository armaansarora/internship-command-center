// @ts-nocheck
'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  generateFollowUpEmail,
  type TemplateType,
} from '@/lib/follow-up-email-actions';
import { sendFollowUpEmail } from '@/lib/gmail-actions';
import { Mail, Loader2, Copy, Check, Send } from 'lucide-react';
import { toast } from 'sonner';

interface DraftEmailProps {
  company: string;
  role: string;
  status: string;
  contactName: string | null;
  contactEmail: string | null;
  notes: string | null;
}

const TEMPLATE_OPTIONS: Array<{ value: TemplateType; label: string }> = [
  { value: 'follow-up', label: 'Standard Follow-Up' },
  { value: 'thank-you', label: 'Thank You (Post-Interview)' },
  { value: 'cold-outreach', label: 'Cold Outreach' },
  { value: 'referral-nudge', label: 'Referral Nudge' },
  { value: 'post-interview', label: 'Post-Interview Check-In' },
];

export function DraftEmail({
  company,
  role,
  status,
  contactName,
  contactEmail,
  notes,
}: DraftEmailProps) {
  const [draft, setDraft] = useState('');
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [templateType, setTemplateType] = useState<TemplateType>('follow-up');

  // Auto-select "Thank You" when application status is 'interview'
  useEffect(() => {
    if (status === 'interview') {
      setTemplateType('thank-you');
    }
  }, [status]);

  async function handleGenerate() {
    setLoading(true);
    setError(null);
    const result = await generateFollowUpEmail(
      company,
      role,
      status,
      contactName,
      notes,
      templateType,
    );
    setLoading(false);
    if ('error' in result) {
      setError(result.error);
    }
    if (result.content) {
      setDraft(result.content);
    }
  }

  async function handleCopy() {
    await navigator.clipboard.writeText(draft);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function handleSend() {
    if (!contactEmail || !draft) return;
    setSending(true);
    const subject = `Follow-up: ${role} at ${company}`;
    const result = await sendFollowUpEmail(
      company,
      role,
      contactEmail,
      subject,
      draft
    );
    setSending(false);
    if ('error' in result) {
      toast.error(`Failed to send: ${result.error}`, { id: 'send-email' });
    } else {
      toast.success('Email sent!', { id: 'send-email' });
      setDraft('');
    }
  }

  if (!draft) {
    return (
      <div className="space-y-2">
        <Select
          value={templateType}
          onValueChange={(v) => setTemplateType(v as TemplateType)}
        >
          <SelectTrigger className="h-8 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {TEMPLATE_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button
          size="sm"
          variant="outline"
          className="gap-1.5 w-full"
          onClick={handleGenerate}
          disabled={loading}
        >
          {loading ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Mail className="h-3.5 w-3.5" />
          )}
          {loading ? 'Drafting...' : 'Draft Follow-Up Email'}
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-muted-foreground">
          Draft Email
        </span>
        <div className="flex gap-1.5">
          <Button
            size="sm"
            variant="ghost"
            className="h-6 text-xs gap-1"
            onClick={handleCopy}
          >
            {copied ? (
              <Check className="h-3 w-3" />
            ) : (
              <Copy className="h-3 w-3" />
            )}
            {copied ? 'Copied' : 'Copy'}
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="h-6 text-xs"
            onClick={handleGenerate}
            disabled={loading}
          >
            Regenerate
          </Button>
          <Button
            size="sm"
            variant="default"
            className="h-6 text-xs gap-1"
            onClick={handleSend}
            disabled={sending || !contactEmail}
            title={!contactEmail ? 'Add contact email to send' : 'Send via Gmail'}
          >
            {sending ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <Send className="h-3 w-3" />
            )}
            {sending ? 'Sending...' : 'Send via Gmail'}
          </Button>
        </div>
      </div>
      <Select
        value={templateType}
        onValueChange={(v) => setTemplateType(v as TemplateType)}
      >
        <SelectTrigger className="h-7 text-xs">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {TEMPLATE_OPTIONS.map((opt) => (
            <SelectItem key={opt.value} value={opt.value}>
              {opt.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Textarea
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        className="bg-background border-border min-h-[150px] text-sm resize-y"
      />
      {error && <p className="text-xs text-red-400">{error}</p>}
    </div>
  );
}
