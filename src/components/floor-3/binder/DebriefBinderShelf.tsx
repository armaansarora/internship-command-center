"use client";

import type { JSX } from "react";
import { useMemo, useState } from "react";
import type { BinderSummary } from "@/lib/db/queries/debriefs-rest";
import { BinderSpine } from "./BinderSpine";
import { BinderOpen } from "./BinderOpen";

/**
 * R6.8 — The Debrief Binder Shelf.
 *
 * A physical shelf of leather-look binders, filed by company. The whole
 * premise is that each binder is a REAL thing on the shelf — the user
 * can see them, count them, watch them age. A JSON dump of debrief
 * records would be the anti-pattern the partner brief explicitly
 * called out.
 *
 * Grouping: binders are grouped by company so the user can scan the
 * shelf and instantly see "I have 3 CBRE binders, 1 Blackstone one."
 * A dashed divider separates each company block. Within a company
 * block, binders are filed adjacent with no gap — they lean against
 * each other the way real binders would.
 *
 * Empty state: an explicit invitation rather than a dead shelf —
 * "SHELF EMPTY // COMPLETE A DRILL TO FILE YOUR FIRST BINDER."
 */

interface Props {
  binders: BinderSummary[];
}

export function DebriefBinderShelf({ binders }: Props): JSX.Element {
  const [openId, setOpenId] = useState<string | null>(null);

  const grouped = useMemo(() => {
    const m = new Map<string, BinderSummary[]>();
    for (const b of binders) {
      const arr = m.get(b.company) ?? [];
      arr.push(b);
      m.set(b.company, arr);
    }
    return Array.from(m.entries());
  }, [binders]);

  const total = binders.length;

  return (
    <section aria-label="Debrief binder shelf" className="flex flex-col gap-2">
      <div
        role="list"
        style={{
          display: "flex",
          alignItems: "flex-end",
          gap: 2,
          padding: "12px 20px 8px",
          background:
            "linear-gradient(to bottom, rgba(34,20,8,0.6), rgba(54,32,12,0.65))",
          borderTop: "2px solid rgba(84,52,20,0.8)",
          borderBottom: "6px solid hsl(22, 42%, 18%)",
          boxShadow: "inset 0 -8px 12px rgba(0,0,0,0.4)",
          minHeight: 196,
          overflowX: "auto",
          overflowY: "visible",
        }}
      >
        {total === 0 ? (
          <span
            role="status"
            style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 10,
              color: "#7a5a3c",
              letterSpacing: "0.12em",
              textTransform: "uppercase",
            }}
          >
            SHELF EMPTY // COMPLETE A DRILL TO FILE YOUR FIRST BINDER
          </span>
        ) : (
          grouped.map(([company, arr], gi) => (
            <div
              key={company}
              role="listitem"
              aria-label={`${company} binders`}
              style={{
                display: "flex",
                gap: 1,
                marginRight: gi < grouped.length - 1 ? 8 : 0,
                borderRight:
                  gi < grouped.length - 1
                    ? "1px dashed rgba(132,86,36,0.4)"
                    : "none",
                paddingRight: gi < grouped.length - 1 ? 4 : 0,
              }}
            >
              {arr.map((b, ai) => {
                const runningIndex =
                  grouped.slice(0, gi).reduce((acc, [, xs]) => acc + xs.length, 0) + ai;
                return (
                  <BinderSpine
                    key={b.id}
                    binder={b}
                    indexFromLeft={runningIndex}
                    totalOnShelf={total}
                    onOpen={setOpenId}
                  />
                );
              })}
            </div>
          ))
        )}
      </div>
      {openId && <BinderOpen binderId={openId} onClose={() => setOpenId(null)} />}
    </section>
  );
}
