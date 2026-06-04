"use client";

import type { JSX } from "react";
import { useEffect, useRef, useState } from "react";

import { initRive, useRive, useStateMachineInput, Fit, Alignment, Layout } from "@/lib/rive-init";

// Configure the self-hosted WASM once. Safe at module scope: this file is only
// ever loaded via next/dynamic({ ssr: false }), so it runs client-side only.
initRive();

/**
 * What the owl.riv should expose. Two tiers:
 *  - v1 (now): just a looping **animation** named `Idle` (the breathe). No state
 *    machine required — Rive plays the animation directly. This is the reliable
 *    first ship; the editor's state-machine tooling is flaky, so we don't depend
 *    on it to get a living owl.
 *  - Stage 2 (later): a state machine named `Owl` with a `greet` (Trigger) and
 *    `hover` (Boolean) input. Pass `stateMachine="Owl"` to switch the owl over to
 *    it and the greet/hover bridge below lights up automatically.
 */
const DEFAULT_ANIMATION = "Idle";
const INPUT_GREET = "greet"; // Trigger  — one-shot greet (Stage 2)
const INPUT_HOVER = "hover"; // Boolean  — pointer-over (Stage 2)

export interface RiveOwlProps {
  /** Path to the rigged owl, e.g. "/brand/owl.riv". */
  src: string;
  /** Square render size in px. */
  size: number;
  /** v1: the looping animation to play (the breathe). Default "Idle". */
  animation?: string;
  /** Stage 2: state-machine name. When set, overrides `animation` and enables greet/hover. */
  stateMachine?: string;
  /** Increment to fire the one-shot greet trigger (Stage 2; no-op without a state machine). */
  greetSignal?: number;
  /** Pointer-over state (Stage 2; no-op without a state machine). */
  hovered?: boolean;
  /** Pause/resume playback (e.g. tab hidden / offscreen). */
  paused?: boolean;
  /** Fired once the .riv has loaded and is rendering. */
  onReady?: () => void;
  /** Fired if the .riv is missing or fails to load (parent keeps the PNG). */
  onFail?: () => void;
  /**
   * Fired once after load with what the file actually contains. Lets the UI tell
   * whether the expected `Idle` animation / `Owl` state machine are present — a
   * mis-named or empty export otherwise fails silently (canvas shows frame 0,
   * nothing plays, and the PNG-identical still hides the mistake).
   */
  onContents?: (contents: { animations: string[]; stateMachines: string[] }) => void;
}

/**
 * RiveOwl — the rigged owl island. Plays the breathe animation (v1) or, when a
 * `stateMachine` is given, runs the state machine and bridges React intent
 * (greet, hover, pause) to its inputs.
 *
 * Intentionally a DEFAULT export and free of app-shell coupling so it can be
 * code-split via next/dynamic({ ssr: false }) — the Rive runtime references
 * `window` at import time and must not run during SSR.
 */
export default function RiveOwl({
  src,
  size,
  animation = DEFAULT_ANIMATION,
  stateMachine,
  greetSignal = 0,
  hovered = false,
  paused = false,
  onReady,
  onFail,
  onContents,
}: RiveOwlProps): JSX.Element {
  const [loaded, setLoaded] = useState(false);
  const reportedRef = useRef(false);
  const { rive, RiveComponent } = useRive({
    src,
    // Drive a state machine if one is named; otherwise just play the animation.
    ...(stateMachine ? { stateMachines: stateMachine } : { animations: animation }),
    autoplay: true,
    layout: new Layout({ fit: Fit.Contain, alignment: Alignment.Center }),
    onLoad: () => setLoaded(true),
    onLoadError: () => onFail?.(),
  });

  // Once the instance is loaded, surface readiness + what the file contains.
  // Done in an effect (not the onLoad callback) because `rive` — and therefore
  // `animationNames`/`stateMachineNames` — is only populated after load. Guarded
  // to fire exactly once.
  useEffect(() => {
    if (!loaded || !rive || reportedRef.current) return;
    reportedRef.current = true;
    onReady?.();
    onContents?.({
      animations: [...(rive.animationNames ?? [])],
      stateMachines: [...(rive.stateMachineNames ?? [])],
    });
  }, [loaded, rive, onReady, onContents]);

  // These resolve to null until a state machine with these inputs exists, so the
  // greet/hover bridge is a safe no-op for the v1 animation-only owl.
  const greet = useStateMachineInput(rive, stateMachine, INPUT_GREET);
  const hover = useStateMachineInput(rive, stateMachine, INPUT_HOVER);

  // Fire the greet trigger whenever the signal advances (skip the initial 0).
  useEffect(() => {
    if (greetSignal > 0) greet?.fire();
  }, [greetSignal, greet]);

  // Map hover intent onto the boolean input. Assigning `.value` on the
  // StateMachineInput is Rive's documented API; the immutability lint rule
  // doesn't model this external-object mutation.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/immutability
    if (hover) hover.value = hovered;
  }, [hovered, hover]);

  // Honour pause/resume (tab hidden, offscreen, reduced-motion safety).
  useEffect(() => {
    if (!rive) return;
    if (paused) rive.pause();
    else rive.play();
  }, [paused, rive]);

  return <RiveComponent style={{ width: size, height: size, display: "block" }} aria-hidden />;
}
