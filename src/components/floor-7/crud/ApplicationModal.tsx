"use client";

import type { JSX } from "react";
import { forwardRef, useActionState, useEffect, useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import type { Application } from "@/db/schema";

interface ApplicationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (formData: FormData) => Promise<void>;
  application?: Application | null;
}

type FormErrors = Partial<Record<string, string>>;

interface FormState {
  errors: FormErrors;
  /** Increments on every successful submit so the parent can react with onClose. */
  successCount: number;
}

const INITIAL_FORM_STATE: FormState = { errors: {}, successCount: 0 };

function validate(data: FormData): FormErrors {
  const errs: FormErrors = {};
  const company = (data.get("companyName") as string)?.trim();
  const role = (data.get("role") as string)?.trim();
  if (!company) errs.companyName = "Company name is required";
  if (!role) errs.role = "Role is required";
  return errs;
}

const STATUS_OPTIONS = [
  { value: "discovered", label: "RECON — Discovered" },
  { value: "applied", label: "OPS SUBMITTED — Applied" },
  { value: "screening", label: "FIRST CONTACT — Screening" },
  { value: "interview_scheduled", label: "ACTIVE — Interview Scheduled" },
  { value: "interviewing", label: "ACTIVE — Interviewing" },
  { value: "under_review", label: "INTEL REVIEW — Under Review" },
  { value: "offer", label: "MISSION SUCCESS — Offer" },
  { value: "accepted", label: "ACCEPTED" },
  { value: "rejected", label: "REJECTED" },
  { value: "withdrawn", label: "WITHDRAWN" },
];

const labelStyle: React.CSSProperties = {
  display: "block",
  fontFamily: "'IBM Plex Mono', monospace",
  fontSize: "9px",
  fontWeight: 600,
  letterSpacing: "0.12em",
  textTransform: "uppercase",
  color: "#7FB3D3",
  marginBottom: "5px",
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  background: "rgba(10, 22, 40, 0.8)",
  border: "1px solid rgba(30, 58, 95, 0.8)",
  borderRadius: "2px",
  padding: "8px 10px",
  fontFamily: "'Satoshi', sans-serif",
  fontSize: "13px",
  color: "#E8F4FD",
  outline: "none",
  boxSizing: "border-box",
  transition: "border-color 0.15s ease",
};

const inputFocusStyle: React.CSSProperties = {
  borderColor: "rgba(30, 144, 255, 0.6)",
};

const errorStyle: React.CSSProperties = {
  fontFamily: "'IBM Plex Mono', monospace",
  fontSize: "9px",
  color: "#DC3C3C",
  marginTop: "3px",
  letterSpacing: "0.04em",
};

function FieldWrapper({
  label,
  htmlFor,
  children,
  error,
  required,
}: {
  label: string;
  htmlFor: string;
  children: React.ReactNode;
  error?: string;
  required?: boolean;
}): JSX.Element {
  return (
    <div style={{ display: "flex", flexDirection: "column" }}>
      <label htmlFor={htmlFor} style={labelStyle}>
        {label}
        {required && (
          <span aria-hidden="true" style={{ color: "#DC3C3C", marginLeft: "2px" }}>
            *
          </span>
        )}
      </label>
      {children}
      {error && (
        <span role="alert" style={errorStyle}>
          ▸ {error}
        </span>
      )}
    </div>
  );
}

const FocusableInput = forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(function FocusableInput(props, ref) {
  const [focused, setFocused] = useState(false);
  return (
    <input
      ref={ref}
      {...props}
      style={{ ...inputStyle, ...(focused ? inputFocusStyle : {}), ...props.style }}
      onFocus={(e) => {
        setFocused(true);
        props.onFocus?.(e);
      }}
      onBlur={(e) => {
        setFocused(false);
        props.onBlur?.(e);
      }}
    />
  );
});

function FocusableTextarea({
  ...props
}: React.TextareaHTMLAttributes<HTMLTextAreaElement>): JSX.Element {
  const [focused, setFocused] = useState(false);
  return (
    <textarea
      {...props}
      style={{
        ...inputStyle,
        resize: "vertical",
        minHeight: "80px",
        ...(focused ? inputFocusStyle : {}),
        ...props.style,
      }}
      onFocus={(e) => {
        setFocused(true);
        props.onFocus?.(e);
      }}
      onBlur={(e) => {
        setFocused(false);
        props.onBlur?.(e);
      }}
    />
  );
}

function FocusableSelect({
  children,
  ...props
}: React.SelectHTMLAttributes<HTMLSelectElement> & {
  children: React.ReactNode;
}): JSX.Element {
  const [focused, setFocused] = useState(false);
  return (
    <select
      {...props}
      style={{
        ...inputStyle,
        appearance: "none",
        WebkitAppearance: "none",
        backgroundImage: `url("data:image/svg+xml,%3Csvg width='10' height='6' viewBox='0 0 10 6' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M1 1L5 5L9 1' stroke='%237FB3D3' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E")`,
        backgroundRepeat: "no-repeat",
        backgroundPosition: "right 10px center",
        paddingRight: "28px",
        cursor: "pointer",
        ...(focused ? inputFocusStyle : {}),
        ...props.style,
      }}
      onFocus={(e) => {
        setFocused(true);
        props.onFocus?.(e);
      }}
      onBlur={(e) => {
        setFocused(false);
        props.onBlur?.(e);
      }}
    >
      {children}
    </select>
  );
}

// React 19 — `useFormStatus` only reads from the closest enclosing <form>.
// Must be invoked inside a child component, never in the form itself.
function SubmitButton({ isEditing }: { isEditing: boolean }): JSX.Element {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      aria-busy={pending}
      style={{
        padding: "8px 24px",
        background: pending
          ? "rgba(30, 144, 255, 0.3)"
          : "rgba(30, 144, 255, 0.9)",
        border: "1px solid rgba(30, 144, 255, 0.8)",
        borderRadius: "2px",
        fontFamily: "'IBM Plex Mono', monospace",
        fontSize: "10px",
        fontWeight: 700,
        letterSpacing: "0.12em",
        color: pending ? "rgba(232, 244, 253, 0.5)" : "#E8F4FD",
        cursor: pending ? "not-allowed" : "pointer",
        textTransform: "uppercase",
        transition: "background 0.15s ease, color 0.15s ease",
        outline: "none",
      }}
      onMouseEnter={(e) => {
        if (!pending) {
          (e.currentTarget as HTMLButtonElement).style.background =
            "rgba(30, 144, 255, 1)";
        }
      }}
      onMouseLeave={(e) => {
        if (!pending) {
          (e.currentTarget as HTMLButtonElement).style.background =
            "rgba(30, 144, 255, 0.9)";
        }
      }}
      onFocus={(e) => {
        (e.currentTarget as HTMLButtonElement).style.outline = "2px solid rgba(30, 144, 255, 0.7)";
      }}
      onBlur={(e) => {
        (e.currentTarget as HTMLButtonElement).style.outline = "none";
      }}
    >
      {pending
        ? "TRANSMITTING..."
        : isEditing
        ? "AMEND DOSSIER"
        : "FILE DOSSIER"}
    </button>
  );
}

function CancelButton({
  onClose,
}: {
  onClose: () => void;
}): JSX.Element {
  const { pending } = useFormStatus();
  return (
    <button
      type="button"
      onClick={onClose}
      disabled={pending}
      style={{
        padding: "8px 18px",
        background: "transparent",
        border: "1px solid rgba(30, 58, 95, 0.8)",
        borderRadius: "2px",
        fontFamily: "'IBM Plex Mono', monospace",
        fontSize: "10px",
        fontWeight: 600,
        letterSpacing: "0.1em",
        color: pending ? "rgba(127, 179, 211, 0.5)" : "#7FB3D3",
        cursor: pending ? "not-allowed" : "pointer",
        textTransform: "uppercase",
        transition: "border-color 0.15s ease, color 0.15s ease",
        outline: "none",
      }}
      onMouseEnter={(e) => {
        if (pending) return;
        const el = e.currentTarget as HTMLButtonElement;
        el.style.borderColor = "rgba(30, 144, 255, 0.4)";
        el.style.color = "#E8F4FD";
      }}
      onMouseLeave={(e) => {
        if (pending) return;
        const el = e.currentTarget as HTMLButtonElement;
        el.style.borderColor = "rgba(30, 58, 95, 0.8)";
        el.style.color = "#7FB3D3";
      }}
      onFocus={(e) => {
        (e.currentTarget as HTMLButtonElement).style.outline = "2px solid rgba(30, 144, 255, 0.5)";
      }}
      onBlur={(e) => {
        (e.currentTarget as HTMLButtonElement).style.outline = "none";
      }}
    >
      ABORT
    </button>
  );
}

export function ApplicationModal({
  isOpen,
  onClose,
  onSubmit,
  application,
}: ApplicationModalProps): JSX.Element | null {
  const dialogRef = useRef<HTMLDivElement>(null);
  const firstInputRef = useRef<HTMLInputElement>(null);
  const isEditing = Boolean(application);

  // React 19 — useActionState wires our async server action through React's
  // built-in pending/error tracking. Submit button reads `pending` via
  // useFormStatus; we read errors and a successCount sentinel to drive close.
  const [state, formAction] = useActionState<FormState, FormData>(
    async (prev, formData) => {
      const errs = validate(formData);
      if (Object.keys(errs).length > 0) {
        return { errors: errs, successCount: prev.successCount };
      }
      try {
        await onSubmit(formData);
        return { errors: {}, successCount: prev.successCount + 1 };
      } catch {
        return {
          errors: { _form: "Failed to save. Please try again." },
          successCount: prev.successCount,
        };
      }
    },
    INITIAL_FORM_STATE
  );

  const errors = state.errors;
  const lastSuccessRef = useRef(state.successCount);
  useEffect(() => {
    if (state.successCount > lastSuccessRef.current) {
      lastSuccessRef.current = state.successCount;
      onClose();
    }
  }, [state.successCount, onClose]);

  // Focus trap + Escape key
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
        return;
      }

      // Focus trap
      if (e.key === "Tab" && dialogRef.current) {
        const focusableElements = dialogRef.current.querySelectorAll<HTMLElement>(
          'button, input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        const first = focusableElements[0];
        const last = focusableElements[focusableElements.length - 1];

        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last?.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first?.focus();
        }
      }
    };

    document.addEventListener("keydown", handleKeyDown);

    // Auto-focus first input after open
    const timer = setTimeout(() => {
      firstInputRef.current?.focus();
    }, 50);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      clearTimeout(timer);
    };
  }, [isOpen, onClose]);

  // Prevent background scroll
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div
      role="presentation"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9000,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "16px",
      }}
    >
      {/* Backdrop */}
      <div
        aria-hidden="true"
        onClick={onClose}
        style={{
          position: "absolute",
          inset: 0,
          background: "rgba(6, 11, 20, 0.85)",
          backdropFilter: "blur(8px)",
          WebkitBackdropFilter: "blur(8px)",
        }}
      />

      {/* Dialog */}
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        aria-describedby="modal-desc"
        style={{
          position: "relative",
          width: "100%",
          maxWidth: "600px",
          maxHeight: "90vh",
          overflowY: "auto",
          background: "rgba(10, 22, 40, 0.97)",
          backdropFilter: "blur(20px)",
          WebkitBackdropFilter: "blur(20px)",
          border: "1px solid rgba(30, 58, 95, 0.9)",
          borderRadius: "2px",
          scrollbarWidth: "thin",
          scrollbarColor: "rgba(30, 144, 255, 0.2) transparent",
        }}
      >
        {/* Corner bracket decorations */}
        {(["tl", "tr", "bl", "br"] as const).map((pos) => (
          <span
            key={pos}
            aria-hidden="true"
            style={{
              position: "absolute",
              ...(pos.includes("t") ? { top: "8px" } : { bottom: "8px" }),
              ...(pos.includes("l") ? { left: "8px" } : { right: "8px" }),
              width: "12px",
              height: "12px",
              borderTop: pos.includes("t") ? "1px solid rgba(30, 144, 255, 0.5)" : "none",
              borderBottom: pos.includes("b") ? "1px solid rgba(30, 144, 255, 0.5)" : "none",
              borderLeft: pos.includes("l") ? "1px solid rgba(30, 144, 255, 0.5)" : "none",
              borderRight: pos.includes("r") ? "1px solid rgba(30, 144, 255, 0.5)" : "none",
              pointerEvents: "none",
            }}
          />
        ))}

        {/* Header */}
        <div
          style={{
            padding: "16px 20px 12px",
            borderBottom: "1px solid rgba(30, 58, 95, 0.6)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div>
            <div
              style={{
                fontFamily: "'IBM Plex Mono', monospace",
                fontSize: "9px",
                letterSpacing: "0.15em",
                color: "#4A7A9B",
                textTransform: "uppercase",
                marginBottom: "4px",
              }}
            >
              ▸ CLASSIFIED DOSSIER
            </div>
            <h2
              id="modal-title"
              style={{
                fontFamily: "'IBM Plex Mono', monospace",
                fontSize: "14px",
                fontWeight: 700,
                color: "#E8F4FD",
                letterSpacing: "0.06em",
                margin: 0,
              }}
            >
              {isEditing ? "AMEND TARGET DOSSIER" : "INITIATE NEW TARGET"}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close modal"
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: "28px",
              height: "28px",
              background: "transparent",
              border: "1px solid rgba(30, 58, 95, 0.6)",
              borderRadius: "2px",
              cursor: "pointer",
              color: "#7FB3D3",
              padding: 0,
              outline: "none",
              transition: "border-color 0.15s ease, color 0.15s ease",
            }}
            onMouseEnter={(e) => {
              const el = e.currentTarget as HTMLButtonElement;
              el.style.borderColor = "#DC3C3C";
              el.style.color = "#DC3C3C";
            }}
            onMouseLeave={(e) => {
              const el = e.currentTarget as HTMLButtonElement;
              el.style.borderColor = "rgba(30, 58, 95, 0.6)";
              el.style.color = "#7FB3D3";
            }}
            onFocus={(e) => {
              (e.currentTarget as HTMLButtonElement).style.outline = "2px solid rgba(30, 144, 255, 0.5)";
            }}
            onBlur={(e) => {
              (e.currentTarget as HTMLButtonElement).style.outline = "none";
            }}
          >
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
              <path
                d="M2 2L10 10M10 2L2 10"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
            </svg>
          </button>
        </div>

        {/* Form — React 19 server-action style. useFormStatus reads pending. */}
        <form action={formAction} noValidate>
          <div
            style={{
              padding: "16px 20px",
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "14px",
            }}
          >
            {/* Company Name — full width */}
            <div style={{ gridColumn: "1 / -1" }}>
              <FieldWrapper
                label="Company Name"
                htmlFor="companyName"
                error={errors.companyName}
                required
              >
                <FocusableInput
                  ref={firstInputRef}
                  id="companyName"
                  name="companyName"
                  type="text"
                  autoComplete="organization"
                  defaultValue={application?.companyName ?? ""}
                  placeholder="e.g. Google, Jane Street..."
                  aria-required="true"
                  aria-invalid={Boolean(errors.companyName)}
                  aria-describedby={errors.companyName ? "companyName-error" : undefined}
                />
              </FieldWrapper>
            </div>

            {/* Role — full width */}
            <div style={{ gridColumn: "1 / -1" }}>
              <FieldWrapper
                label="Role / Position"
                htmlFor="role"
                error={errors.role}
                required
              >
                <FocusableInput
                  id="role"
                  name="role"
                  type="text"
                  defaultValue={application?.role ?? ""}
                  placeholder="e.g. Software Engineering Intern"
                  aria-required="true"
                  aria-invalid={Boolean(errors.role)}
                />
              </FieldWrapper>
            </div>

            {/* Status */}
            <FieldWrapper label="Status" htmlFor="status">
              <FocusableSelect
                id="status"
                name="status"
                defaultValue={application?.status ?? "discovered"}
                aria-label="Application status"
              >
                {STATUS_OPTIONS.map((opt) => (
                  <option
                    key={opt.value}
                    value={opt.value}
                    style={{ background: "#0A1628" }}
                  >
                    {opt.label}
                  </option>
                ))}
              </FocusableSelect>
            </FieldWrapper>

            {/* Tier */}
            <FieldWrapper label="Priority Tier (1–5)" htmlFor="tier">
              <FocusableSelect
                id="tier"
                name="tier"
                defaultValue={application?.tier?.toString() ?? ""}
                aria-label="Priority tier"
              >
                <option value="" style={{ background: "#0A1628" }}>
                  — Unclassified —
                </option>
                {[1, 2, 3, 4, 5].map((t) => (
                  <option
                    key={t}
                    value={t.toString()}
                    style={{ background: "#0A1628" }}
                  >
                    Tier {t} {t === 1 ? "— PRIORITY" : t === 5 ? "— LOW" : ""}
                  </option>
                ))}
              </FocusableSelect>
            </FieldWrapper>

            {/* URL */}
            <FieldWrapper label="Job Posting URL" htmlFor="url">
              <FocusableInput
                id="url"
                name="url"
                type="url"
                defaultValue={application?.url ?? ""}
                placeholder="https://..."
              />
            </FieldWrapper>

            {/* Source */}
            <FieldWrapper label="Intelligence Source" htmlFor="source">
              <FocusableInput
                id="source"
                name="source"
                type="text"
                defaultValue={application?.source ?? ""}
                placeholder="e.g. LinkedIn, Referral, Cold..."
              />
            </FieldWrapper>

            {/* Location */}
            <FieldWrapper label="Location / Theater" htmlFor="location">
              <FocusableInput
                id="location"
                name="location"
                type="text"
                defaultValue={application?.location ?? ""}
                placeholder="e.g. New York, Remote..."
              />
            </FieldWrapper>

            {/* Salary */}
            <FieldWrapper label="Salary / Compensation" htmlFor="salary">
              <FocusableInput
                id="salary"
                name="salary"
                type="text"
                defaultValue={application?.salary ?? ""}
                placeholder="e.g. $45/hr, $90k..."
              />
            </FieldWrapper>

            {/* Sector */}
            <FieldWrapper label="Sector / Industry" htmlFor="sector">
              <FocusableInput
                id="sector"
                name="sector"
                type="text"
                defaultValue={application?.sector ?? ""}
                placeholder="e.g. Finance, Defense Tech..."
              />
            </FieldWrapper>

            {/* R7.8 — Hard deadline for the application. Optional. Feeds the
                Final Countdown section on Floor 4 + the 3-beat cron. */}
            <FieldWrapper label="Deadline" htmlFor="deadlineAt">
              <FocusableInput
                id="deadlineAt"
                name="deadlineAt"
                type="datetime-local"
                defaultValue={
                  application?.deadlineAt
                    ? new Date(application.deadlineAt).toISOString().slice(0, 16)
                    : ""
                }
                placeholder=""
              />
            </FieldWrapper>

            {/* Notes — full width */}
            <div style={{ gridColumn: "1 / -1" }}>
              <FieldWrapper label="Field Notes / Intelligence" htmlFor="notes">
                <FocusableTextarea
                  id="notes"
                  name="notes"
                  defaultValue={application?.notes ?? ""}
                  placeholder="Interview insights, contacts, relevant intel..."
                  rows={3}
                />
              </FieldWrapper>
            </div>

            {/* Form-level error */}
            {errors._form && (
              <div
                role="alert"
                style={{
                  gridColumn: "1 / -1",
                  padding: "8px 10px",
                  background: "rgba(220, 60, 60, 0.08)",
                  border: "1px solid rgba(220, 60, 60, 0.3)",
                  borderRadius: "2px",
                  fontFamily: "'IBM Plex Mono', monospace",
                  fontSize: "10px",
                  color: "#DC3C3C",
                  letterSpacing: "0.04em",
                }}
              >
                ▸ {errors._form}
              </div>
            )}
          </div>

          {/* Footer actions — buttons read pending from useFormStatus inside the form */}
          <div
            style={{
              padding: "12px 20px 16px",
              borderTop: "1px solid rgba(30, 58, 95, 0.6)",
              display: "flex",
              gap: "10px",
              justifyContent: "flex-end",
              alignItems: "center",
            }}
          >
            <CancelButton onClose={onClose} />
            <SubmitButton isEditing={isEditing} />
          </div>
        </form>

        {/* Screen reader description */}
        <p id="modal-desc" style={{ position: "absolute", left: "-9999px" }}>
          {isEditing
            ? "Edit application form. Fill in the required fields and submit."
            : "Create new application form. Fill in the required fields and submit."}
        </p>
      </div>
    </div>
  );
}
