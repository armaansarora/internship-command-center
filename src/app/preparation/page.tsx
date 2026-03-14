import { db } from '@/db';
import { applications, companies, documents, interviews } from '@/db/schema';
import { eq, and, desc, gte } from 'drizzle-orm';
import { InterviewPrepSection } from '@/components/detail/interview-prep';
import { EmptyState } from '@/components/shared/empty-state';
import { GraduationCap } from 'lucide-react';
import Link from 'next/link';

export default async function PreparationPage() {
  // Fetch applications with upcoming interviews or active interview status
  const upcomingInterviews = await db
    .select({
      appId: applications.id,
      company: companies.name,
      role: applications.role,
      tier: applications.tier,
      status: applications.status,
      scheduledAt: interviews.scheduledAt,
      interviewFormat: interviews.format,
    })
    .from(interviews)
    .innerJoin(applications, eq(interviews.applicationId, applications.id))
    .innerJoin(companies, eq(applications.companyId, companies.id))
    .where(
      and(
        eq(interviews.status, 'scheduled'),
        gte(interviews.scheduledAt, new Date().toISOString()),
      ),
    )
    .orderBy(interviews.scheduledAt);

  // Also get all existing prep packets
  const prepPackets = await db
    .select({
      appId: documents.applicationId,
      content: documents.content,
      createdAt: documents.createdAt,
      company: companies.name,
      role: applications.role,
    })
    .from(documents)
    .leftJoin(applications, eq(documents.applicationId, applications.id))
    .leftJoin(companies, eq(applications.companyId, companies.id))
    .where(eq(documents.type, 'prep_packet'))
    .orderBy(desc(documents.createdAt));

  const prepByApp = new Map<string, string>();
  for (const p of prepPackets) {
    if (p.appId && !prepByApp.has(p.appId)) {
      prepByApp.set(p.appId, p.content ?? '');
    }
  }

  // Merge: upcoming interviews + any app that has a prep packet
  const allApps = new Map<string, { id: string; company: string; role: string; tier: number | null; scheduledAt: string | null; existingPrep: string | null }>();

  for (const i of upcomingInterviews) {
    allApps.set(i.appId, {
      id: i.appId,
      company: i.company,
      role: i.role,
      tier: i.tier,
      scheduledAt: i.scheduledAt,
      existingPrep: prepByApp.get(i.appId) ?? null,
    });
  }

  for (const p of prepPackets) {
    if (p.appId && !allApps.has(p.appId)) {
      allApps.set(p.appId, {
        id: p.appId,
        company: p.company ?? 'Unknown',
        role: p.role ?? 'Unknown',
        tier: null,
        scheduledAt: null,
        existingPrep: p.content ?? null,
      });
    }
  }

  const items = Array.from(allApps.values());

  return (
    <div className="space-y-8 p-6">
      <div>
        <h1 className="font-['Playfair_Display'] text-2xl font-bold text-[#F5F0E8]">
          Interview Preparation
        </h1>
        <p className="text-sm text-[#8B8FA3] mt-1">
          Prep packets and upcoming interviews
        </p>
      </div>

      {items.length === 0 ? (
        <EmptyState
          icon={GraduationCap}
          title="No prep needed yet"
          description="When you have upcoming interviews or generate prep packets, they'll appear here."
          variant="generic"
        />
      ) : (
        <div className="space-y-6">
          {items.map((item) => (
            <div key={item.id} className="rounded-xl border border-border bg-card p-5 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <Link
                    href={`/applications/${item.id}`}
                    className="font-['Playfair_Display'] text-lg font-semibold hover:text-[#C9A84C] transition-colors"
                  >
                    {item.company}
                  </Link>
                  <p className="text-sm text-muted-foreground">{item.role}</p>
                </div>
                {item.scheduledAt && (
                  <div className="text-right">
                    <p className="text-xs text-muted-foreground">Interview</p>
                    <p className="text-sm font-medium text-[#C9A84C]">
                      {new Date(item.scheduledAt).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        hour: 'numeric',
                        minute: '2-digit',
                      })}
                    </p>
                  </div>
                )}
              </div>
              <InterviewPrepSection
                applicationId={item.id as unknown as number}
                company={item.company}
                role={item.role}
                existingPrep={item.existingPrep}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
