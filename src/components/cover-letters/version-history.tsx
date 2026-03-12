'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { setActiveCoverLetterAction } from '@/lib/cover-letter-actions';
import { VersionCompare } from './version-compare';
import { formatDistanceToNow } from 'date-fns';
import { Check, ChevronDown, ChevronRight, GitCompare, Star } from 'lucide-react';
import { toast } from 'sonner';
import type { CoverLetter } from '@/db/schema';

interface VersionHistoryProps {
  versions: Record<string, CoverLetter[]>;
}

export function VersionHistory({ versions }: VersionHistoryProps) {
  const [expandedCompanies, setExpandedCompanies] = useState<Set<string>>(new Set());
  const [selectedForCompare, setSelectedForCompare] = useState<CoverLetter[]>([]);
  const [showCompare, setShowCompare] = useState(false);

  const companies = Object.keys(versions);

  if (companies.length === 0) {
    return (
      <p className="text-sm text-muted-foreground py-8 text-center">
        Generated cover letters will appear here
      </p>
    );
  }

  function toggleCompany(company: string) {
    setExpandedCompanies((prev) => {
      const next = new Set(prev);
      if (next.has(company)) {
        next.delete(company);
      } else {
        next.add(company);
      }
      return next;
    });
  }

  function toggleSelect(letter: CoverLetter) {
    setSelectedForCompare((prev) => {
      const exists = prev.find((l) => l.id === letter.id);
      if (exists) {
        return prev.filter((l) => l.id !== letter.id);
      }
      if (prev.length >= 2) {
        // Replace the oldest selection
        return [prev[1], letter];
      }
      return [...prev, letter];
    });
  }

  async function handleSetActive(id: number) {
    const result = await setActiveCoverLetterAction(id);
    if (result.success) {
      toast.success('Cover letter set as active', { id: 'set-active' });
    } else {
      toast.error('Failed to set active', { description: result.error, id: 'set-active' });
    }
  }

  const canCompare = selectedForCompare.length === 2;

  return (
    <div className="space-y-3">
      {canCompare && (
        <div className="flex items-center justify-between bg-muted/50 rounded-lg p-3 border border-border">
          <span className="text-sm text-muted-foreground">
            2 versions selected
          </span>
          <Button
            size="sm"
            variant="outline"
            className="gap-1.5"
            onClick={() => setShowCompare(true)}
          >
            <GitCompare className="h-3.5 w-3.5" />
            Compare Selected
          </Button>
        </div>
      )}

      {companies.map((company) => {
        const letters = versions[company];
        const isExpanded = expandedCompanies.has(company);
        const activeVersion = letters.find((l) => l.isActive);

        return (
          <div key={company} className="rounded-lg border border-border bg-card">
            <button
              onClick={() => toggleCompany(company)}
              className="w-full flex items-center justify-between p-4 hover:bg-muted/50 transition-colors"
            >
              <div className="flex items-center gap-2">
                {isExpanded ? (
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                )}
                <span className="font-medium text-sm">{company}</span>
                <Badge variant="outline" className="text-xs">
                  {letters.length} version{letters.length !== 1 ? 's' : ''}
                </Badge>
                {activeVersion && (
                  <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30 text-xs">
                    Active
                  </Badge>
                )}
              </div>
            </button>

            {isExpanded && (
              <div className="border-t border-border divide-y divide-border">
                {letters.map((letter) => {
                  const isSelected = selectedForCompare.some(
                    (l) => l.id === letter.id
                  );
                  const generatedDate =
                    letter.generatedAt instanceof Date
                      ? letter.generatedAt
                      : new Date(letter.generatedAt as unknown as number);

                  return (
                    <div
                      key={letter.id}
                      className={`p-4 space-y-2 ${isSelected ? 'bg-muted/30' : ''}`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="space-y-1 flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium">
                              {letter.role}
                            </span>
                            {letter.isActive && (
                              <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30 text-xs">
                                Active
                              </Badge>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {formatDistanceToNow(generatedDate, {
                              addSuffix: true,
                            })}
                          </p>
                          <p className="text-sm text-muted-foreground truncate">
                            {letter.content.slice(0, 100)}...
                          </p>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          <Button
                            size="sm"
                            variant={isSelected ? 'default' : 'outline'}
                            className="h-7 px-2 text-xs"
                            onClick={() => toggleSelect(letter)}
                          >
                            {isSelected ? (
                              <Check className="h-3 w-3" />
                            ) : (
                              <GitCompare className="h-3 w-3" />
                            )}
                          </Button>
                          {!letter.isActive && (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 px-2 text-xs gap-1"
                              onClick={() => handleSetActive(letter.id)}
                            >
                              <Star className="h-3 w-3" />
                              Set Active
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}

      {showCompare && canCompare && (
        <VersionCompare
          versionA={selectedForCompare[0]}
          versionB={selectedForCompare[1]}
          onClose={() => setShowCompare(false)}
        />
      )}
    </div>
  );
}
