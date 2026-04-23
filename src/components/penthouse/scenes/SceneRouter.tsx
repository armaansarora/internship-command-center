"use client";
import { type JSX } from "react";
import type { TimeOfDay } from "@/lib/penthouse/time-of-day";
import type { MorningBriefing } from "@/lib/ai/agents/morning-briefing";
import { MorningBriefingScene } from "./morning/MorningBriefingScene";
import { AfternoonScene } from "./afternoon/AfternoonScene";
import { EveningScene } from "./evening/EveningScene";
import { LateNightScene } from "./latenight/LateNightScene";

/**
 * Picks the active Penthouse scene based on the user's current time-of-day
 * window. Each scene is self-contained and receives only what it needs; the
 * router is a pure switch.
 */
interface Props {
  timeOfDay: TimeOfDay;
  briefing: MorningBriefing | null;
  displayName: string;
  changesSinceMorning?: number | null;
  todayTouched?: number;
  onDismiss?: () => void;
}

export function SceneRouter(props: Props): JSX.Element {
  const { timeOfDay, briefing, displayName, changesSinceMorning, todayTouched, onDismiss } = props;

  switch (timeOfDay) {
    case "morning":
      if (briefing) {
        return <MorningBriefingScene briefing={briefing} onDismiss={onDismiss} />;
      }
      // Morning window but no briefing payload — degrade to the afternoon
      // framing so the user still sees a scene, not a blank floor.
      return (
        <AfternoonScene
          displayName={displayName}
          changesSinceMorning={changesSinceMorning}
          onDismiss={onDismiss}
        />
      );
    case "afternoon":
      return (
        <AfternoonScene
          displayName={displayName}
          changesSinceMorning={changesSinceMorning}
          onDismiss={onDismiss}
        />
      );
    case "evening":
      return (
        <EveningScene
          displayName={displayName}
          todayTouched={todayTouched}
          onDismiss={onDismiss}
        />
      );
    case "late-night":
    default:
      return <LateNightScene onDismiss={onDismiss} />;
  }
}
