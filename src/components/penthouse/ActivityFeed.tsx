import { useState, type JSX } from "react";
import type { ActivityItemData } from "@/app/(authenticated)/penthouse/penthouse-data";

/* ──────────────────────────────────────────────────────────────
   TYPES
   ────────────────────────────────────────────────────────────── */

interface ActivityFeedProps {
  activity: ActivityItemData[];
}

interface ActivityRowProps {
  item: ActivityItemData;
  index: number;
}

/* ──────────────────────────────────────────────────────────────
   ACTIVITY DOT — coloured type indicator
   ────────────────────────────────────────────────────────────── */

/**
 * Maps each activity type to a CSS colour token.
 * Hex fallbacks are intentional — these values align with the
 * design tokens: --gold, --info, --success, --warning.
 */
function ActivityDot({ type }: { type: ActivityItemData["type"] }): JSX.Element {
  const colorMap: Record<ActivityItemData["type"], string> = {
    application: "var(--gold)",
    email: "var(--info)",
    interview: "var(--success)",
    follow_up: "var(--warning)",
  };
  const color = colorMap[type];

  return (
    <span
      aria-hidden="true"
      style={{
        display: "inline-block",
        width: "8px",
        height: "8px",
        borderRadius: "50%",
        background: color,
        boxShadow: `0 0 6px ${color}`,
        flexShrink: 0,
        marginTop: "6px",
        position: "relative",
        zIndex: 1,
      }}
    />
  );
}

/* ──────────────────────────────────────────────────────────────
   ACTIVITY ROW — slide-in, hover accent + gold side-rule
   ────────────────────────────────────────────────────────────── */

function ActivityRow({ item, index }: ActivityRowProps): JSX.Element {
  const [hovered, setHovered] = useState(false);

  return (
    <div
      role="listitem"
      className="flex items-start gap-3 p-3 rounded-lg relative overflow-hidden"
      style={{
        border: hovered ? "1px solid rgba(201, 168, 76, 0.2)" : "1px solid transparent",
        /* rgba(201,168,76,…) = --gold */
        background: hovered ? "rgba(201, 168, 76, 0.04)" : "transparent",
        transform: hovered ? "translateX(4px) translateY(-1px)" : "translateX(0) translateY(0)",
        boxShadow: hovered
          ? "0 4px 12px rgba(0, 0, 0, 0.2), 0 0 0 1px rgba(201, 168, 76, 0.08)"
          : "none",
        transition: "all 0.25s ease-out",
        animation: "slide-in-left 0.4s ease-out both",
        animationDelay: `${index * 80}ms`,
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Sliding gold accent rule on hover */}
      <div
        className="absolute left-0 top-0 w-0.5"
        aria-hidden="true"
        style={{
          height: hovered ? "100%" : "0%",
          background: "linear-gradient(to bottom, var(--gold), rgba(201, 168, 76, 0.3))",
          opacity: hovered ? 0.7 : 0,
          transition: "height 0.25s ease-out, opacity 0.25s ease-out",
        }}
      />

      <ActivityDot type={item.type} />

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p className="text-sm truncate" style={{ color: "var(--text-primary)" }}>
          {item.title}
        </p>
        <p className="text-xs" style={{ color: "var(--text-muted)" }}>
          {item.description}
        </p>
      </div>

      {/* Timestamp */}
      <span
        className="shrink-0"
        style={{
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: "10px",
          color: "var(--text-muted)",
        }}
      >
        {item.timestamp}
      </span>
    </div>
  );
}

/* ──────────────────────────────────────────────────────────────
   ACTIVITY FEED — timeline line + list of ActivityRows
   ────────────────────────────────────────────────────────────── */

/**
 * ActivityFeed renders the "Recent Activity" list with:
 *  - an empty state with radar-pulse animation when no items exist
 *  - a gold gradient vertical timeline line
 *  - staggered slide-in ActivityRow items
 */
export function ActivityFeed({ activity }: ActivityFeedProps): JSX.Element {
  if (activity.length === 0) {
    return (
      <div className="flex flex-col items-center gap-4 py-10 text-center">
        {/* Pulsing radar animation */}
        <div aria-hidden="true" style={{ position: "relative", width: "56px", height: "56px" }}>
          {([0, 0.5, 1] as const).map((delay, i) => (
            <div
              key={i}
              style={{
                position: "absolute",
                inset: 0,
                borderRadius: "50%",
                /* rgba(201,168,76,…) = --gold */
                border: "1.5px solid rgba(201,168,76,0.4)",
                animation: `radar-pulse 2.5s ease-out infinite ${delay}s`,
              }}
            />
          ))}
          <div
            style={{
              position: "absolute",
              inset: "22px",
              borderRadius: "50%",
              background: "var(--gold)",
              opacity: 0.6,
            }}
          />
        </div>
        <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
          No activity yet. Your timeline will populate as you use The Tower.
        </p>
      </div>
    );
  }

  return (
    <div
      className="relative"
      role="list"
      aria-label="Recent activity list"
      style={{ paddingLeft: "20px" }}
    >
      {/* Vertical gold gradient timeline line */}
      <div
        aria-hidden="true"
        style={{
          position: "absolute",
          left: "3px",
          top: "8px",
          bottom: "8px",
          width: "1px",
          /* rgba(201,168,76,…) = --gold */
          background:
            "linear-gradient(to bottom, var(--gold), rgba(201,168,76,0.3), transparent)",
          opacity: 0.4,
        }}
      />
      <div className="space-y-1">
        {activity.map((item, i) => (
          <ActivityRow key={item.id} item={item} index={i} />
        ))}
      </div>
    </div>
  );
}
