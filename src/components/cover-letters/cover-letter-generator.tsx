'use client';

import { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  generateCoverLetterAction,
  type GenerationState,
} from '@/lib/cover-letter-actions';
import {
  Loader2,
  Copy,
  Check,
  FileText,
  Search,
} from 'lucide-react';
import { toast } from 'sonner';

interface AppOption {
  id: number;
  company: string;
  role: string;
  tier: string;
}

interface CoverLetterGeneratorProps {
  applications: AppOption[];
}

export function CoverLetterGenerator({
  applications,
}: CoverLetterGeneratorProps) {
  const [company, setCompany] = useState('');
  const [role, setRole] = useState('');
  const [state, setState] = useState<GenerationState>({ step: 'idle' });
  const [copied, setCopied] = useState(false);
  const [editedContent, setEditedContent] = useState('');

  const uniqueCompanies = Array.from(
    new Map(applications.map((a) => [a.company, a])).values()
  );

  const handleSelectApp = useCallback(
    (appId: string) => {
      const app = applications.find((a) => a.id === Number(appId));
      if (app) {
        setCompany(app.company);
        setRole(app.role);
      }
    },
    [applications]
  );

  async function handleGenerate() {
    if (!company || !role) return;

    setState({ step: 'researching' });

    // Small delay to show researching state
    await new Promise((r) => setTimeout(r, 300));
    setState({ step: 'generating' });

    const result = await generateCoverLetterAction(company, role);
    setState(result);
    if (result.error) {
      toast.error('Generation failed', { description: result.error });
    } else if (result.content) {
      toast.success('Cover letter generated');
      setEditedContent(result.content);
    }
  }

  async function handleCopy() {
    await navigator.clipboard.writeText(editedContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-border bg-card p-6 space-y-4">
        <div className="space-y-2">
          <Label>Select from applications</Label>
          <Select onValueChange={handleSelectApp}>
            <SelectTrigger className="bg-background border-border">
              <SelectValue placeholder="Pick an application..." />
            </SelectTrigger>
            <SelectContent>
              {uniqueCompanies.map((app) => (
                <SelectItem key={app.id} value={String(app.id)}>
                  {app.company} — {app.role}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label htmlFor="cl-company">Company</Label>
            <Input
              id="cl-company"
              value={company}
              onChange={(e) => setCompany(e.target.value)}
              placeholder="e.g., JPMorgan Chase"
              className="bg-background border-border"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="cl-role">Role</Label>
            <Input
              id="cl-role"
              value={role}
              onChange={(e) => setRole(e.target.value)}
              placeholder="e.g., Summer Analyst"
              className="bg-background border-border"
            />
          </div>
        </div>

        <Button
          onClick={handleGenerate}
          disabled={
            !company ||
            !role ||
            state.step === 'researching' ||
            state.step === 'generating'
          }
          className="w-full"
        >
          {state.step === 'researching' && (
            <>
              <Search className="h-4 w-4 mr-2 animate-pulse" />
              Researching {company}...
            </>
          )}
          {state.step === 'generating' && (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Generating cover letter...
            </>
          )}
          {(state.step === 'idle' || state.step === 'done' || state.step === 'error') && (
            <>
              <FileText className="h-4 w-4 mr-2" />
              Generate Cover Letter
            </>
          )}
        </Button>
      </div>

      {state.step === 'error' && (
        <div className="rounded-lg border border-red-500/50 bg-card p-4">
          <p className="text-sm text-red-400">{state.error}</p>
        </div>
      )}

      {state.step === 'done' && editedContent && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium">
              Cover Letter — {company}
            </h3>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                className="gap-1.5"
                onClick={handleCopy}
              >
                {copied ? (
                  <>
                    <Check className="h-3.5 w-3.5" />
                    Copied
                  </>
                ) : (
                  <>
                    <Copy className="h-3.5 w-3.5" />
                    Copy
                  </>
                )}
              </Button>
            </div>
          </div>
          <Textarea
            value={editedContent}
            onChange={(e) => setEditedContent(e.target.value)}
            className="bg-background border-border min-h-[400px] font-mono text-sm leading-relaxed resize-y"
          />
        </div>
      )}
    </div>
  );
}
