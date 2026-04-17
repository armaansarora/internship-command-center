import type { Metadata } from "next";
import { requireUser, createClient } from "@/lib/supabase/server";
import { FloorShell } from "@/components/world/FloorShell";
import { BriefingRoomClient } from "@/components/floor-3/BriefingRoomClient";
import type { Interview } from "@/components/floor-3/crud/InterviewTimeline";
import type { PrepPacket, PrepQuestion, QuestionCategory } from "@/components/floor-3/crud/PrepPacketViewer";
import type { PrepStats } from "@/components/floor-3/cpo-character/CPOWhiteboard";
import {
  createPrepPacketAction,
  exportPacketAction,
  printPacketAction,
} from "@/lib/actions/interviews";

export const metadata: Metadata = { title: "The Briefing Room | The Tower" };

/** Floor 3 — Interview Prep + CPO Agent */
export default async function BriefingRoomPage() {
  const user = await requireUser();
  const supabase = await createClient();

  // Fetch interviews, prep packet documents, and applications in parallel
  const [interviewsResult, prepDocsResult, applicationsResult] = await Promise.all([
    supabase
      .from("interviews")
      .select("id, application_id, company_id, round, format, scheduled_at, duration_minutes, location, interviewer_name, interviewer_title, status, prep_packet_id, debrief_id, calendar_event_id, notes, created_at, updated_at")
      .eq("user_id", user.id)
      .order("scheduled_at", { ascending: true }),
    supabase
      .from("documents")
      .select("*")
      .eq("user_id", user.id)
      .eq("type", "prep_packet")
      .eq("is_active", true)
      .order("updated_at", { ascending: false }),
    supabase
      .from("applications")
      .select("id, role, company_name, status, company_id")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false }),
  ]);

  const now = new Date();
  const rawInterviews = interviewsResult.data ?? [];
  const rawPrepDocs = prepDocsResult.data ?? [];
  const rawApps = applicationsResult.data ?? [];

  // Build app lookup for enrichment
  const appLookup = new Map(rawApps.map((a) => [a.id, a]));

  // Map interviews to the Interview type expected by InterviewTimeline
  const interviews: Interview[] = rawInterviews.map((row) => {
    const app = appLookup.get(row.application_id);
    const hasPrepPacket = row.prep_packet_id !== null;

    // Determine status mapping
    let status: Interview["status"] = "upcoming";
    if (row.status === "completed") status = "completed";
    else if (row.status === "cancelled") status = "cancelled";
    else if (row.status === "rescheduled") status = "rescheduled";
    else if (row.scheduled_at && new Date(row.scheduled_at) < now) status = "completed";

    return {
      id: row.id,
      company: app?.company_name ?? "Unknown Company",
      role: app?.role ?? "Unknown Role",
      scheduledAt: row.scheduled_at,
      round: row.round ?? "1",
      format: (row.format ?? "in_person") as Interview["format"],
      location: row.location ?? undefined,
      prepPacketId: row.prep_packet_id ?? undefined,
      prepCompleteness: hasPrepPacket ? 100 : 0,
      status,
      notes: row.notes ?? undefined,
    };
  });

  // Map prep docs to PrepPacket type — parse structured content from JSON
  const prepPackets: PrepPacket[] = rawPrepDocs.map((row) => {
    const app = row.application_id ? appLookup.get(row.application_id) : null;
    const linkedInterview = rawInterviews.find(
      (i) => i.prep_packet_id === row.id
    );

    // Try to parse structured content, fall back to empty structure
    let parsed: Partial<PrepPacket> = {};
    try {
      if (row.content) {
        parsed = JSON.parse(row.content) as Partial<PrepPacket>;
      }
    } catch {
      // Content is plain text, wrap in basic structure
    }

    // Normalize questions: if parsed content is a category-keyed object, flatten
    let questions: PrepQuestion[] = [];
    if (Array.isArray(parsed.questions)) {
      questions = parsed.questions;
    } else if (parsed.questions && typeof parsed.questions === "object") {
      // Legacy format: { behavioral: [], technical: [], ... }
      const legacyQ = parsed.questions as unknown as Record<string, Array<{ text?: string; sampleAnswer?: string; difficulty?: string }>>;
      const categoryMap: Record<string, QuestionCategory> = {
        behavioral: "behavioral",
        technical: "technical",
        cultureFit: "culture-fit",
        caseStudy: "case",
      };
      for (const [key, arr] of Object.entries(legacyQ)) {
        if (Array.isArray(arr)) {
          for (const q of arr) {
            questions.push({
              id: crypto.randomUUID(),
              text: q.text ?? "",
              category: categoryMap[key] ?? "behavioral",
              difficulty: (q.difficulty as PrepQuestion["difficulty"]) ?? undefined,
              sampleAnswer: q.sampleAnswer ?? undefined,
            });
          }
        }
      }
    }

    return {
      id: row.id,
      company: app?.company_name ?? "Unknown",
      role: app?.role ?? "Unknown",
      interviewDate: linkedInterview?.scheduled_at ?? "",
      round: linkedInterview?.round ?? "1",
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      companyOverview: parsed.companyOverview ?? {
        industry: "Unknown",
        keyBusinessLines: [],
      },
      questions,
      talkingPoints: parsed.talkingPoints ?? [],
      interviewers: parsed.interviewers ?? undefined,
      completeness: parsed.completeness ?? (questions.length > 0 ? 50 : 0),
    };
  });

  // Compute prep stats for CPOWhiteboard
  const upcoming = interviews.filter((i) => i.status === "upcoming");
  const withPackets = upcoming.filter((i) => i.prepPacketId);

  const sortedUpcoming = [...upcoming].sort(
    (a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime()
  );

  const prepStats: PrepStats = {
    upcomingInterviews: sortedUpcoming.map((i) => ({
      id: i.id,
      company: i.company,
      role: i.role,
      scheduledAt: i.scheduledAt,
      hasPacket: i.prepCompleteness > 0,
      round: i.round,
    })),
    prepCoverage: upcoming.length > 0 ? Math.round((withPackets.length / upcoming.length) * 100) : 100,
    totalInterviews: interviews.length,
    interviewsWithPackets: withPackets.length,
    questionCategories: {
      behavioral: 0,
      technical: 0,
      cultureFit: 0,
      case: 0,
    },
  };

  // Count question categories across all prep packets
  for (const packet of prepPackets) {
    for (const q of packet.questions) {
      if (q.category === "behavioral") prepStats.questionCategories.behavioral++;
      else if (q.category === "technical") prepStats.questionCategories.technical++;
      else if (q.category === "culture-fit") prepStats.questionCategories.cultureFit++;
      else if (q.category === "case") prepStats.questionCategories.case++;
    }
  }

  // Simple applications array for ticker
  const applications = rawApps.map((row) => ({
    id: row.id as string,
    companyName: (row.company_name as string | null) ?? null,
    status: row.status as string,
  }));

  return (
    <FloorShell floorId="3">
      <BriefingRoomClient
        interviews={interviews}
        prepPackets={prepPackets}
        applications={applications}
        stats={prepStats}
        onCreatePacket={createPrepPacketAction}
        onExportPacket={exportPacketAction}
        onPrintPacket={printPacketAction}
      />
    </FloorShell>
  );
}
