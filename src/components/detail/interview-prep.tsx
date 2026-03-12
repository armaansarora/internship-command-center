'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  generateInterviewPrepAction,
  regenerateInterviewPrepAction,
} from '@/lib/interview-prep-actions';
import {
  Loader2,
  ChevronDown,
  ChevronRight,
  RefreshCw,
  Sparkles,
  CheckCircle2,
} from 'lucide-react';
import { toast } from 'sonner';

interface InterviewPrepSectionProps {
  applicationId: number;
  company: string;
  role: string;
  existingPrep: string | null;
}

export function InterviewPrepSection({
  applicationId,
  company,
  role,
  existingPrep,
}: InterviewPrepSectionProps) {
  const [content, setContent] = useState<string | null>(existingPrep);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState(false);

  async function handleGenerate() {
    setLoading(true);
    const result = await generateInterviewPrepAction(
      applicationId,
      company,
      role
    );

    if ('error' in result) {
      toast.error('Failed to generate interview prep', {
        description: result.error,
        id: 'interview-prep',
      });
    } else {
      setContent(result.content);
      setExpanded(true);
      toast.success('Interview prep generated', { id: 'interview-prep' });
    }
    setLoading(false);
  }

  async function handleRegenerate() {
    setLoading(true);
    const result = await regenerateInterviewPrepAction(
      applicationId,
      company,
      role
    );

    if ('error' in result) {
      toast.error('Failed to regenerate interview prep', {
        description: result.error,
        id: 'interview-prep',
      });
    } else {
      setContent(result.content);
      setExpanded(true);
      toast.success('Interview prep regenerated', { id: 'interview-prep' });
    }
    setLoading(false);
  }

  // No prep exists yet
  if (!content) {
    return (
      <Button
        size="sm"
        variant="outline"
        className="w-full gap-2"
        onClick={handleGenerate}
        disabled={loading}
      >
        {loading ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : (
          <Sparkles className="h-3.5 w-3.5" />
        )}
        {loading ? 'Generating prep...' : 'Generate Interview Prep'}
      </Button>
    );
  }

  // Prep exists -- show collapsed or expanded
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex items-center gap-2 hover:text-foreground transition-colors"
        >
          {expanded ? (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          )}
          <div className="flex items-center gap-1.5">
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
            <span className="text-sm font-medium">Interview Prep Ready</span>
          </div>
        </button>

        <Button
          size="sm"
          variant="ghost"
          className="h-7 px-2 gap-1 text-xs"
          onClick={handleRegenerate}
          disabled={loading}
        >
          {loading ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : (
            <RefreshCw className="h-3 w-3" />
          )}
          Re-generate
        </Button>
      </div>

      {expanded && (
        <div className="space-y-4 text-sm">
          <PrepContent content={content} />
        </div>
      )}
    </div>
  );
}

/**
 * Parse and render interview prep markdown content into structured sections.
 */
function PrepContent({ content }: { content: string }) {
  const sections = parseMarkdownSections(content);

  return (
    <div className="space-y-4">
      {sections.map((section, idx) => (
        <div key={idx} className="space-y-1.5">
          <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
            {section.title}
          </h4>
          <div className="space-y-1">
            {section.items.map((item, i) => (
              <p
                key={i}
                className="text-sm text-muted-foreground leading-relaxed"
              >
                {item}
              </p>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

interface Section {
  title: string;
  items: string[];
}

function parseMarkdownSections(content: string): Section[] {
  const lines = content.split('\n');
  const sections: Section[] = [];
  let current: Section | null = null;

  for (const line of lines) {
    const heading = line.match(/^##\s+(.+)/);
    if (heading) {
      if (current) sections.push(current);
      current = { title: heading[1], items: [] };
      continue;
    }

    if (!current) continue;

    const trimmed = line.trim();
    if (!trimmed) continue;

    // Remove markdown list markers
    const cleaned = trimmed.replace(/^[-*]\s+/, '').replace(/^\d+\.\s+/, '');
    if (cleaned) {
      current.items.push(cleaned);
    }
  }

  if (current) sections.push(current);
  return sections;
}
