import { NextResponse } from "next/server";
import {
  DEV_PREVIEW_USER,
  getSafeDevPreviewNextPath,
  getSupabaseAuthCookieBaseName,
  isDevPreviewAuthEnabled,
  isLocalAppHost,
} from "@/lib/dev-preview-auth";

export const runtime = "nodejs";

export async function GET(request: Request): Promise<NextResponse> {
  const requestUrl = new URL(request.url);
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  if (
    !isDevPreviewAuthEnabled() ||
    !isLocalAppHost(requestUrl.hostname) ||
    !supabaseUrl
  ) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  try {
    await installPreviewScenario(supabaseUrl);
  } catch (error) {
    return NextResponse.json(
      {
        error: "preview_stub_unavailable",
        message:
          "Start the local Supabase stub on :3001 before using preview login.",
        detail: error instanceof Error ? error.message : String(error),
      },
      { status: 503 },
    );
  }

  const nextPath = getSafeDevPreviewNextPath(
    requestUrl.searchParams.get("next"),
  );
  const redirectUrl = new URL(nextPath, requestUrl.origin);
  const response = NextResponse.redirect(redirectUrl);
  response.cookies.set(
    getSupabaseAuthCookieBaseName(supabaseUrl),
    buildSessionCookie(),
    {
      httpOnly: true,
      secure: false,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 8,
    },
  );
  return response;
}

async function installPreviewScenario(supabaseUrl: string): Promise<void> {
  const result = await fetch(`${supabaseUrl}/__test__/install`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      scenarioId: "manual-tower-preview",
      authedUser: DEV_PREVIEW_USER,
      allowWrites: true,
      tables: buildPreviewTables(),
      rpc: {
        bump_ai_quota: [{ used: 1, cap: 200 }],
      },
    }),
  });

  if (!result.ok) {
    throw new Error(`stub install failed: ${result.status}`);
  }
}

function buildSessionCookie(): string {
  const sessionJson = JSON.stringify({
    access_token: buildJwt(),
    refresh_token: `refresh-${DEV_PREVIEW_USER.id}`,
    expires_at: 9999999999,
    expires_in: 3600,
    token_type: "bearer",
    user: DEV_PREVIEW_USER,
  });
  return `base64-${base64url(sessionJson)}`;
}

function buildJwt(): string {
  const header = base64url(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const payload = base64url(
    JSON.stringify({
      sub: DEV_PREVIEW_USER.id,
      email: DEV_PREVIEW_USER.email,
      role: "authenticated",
      aud: "authenticated",
      iss: "stub-supabase",
      exp: 9999999999,
      iat: 0,
    }),
  );
  return `${header}.${payload}.stub-signature`;
}

function base64url(value: string): string {
  return Buffer.from(value, "utf8").toString("base64url");
}

function buildPreviewTables(): Record<string, Array<Record<string, unknown>>> {
  const now = "2026-05-08T16:00:00.000Z";
  return {
    user_profiles: [
      {
        id: DEV_PREVIEW_USER.id,
        email: DEV_PREVIEW_USER.email,
        display_name: "Armaan",
        timezone: "America/New_York",
        concierge_target_profile: {
          roles: ["Software Engineering Intern", "AI Product Intern"],
          level: ["intern"],
          geos: ["New York", "San Francisco", "Remote"],
          companies: ["Ramp", "Databricks", "Stripe"],
          musts: ["technical depth", "high ownership"],
          nices: ["AI infrastructure", "founder energy"],
        },
        preferences: {
          automationComfort: "approval-first",
          riskTolerance: "measured",
          disallowedPaths: ["spray-and-pray applications"],
        },
        networking_consent_at: "2026-05-01T12:00:00.000Z",
        networking_revoked_at: null,
        networking_consent_version: 2,
        data_export_status: "idle",
        deleted_at: null,
        floors_unlocked: ["PH", "7", "6", "5", "4", "3", "2", "1", "L"],
        match_index_last_rescan_at: "2026-05-07T12:00:00.000Z",
        shared_knowledge: {},
        created_at: "2026-04-01T12:00:00.000Z",
        updated_at: now,
      },
    ],
    companies: [
      {
        id: "company-ramp",
        user_id: DEV_PREVIEW_USER.id,
        name: "Ramp",
        sector: "Fintech",
        research_freshness: "fresh",
        internship_intel:
          "Recent product expansion makes AI workflow automation especially relevant.",
        updated_at: "2026-05-08T14:00:00.000Z",
      },
      {
        id: "company-databricks",
        user_id: DEV_PREVIEW_USER.id,
        name: "Databricks",
        sector: "AI Infrastructure",
        research_freshness: "aging",
        internship_intel: "Strong match for systems and data platform work.",
        updated_at: "2026-05-05T14:00:00.000Z",
      },
    ],
    applications: [
      {
        id: "app-ramp",
        user_id: DEV_PREVIEW_USER.id,
        company_id: "company-ramp",
        role: "Software Engineering Intern",
        company_name: "Ramp",
        status: "interviewing",
        tier: 1,
        source: "target_profile",
        sector: "Fintech",
        location: "New York",
        salary: "$55/hr",
        match_score: 0.92,
        deadline_at: "2026-05-16T23:59:00.000Z",
        last_activity_at: "2026-05-08T13:15:00.000Z",
        created_at: "2026-04-24T12:00:00.000Z",
        updated_at: "2026-05-08T13:15:00.000Z",
      },
      {
        id: "app-databricks",
        user_id: DEV_PREVIEW_USER.id,
        company_id: "company-databricks",
        role: "AI Product Intern",
        company_name: "Databricks",
        status: "applied",
        tier: 1,
        source: "warm_intro",
        sector: "AI Infrastructure",
        location: "San Francisco",
        salary: "$58/hr",
        match_score: 0.88,
        deadline_at: "2026-05-22T23:59:00.000Z",
        last_activity_at: "2026-05-06T10:00:00.000Z",
        created_at: "2026-04-28T12:00:00.000Z",
        updated_at: "2026-05-06T10:00:00.000Z",
      },
    ],
    contacts: [
      {
        id: "contact-ramp-mentor",
        user_id: DEV_PREVIEW_USER.id,
        company_id: "company-ramp",
        name: "Maya Chen",
        title: "Engineering Manager",
        relationship: "warm alumni",
        warmth: 82,
        last_contact_at: "2026-05-05T18:00:00.000Z",
        updated_at: "2026-05-08T11:00:00.000Z",
      },
    ],
    documents: [
      {
        id: "doc-ramp-cover",
        user_id: DEV_PREVIEW_USER.id,
        application_id: "app-ramp",
        company_id: "company-ramp",
        type: "cover_letter",
        title: "Ramp - focused systems narrative",
        generated_by: "cmo",
        is_active: true,
        updated_at: "2026-05-08T12:00:00.000Z",
      },
    ],
    interviews: [
      {
        id: "interview-ramp-technical",
        user_id: DEV_PREVIEW_USER.id,
        application_id: "app-ramp",
        company_id: "company-ramp",
        status: "scheduled",
        round: "technical screen",
        scheduled_at: "2026-05-13T18:00:00.000Z",
        prep_packet_id: "doc-ramp-prep",
        updated_at: "2026-05-08T13:00:00.000Z",
      },
    ],
    offers: [],
    outreach_queue: [
      {
        id: "outreach-ramp-followup",
        user_id: DEV_PREVIEW_USER.id,
        application_id: "app-ramp",
        company_id: "company-ramp",
        contact_id: "contact-ramp-mentor",
        type: "follow_up",
        status: "pending_approval",
        generated_by: "coo",
        send_after: null,
        updated_at: "2026-05-08T15:15:00.000Z",
      },
    ],
    notifications: [
      {
        id: "notif-ramp-prep",
        user_id: DEV_PREVIEW_USER.id,
        type: "interview",
        priority: "high",
        title: "Ramp prep packet needs review",
        body: "Technical screen is five days out. CPO recommends a focused drill.",
        source_agent: "cpo",
        source_entity_id: "interview-ramp-technical",
        source_entity_type: "interview",
        is_dismissed: false,
        created_at: "2026-05-08T15:20:00.000Z",
      },
    ],
    agent_dispatches: [
      {
        id: "dispatch-ramp-brief",
        user_id: DEV_PREVIEW_USER.id,
        request_id: "request-ramp-brief",
        agent: "cpo",
        task: "Prepare Ramp technical screen drill",
        status: "completed",
        summary: "Focus on API design, data modeling, and ownership stories.",
        started_at: "2026-05-08T14:00:00.000Z",
        completed_at: "2026-05-08T14:03:00.000Z",
        updated_at: "2026-05-08T14:03:00.000Z",
      },
    ],
    agent_memory: [
      {
        id: "memory-ramp-positioning",
        user_id: DEV_PREVIEW_USER.id,
        agent: "cmo",
        category: "positioning",
        content:
          "Armaan wants a technical narrative that connects AI systems work to operational leverage.",
        importance: 0.8,
        updated_at: "2026-05-08T12:30:00.000Z",
      },
    ],
    audit_logs: [
      {
        id: "audit-ramp-approval",
        user_id: DEV_PREVIEW_USER.id,
        event_type: "approval.created",
        resource_type: "outreach_queue",
        resource_id: "outreach-ramp-followup",
        created_at: "2026-05-08T15:15:00.000Z",
      },
    ],
    daily_snapshots: [
      {
        id: "snapshot-2026-05-08",
        user_id: DEV_PREVIEW_USER.id,
        date: "2026-05-08",
        total_applications: 2,
        active_pipeline: 2,
        interviews_scheduled: 1,
        offers: 0,
        rejections: 0,
        conversion_rate: 0.5,
        stale_count: 0,
      },
    ],
  };
}
