"use client";

import { useEffect, useMemo, useState, type JSX } from "react";
import dynamic from "next/dynamic";
import { shapeOutreachArcs, type ShapeInput } from "@/lib/situation/outreach-arcs";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { SituationMapList } from "./SituationMapList";

const SituationMapCanvas = dynamic(
  () => import("./SituationMapCanvas").then((m) => m.SituationMapCanvas),
  { ssr: false },
);

export interface SituationMapProps {
  outreach: ShapeInput["outreach"];
  companies: ShapeInput["companies"];
}

/**
 * Dispatcher that chooses Canvas2D vs list fallback. Arrives at one of:
 *   - prefers-reduced-motion → list
 *   - viewport width < 720 → list
 *   - no canvas feature → list
 *   - otherwise → Canvas2D
 *
 * Data shaping happens once per render (memoized on the outreach + companies
 * arrays). nowMs is snapshotted at mount; consumers who need live re-shaping
 * pass new arrays on refresh.
 */
export function SituationMap({ outreach, companies }: SituationMapProps): JSX.Element {
  const reducedMotion = useReducedMotion();
  const [canRenderCanvas, setCanRenderCanvas] = useState<boolean | null>(null);

  useEffect(() => {
    // Feature-detect Canvas2D + viewport width. Runs on mount in the client;
    // during SSR (null) we fall through to the list below.
    const wide = window.matchMedia("(min-width: 720px)").matches;
    let canvasOk = false;
    try {
      const c = document.createElement("canvas");
      canvasOk = !!c.getContext && !!c.getContext("2d");
    } catch {
      canvasOk = false;
    }
    setCanRenderCanvas(wide && canvasOk);
  }, []);

  const shape = useMemo(
    () =>
      shapeOutreachArcs({
        outreach,
        companies,
        nowMs: Date.now(),
      }),
    [outreach, companies],
  );

  const companyNameById = useMemo(() => {
    const map: Record<string, string> = {};
    for (const c of companies) map[c.id] = c.name;
    return map;
  }, [companies]);

  const useCanvas = !reducedMotion && canRenderCanvas === true;

  return (
    <section
      aria-label="Outreach in flight"
      data-situation-map="root"
      style={{
        marginBottom: 18,
      }}
    >
      {useCanvas ? (
        <SituationMapCanvas shape={shape} companyNameById={companyNameById} />
      ) : (
        <SituationMapList shape={shape} companyNameById={companyNameById} />
      )}
    </section>
  );
}
