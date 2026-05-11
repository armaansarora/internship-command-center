"use client";

import { useState, useRef, useEffect, useCallback, type JSX } from "react";
import { useRouter } from "next/navigation";

interface UserMenuProps {
  displayName: string;
  email: string;
  avatarUrl?: string | null;
}

/**
 * UserMenu — account dropdown (top-right of authenticated pages).
 *
 * Shows user avatar/initial, expands to reveal:
 * - Display name + email
 * - Settings link
 * - Sign out action
 *
 * Implements BUG-005 (sign out) and links to BUG-012 (settings).
 * Closes on outside click, Escape key, and after navigation.
 */
export function UserMenu({ displayName, email, avatarUrl }: UserMenuProps): JSX.Element {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  const initial = (displayName || email)[0]?.toUpperCase() ?? "?";

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  // Close on Escape + arrow-key navigation between menu items.
  // ArrowDown/ArrowUp cycle through the [role="menuitem"] children;
  // Home/End jump to first/last. Improves keyboard a11y over the
  // previous "Escape only" behaviour.
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        return;
      }
      const root = menuRef.current;
      if (!root) return;
      const items = Array.from(
        root.querySelectorAll<HTMLElement>('[role="menuitem"]'),
      );
      if (items.length === 0) return;
      const current = document.activeElement as HTMLElement | null;
      const idx = current ? items.indexOf(current) : -1;
      if (e.key === "ArrowDown") {
        e.preventDefault();
        const next = items[idx >= 0 ? (idx + 1) % items.length : 0];
        next?.focus();
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        const next = items[idx > 0 ? idx - 1 : items.length - 1];
        next?.focus();
      } else if (e.key === "Home") {
        e.preventDefault();
        items[0]?.focus();
      } else if (e.key === "End") {
        e.preventDefault();
        items[items.length - 1]?.focus();
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open]);

  // When the menu opens, drop focus on the first menuitem so a keyboard-only
  // user can immediately arrow-navigate or Enter to activate.
  useEffect(() => {
    if (!open) return;
    const root = menuRef.current;
    if (!root) return;
    const firstItem = root.querySelector<HTMLElement>('[role="menuitem"]');
    // Delay so the menu has rendered before focusing.
    const id = window.setTimeout(() => firstItem?.focus(), 30);
    return () => window.clearTimeout(id);
  }, [open]);

  const handleSignOut = useCallback(async () => {
    setOpen(false);
    // POST to signout API route — server handles session cleanup + redirect
    const form = document.createElement("form");
    form.method = "POST";
    form.action = "/api/auth/signout";
    document.body.appendChild(form);
    form.submit();
  }, []);

  const handleSettings = useCallback(() => {
    setOpen(false);
    router.push("/settings");
  }, [router]);

  return (
    <div ref={menuRef} className="relative" style={{ zIndex: 40 }}>
      {/* Trigger button — avatar or initial */}
      <button
        onClick={() => setOpen((prev) => !prev)}
        aria-label="Account menu"
        aria-expanded={open}
        aria-haspopup="menu"
        aria-controls="user-menu-dropdown"
        type="button"
        className="flex items-center justify-center rounded-full transition-all duration-200 focus-visible:outline-2 focus-visible:outline-[var(--gold)] focus-visible:outline-offset-2"
        style={{
          width: "44px",
          height: "44px",
          background: avatarUrl ? "transparent" : "rgba(201, 168, 76, 0.12)",
          border: open
            ? "1.5px solid rgba(201, 168, 76, 0.5)"
            : "1.5px solid rgba(201, 168, 76, 0.2)",
          boxShadow: open
            ? "0 0 12px rgba(201, 168, 76, 0.15)"
            : "none",
        }}
        onMouseEnter={(e) => {
          if (!open) {
            const el = e.currentTarget as HTMLButtonElement;
            el.style.border = "1.5px solid rgba(201, 168, 76, 0.4)";
            el.style.transform = "scale(1.08)";
            el.style.boxShadow = "0 0 12px rgba(201, 168, 76, 0.12)";
          }
        }}
        onMouseLeave={(e) => {
          if (!open) {
            const el = e.currentTarget as HTMLButtonElement;
            el.style.border = "1.5px solid rgba(201, 168, 76, 0.2)";
            el.style.transform = "";
            el.style.boxShadow = "";
          }
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
              fontSize: "14px",
              fontWeight: 600,
              color: "var(--gold)",
              lineHeight: 1,
            }}
          >
            {initial}
          </span>
        )}
      </button>

      {/* Dropdown menu */}
      {open && (
        <div
          id="user-menu-dropdown"
          role="menu"
          aria-label="Account options"
          aria-orientation="vertical"
          className="absolute right-0 mt-2 w-64 rounded-xl overflow-hidden"
          style={{
            background: "rgba(10, 12, 25, 0.92)",
            backdropFilter: "blur(20px) saturate(1.5)",
            WebkitBackdropFilter: "blur(20px) saturate(1.5)",
            border: "1px solid rgba(201, 168, 76, 0.15)",
            boxShadow:
              "0 12px 40px rgba(0, 0, 0, 0.6), 0 0 1px rgba(201, 168, 76, 0.1), inset 0 1px 0 rgba(255, 255, 255, 0.04)",
            animation: "user-menu-enter 150ms ease-out",
          }}
        >
          {/* User info header */}
          <div
            className="px-4 py-3"
            style={{ borderBottom: "1px solid rgba(255, 255, 255, 0.06)" }}
          >
            <div
              style={{
                fontFamily: "'Satoshi', sans-serif",
                fontSize: "13px",
                fontWeight: 600,
                color: "var(--text-primary)",
                lineHeight: 1.3,
                marginBottom: "2px",
              }}
            >
              {displayName}
            </div>
            <div
              style={{
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: "11px",
                color: "var(--text-muted)",
                letterSpacing: "0.02em",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {email}
            </div>
          </div>

          {/* Menu items */}
          <div className="py-1">
            {/* Settings */}
            <button
              role="menuitem"
              onClick={handleSettings}
              className="flex items-center gap-3 w-full px-4 py-2.5 text-left transition-colors duration-150"
              style={{ background: "transparent" }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLButtonElement).style.background =
                  "rgba(201, 168, 76, 0.06)";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLButtonElement).style.background = "transparent";
              }}
            >
              {/* Gear icon */}
              <svg
                width="16"
                height="16"
                viewBox="0 0 16 16"
                fill="none"
                aria-hidden="true"
                style={{ flexShrink: 0 }}
              >
                <path
                  d="M6.5 1.5L6.87 3.13C7.05 3.21 7.22 3.31 7.38 3.42L9 2.94L10.5 5.56L9.17 6.63C9.18 6.75 9.18 6.88 9.17 7L10.5 8.06L9 10.69L7.38 10.21C7.22 10.32 7.05 10.42 6.87 10.5L6.5 12.13H3.5L3.13 10.5C2.95 10.42 2.78 10.32 2.62 10.21L1 10.69L-.5 8.06L.83 7C.82 6.88 .82 6.75 .83 6.63L-.5 5.56L1 2.94L2.62 3.42C2.78 3.31 2.95 3.21 3.13 3.13L3.5 1.5H6.5Z"
                  transform="translate(3 1.19)"
                  stroke="var(--text-secondary)"
                  strokeWidth="1.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <circle
                  cx="8"
                  cy="8"
                  r="2"
                  stroke="var(--text-secondary)"
                  strokeWidth="1.2"
                />
              </svg>
              <span
                style={{
                  fontFamily: "'Satoshi', sans-serif",
                  fontSize: "13px",
                  color: "var(--text-secondary)",
                }}
              >
                Settings
              </span>
            </button>

            {/* Divider */}
            <div
              className="mx-3 my-1"
              style={{ height: "1px", background: "rgba(255, 255, 255, 0.06)" }}
              aria-hidden="true"
            />

            {/* Sign out */}
            <button
              role="menuitem"
              onClick={handleSignOut}
              className="flex items-center gap-3 w-full px-4 py-2.5 text-left transition-colors duration-150"
              style={{ background: "transparent" }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLButtonElement).style.background =
                  "rgba(220, 60, 60, 0.06)";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLButtonElement).style.background = "transparent";
              }}
            >
              {/* Sign out icon */}
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
                  fontSize: "13px",
                  color: "rgba(220, 80, 80, 0.85)",
                }}
              >
                Sign out
              </span>
            </button>
          </div>
        </div>
      )}

      {/* Dropdown entrance animation — gracefully no-ops under
          prefers-reduced-motion via the global override in globals.css. */}
      <style>{`
        @keyframes user-menu-enter {
          from {
            opacity: 0;
            transform: translateY(-4px) scale(0.97);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
        @media (prefers-reduced-motion: reduce) {
          [id="user-menu-dropdown"] {
            animation: none !important;
          }
        }
      `}</style>
    </div>
  );
}
