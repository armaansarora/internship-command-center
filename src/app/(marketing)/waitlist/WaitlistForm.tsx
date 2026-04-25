"use client";

import { useState, useTransition, type FormEvent, type JSX } from "react";
import { joinWaitlist } from "./actions";

type Status =
  | { kind: "idle" }
  | { kind: "submitting" }
  | { kind: "success" }
  | { kind: "error"; message: string };

export function WaitlistForm(): JSX.Element {
  const [status, setStatus] = useState<Status>({ kind: "idle" });
  const [isPending, startTransition] = useTransition();

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (status.kind === "submitting" || isPending) return;
    const form = event.currentTarget;
    const data = new FormData(form);
    setStatus({ kind: "submitting" });
    startTransition(async () => {
      const result = await joinWaitlist(data);
      if (result.ok) {
        setStatus({ kind: "success" });
        form.reset();
      } else {
        setStatus({ kind: "error", message: result.error });
      }
    });
  };

  if (status.kind === "success") {
    return (
      <div
        className="rounded-xl px-6 py-8 text-center"
        role="status"
        aria-live="polite"
        style={{
          background: "rgba(201, 168, 76, 0.08)",
          border: "1px solid rgba(201, 168, 76, 0.3)",
        }}
      >
        <p
          style={{
            fontFamily: "'Playfair Display', serif",
            fontSize: "22px",
            color: "#C9A84C",
            lineHeight: 1.3,
          }}
        >
          You&apos;re on the list.
        </p>
        <p
          className="mt-2"
          style={{
            fontFamily: "'Satoshi', sans-serif",
            fontSize: "14px",
            color: "rgba(255,255,255,0.7)",
            lineHeight: 1.5,
          }}
        >
          When the doorman calls your name, we&apos;ll send the key.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3" noValidate>
      <input type="hidden" name="referrer" value={typeof document !== "undefined" ? document.referrer : ""} />
      <label htmlFor="email" className="sr-only">
        Email address
      </label>
      <div className="flex flex-col gap-2 sm:flex-row">
        <input
          id="email"
          name="email"
          type="email"
          inputMode="email"
          autoComplete="email"
          required
          aria-invalid={status.kind === "error"}
          aria-describedby={status.kind === "error" ? "waitlist-error" : undefined}
          placeholder="you@example.com"
          className="flex-1 rounded-lg px-4 py-3 outline-none transition-all"
          style={{
            fontFamily: "'Satoshi', sans-serif",
            fontSize: "15px",
            background: "rgba(10, 12, 25, 0.7)",
            border: "1px solid rgba(255,255,255,0.12)",
            color: "var(--text-primary)",
          }}
        />
        <button
          type="submit"
          disabled={status.kind === "submitting" || isPending}
          className="rounded-lg px-6 py-3 transition-all disabled:opacity-60"
          style={{
            fontFamily: "'Satoshi', sans-serif",
            fontSize: "14px",
            fontWeight: 600,
            background: "rgba(201, 168, 76, 0.18)",
            border: "1px solid rgba(201, 168, 76, 0.4)",
            color: "#C9A84C",
            cursor: status.kind === "submitting" || isPending ? "wait" : "pointer",
          }}
        >
          {status.kind === "submitting" || isPending ? "Adding…" : "Request key"}
        </button>
      </div>
      {status.kind === "error" && (
        <p
          id="waitlist-error"
          role="alert"
          style={{
            fontFamily: "'Satoshi', sans-serif",
            fontSize: "13px",
            color: "#ef9a9a",
          }}
        >
          {status.message}
        </p>
      )}
    </form>
  );
}
