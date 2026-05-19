"use client";

import type { CSSProperties, JSX, ReactNode } from "react";

interface VisualAssetStageProps {
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
  shadowProfile?: "grounded-premium";
}

const VISUAL_ASSET_STAGE_CSS = `
.tower-visual-asset-stage {
  position: relative;
  display: inline-grid;
  place-items: end center;
  isolation: isolate;
}
.tower-visual-asset-stage__shadow {
  position: absolute;
  left: 50%;
  bottom: 3%;
  width: min(72%, 280px);
  height: 8%;
  min-height: 16px;
  border-radius: 999px;
  background: radial-gradient(ellipse at center, rgba(7, 9, 13, 0.28) 0%, rgba(7, 9, 13, 0.16) 42%, rgba(7, 9, 13, 0) 72%);
  transform: translateX(-50%);
  filter: blur(5px);
  pointer-events: none;
  z-index: 0;
}
.tower-visual-asset-stage__content {
  position: relative;
  z-index: 1;
  display: inline-grid;
  place-items: end center;
}
`;

export function VisualAssetStage({
  children,
  className,
  style,
  shadowProfile = "grounded-premium",
}: VisualAssetStageProps): JSX.Element {
  return (
    <span
      className={["tower-visual-asset-stage", className].filter(Boolean).join(" ")}
      data-visual-stage-shadow={shadowProfile}
      style={style}
    >
      <style>{VISUAL_ASSET_STAGE_CSS}</style>
      <span className="tower-visual-asset-stage__shadow" aria-hidden="true" />
      <span className="tower-visual-asset-stage__content">{children}</span>
    </span>
  );
}
