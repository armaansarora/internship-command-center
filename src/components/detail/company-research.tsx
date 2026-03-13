// @ts-nocheck
'use client';

import { useState, useEffect } from 'react';
import { fetchResearchAction } from '@/lib/cover-letter-actions';
import type { CompanyResearchData } from '@/lib/research';
import {
  Building2,
  Newspaper,
  Users,
  TrendingUp,
  Loader2,
  RefreshCw,
} from 'lucide-react';
import { Button } from '@/components/ui/button';

interface CompanyResearchProps {
  company: string;
}

export function CompanyResearchView({ company }: CompanyResearchProps) {
  const [research, setResearch] = useState<CompanyResearchData | null>(null);
  const [loading, setLoading] = useState(false);
  const [fetched, setFetched] = useState(false);

  async function fetchResearch() {
    setLoading(true);
    const result = await fetchResearchAction(company);
    setResearch(result);
    setLoading(false);
    setFetched(true);
  }

  if (!fetched) {
    return (
      <div className="space-y-3">
        <Button
          size="sm"
          variant="outline"
          className="w-full gap-2"
          onClick={fetchResearch}
          disabled={loading}
        >
          {loading ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Building2 className="h-3.5 w-3.5" />
          )}
          {loading ? 'Loading research...' : 'Load Company Research'}
        </Button>
      </div>
    );
  }

  if (!research) {
    return (
      <p className="text-sm text-muted-foreground">
        No research available for {company}.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground capitalize">
          Source: {research.source}
        </span>
        <Button
          size="sm"
          variant="ghost"
          className="h-6 w-6 p-0"
          onClick={fetchResearch}
          disabled={loading}
        >
          <RefreshCw
            className={`h-3 w-3 ${loading ? 'animate-spin' : ''}`}
          />
        </Button>
      </div>

      {research.overview && (
        <div className="space-y-1">
          <div className="flex items-center gap-1.5">
            <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-xs font-medium text-muted-foreground">
              Overview
            </span>
          </div>
          <p className="text-sm leading-relaxed">{research.overview}</p>
        </div>
      )}

      {research.leadership.length > 0 && (
        <div className="space-y-1">
          <div className="flex items-center gap-1.5">
            <Users className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-xs font-medium text-muted-foreground">
              Leadership
            </span>
          </div>
          <ul className="text-sm space-y-0.5">
            {research.leadership.map((l, i) => (
              <li key={i} className="text-muted-foreground">
                {l}
              </li>
            ))}
          </ul>
        </div>
      )}

      {research.deals.length > 0 && (
        <div className="space-y-1">
          <div className="flex items-center gap-1.5">
            <TrendingUp className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-xs font-medium text-muted-foreground">
              Activity
            </span>
          </div>
          <ul className="text-sm space-y-0.5">
            {research.deals.map((d, i) => (
              <li key={i} className="text-muted-foreground">
                {d}
              </li>
            ))}
          </ul>
        </div>
      )}

      {research.recentNews.length > 0 && (
        <div className="space-y-1">
          <div className="flex items-center gap-1.5">
            <Newspaper className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-xs font-medium text-muted-foreground">
              Recent News
            </span>
          </div>
          <ul className="text-sm space-y-0.5">
            {research.recentNews.map((n, i) => (
              <li key={i} className="text-muted-foreground">
                {n}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
