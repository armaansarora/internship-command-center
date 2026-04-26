/**
 * Deadline beat detection.
 *
 * Three beats per application deadline: t_24h (24h out), t_4h (4h out),
 * t_0 (deadline itself). Each beat fires exactly once — dedupe via
 * `applications.deadline_alerts_sent` jsonb which stores the ISO
 * timestamp of each beat that already fired.
 *
 * Eligibility windows (open on the far side, closed on the near side):
 *   t_24h : fires when  deadline - 25h ≤ now < deadline -  3h   AND t_24h key missing
 *   t_4h  : fires when  deadline -  5h ≤ now < deadline         AND t_4h  key missing
 *   t_0   : fires when  deadline       ≤ now < deadline +  1h   AND t_0   key missing
 *
 * The 1-hour-after-deadline grace for t_0 catches late cron runs without
 * firing t_0 for apps whose deadline passed days ago.
 */

export type BeatKind = "t_24h" | "t_4h" | "t_0";

export interface DeadlineAppInput {
  id: string;
  company: string;
  deadlineAtMs: number;
  alertsSent: Partial<Record<BeatKind, string>>;
}

export interface BeatFire {
  appId: string;
  company: string;
  kind: BeatKind;
  deadlineAtMs: number;
}

const HOUR_MS = 60 * 60 * 1000;

export function computeEligibleBeats(
  apps: DeadlineAppInput[],
  nowMs: number,
): BeatFire[] {
  const fires: BeatFire[] = [];
  for (const app of apps) {
    const delta = app.deadlineAtMs - nowMs;
    if (!(app.alertsSent.t_24h) && delta <= 25 * HOUR_MS && delta > 3 * HOUR_MS) {
      fires.push({ appId: app.id, company: app.company, kind: "t_24h", deadlineAtMs: app.deadlineAtMs });
      continue;
    }
    if (!(app.alertsSent.t_4h) && delta <= 5 * HOUR_MS && delta > 0) {
      fires.push({ appId: app.id, company: app.company, kind: "t_4h", deadlineAtMs: app.deadlineAtMs });
      continue;
    }
    if (!(app.alertsSent.t_0) && delta <= 0 && delta > -1 * HOUR_MS) {
      fires.push({ appId: app.id, company: app.company, kind: "t_0", deadlineAtMs: app.deadlineAtMs });
    }
  }
  return fires;
}

export function beatCopy(kind: BeatKind, company: string): { title: string; body: string } {
  switch (kind) {
    case "t_24h":
      return { title: `${company} deadline in 24h`, body: `COO left a note on your desk.` };
    case "t_4h":
      return { title: `${company} deadline in 4h`, body: `Last window — decide now.` };
    case "t_0":
      return { title: `${company} deadline now`, body: `The door closes.` };
  }
}
