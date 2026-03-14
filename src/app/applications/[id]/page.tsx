import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { db } from '@/db';
import { applications, companies, contacts, documents } from '@/db/schema';
import { eq, and, desc } from 'drizzle-orm';
import { computeWarmth } from '@/lib/contacts';
import type { ContactWithWarmth } from '@/lib/contacts';
import type { Status } from '@/types';
import { StatusEditor } from '@/components/detail/status-editor';
import { NotesEditor } from '@/components/detail/notes-editor';
import { InterviewPrepSection } from '@/components/detail/interview-prep';
import { CompanyContacts } from '@/components/detail/company-contacts';
import { CompanyResearchView } from '@/components/detail/company-research';
import { AddToCalendar } from '@/components/detail/add-to-calendar';
import { ContactInfo } from '@/components/detail/contact-info';
import { TierBadge } from '@/components/applications/tier-badge';
import { StatusBadge } from '@/components/applications/status-badge';

interface PageProps {
  params: Promise<{ id: string }>;
}

// Map DB status values to the UI Status type
const STATUS_MAP: Record<string, Status> = {
  discovered: 'applied',
  applied: 'applied',
  screening: 'in_progress',
  interview_scheduled: 'interview',
  interviewing: 'interview',
  under_review: 'under_review',
  offer: 'offer',
  accepted: 'offer',
  rejected: 'rejected',
  withdrawn: 'rejected',
};

export default async function ApplicationDetailPage({ params }: PageProps) {
  const { id } = await params;

  // Fetch application with company and contact joins
  const rows = await db
    .select()
    .from(applications)
    .leftJoin(companies, eq(applications.companyId, companies.id))
    .leftJoin(contacts, eq(applications.contactId, contacts.id))
    .where(eq(applications.id, id));

  if (rows.length === 0) {
    notFound();
  }

  const row = rows[0];
  const app = row.applications;
  const company = row.companies;
  const contact = row.contacts;

  // Fetch interview prep document
  const prepDocs = await db
    .select()
    .from(documents)
    .where(
      and(
        eq(documents.type, 'prep_packet'),
        eq(documents.applicationId, id),
      ),
    )
    .orderBy(desc(documents.createdAt))
    .limit(1);

  const existingPrep = prepDocs.length > 0 ? prepDocs[0].content : null;

  // Fetch contacts for this company
  let companyContacts: ContactWithWarmth[] = [];
  if (app.companyId) {
    const contactRows = await db
      .select()
      .from(contacts)
      .leftJoin(companies, eq(contacts.companyId, companies.id))
      .where(eq(contacts.companyId, app.companyId));

    companyContacts = contactRows.map((r) => {
      const c = r.contacts;
      const lastContactedAt = c.lastContactAt ? new Date(c.lastContactAt) : null;
      const warmth = computeWarmth(lastContactedAt);
      return {
        id: c.id as unknown as number,
        name: c.name,
        company: r.companies?.name ?? '',
        email: c.email ?? null,
        phone: c.phone ?? null,
        role: c.title ?? null,
        relationshipType: (c.relationship as ContactWithWarmth['relationshipType']) ?? null,
        introducedBy: c.introducedBy as unknown as number | null,
        notes: c.notes ?? null,
        lastContactedAt,
        warmth,
      };
    });
  }

  // Map DB status to UI status
  const uiStatus: Status = STATUS_MAP[app.status] ?? 'applied';
  const companyName = company?.name ?? 'Unknown Company';
  const tierLabel = app.tier ? (`T${app.tier}` as 'T1' | 'T2' | 'T3' | 'T4') : null;

  return (
    <div className="space-y-6">
      {/* Back link */}
      <Link
        href="/applications"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors duration-150"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Applications
      </Link>

      {/* Page header */}
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="font-['Playfair_Display'] text-3xl font-bold tracking-tight">
          {companyName}
        </h1>
        <span className="text-lg text-muted-foreground">&mdash;</span>
        <span className="text-lg text-muted-foreground">{app.role}</span>
        <div className="flex items-center gap-2 ml-auto">
          {tierLabel && <TierBadge tier={tierLabel} />}
          <StatusBadge status={uiStatus} />
        </div>
      </div>

      {/* Two-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column — main info */}
        <div className="lg:col-span-2 space-y-6">
          {/* Status Editor */}
          <section className="rounded-xl border border-white/[0.06] bg-card/80 backdrop-blur-xl p-6 space-y-4">
            <h2 className="text-sm font-medium uppercase tracking-wider text-muted-foreground">
              Application Status
            </h2>
            <StatusEditor
              applicationId={id as unknown as number}
              currentStatus={uiStatus}
            />
          </section>

          {/* Notes Editor */}
          <section className="rounded-xl border border-white/[0.06] bg-card/80 backdrop-blur-xl p-6 space-y-4">
            <h2 className="text-sm font-medium uppercase tracking-wider text-muted-foreground">
              Notes
            </h2>
            <NotesEditor
              applicationId={id as unknown as number}
              currentNotes={app.notes}
            />
          </section>

          {/* Interview Prep */}
          <section className="rounded-xl border border-white/[0.06] bg-card/80 backdrop-blur-xl p-6 space-y-4">
            <h2 className="text-sm font-medium uppercase tracking-wider text-muted-foreground">
              Interview Preparation
            </h2>
            <InterviewPrepSection
              applicationId={id as unknown as number}
              company={companyName}
              role={app.role}
              existingPrep={existingPrep}
            />
          </section>
        </div>

        {/* Right column — company info */}
        <div className="space-y-6">
          {/* Contact Info */}
          <section className="rounded-xl border border-white/[0.06] bg-card/80 backdrop-blur-xl p-6 space-y-4">
            <h2 className="text-sm font-medium uppercase tracking-wider text-muted-foreground">
              Primary Contact
            </h2>
            <ContactInfo
              contactName={contact?.name ?? null}
              contactEmail={contact?.email ?? null}
              contactRole={contact?.title ?? null}
            />
          </section>

          {/* Company Research */}
          <section className="rounded-xl border border-white/[0.06] bg-card/80 backdrop-blur-xl p-6 space-y-4">
            <h2 className="text-sm font-medium uppercase tracking-wider text-muted-foreground">
              Company Research
            </h2>
            <CompanyResearchView company={companyName} />
          </section>

          {/* Company Contacts */}
          <section className="rounded-xl border border-white/[0.06] bg-card/80 backdrop-blur-xl p-6 space-y-4">
            <h2 className="text-sm font-medium uppercase tracking-wider text-muted-foreground">
              Company Contacts
            </h2>
            <CompanyContacts contacts={companyContacts} />
          </section>

          {/* Add to Calendar */}
          <section className="rounded-xl border border-white/[0.06] bg-card/80 backdrop-blur-xl p-6 space-y-4">
            <h2 className="text-sm font-medium uppercase tracking-wider text-muted-foreground">
              Schedule Interview
            </h2>
            <AddToCalendar company={companyName} role={app.role} />
          </section>
        </div>
      </div>
    </div>
  );
}
