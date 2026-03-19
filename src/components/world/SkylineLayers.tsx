"use client";

import type { JSX } from "react";
import type { FloorId } from "@/types/ui";
import type { SkylineVariant } from "@/hooks/useSkylineVariant";

/**
 * Floor-height mapping: higher floors see more sky, lower floors see more buildings.
 * Value = vertical offset percentage applied to the parallax container.
 */
const FLOOR_HEIGHT: Record<FloorId, number> = {
  PH: 0,    // Penthouse: highest — default framing, most sky
  "7": -3,
  "6": -6,
  "5": -9,
  "4": -12,
  "3": -15,
  "2": -18,
  "1": -21,
  L: -25,   // Lobby: lowest — buildings fill more of the view
};

/**
 * Layer depth configuration for CSS 3D perspective.
 * translateZ determines how much the layer moves with parallax.
 * scale compensates for perspective shrink.
 */
const LAYERS = [
  { name: "sky",  z: -400, scale: 1.4 },
  { name: "far",  z: -300, scale: 1.3 },
  { name: "mid",  z: -150, scale: 1.15 },
  { name: "near", z: -50,  scale: 1.05 },
] as const;

interface SkylineLayersProps {
  variant: SkylineVariant;
  floorId: FloorId;
  parallaxX: number;
  parallaxY: number;
}

/**
 * SkylineLayers — renders 4 depth-separated photo layers in a CSS 3D perspective container.
 *
 * Each layer has a different translateZ, creating natural parallax when the
 * container's rotateX/rotateY changes from mouse movement.
 *
 * Day and night variants are both rendered (for crossfade), with opacity
 * controlled by the parent SkylineScene.
 */
export function SkylineLayers({ variant, floorId, parallaxX, parallaxY }: SkylineLayersProps): JSX.Element {
  const heightOffset = FLOOR_HEIGHT[floorId];

  // Max parallax rotation: ±1.5deg horizontal, ±0.75deg vertical
  const rotateY = parallaxX * 3;   // -1.5 to 1.5
  const rotateX = -parallaxY * 1.5; // -0.75 to 0.75

  return (
    <div
      className="absolute inset-0 overflow-hidden"
      style={{
        perspective: "1000px",
        transformStyle: "preserve-3d",
      }}
    >
      <div
        className="absolute inset-0 will-change-transform"
        style={{
          transformStyle: "preserve-3d",
          transform: `rotateY(${rotateY}deg) rotateX(${rotateX}deg) translateY(${heightOffset}%)`,
          transition: "transform 0.1s linear",
        }}
      >
        {LAYERS.map((layer) => (
          <div
            key={layer.name}
            className="absolute inset-0 will-change-transform"
            style={{
              transform: `translateZ(${layer.z}px) scale(${layer.scale})`,
            }}
          >
            <picture>
              <source
                media="(max-width: 768px)"
                srcSet={`/skyline/${variant}/${layer.name}-mobile.webp`}
                type="image/webp"
              />
              <source
                srcSet={`/skyline/${variant}/${layer.name}.webp`}
                type="image/webp"
              />
              <img
                src={`/skyline/${variant}/${layer.name}.png`}
                alt=""
                aria-hidden="true"
                loading={layer.name === "sky" ? "eager" : "lazy"}
                decoding="async"
                className="absolute inset-0 h-full w-full object-cover"
                style={{
                  // Sky layer fills from top, others position naturally
                  objectPosition: layer.name === "sky" ? "center top" : "center center",
                }}
              />
            </picture>
          </div>
        ))}
      </div>
    </div>
  );
}
