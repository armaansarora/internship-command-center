'use client';

import { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Loader2, Copy, Check } from 'lucide-react';
import { toast } from 'sonner';
import {
  generateCompanyComparison,
  type ComparisonResult,
} from '@/lib/company-comparison';

interface CompanyCompareProps {
  companies: Array<{ company: string; role: string }>;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const CATEGORY_LABELS: Array<{
  key: keyof Omit<ComparisonResult, 'company' | 'role'>;
  label: string;
}> = [
  { key: 'culture', label: 'Culture' },
  { key: 'size', label: 'Size' },
  { key: 'recentDeals', label: 'Recent Deals / News' },
  { key: 'compensationRange', label: 'Compensation Range' },
  { key: 'fitAssessment', label: 'Fit Assessment' },
];

export function CompanyCompare({
  companies,
  open,
  onOpenChange,
}: CompanyCompareProps) {
  const [comparisons, setComparisons] = useState<ComparisonResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (open && companies.length >= 2) {
      setLoading(true);
      setError(null);
      generateCompanyComparison(companies)
        .then((result) => {
          setComparisons(result.comparisons);
          if (result.error) setError(result.error);
        })
        .catch((e) => {
          setError(e instanceof Error ? e.message : 'Failed to compare');
        })
        .finally(() => setLoading(false));
    }
  }, [open, companies]);

  async function handleCopy() {
    // Build plain-text table for clipboard
    const header = ['Category', ...comparisons.map((c) => `${c.company} (${c.role})`)];
    const rows = CATEGORY_LABELS.map(({ key, label }) => [
      label,
      ...comparisons.map((c) => c[key]),
    ]);

    const text = [header, ...rows]
      .map((row) => row.join('\t'))
      .join('\n');

    await navigator.clipboard.writeText(text);
    setCopied(true);
    toast.success('Comparison copied to clipboard', { id: 'compare-copy' });
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-lg">Company Comparison</DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-12 gap-3">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              Generating comparison...
            </p>
          </div>
        ) : comparisons.length > 0 ? (
          <div className="space-y-4">
            {error && (
              <p className="text-xs text-amber-400">{error}</p>
            )}

            <div className="rounded-md border border-border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-border hover:bg-transparent">
                    <TableHead className="text-muted-foreground w-[160px]">
                      Category
                    </TableHead>
                    {comparisons.map((c) => (
                      <TableHead
                        key={c.company}
                        className="text-foreground font-medium"
                      >
                        <div>
                          <div>{c.company}</div>
                          <div className="text-xs text-muted-foreground font-normal">
                            {c.role}
                          </div>
                        </div>
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {CATEGORY_LABELS.map(({ key, label }) => (
                    <TableRow key={key} className="border-border">
                      <TableCell className="font-medium text-muted-foreground align-top">
                        {label}
                      </TableCell>
                      {comparisons.map((c) => (
                        <TableCell
                          key={`${c.company}-${key}`}
                          className="text-sm align-top"
                        >
                          {c[key] || '--'}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            <div className="flex justify-end">
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5"
                onClick={handleCopy}
              >
                {copied ? (
                  <Check className="h-3.5 w-3.5" />
                ) : (
                  <Copy className="h-3.5 w-3.5" />
                )}
                {copied ? 'Copied' : 'Copy to Clipboard'}
              </Button>
            </div>
          </div>
        ) : error ? (
          <p className="text-sm text-red-400 py-8 text-center">{error}</p>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
