"use client";

import type { JSX } from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useSoundEngine } from "@/components/world/SoundProvider";

function Volume2Icon(): JSX.Element {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/>
      <path d="M19.07 4.93a10 10 0 0 1 0 14.14"/>
      <path d="M15.54 8.46a5 5 0 0 1 0 7.07"/>
    </svg>
  );
}

function VolumeXIcon(): JSX.Element {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/>
      <line x1="23" y1="9" x2="17" y2="15"/>
      <line x1="17" y1="9" x2="23" y2="15"/>
    </svg>
  );
}

/**
 * SoundToggle — small fixed speaker button (bottom-right).
 * Click toggles sound on/off.
 * Long-press (500ms) or right-click opens an inline volume slider.
 */
export function SoundToggle(): JSX.Element {
  const { enabled, setEnabled, volume, setVolume } = useSoundEngine();
  const [showSlider, setShowSlider] = useState(false);
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const handlePointerDown = useCallback(() => {
    longPressTimer.current = setTimeout(() => {
      setShowSlider((prev) => !prev);
    }, 500);
  }, []);

  const handlePointerUp = useCallback(() => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  }, []);

  const handleClick = useCallback(() => {
    // Only toggle if the long-press didn't fire
    if (!showSlider) {
      setEnabled(!enabled);
    }
  }, [enabled, setEnabled, showSlider]);

  const handleContextMenu = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      setShowSlider((prev) => !prev);
    },
    []
  );

  // Close slider on outside click
  useEffect(() => {
    if (!showSlider) return;

    function handleOutside(e: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setShowSlider(false);
      }
    }

    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, [showSlider]);

  return (
    <div
      ref={containerRef}
      style={{
        position: "fixed",
        bottom: "24px",
        right: "24px",
        zIndex: 9999,
        display: "flex",
        flexDirection: "column",
        alignItems: "flex-end",
        gap: "8px",
      }}
    >
      {/* Volume slider — shown on long-press / right-click */}
      {showSlider && (
        <div
          role="group"
          aria-label="Volume control"
          style={{
            background: "rgba(10, 12, 25, 0.88)",
            backdropFilter: "blur(16px)",
            WebkitBackdropFilter: "blur(16px)",
            border: "1px solid rgba(201, 168, 76, 0.2)",
            borderRadius: "8px",
            padding: "10px 14px",
            display: "flex",
            flexDirection: "column",
            gap: "6px",
            boxShadow: "0 8px 32px rgba(0,0,0,0.45)",
          }}
        >
          <label
            htmlFor="sound-volume-slider"
            style={{
              fontSize: "9px",
              fontFamily: "JetBrains Mono, IBM Plex Mono, monospace",
              color: "rgba(201, 168, 76, 0.8)",
              letterSpacing: "0.1em",
            }}
          >
            VOLUME
          </label>
          <input
            id="sound-volume-slider"
            type="range"
            min={0}
            max={1}
            step={0.05}
            value={volume}
            aria-label="Adjust sound volume"
            onChange={(e) => setVolume(Number(e.target.value))}
            style={{
              width: "80px",
              accentColor: "#C9A84C",
              cursor: "pointer",
            }}
          />
          <span
            aria-live="polite"
            aria-atomic="true"
            style={{
              fontSize: "9px",
              fontFamily: "JetBrains Mono, IBM Plex Mono, monospace",
              color: "rgba(201, 168, 76, 0.6)",
              textAlign: "right",
            }}
          >
            {Math.round(volume * 100)}%
          </span>
        </div>
      )}

      {/* Toggle button */}
      <button
        type="button"
        aria-label={enabled ? "Mute sound" : "Enable sound"}
        aria-pressed={enabled}
        onClick={handleClick}
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
        onContextMenu={handleContextMenu}
        style={{
          width: "36px",
          height: "36px",
          borderRadius: "50%",
          background: "rgba(10, 12, 25, 0.78)",
          backdropFilter: "blur(12px)",
          WebkitBackdropFilter: "blur(12px)",
          border: `1px solid ${enabled ? "rgba(201, 168, 76, 0.35)" : "rgba(255,255,255,0.08)"}`,
          boxShadow: enabled
            ? "0 0 12px rgba(201, 168, 76, 0.15), 0 4px 16px rgba(0,0,0,0.35)"
            : "0 4px 16px rgba(0,0,0,0.3)",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: enabled ? "#C9A84C" : "rgba(255,255,255,0.4)",
          transition: "border-color 0.2s ease, color 0.2s ease, box-shadow 0.2s ease",
        }}
      >
        {enabled ? (
          <Volume2Icon />
        ) : (
          <VolumeXIcon />
        )}
      </button>
    </div>
  );
}
