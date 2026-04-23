export type InterruptType =
  | "no_action_verb"
  | "too_much_situation"
  | "no_result"
  | "wrapping_up"
  | "over_time";

export type Firmness = "gentle" | "firm" | "hardass";

export interface InterruptTrigger {
  type: InterruptType;
  prompt: string;
}

export interface DrillState {
  elapsedMs: number;
  lastInterruptAtMs: number | null;
  firmness: Firmness;
  isFirstQuestion: boolean;
  wordCount: number;
  stars: { s: number; t: number; a: number; r: number };
}

const COOLDOWN_MS = 20_000;
const FIRST_QUESTION_GRACE_MS = 15_000;

const FIRMNESS_MULT: Record<Firmness, number> = {
  gentle: 1.5,
  firm: 1.0,
  hardass: 0.6,
};

const PROMPTS: Record<InterruptType, string> = {
  no_action_verb: "I need an Action — a verb. What did YOU do?",
  too_much_situation: "That's the setup. What did YOU do?",
  no_result: "And the Result? I need a number or an outcome.",
  wrapping_up: "Thirty seconds. Land it.",
  over_time: "Time. Wrap it.",
};

export function nextInterrupt(state: DrillState): InterruptTrigger | null {
  const { elapsedMs, lastInterruptAtMs, firmness, isFirstQuestion, wordCount, stars } = state;

  if (isFirstQuestion && elapsedMs < FIRST_QUESTION_GRACE_MS) return null;
  if (lastInterruptAtMs !== null && elapsedMs - lastInterruptAtMs < COOLDOWN_MS) return null;

  const mult = FIRMNESS_MULT[firmness];

  if (elapsedMs > 120_000) return { type: "over_time", prompt: PROMPTS.over_time };
  if (elapsedMs > 90_000) return { type: "wrapping_up", prompt: PROMPTS.wrapping_up };

  // For the first question, once the 15s grace passes, treat the grace itself
  // as the time floor — the drill instructor stops waiting. For any other
  // question, the normal 30s/60s firmness-scaled floors apply.
  const earlyFloorMs = isFirstQuestion ? FIRST_QUESTION_GRACE_MS : 30_000 * mult;
  const lateFloorMs = isFirstQuestion ? FIRST_QUESTION_GRACE_MS : 60_000 * mult;

  // Flat word floor — firmness already scales the time gate. Set low enough
  // that hardass (elapsed 20s, wc 30) fires, while still letting the time
  // gate be the primary rate-limiter for firm/gentle.
  const wordThreshold = 25;

  if (elapsedMs > lateFloorMs && stars.a > 40 && stars.r < 20) {
    return { type: "no_result", prompt: PROMPTS.no_result };
  }
  if (elapsedMs > earlyFloorMs && wordCount > wordThreshold && stars.a < 20) {
    return { type: "no_action_verb", prompt: PROMPTS.no_action_verb };
  }
  if (elapsedMs > earlyFloorMs && stars.s > 60 && stars.t < 20 && stars.a < 20) {
    return { type: "too_much_situation", prompt: PROMPTS.too_much_situation };
  }
  return null;
}
