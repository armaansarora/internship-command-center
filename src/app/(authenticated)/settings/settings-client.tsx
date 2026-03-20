"use client";

import { useCallback, type JSX } from "react";

interface SettingsClientProps {
  userName: string | null;
  userEmail: string;
  avatarUrl?: string | null;
  provider: string;
}

/**
 * SettingsClient — account management and preferences.
 *
 * Sections:
 * 1. Profile overview (name, email, provider)
 * 2. Appearance (theme toggle — BUG-011)
 * 3. Account actions (sign out — BUG-005, data export placeholder)
 *
 * Theme is currently stored in localStorage only. When user_profiles
 * table gets a preferences column, migrate to server-persisted preference.
 */
export function SettingsClient({
  userName,
  userEmail,
  avatarUrl,
  provider,
}: SettingsClientProps): JSX.Element {
  const displayName = userName ?? userEmail.split("@")[0];
  const initial = displayName[0]?.toUpperCase() ?? "?";

  const handleSignOut = useCallback(() => {
    const form = document.createElement("form");
    form.method = "POST";
    form.action = "/api/auth/signout";
    document.body.appendChild(form);
    form.submit();
  }, []);

  return (
    <div className="relative flex min-h-dvh flex-col items-start gap-8 p-8 md:p-12 max-w-2xl mx-auto">
      {/* Page header */}
      <div className="w-full">
        <div className="flex items-center gap-2 mb-2">
          <span
            style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: "11px",
              color: "var(--gold)",
              letterSpacing: "0.15em",
              textTransform: "uppercase",
            }}
          >
            Account
          </span>
        </div>
        <h1
          style={{
            fontFamily: "'Playfair Display', serif",
            fontSize: "clamp(1.5rem, 3vw, 2rem)",
            color: "var(--text-primary)",
            lineHeight: 1.2,
          }}
        >
          Settings
        </h1>
      </div>

      {/* ── Section 1: Profile ── */}
      <section className="w-full" aria-labelledby="section-profile">
        <h2
          id="section-profile"
          className="mb-4"
          style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: "10px",
            color: "var(--gold)",
            letterSpacing: "0.2em",
            textTransform: "uppercase",
          }}
        >
          Profile
        </h2>
        <div
          className="rounded-xl p-5"
          style={{
            background: "rgba(10, 12, 25, 0.65)",
            backdropFilter: "blur(16px)",
            WebkitBackdropFilter: "blur(16px)",
            border: "1px solid rgba(201, 168, 76, 0.1)",
            boxShadow:
              "0 4px 24px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.03)",
          }}
        >
          <div className="flex items-center gap-4">
            {/* Avatar */}
            <div
              className="flex items-center justify-center rounded-full shrink-0"
              style={{
                width: "52px",
                height: "52px",
                background: avatarUrl
                  ? "transparent"
                  : "rgba(201, 168, 76, 0.12)",
                border: "2px solid rgba(201, 168, 76, 0.2)",
              }}
            >
              {avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={avatarUrl}
                  alt={displayName}
                  className="w-full h-full rounded-full object-cover"
                />
              ) : (
                <span
                  style={{
                    fontFamily: "'Satoshi', sans-serif",
                    fontSize: "20px",
                    fontWeight: 600,
                    color: "var(--gold)",
                  }}
                >
                  {initial}
                </span>
              )}
            </div>
            <div className="min-w-0">
              <div
                style={{
                  fontFamily: "'Satoshi', sans-serif",
                  fontSize: "16px",
                  fontWeight: 600,
                  color: "var(--text-primary)",
                  lineHeight: 1.3,
                }}
              >
                {displayName}
              </div>
              <div
                style={{
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: "12px",
                  color: "var(--text-muted)",
                  letterSpacing: "0.02em",
                  marginTop: "2px",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {userEmail}
              </div>
              <div
                className="mt-1 inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5"
                style={{
                  background: "rgba(201, 168, 76, 0.08)",
                  border: "1px solid rgba(201, 168, 76, 0.12)",
                }}
              >
                {/* Provider icon */}
                {provider === "google" && (
                  <svg width="12" height="12" viewBox="0 0 24 24" aria-hidden="true">
                    <path
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
                      fill="#4285F4"
                    />
                    <path
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                      fill="#34A853"
                    />
                    <path
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                      fill="#FBBC05"
                    />
                    <path
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                      fill="#EA4335"
                    />
                  </svg>
                )}
                <span
                  style={{
                    fontFamily: "'JetBrains Mono', monospace",
                    fontSize: "10px",
                    color: "var(--text-muted)",
                    letterSpacing: "0.06em",
                    textTransform: "capitalize",
                  }}
                >
                  {provider}
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Section 2: Account Actions ── */}
      <section className="w-full" aria-labelledby="section-account">
        <h2
          id="section-account"
          className="mb-4"
          style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: "10px",
            color: "var(--gold)",
            letterSpacing: "0.2em",
            textTransform: "uppercase",
          }}
        >
          Account
        </h2>
        <div
          className="rounded-xl overflow-hidden"
          style={{
            background: "rgba(10, 12, 25, 0.65)",
            backdropFilter: "blur(16px)",
            WebkitBackdropFilter: "blur(16px)",
            border: "1px solid rgba(201, 168, 76, 0.1)",
            boxShadow:
              "0 4px 24px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.03)",
          }}
        >
          {/* Data export placeholder */}
          <div
            className="flex items-center justify-between px-5 py-4"
            style={{ borderBottom: "1px solid rgba(255, 255, 255, 0.04)" }}
          >
            <div>
              <div
                style={{
                  fontFamily: "'Satoshi', sans-serif",
                  fontSize: "14px",
                  fontWeight: 500,
                  color: "var(--text-primary)",
                  lineHeight: 1.3,
                }}
              >
                Export Data
              </div>
              <div
                className="mt-0.5"
                style={{
                  fontFamily: "'Satoshi', sans-serif",
                  fontSize: "13px",
                  color: "var(--text-muted)",
                }}
              >
                Download all your application data as JSON
              </div>
            </div>
            <span
              style={{
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: "10px",
                color: "var(--text-muted)",
                letterSpacing: "0.1em",
                textTransform: "uppercase",
              }}
            >
              Coming Soon
            </span>
          </div>

          {/* Notification preferences placeholder */}
          <div
            className="flex items-center justify-between px-5 py-4"
            style={{ borderBottom: "1px solid rgba(255, 255, 255, 0.04)" }}
          >
            <div>
              <div
                style={{
                  fontFamily: "'Satoshi', sans-serif",
                  fontSize: "14px",
                  fontWeight: 500,
                  color: "var(--text-primary)",
                  lineHeight: 1.3,
                }}
              >
                Notifications
              </div>
              <div
                className="mt-0.5"
                style={{
                  fontFamily: "'Satoshi', sans-serif",
                  fontSize: "13px",
                  color: "var(--text-muted)",
                }}
              >
                Configure email and in-app notification preferences
              </div>
            </div>
            <span
              style={{
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: "10px",
                color: "var(--text-muted)",
                letterSpacing: "0.1em",
                textTransform: "uppercase",
              }}
            >
              Coming Soon
            </span>
          </div>

          {/* Connected services placeholder */}
          <div
            className="flex items-center justify-between px-5 py-4"
            style={{ borderBottom: "1px solid rgba(255, 255, 255, 0.04)" }}
          >
            <div>
              <div
                style={{
                  fontFamily: "'Satoshi', sans-serif",
                  fontSize: "14px",
                  fontWeight: 500,
                  color: "var(--text-primary)",
                  lineHeight: 1.3,
                }}
              >
                Connected Services
              </div>
              <div
                className="mt-0.5"
                style={{
                  fontFamily: "'Satoshi', sans-serif",
                  fontSize: "13px",
                  color: "var(--text-muted)",
                }}
              >
                Gmail, Google Calendar, and other integrations
              </div>
            </div>
            <span
              style={{
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: "10px",
                color: "var(--text-muted)",
                letterSpacing: "0.1em",
                textTransform: "uppercase",
              }}
            >
              Coming Soon
            </span>
          </div>

          {/* Sign out */}
          <button
            onClick={handleSignOut}
            className="flex items-center gap-3 w-full px-5 py-4 text-left transition-colors duration-150"
            style={{ background: "transparent" }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLButtonElement).style.background =
                "rgba(220, 60, 60, 0.04)";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.background =
                "transparent";
            }}
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 16 16"
              fill="none"
              aria-hidden="true"
              style={{ flexShrink: 0 }}
            >
              <path
                d="M6 14H3.33C2.6 14 2 13.4 2 12.67V3.33C2 2.6 2.6 2 3.33 2H6M10.67 11.33L14 8L10.67 4.67M14 8H6"
                stroke="rgba(220, 80, 80, 0.8)"
                strokeWidth="1.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            <span
              style={{
                fontFamily: "'Satoshi', sans-serif",
                fontSize: "14px",
                fontWeight: 500,
                color: "rgba(220, 80, 80, 0.85)",
              }}
            >
              Sign Out
            </span>
          </button>
        </div>
      </section>

      {/* Bottom spacer for mobile nav bar */}
      <div className="h-20 md:h-8" aria-hidden="true" />
    </div>
  );
}
