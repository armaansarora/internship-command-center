import { db } from '@/db';
import { applications } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Calendar, Globe, Layers } from 'lucide-react';
import { format } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PageHeader } from '@/components/layout/page-header';
import { TierBadge } from '@/components/applications/tier-badge';
import { StatusBadge } from '@/components/applications/status-badge';
import { StatusEditor } from '@/components/detail/status-editor';
import { NotesEditor } from '@/components/detail/notes-editor';
import { ContactInfo } from '@/components/detail/contact-info';
import { CompanyContacts } from '@/components/detail/company-contacts';
import { CreateFollowUp } from '@/components/follow-ups/create-follow-up';
import { CompanyResearchView } from '@/components/detail/company-research';
import { AddToCalendar } from '@/components/detail/add-to-calendar';
import { EmailThread } from '@/components/detail/email-thread';
import { DraftEmail } from '@/components/follow-ups/draft-email';
import { InterviewPrepSection } from '@/components/detail/interview-prep';
import { getFullEmailThread } from '@/lib/gmail';
import { getInterviewPrep } from '@/lib/interview-prep';
import { getContactsByCompany } from '@/lib/contacts';
import type { Tier, Status } from '@/types';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function ApplicationDetailPage({ params }: PageProps) {
  const { id } = await params;
  const app = await db
    .select()
    .from(applications)
    .where(eq(applications.id, Number(id)))
    .get();

  if (!app) notFound();

  const [emailThread, prep, companyContacts] = await Promise.all([
    getFullEmailThread(app.company).catch(() => []),
    getInterviewPrep(Number(id)),
    getContactsByCompany(app.company),
  ]);

  const appliedDate = app.appliedAt instanceof Date
    ? app.appliedAt
    : new Date(app.appliedAt as unknown as number);

  return (
    <div className="space-y-0">
      <PageHeader title={app.company} subtitle={app.role}>
        <Link
          href="/applications"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors duration-150"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </Link>
        <TierBadge tier={app.tier as Tier} />
        <StatusBadge status={app.status as Status} />
      </PageHeader>

      <div className="p-4 md:p-6 max-w-4xl mx-auto space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-6">
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="text-base">Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="flex items-start gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-xs text-muted-foreground">Applied</p>
                    <p className="text-sm">{format(appliedDate, 'MMM d, yyyy')}</p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <Globe className="h-4 w-4 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-xs text-muted-foreground">Platform</p>
                    <p className="text-sm">{app.platform || '—'}</p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <Layers className="h-4 w-4 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-xs text-muted-foreground">Sector</p>
                    <p className="text-sm">{app.sector}</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card border-border">
            <CardContent className="pt-6">
              <NotesEditor
                applicationId={app.id}
                currentNotes={app.notes}
              />
            </CardContent>
          </Card>

          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="text-base">Interview Prep</CardTitle>
            </CardHeader>
            <CardContent>
              <InterviewPrepSection
                applicationId={app.id}
                company={app.company}
                role={app.role}
                existingPrep={prep?.content ?? null}
              />
            </CardContent>
          </Card>

          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="text-base">Email History</CardTitle>
            </CardHeader>
            <CardContent>
              <EmailThread company={app.company} emails={emailThread} />
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="bg-card border-border">
            <CardContent className="pt-6">
              <StatusEditor
                applicationId={app.id}
                currentStatus={app.status as Status}
              />
              {app.status === 'interview' && (
                <AddToCalendar company={app.company} role={app.role} />
              )}
            </CardContent>
          </Card>

          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="text-base">Who Do I Know?</CardTitle>
            </CardHeader>
            <CardContent>
              <CompanyContacts contacts={companyContacts} />
            </CardContent>
          </Card>

          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="text-base">Application Contact</CardTitle>
            </CardHeader>
            <CardContent>
              <ContactInfo
                contactName={app.contactName}
                contactEmail={app.contactEmail}
                contactRole={app.contactRole}
              />
            </CardContent>
          </Card>

          <Card className="bg-card border-border">
            <CardHeader className="flex-row items-center justify-between space-y-0">
              <CardTitle className="text-base">Follow-Up</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <CreateFollowUp
                applicationId={app.id}
                tier={app.tier}
                status={app.status}
              />
              <DraftEmail
                company={app.company}
                role={app.role}
                status={app.status}
                contactName={app.contactName}
                contactEmail={app.contactEmail}
                notes={app.notes}
              />
            </CardContent>
          </Card>

          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="text-base">Company Research</CardTitle>
            </CardHeader>
            <CardContent>
              <CompanyResearchView company={app.company} />
            </CardContent>
          </Card>
        </div>
      </div>
      </div>
    </div>
  );
}
