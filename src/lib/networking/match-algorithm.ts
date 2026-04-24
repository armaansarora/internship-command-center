import { counterpartyAnonKey } from "./match-anon";

export interface UserTarget {
  companyName: string;
  insertedAt: string; // ISO timestamp when user targeted this company
}

export interface CounterpartyContact {
  id: string;
  companyName: string | null;
  lastContactAt: string | null;
  ownerUserId: string;
}

export interface MatchCandidate {
  counterpartyAnonKey: string;
  companyContext: string;
  edgeStrength: string; // 0.000-1.000 — numeric as string so it round-trips through PG NUMERIC(4,3)
}

// Exported for testing — not used externally.
export function warmthFactor(lastContactAt: string | null, now: Date): number {
  if (!lastContactAt) return 0.2;
  const ms = now.getTime() - new Date(lastContactAt).getTime();
  const days = ms / 86_400_000;
  if (days < 7) return 1.0;
  if (days < 14) return 0.5;
  return 0.2;
}

export function recencyFactor(insertedAt: string, now: Date): number {
  const days = (now.getTime() - new Date(insertedAt).getTime()) / 86_400_000;
  if (days < 7) return 1.0;
  if (days < 30) return 0.7;
  return 0.4;
}

/**
 * Deterministic ranked match candidates. Pure — no I/O. score = warmth ×
 * company_overlap × recency; company_overlap is 1.0 when the contact's
 * company matches one of the user's targets, else 0 (excluded).
 * Tie-break on counterpartyAnonKey ascending for stable ordering.
 */
export function computeMatchCandidates(opts: {
  userTargets: UserTarget[];
  counterpartyContacts: CounterpartyContact[];
  now: Date;
}): MatchCandidate[] {
  const { userTargets, counterpartyContacts, now } = opts;
  if (userTargets.length === 0) return [];

  const targetsByCompany = new Map<string, UserTarget>();
  for (const t of userTargets) {
    targetsByCompany.set(t.companyName.toLowerCase(), t);
  }

  const candidates: MatchCandidate[] = [];
  for (const c of counterpartyContacts) {
    if (!c.companyName) continue;
    const target = targetsByCompany.get(c.companyName.toLowerCase());
    if (!target) continue; // company_overlap = 0 → exclude

    const score =
      warmthFactor(c.lastContactAt, now) *
      1.0 *
      recencyFactor(target.insertedAt, now);

    candidates.push({
      counterpartyAnonKey: counterpartyAnonKey(c.id),
      companyContext: c.companyName,
      edgeStrength: score.toFixed(3),
    });
  }

  candidates.sort(
    (a, b) =>
      parseFloat(b.edgeStrength) - parseFloat(a.edgeStrength) ||
      a.counterpartyAnonKey.localeCompare(b.counterpartyAnonKey),
  );
  return candidates;
}
