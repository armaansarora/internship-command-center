"use client";

import type { JSX } from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { OfferRow } from "@/lib/db/queries/offers-rest";
import type {
  HistoryTurn,
  SimulateTurnScoring,
  Stance,
} from "@/lib/ai/structured/simulator-turn";
import { TurnScoreBadge } from "./TurnScoreBadge";

/**
 * R10.13 — NegotiationSimulator.
 *
 * Turn-based practice surface. Three phases: stance (form), round (dialogue),
 * done (aggregate + reset). All state is local React state — simulations
 * are ephemeral practice, not persisted.
 *
 * Stance priors: anchor = offer.base, flex = 5% of base, walkaway = 90%
 * of base. User can edit before starting.
 *
 * The opening POST (round 0) sends userReply=null; the server/helper knows
 * to open at 5-10% below offer.base. Subsequent rounds include the user's
 * latest reply + full history for context. When the server returns
 * `done: true`, we flip to the done phase and show Start over.
 */

interface Props {
  offer: OfferRow;
  endpoint?: string;
}

type Phase = "stance" | "round" | "done";

interface ScoredTurn {
  scoring: SimulateTurnScoring;
  round: number;
}

export function NegotiationSimulator({ offer, endpoint }: Props): JSX.Element {
  const priors = useMemo<Stance>(
    () => ({
      anchor: offer.base,
      flex: Math.round(offer.base * 0.05),
      walkaway: Math.round(offer.base * 0.9),
    }),
    [offer.base],
  );

  const [phase, setPhase] = useState<Phase>("stance");
  const [stance, setStance] = useState<Stance>(priors);
  const [history, setHistory] = useState<HistoryTurn[]>([]);
  const [scores, setScores] = useState<ScoredTurn[]>([]);
  const [pending, setPending] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const dialogRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const el = dialogRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior: "auto" });
  }, [history]);

  const url = endpoint ?? `/api/offers/${offer.id}/simulate`;

  const sendTurn = useCallback(
    async (userReply: string | null): Promise<void> => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(url, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            stance,
            history: userReply
              ? [...history, { role: "user", text: userReply }]
              : history,
            userReply,
          }),
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const body = (await res.json()) as {
          recruiterReply: string;
          scoring: SimulateTurnScoring | null;
          round: number;
          done: boolean;
        };
        setHistory((prev) => {
          const withUser = userReply
            ? [...prev, { role: "user" as const, text: userReply }]
            : prev;
          return [
            ...withUser,
            { role: "recruiter" as const, text: body.recruiterReply },
          ];
        });
        if (body.scoring) {
          setScores((prev) => [
            ...prev,
            { scoring: body.scoring!, round: body.round },
          ]);
        }
        setPending("");
        setPhase(body.done ? "done" : "round");
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        setError(message);
      } finally {
        setLoading(false);
      }
    },
    [url, stance, history],
  );

  const onStart = useCallback((): void => {
    setPhase("round");
    void sendTurn(null);
  }, [sendTurn]);

  const onSend = useCallback((): void => {
    if (!pending.trim()) return;
    void sendTurn(pending.trim());
  }, [pending, sendTurn]);

  const onReset = useCallback((): void => {
    setPhase("stance");
    setStance(priors);
    setHistory([]);
    setScores([]);
    setPending("");
    setError(null);
  }, [priors]);

  const aggregate = useMemo(() => {
    if (scores.length === 0) {
      return { anchor: 0, concession: 0, walkaway: 0 };
    }
    const sum = scores.reduce(
      (acc, s) => ({
        anchor: acc.anchor + s.scoring.anchorScore,
        concession: acc.concession + s.scoring.concessionScore,
        walkaway: acc.walkaway + s.scoring.walkawayScore,
      }),
      { anchor: 0, concession: 0, walkaway: 0 },
    );
    return {
      anchor: sum.anchor / scores.length,
      concession: sum.concession / scores.length,
      walkaway: sum.walkaway / scores.length,
    };
  }, [scores]);

  return (
    <section
      role="region"
      aria-label="Negotiation simulator"
      className="parlor-simulator"
      data-phase={phase}
    >
      <header className="parlor-simulator-header">
        <h3>Negotiation practice</h3>
        <span className="parlor-simulator-tag">R10.13 · PRACTICE</span>
      </header>

      {phase === "stance" && (
        <div className="parlor-simulator-stance">
          <p className="parlor-simulator-stance-copy">
            Set your coaching targets. The recruiter opens 5–10% below the
            real offer of ${offer.base.toLocaleString()} to pressure-test your
            anchor.
          </p>
          <div className="parlor-simulator-stance-fields">
            <label>
              <span>Anchor ($)</span>
              <input type="number" name="anchor" value={stance.anchor}
                onChange={(e) => setStance((s) => ({ ...s, anchor: Number(e.target.value) }))} />
            </label>
            <label>
              <span>Flex ($)</span>
              <input type="number" name="flex" value={stance.flex}
                onChange={(e) => setStance((s) => ({ ...s, flex: Number(e.target.value) }))} />
            </label>
            <label>
              <span>Walkaway ($)</span>
              <input type="number" name="walkaway" value={stance.walkaway}
                onChange={(e) => setStance((s) => ({ ...s, walkaway: Number(e.target.value) }))} />
            </label>
          </div>
          <button type="button" className="parlor-simulator-start"
            data-testid="sim-start" onClick={onStart}>
            Start simulation
          </button>
        </div>
      )}

      {phase !== "stance" && (
        <div ref={dialogRef} className="parlor-simulator-dialog" role="log" aria-live="polite">
          {(() => {
            let userTurnCount = 0;
            return history.map((turn, i) => {
              const isUserTurn = turn.role === "user";
              if (isUserTurn) userTurnCount += 1;
              // Server returns `round` = N for the Nth user turn scored.
              const score = isUserTurn
                ? scores.find((s) => s.round === userTurnCount)
                : undefined;
              return (
                <div key={i} className={`parlor-simulator-turn parlor-simulator-turn-${turn.role}`}>
                  <span className="parlor-simulator-turn-role">
                    {turn.role === "recruiter" ? "Recruiter" : "You"}
                  </span>
                  <p className="parlor-simulator-turn-text">{turn.text}</p>
                  {isUserTurn && score ? (
                    <TurnScoreBadge round={score.round} scoring={score.scoring} />
                  ) : null}
                </div>
              );
            });
          })()}
          {loading && (
            <p className="parlor-simulator-loading" aria-live="polite">Drafting…</p>
          )}
          {error && (
            <p role="alert" className="parlor-simulator-error">Turn failed: {error}</p>
          )}
        </div>
      )}

      {phase === "round" && (
        <div className="parlor-simulator-compose">
          <textarea data-testid="sim-reply-input" value={pending}
            onChange={(e) => setPending(e.target.value)}
            placeholder="Your counter…" rows={3} />
          <button type="button" data-testid="sim-send" onClick={onSend}
            disabled={loading || !pending.trim()}>
            Send
          </button>
        </div>
      )}

      {phase === "done" && (
        <div className="parlor-simulator-done">
          <p className="parlor-simulator-done-copy">
            Simulation complete. Aggregate — A {aggregate.anchor.toFixed(1)} ·
            C {aggregate.concession.toFixed(1)} · W {aggregate.walkaway.toFixed(1)}.
          </p>
          <button type="button" data-testid="sim-reset" onClick={onReset}
            className="parlor-simulator-reset">
            Start over
          </button>
        </div>
      )}
    </section>
  );
}
