"use client";

import type { CSSProperties, JSX } from "react";
import { VisualAssetImage } from "./VisualAssetImage";
import {
  getCharacterAsset,
  getCharacterVisualMetadata,
  type CharacterId,
  type CharacterOutfitVariant,
  type CharacterPose,
} from "@/lib/visual-assets";

interface CharacterSpriteProps {
  characterId: CharacterId;
  pose: CharacterPose;
  outfitVariant?: CharacterOutfitVariant;
  state?: string;
  "aria-label": string;
  className?: string;
  priority?: boolean;
  style?: CSSProperties;
}

export function CharacterSprite({
  characterId,
  pose,
  outfitVariant = "regular",
  state,
  "aria-label": ariaLabel,
  className,
  priority = false,
  style,
}: CharacterSpriteProps): JSX.Element {
  const asset = getCharacterAsset(characterId, pose, outfitVariant);
  const character = getCharacterVisualMetadata(characterId);
  const frameStyle: CSSProperties = {
    display: "inline-grid",
    placeItems: "center",
    width: `${character.displayFrame.width}px`,
    height: `${character.displayFrame.height}px`,
    maxWidth: "44vw",
    position: "relative",
    ...style,
  };

  if (asset) {
    return (
      <div
        role="img"
        aria-label={ariaLabel}
        data-character-outfit={outfitVariant}
        data-character-pose={pose}
        data-character-state={state}
        className={className}
        style={frameStyle}
      >
        <VisualAssetImage
          asset={asset}
          priority={priority}
          sizes="(max-width: 760px) 42vw, 220px"
          style={{
            display: "block",
            width: "100%",
            height: "100%",
            objectFit: "contain",
          }}
        />
      </div>
    );
  }

  return (
    <div
      role="img"
      aria-label={`${ariaLabel}. Final generated art pending approval.`}
      data-visual-asset-fallback={characterId}
      data-character-outfit={outfitVariant}
      data-character-pose={pose}
      data-character-state={state}
      className={className}
      style={frameStyle}
    >
      <div
        aria-hidden="true"
        style={{
          position: "absolute",
          inset: "8% 18% 20%",
          borderRadius: "999px 999px 30px 30px",
          background: `linear-gradient(180deg, ${character.accent}, rgba(5, 6, 13, 0.72))`,
          boxShadow: `0 0 34px color-mix(in srgb, ${character.accent} 38%, transparent)`,
          opacity: 0.78,
        }}
      />
      <div
        aria-hidden="true"
        style={{
          position: "absolute",
          top: "16%",
          width: "58px",
          height: "58px",
          borderRadius: "50%",
          background: `radial-gradient(circle at 42% 38%, #f7ead0 0 4px, transparent 5px), ${character.accent}`,
          boxShadow: `0 0 22px color-mix(in srgb, ${character.accent} 45%, transparent)`,
        }}
      />
      <div
        aria-hidden="true"
        style={{
          position: "absolute",
          left: "16%",
          right: "16%",
          bottom: characterId === "otis" ? "8%" : "10%",
          height: characterId === "otis" ? "26%" : "9%",
          borderRadius: "6px",
          border: `1px solid color-mix(in srgb, ${character.accent} 42%, transparent)`,
          background:
            characterId === "otis"
              ? "linear-gradient(180deg, rgba(61,22,24,0.96), rgba(20,6,8,0.98))"
              : "rgba(8, 10, 20, 0.8)",
        }}
      />
      <span
        aria-hidden="true"
        style={{
          position: "absolute",
          bottom: characterId === "otis" ? "17%" : "14%",
          padding: "4px 8px",
          borderRadius: "999px",
          border: `1px solid color-mix(in srgb, ${character.accent} 46%, transparent)`,
          background: "rgba(5, 6, 13, 0.78)",
          color: "#F5EEE1",
          fontFamily: "JetBrains Mono, IBM Plex Mono, monospace",
          fontSize: "10px",
          letterSpacing: "0.14em",
        }}
      >
        {character.shortLabel}
      </span>
    </div>
  );
}
