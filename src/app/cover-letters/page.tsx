import { db } from '@/db';
import { applications } from '@/db/schema';
import { CoverLetterGenerator } from '@/components/cover-letters/cover-letter-generator';
import { VersionHistory } from '@/components/cover-letters/version-history';
import { EmptyState } from '@/components/shared/empty-state';
import { PageHeader } from '@/components/layout/page-header';
import { FileText } from 'lucide-react';
import { getAllCoverLettersGrouped } from '@/lib/cover-letter-versions';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export default async function CoverLettersPage() {
  const allApps = await db
    .select({
      id: applications.id,
      company: applications.company,
      role: applications.role,
      tier: applications.tier,
    })
    .from(applications)
    .all();

  const groupedVersions = await getAllCoverLettersGrouped();
  const totalVersions = Object.values(groupedVersions).reduce((sum, v) => sum + v.length, 0);

  return (
    <div className="space-y-0">
      <PageHeader
        title="Cover Letter Lab"
        subtitle={totalVersions > 0
          ? `${totalVersions} cover letter${totalVersions !== 1 ? 's' : ''} generated`
          : 'Generate tailored cover letters with company research'}
      />

      <div className="p-4 md:p-6 max-w-[800px] mx-auto space-y-6">
        {allApps.length > 0 ? (
          <Tabs defaultValue="generator" className="space-y-4">
            <TabsList>
              <TabsTrigger value="generator">Generator</TabsTrigger>
              <TabsTrigger value="history">
                Version History
                {Object.keys(groupedVersions).length > 0 && (
                  <span className="ml-1.5 text-xs text-muted-foreground">
                    ({totalVersions})
                  </span>
                )}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="generator">
              <CoverLetterGenerator applications={allApps} />
            </TabsContent>

            <TabsContent value="history">
              <VersionHistory versions={groupedVersions} />
            </TabsContent>
          </Tabs>
        ) : (
          <EmptyState
            icon={FileText}
            title="No applications to write for"
            description="Add some applications first, then come back to generate tailored cover letters."
            action={{ label: 'Add Applications', href: '/applications' }}
            variant="cover-letters"
          />
        )}
      </div>
    </div>
  );
}
