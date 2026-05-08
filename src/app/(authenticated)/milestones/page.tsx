import type { CSSProperties } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { FloorShell } from "@/components/world/FloorShell";
import { requireUser, createClient } from "@/lib/supabase/server";
import { MILESTONES, type MilestoneMetric } from "@/lib/progression/milestones";

export const metadata: Metadata = { title: "Milestones" };

type MetricCounts = Record<MilestoneMetric, number>;

export default async function MilestonesPage() {
  const user = await requireUser();
  const supabase = await createClient();

  const [
    unlockedResult,
    appsResult,
    contactsResult,
    documentsResult,
    interviewsResult,
    profileResult,
  ] = await Promise.all([
    supabase
      .from("progression_milestones")
      .select("milestone, unlocked_at")
      .eq("user_id", user.id),
    supabase
      .from("applications")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id),
    supabase
      .from("contacts")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id),
    supabase
      .from("documents")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("type", "cover_letter"),
    supabase
      .from("interviews")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id),
    supabase
      .from("user_profiles")
      .select("google_tokens")
      .eq("id", user.id)
      .single(),
  ]);

  const counts: MetricCounts = {
    applications: appsResult.count ?? 0,
    contacts: contactsResult.count ?? 0,
    gmail_connected: profileResult.data?.google_tokens ? 1 : 0,
    documents: documentsResult.count ?? 0,
    interviews: interviewsResult.count ?? 0,
    bell_rings: 0,
  };

  const unlocked = new Map(
    (unlockedResult.data ?? []).map((row) => [
      row.milestone as string,
      row.unlocked_at as string,
    ]),
  );

  return (
    <FloorShell floorId="PH">
      <main
        aria-label="Milestones ledger"
        style={{
          minHeight: "100dvh",
          padding: "82px clamp(18px, 5vw, 64px) 40px",
          color: "#F8F1E4",
        }}
      >
        <div style={{ maxWidth: "1060px", margin: "0 auto", display: "grid", gap: "20px" }}>
          <header style={panelStyle}>
            <div>
              <p style={eyebrowStyle}>Tower progression</p>
              <h1 style={headingStyle}>Milestones</h1>
              <p style={bodyStyle}>
                See every building threshold, what unlocks it, and how close the current account is.
              </p>
            </div>
            <Link href="/settings" style={linkButtonStyle}>
              Settings
            </Link>
          </header>

          <section
            aria-label="All milestones"
            style={{
              ...panelStyle,
              display: "grid",
              alignItems: "stretch",
              padding: "10px",
              gap: "0",
            }}
          >
            {MILESTONES.map((milestone) => {
              const current = counts[milestone.metric];
              const complete = unlocked.has(milestone.id);
              const pct = complete
                ? 100
                : Math.min(100, Math.round((current / milestone.threshold) * 100));
              return (
                <article key={milestone.id} style={milestoneRowStyle}>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", alignItems: "center" }}>
                      <h2 style={rowTitleStyle}>{milestone.label}</h2>
                      <span style={statusStyle(complete)}>
                        {complete ? "Unlocked" : `Floor ${milestone.floor}`}
                      </span>
                    </div>
                    <p style={{ ...bodyStyle, margin: "6px 0 0" }}>{milestone.description}</p>
                  </div>
                  <div style={{ display: "grid", gap: "8px", minWidth: "220px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", gap: "12px" }}>
                      <span style={monoStyle}>{metricLabel(milestone.metric)}</span>
                      <span style={monoStyle}>
                        {complete ? "done" : `${current}/${milestone.threshold}`}
                      </span>
                    </div>
                    <div style={trackStyle} aria-hidden="true">
                      <div style={{ ...fillStyle, width: `${pct}%` }} />
                    </div>
                    {complete && (
                      <span style={monoStyle}>
                        {formatDate(unlocked.get(milestone.id) ?? null)}
                      </span>
                    )}
                  </div>
                </article>
              );
            })}
          </section>
        </div>
      </main>
    </FloorShell>
  );
}

function metricLabel(metric: MilestoneMetric): string {
  return metric.replace(/_/g, " ");
}

function formatDate(value: string | null): string {
  if (!value) return "unlocked";
  return new Date(value).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

const panelStyle = {
  border: "1px solid rgba(201,168,76,0.2)",
  borderRadius: "8px",
  background: "rgba(8,10,20,0.9)",
  boxShadow: "0 24px 70px rgba(0,0,0,0.34)",
  padding: "22px",
  display: "flex",
  minWidth: 0,
  justifyContent: "space-between",
  gap: "18px",
  alignItems: "center",
} satisfies CSSProperties;

const eyebrowStyle = {
  margin: "0 0 8px",
  fontFamily: "'JetBrains Mono', monospace",
  fontSize: "10px",
  letterSpacing: "0.18em",
  textTransform: "uppercase",
  color: "#C9A84C",
} satisfies CSSProperties;

const headingStyle = {
  margin: 0,
  fontFamily: "'Playfair Display', Georgia, serif",
  fontSize: "clamp(30px, 4vw, 46px)",
  color: "#F8F1E4",
  lineHeight: 1.05,
} satisfies CSSProperties;

const bodyStyle = {
  margin: "9px 0 0",
  color: "rgba(248,241,228,0.72)",
  fontSize: "14px",
  lineHeight: 1.5,
} satisfies CSSProperties;

const linkButtonStyle = {
  border: "1px solid rgba(201,168,76,0.24)",
  borderRadius: "7px",
  padding: "10px 12px",
  minHeight: "44px",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  color: "#E8C45A",
  background: "rgba(201,168,76,0.08)",
  textDecoration: "none",
  fontFamily: "'JetBrains Mono', monospace",
  fontSize: "10px",
  letterSpacing: "0.12em",
  textTransform: "uppercase",
  whiteSpace: "nowrap",
} satisfies CSSProperties;

const milestoneRowStyle = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 260px), 1fr))",
  gap: "18px",
  alignItems: "center",
  padding: "16px 14px",
  borderBottom: "1px solid rgba(255,255,255,0.07)",
} satisfies CSSProperties;

const rowTitleStyle = {
  margin: 0,
  color: "#F8F1E4",
  fontFamily: "'Playfair Display', Georgia, serif",
  fontSize: "22px",
  lineHeight: 1.1,
} satisfies CSSProperties;

function statusStyle(complete: boolean): CSSProperties {
  return {
    border: `1px solid ${complete ? "rgba(201,168,76,0.35)" : "rgba(255,255,255,0.12)"}`,
    borderRadius: "999px",
    padding: "5px 8px",
    color: complete ? "#E8C45A" : "rgba(248,241,228,0.64)",
    background: complete ? "rgba(201,168,76,0.1)" : "rgba(255,255,255,0.04)",
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: "9px",
    letterSpacing: "0.1em",
    textTransform: "uppercase",
  };
}

const monoStyle = {
  color: "rgba(248,241,228,0.64)",
  fontFamily: "'JetBrains Mono', monospace",
  fontSize: "10px",
  letterSpacing: "0.1em",
  textTransform: "uppercase",
} satisfies CSSProperties;

const trackStyle = {
  height: "6px",
  borderRadius: "999px",
  background: "rgba(255,255,255,0.09)",
  overflow: "hidden",
} satisfies CSSProperties;

const fillStyle = {
  height: "100%",
  borderRadius: "999px",
  background: "linear-gradient(90deg, #C9A84C, #E8C45A)",
} satisfies CSSProperties;
