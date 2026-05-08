"use client";

import type { CSSProperties, JSX } from "react";
import { EntranceSequence } from "@/components/transitions/EntranceSequence";
import { PipelineNodes, PipelineBar } from "@/components/penthouse/PipelineNodes";
import { ActivityFeed } from "@/components/penthouse/ActivityFeed";
import { QuickActionsRow } from "@/components/penthouse/quick-actions/QuickActionsRow";
import { IdleDetail } from "@/components/penthouse/idle/IdleDetail";
import { useIdleDetail } from "@/hooks/useIdleDetail";
import type {
  ActivityItemData,
  PenthouseScene,
  PenthouseStats,
  PipelineStageData,
} from "./penthouse-data";
import type { MorningBriefing } from "@/lib/ai/agents/morning-briefing";

const KEYFRAMES = `
  @keyframes slide-in-left {
    from { opacity: 0; transform: translateX(-18px); }
    to   { opacity: 1; transform: translateX(0);     }
  }
  @keyframes pulse-ring-ph {
    0%   { transform: scale(1);   opacity: 0.7; }
    100% { transform: scale(2.6); opacity: 0;   }
  }
  @keyframes radar-pulse {
    0%   { transform: scale(0.8); opacity: 0.9; }
    50%  { transform: scale(1.5); opacity: 0.3; }
    100% { transform: scale(2.2); opacity: 0;   }
  }
  @keyframes pipeline-shimmer {
    0%   { transform: translateX(-100%); }
    100% { transform: translateX(400%);  }
  }
  @keyframes flow-dot {
    0%, 100% { opacity: 0.3; transform: scale(1); }
    50%      { opacity: 1;   transform: scale(1.4); }
  }
`;

interface Props {
  scene: PenthouseScene;
}

export function PenthouseClient({ scene }: Props): JSX.Element {
  const idleKind = useIdleDetail({
    userId: scene.user.userId,
    dateIso: scene.dateIso,
    recentRejection: scene.recentRejection,
  });
  const nextActions = deriveNextActions(scene);

  return (
    <EntranceSequence>
      <style>{KEYFRAMES}</style>
      <FloorChyron />

      {scene.timeOfDay !== "late-night" && (
        <div
          aria-hidden="true"
          style={{
            position: "fixed",
            right: "34px",
            bottom: "34px",
            zIndex: 3,
            pointerEvents: "none",
            opacity: 0.34,
          }}
        >
          <IdleDetail kind={idleKind} scale={0.9} />
        </div>
      )}

      <main
        aria-label="Command center dashboard"
        style={{
          minHeight: "calc(100dvh - 28px)",
          padding: "82px clamp(18px, 4vw, 56px) 34px",
          display: "grid",
          gridTemplateColumns: "minmax(300px, 0.9fr) minmax(420px, 1.35fr)",
          gap: "24px",
          alignItems: "stretch",
        }}
      >
        <MorningReport
          briefing={scene.briefing}
          displayName={scene.user.displayName}
          generated={scene.briefingGenerated}
          overnight={scene.overnightDelta}
        />

        <DashboardDesk
          stats={scene.stats}
          pipeline={scene.pipeline}
          activity={scene.activity}
          nextActions={nextActions}
        />
      </main>

      <style>{`
        @media (max-width: 1080px) {
          main[aria-label="Command center dashboard"] {
            grid-template-columns: 1fr !important;
            padding-top: 76px !important;
          }
        }
      `}</style>
    </EntranceSequence>
  );
}

function MorningReport({
  briefing,
  displayName,
  generated,
  overnight,
}: {
  briefing: MorningBriefing | null;
  displayName: string;
  generated: boolean;
  overnight: PenthouseScene["overnightDelta"];
}): JSX.Element {
  const beats = briefing?.beats ?? [];
  const summary =
    beats.length > 0
      ? beats
          .slice(0, 2)
          .map((beat) => beat.text)
          .join(" ")
      : `${displayName}, the desk is quiet. Build the first signal from the War Room.`;
  const date = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  return (
    <section aria-label="Morning Briefing" style={panelStyle}>
      <div style={panelHeaderStyle}>
        <div>
          <p style={eyebrowStyle}>Morning Briefing</p>
          <h1 style={displayHeadingStyle}>Executive report</h1>
        </div>
        <span style={statusPillStyle}>{generated ? "Filed" : "Live fallback"}</span>
      </div>

      <div
        style={{
          padding: "18px",
          border: "1px solid rgba(201,168,76,0.18)",
          background: "rgba(201,168,76,0.07)",
          borderRadius: "8px",
        }}
      >
        <p
          style={{
            margin: "0 0 8px",
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: "10px",
            letterSpacing: "0.14em",
            textTransform: "uppercase",
            color: "rgba(245,238,225,0.56)",
          }}
        >
          {date}
        </p>
        <p
          style={{
            margin: 0,
            color: "#F5EEE1",
            fontSize: "17px",
            lineHeight: 1.55,
            fontFamily: "'Satoshi', system-ui, sans-serif",
          }}
        >
          {summary}
        </p>
      </div>

      <div
        aria-label="Overnight signal summary"
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
          gap: "8px",
        }}
      >
        <SignalChip label="New" value={overnight.newApps} />
        <SignalChip label="Replies" value={overnight.responses} />
        <SignalChip label="Urgent mail" value={overnight.importantEmailCount} />
        <SignalChip label="Rejections" value={overnight.rejections} />
      </div>

      <div aria-label="Briefing sections" style={{ display: "grid", gap: "10px" }}>
        {(beats.length > 0 ? beats : emptyBriefingBeats()).map((beat, index) => (
          <article
            key={`${index}-${beat.text}`}
            style={{
              display: "grid",
              gridTemplateColumns: "74px 1fr",
              gap: "12px",
              alignItems: "start",
              padding: "13px 0",
              borderTop: index === 0 ? "none" : "1px solid rgba(255,255,255,0.07)",
            }}
          >
            <span style={toneLabelStyle}>{beat.tone}</span>
            <p style={{ margin: 0, color: "rgba(245,238,225,0.82)", lineHeight: 1.5 }}>
              {beat.text}
            </p>
          </article>
        ))}
      </div>
    </section>
  );
}

function DashboardDesk({
  stats,
  pipeline,
  activity,
  nextActions,
}: {
  stats: PenthouseStats;
  pipeline: PipelineStageData[];
  activity: ActivityItemData[];
  nextActions: NextAction[];
}): JSX.Element {
  const totalPipeline = pipeline.reduce((sum, stage) => sum + stage.count, 0);

  return (
    <section style={panelStyle}>
      <div style={panelHeaderStyle}>
        <div>
          <p style={eyebrowStyle}>Penthouse command center</p>
          <h2 style={displayHeadingStyle}>Dashboard</h2>
        </div>
        <a href="/war-room" style={smallLinkStyle}>
          War Room
        </a>
      </div>

      <div
        aria-label="Dashboard metrics"
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
          gap: "10px",
        }}
      >
        <MetricTile label="Applications" value={stats.totalApplications} />
        <MetricTile label="In pipeline" value={stats.inPipeline} />
        <MetricTile label="Interviews" value={stats.interviews} />
        <MetricTile label="Response rate" value={`${stats.responseRate}%`} />
      </div>

      <section aria-label="Pipeline status" style={innerPanelStyle}>
        <div className="flex items-center justify-between gap-3">
          <h3 style={sectionTitleStyle}>Pipeline status</h3>
          <span style={monoMutedStyle}>{totalPipeline} active</span>
        </div>
        {totalPipeline === 0 ? (
          <div style={emptyStateStyle}>
            <p style={{ margin: 0, color: "#F5EEE1", fontWeight: 600 }}>
              No active pipeline yet.
            </p>
            <p style={{ margin: "5px 0 0", color: "rgba(245,238,225,0.62)", fontSize: "13px" }}>
              Start in the War Room. The Penthouse will track movement once roles land here.
            </p>
          </div>
        ) : (
          <div style={{ display: "grid", gap: "14px" }}>
            <PipelineNodes pipeline={pipeline} totalPipeline={totalPipeline} />
            <PipelineBar pipeline={pipeline} totalPipeline={totalPipeline} />
          </div>
        )}
      </section>

      <section aria-label="Next actions" style={innerPanelStyle}>
        <h3 style={sectionTitleStyle}>Next actions</h3>
        <div style={{ display: "grid", gap: "8px" }}>
          {nextActions.map((action) => (
            <a key={action.href + action.label} href={action.href} style={actionRowStyle}>
              <span>
                <strong style={{ color: "#F5EEE1", fontWeight: 600 }}>{action.label}</strong>
                <span style={{ display: "block", marginTop: "3px", color: "rgba(245,238,225,0.58)" }}>
                  {action.detail}
                </span>
              </span>
              <span aria-hidden="true" style={{ color: "var(--gold)" }}>
                →
              </span>
            </a>
          ))}
        </div>
      </section>

      <section aria-label="Recent movement" style={innerPanelStyle}>
        <h3 style={sectionTitleStyle}>Recent movement</h3>
        <ActivityFeed activity={activity} />
      </section>

      <div role="group" aria-label="Quick actions">
        <QuickActionsRow />
      </div>
    </section>
  );
}

type NextAction = {
  label: string;
  detail: string;
  href: string;
};

function deriveNextActions(scene: PenthouseScene): NextAction[] {
  const actions: NextAction[] = [];
  if (scene.stats.totalApplications === 0) {
    actions.push({
      label: "Build the first slate",
      detail: "Open Floor 7 and add or discover the roles you want tracked.",
      href: "/war-room",
    });
  }
  if (scene.overnightDelta.importantEmailCount > 0) {
    actions.push({
      label: "Review urgent mail",
      detail: `${scene.overnightDelta.importantEmailCount} important message${scene.overnightDelta.importantEmailCount === 1 ? "" : "s"} need a decision.`,
      href: "/situation-room",
    });
  }
  if (scene.stats.interviews > 0) {
    actions.push({
      label: "Prep interview packets",
      detail: "Turn upcoming interviews into structured practice before the clock gets tight.",
      href: "/briefing-room",
    });
  }
  if (scene.stats.inPipeline > 0) {
    actions.push({
      label: "Clear stuck applications",
      detail: "Scan the active pipeline and decide what needs a follow-up.",
      href: "/war-room",
    });
  }
  actions.push({
    label: "Tune your intake",
    detail: "Update target roles, constraints, and Google connections when your search changes.",
    href: "/settings",
  });
  return actions.slice(0, 4);
}

function emptyBriefingBeats(): MorningBriefing["beats"] {
  return [
    {
      tone: "steady",
      text: "The building has no overnight signal yet.",
    },
    {
      tone: "reflective",
      text: "Add target roles and applications to give the executive desk something real to brief.",
    },
    {
      tone: "warm",
      text: "Your first useful report starts with one clear pipeline move.",
    },
  ];
}

function SignalChip({ label, value }: { label: string; value: number }): JSX.Element {
  return (
    <div
      style={{
        border: "1px solid rgba(255,255,255,0.08)",
        background: "rgba(255,255,255,0.035)",
        borderRadius: "6px",
        padding: "10px",
      }}
    >
      <div style={metricValueStyle}>{value}</div>
      <div style={metricLabelStyle}>{label}</div>
    </div>
  );
}

function MetricTile({ label, value }: { label: string; value: number | string }): JSX.Element {
  return (
    <div
      style={{
        border: "1px solid rgba(201,168,76,0.16)",
        background: "rgba(201,168,76,0.055)",
        borderRadius: "8px",
        padding: "14px 13px",
        minHeight: "86px",
      }}
    >
      <div style={{ ...metricValueStyle, fontSize: "28px", color: "#F5EEE1" }}>
        {value === 0 ? "0" : value}
      </div>
      <div style={metricLabelStyle}>{label}</div>
    </div>
  );
}

function FloorChyron(): JSX.Element {
  return (
    <div
      aria-label="Penthouse — Floor PH"
      style={{
        position: "fixed",
        top: "24px",
        left: "28px",
        zIndex: 6,
        display: "flex",
        alignItems: "center",
        gap: "10px",
        fontFamily: "'JetBrains Mono', monospace",
        fontSize: "11px",
        letterSpacing: "0.3em",
        color: "var(--gold)",
        opacity: 0.65,
        pointerEvents: "none",
        userSelect: "none",
      }}
    >
      <span
        aria-hidden="true"
        style={{ position: "relative", width: "10px", height: "10px" }}
      >
        <span
          style={{
            display: "block",
            width: "6px",
            height: "6px",
            borderRadius: "50%",
            background: "var(--gold)",
            boxShadow: "0 0 8px rgba(201, 168, 76, 0.7)",
            position: "absolute",
            top: "2px",
            left: "2px",
          }}
        />
        <span
          style={{
            position: "absolute",
            inset: 0,
            borderRadius: "50%",
            border: "1px solid rgba(201, 168, 76, 0.45)",
            animation: "pulse-ring-ph 2.6s ease-out infinite",
          }}
        />
      </span>
      <span>FLOOR PH · PENTHOUSE</span>
    </div>
  );
}

const panelStyle = {
  border: "1px solid rgba(201,168,76,0.18)",
  borderRadius: "8px",
  background: "rgba(7, 9, 18, 0.88)",
  boxShadow: "0 30px 80px rgba(0,0,0,0.36)",
  padding: "22px",
  display: "flex",
  flexDirection: "column",
  gap: "18px",
  minWidth: 0,
} satisfies CSSProperties;

const innerPanelStyle = {
  border: "1px solid rgba(255,255,255,0.08)",
  borderRadius: "8px",
  background: "rgba(255,255,255,0.035)",
  padding: "16px",
  display: "grid",
  gap: "14px",
} satisfies CSSProperties;

const panelHeaderStyle = {
  display: "flex",
  justifyContent: "space-between",
  gap: "16px",
  alignItems: "start",
} satisfies CSSProperties;

const eyebrowStyle = {
  margin: "0 0 7px",
  fontFamily: "'JetBrains Mono', monospace",
  fontSize: "10px",
  letterSpacing: "0.18em",
  textTransform: "uppercase",
  color: "var(--gold)",
} satisfies CSSProperties;

const displayHeadingStyle = {
  margin: 0,
  fontFamily: "'Playfair Display', Georgia, serif",
  fontSize: "clamp(26px, 3vw, 36px)",
  lineHeight: 1.05,
  color: "#F5EEE1",
} satisfies CSSProperties;

const statusPillStyle = {
  border: "1px solid rgba(201,168,76,0.22)",
  borderRadius: "999px",
  padding: "6px 10px",
  fontFamily: "'JetBrains Mono', monospace",
  fontSize: "10px",
  letterSpacing: "0.1em",
  textTransform: "uppercase",
  color: "#E8C45A",
  background: "rgba(201,168,76,0.08)",
  whiteSpace: "nowrap",
} satisfies CSSProperties;

const toneLabelStyle = {
  fontFamily: "'JetBrains Mono', monospace",
  fontSize: "10px",
  letterSpacing: "0.12em",
  textTransform: "uppercase",
  color: "rgba(245,238,225,0.46)",
} satisfies CSSProperties;

const sectionTitleStyle = {
  margin: 0,
  fontFamily: "'Playfair Display', Georgia, serif",
  fontSize: "18px",
  color: "#F5EEE1",
} satisfies CSSProperties;

const monoMutedStyle = {
  fontFamily: "'JetBrains Mono', monospace",
  fontSize: "11px",
  color: "rgba(245,238,225,0.48)",
} satisfies CSSProperties;

const metricValueStyle = {
  fontFamily: "'JetBrains Mono', monospace",
  fontSize: "22px",
  fontVariantNumeric: "tabular-nums lining-nums",
  color: "var(--gold)",
  lineHeight: 1,
} satisfies CSSProperties;

const metricLabelStyle = {
  marginTop: "8px",
  fontFamily: "'JetBrains Mono', monospace",
  fontSize: "10px",
  letterSpacing: "0.1em",
  textTransform: "uppercase",
  color: "rgba(245,238,225,0.5)",
} satisfies CSSProperties;

const smallLinkStyle = {
  border: "1px solid rgba(201,168,76,0.22)",
  borderRadius: "6px",
  padding: "8px 10px",
  fontFamily: "'JetBrains Mono', monospace",
  fontSize: "10px",
  letterSpacing: "0.12em",
  textTransform: "uppercase",
  color: "#E8C45A",
  textDecoration: "none",
  background: "rgba(201,168,76,0.08)",
} satisfies CSSProperties;

const emptyStateStyle = {
  border: "1px solid rgba(76,143,212,0.18)",
  borderRadius: "8px",
  background: "rgba(76,143,212,0.07)",
  padding: "14px",
} satisfies CSSProperties;

const actionRowStyle = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: "12px",
  border: "1px solid rgba(255,255,255,0.08)",
  borderRadius: "7px",
  background: "rgba(255,255,255,0.035)",
  padding: "12px 13px",
  textDecoration: "none",
  fontSize: "13px",
  lineHeight: 1.35,
} satisfies CSSProperties;
