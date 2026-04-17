"use client";

import type { JSX } from "react";
import { useActionState, useEffect, useRef, useState, useCallback } from "react";
import { useFormStatus } from "react-dom";
import { z } from "zod/v4";
import type { ContactForAgent } from "@/lib/db/queries/contacts-rest";

// ---------------------------------------------------------------------------
// Validation schema (Zod v4)
// ---------------------------------------------------------------------------
const ContactFormSchema = z.object({
  name: z.string().min(1, "Name is required").max(120, "Name too long"),
  email: z.string().email("Invalid email").optional().or(z.literal("")),
  title: z.string().max(120, "Title too long").optional().or(z.literal("")),
  companyId: z.string().optional().or(z.literal("")),
  relationship: z
    .enum(["alumni", "recruiter", "referral", "cold", "warm_intro", ""])
    .optional(),
  phone: z.string().max(30, "Phone too long").optional().or(z.literal("")),
  linkedinUrl: z
    .string()
    .url("Invalid LinkedIn URL")
    .optional()
    .or(z.literal("")),
  introducedBy: z.string().max(200, "Too long").optional().or(z.literal("")),
  notes: z.string().max(2000, "Notes too long").optional().or(z.literal("")),
});

type ContactFormData = z.infer<typeof ContactFormSchema>;
type FormErrors = Partial<Record<keyof ContactFormData, string>>;

interface FormState {
  errors: FormErrors;
  /** Increments on every successful submit so the host can react with onClose. */
  successCount: number;
}

const INITIAL_FORM_STATE: FormState = { errors: {}, successCount: 0 };

function parseAndValidate(formData: FormData): {
  ok: true;
  data: ContactFormData;
} | { ok: false; errors: FormErrors } {
  const raw: ContactFormData = {
    name: (formData.get("name") as string) ?? "",
    email: (formData.get("email") as string) ?? "",
    title: (formData.get("title") as string) ?? "",
    companyId: (formData.get("companyId") as string) ?? "",
    relationship: (formData.get("relationship") as ContactFormData["relationship"]) ?? "",
    phone: (formData.get("phone") as string) ?? "",
    linkedinUrl: (formData.get("linkedinUrl") as string) ?? "",
    introducedBy: (formData.get("introducedBy") as string) ?? "",
    notes: (formData.get("notes") as string) ?? "",
  };

  const result = ContactFormSchema.safeParse(raw);
  if (!result.success) {
    const fieldErrors: FormErrors = {};
    for (const issue of result.error.issues) {
      const key = issue.path[0] as keyof ContactFormData;
      if (key) fieldErrors[key] = issue.message;
    }
    return { ok: false, errors: fieldErrors };
  }
  return { ok: true, data: raw };
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------
interface ContactModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (formData: FormData) => Promise<void>;
  onDelete?: (contactId: string) => Promise<void>;
  contact?: ContactForAgent | null;
  companies?: Array<{ id: string; name: string }>;
}

// ---------------------------------------------------------------------------
// Style helpers
// ---------------------------------------------------------------------------
const labelStyle: React.CSSProperties = {
  display: "block",
  fontFamily: "IBM Plex Mono, monospace",
  fontSize: "9px",
  fontWeight: 600,
  letterSpacing: "0.12em",
  textTransform: "uppercase",
  color: "#C4925A",
  marginBottom: "5px",
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  background: "rgba(35, 21, 8, 0.8)",
  border: "1px solid rgba(92, 58, 30, 0.8)",
  borderRadius: "2px",
  padding: "8px 10px",
  fontFamily: "'Satoshi', sans-serif",
  fontSize: "13px",
  color: "#FDF3E8",
  outline: "none",
  boxSizing: "border-box",
  transition: "border-color 0.15s ease",
};

const inputFocusStyle: React.CSSProperties = {
  borderColor: "rgba(201, 168, 76, 0.6)",
};

const errorStyle: React.CSSProperties = {
  fontFamily: "IBM Plex Mono, monospace",
  fontSize: "9px",
  color: "#EF4444",
  marginTop: "3px",
  letterSpacing: "0.04em",
};

// ---------------------------------------------------------------------------
// Field component
// ---------------------------------------------------------------------------
function Field({
  id,
  label,
  error,
  children,
}: {
  id: string;
  label: string;
  error?: string;
  children: React.ReactNode;
}): JSX.Element {
  return (
    <div style={{ display: "flex", flexDirection: "column" }}>
      <label htmlFor={id} style={labelStyle}>
        {label}
      </label>
      {children}
      {error && (
        <span role="alert" style={errorStyle}>
          {error}
        </span>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// React 19 form-status-aware buttons. Must be rendered as descendants of the
// <form>; they read pending state from the closest enclosing form.
// ---------------------------------------------------------------------------
function ContactSubmitButton({ isEditing }: { isEditing: boolean }): JSX.Element {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      aria-busy={pending}
      aria-label={isEditing ? "Save contact changes" : "Add contact to network"}
      style={{
        fontFamily: "IBM Plex Mono, monospace",
        fontSize: "10px",
        color: pending ? "#7A5B35" : "#C9A84C",
        backgroundColor: "rgba(201, 168, 76, 0.1)",
        border: "1px solid rgba(201, 168, 76, 0.35)",
        borderRadius: "2px",
        padding: "7px 20px",
        cursor: pending ? "not-allowed" : "pointer",
        letterSpacing: "0.08em",
        textTransform: "uppercase",
        fontWeight: 600,
      }}
    >
      {pending ? "SAVING..." : isEditing ? "SAVE CHANGES" : "ADD TO NETWORK"}
    </button>
  );
}

function ContactCancelButton({ onClose }: { onClose: () => void }): JSX.Element {
  const { pending } = useFormStatus();
  return (
    <button
      type="button"
      onClick={onClose}
      disabled={pending}
      style={{
        fontFamily: "IBM Plex Mono, monospace",
        fontSize: "10px",
        color: "#C4925A",
        backgroundColor: "transparent",
        border: "1px solid #5C3A1E",
        borderRadius: "2px",
        padding: "7px 16px",
        cursor: pending ? "not-allowed" : "pointer",
        letterSpacing: "0.08em",
        textTransform: "uppercase",
        opacity: pending ? 0.5 : 1,
      }}
    >
      Cancel
    </button>
  );
}

function ContactDeleteTriggerButton({
  onTrigger,
}: {
  onTrigger: () => void;
}): JSX.Element {
  const { pending } = useFormStatus();
  return (
    <button
      type="button"
      onClick={onTrigger}
      disabled={pending}
      aria-label="Delete this contact"
      style={{
        fontFamily: "IBM Plex Mono, monospace",
        fontSize: "10px",
        color: "#EF4444",
        backgroundColor: "rgba(239, 68, 68, 0.06)",
        border: "1px solid rgba(239, 68, 68, 0.25)",
        borderRadius: "2px",
        padding: "7px 14px",
        cursor: pending ? "not-allowed" : "pointer",
        opacity: pending ? 0.5 : 1,
        letterSpacing: "0.08em",
        textTransform: "uppercase",
      }}
    >
      Remove
    </button>
  );
}

// ---------------------------------------------------------------------------
// Delete confirmation
// ---------------------------------------------------------------------------
function DeleteConfirm({
  contactName,
  onConfirm,
  onCancel,
  isDeleting,
}: {
  contactName: string;
  onConfirm: () => void;
  onCancel: () => void;
  isDeleting: boolean;
}): JSX.Element {
  return (
    <div
      role="alertdialog"
      aria-modal="true"
      aria-label="Confirm contact deletion"
      style={{
        padding: "20px",
        display: "flex",
        flexDirection: "column",
        gap: "16px",
        alignItems: "center",
        textAlign: "center",
      }}
    >
      <span
        style={{
          fontFamily: "IBM Plex Mono, monospace",
          fontSize: "12px",
          color: "#FDF3E8",
          lineHeight: 1.6,
        }}
      >
        Remove{" "}
        <span style={{ color: "#C9A84C", fontWeight: 600 }}>{contactName}</span>{" "}
        from your network?
        <br />
        <span style={{ color: "#7A5B35", fontSize: "11px" }}>
          This action cannot be undone.
        </span>
      </span>
      <div style={{ display: "flex", gap: "10px" }}>
        <button
          type="button"
          onClick={onCancel}
          disabled={isDeleting}
          aria-label="Cancel deletion"
          style={{
            fontFamily: "IBM Plex Mono, monospace",
            fontSize: "11px",
            color: "#C4925A",
            backgroundColor: "rgba(201, 168, 76, 0.06)",
            border: "1px solid #5C3A1E",
            borderRadius: "2px",
            padding: "8px 16px",
            cursor: isDeleting ? "not-allowed" : "pointer",
            opacity: isDeleting ? 0.5 : 1,
          }}
        >
          CANCEL
        </button>
        <button
          type="button"
          onClick={onConfirm}
          disabled={isDeleting}
          aria-label="Confirm delete contact"
          style={{
            fontFamily: "IBM Plex Mono, monospace",
            fontSize: "11px",
            color: "#EF4444",
            backgroundColor: "rgba(239, 68, 68, 0.08)",
            border: "1px solid rgba(239, 68, 68, 0.3)",
            borderRadius: "2px",
            padding: "8px 16px",
            cursor: isDeleting ? "not-allowed" : "pointer",
            opacity: isDeleting ? 0.5 : 1,
          }}
        >
          {isDeleting ? "REMOVING..." : "REMOVE"}
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main modal
// ---------------------------------------------------------------------------
export function ContactModal({
  isOpen,
  onClose,
  onSubmit,
  onDelete,
  contact,
  companies = [],
}: ContactModalProps): JSX.Element | null {
  const panelRef = useRef<HTMLDivElement>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const isEditing = Boolean(contact);

  // React 19 — useActionState pipes our async submit through React's transition
  // machinery. Pending state is exposed downstream via useFormStatus.
  const [state, formAction] = useActionState<FormState, FormData>(
    async (prev, formData) => {
      const parsed = parseAndValidate(formData);
      if (!parsed.ok) {
        return { errors: parsed.errors, successCount: prev.successCount };
      }
      try {
        await onSubmit(formData);
        return { errors: {}, successCount: prev.successCount + 1 };
      } catch {
        return {
          errors: { name: "Failed to save. Please try again." },
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

  // Escape key to close
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape" && isOpen) onClose();
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  // Focus trap on open
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        const first = panelRef.current?.querySelector<HTMLElement>(
          "input, select, textarea, button"
        );
        first?.focus();
      }, 50);
    } else {
      setShowDeleteConfirm(false);
    }
  }, [isOpen]);

  const handleDeleteConfirm = useCallback(async () => {
    if (!contact?.id || !onDelete) return;
    setIsDeleting(true);
    try {
      await onDelete(contact.id);
      onClose();
    } finally {
      setIsDeleting(false);
    }
  }, [contact, onDelete, onClose]);

  if (!isOpen) return null;

  const focusStyle = {
    onFocus: (e: React.FocusEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
      Object.assign(e.currentTarget.style, inputFocusStyle);
    },
    onBlur: (e: React.FocusEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
      e.currentTarget.style.borderColor = "rgba(92, 58, 30, 0.8)";
    },
  };

  return (
    <>
      {/* Backdrop */}
      <div
        role="presentation"
        onClick={onClose}
        style={{
          position: "fixed",
          inset: 0,
          backgroundColor: "rgba(0, 0, 0, 0.55)",
          backdropFilter: "blur(3px)",
          WebkitBackdropFilter: "blur(3px)",
          zIndex: 60,
        }}
      />

      {/* Panel */}
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={isEditing ? "Edit contact" : "Add new contact"}
        style={{
          position: "fixed",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          zIndex: 61,
          width: "min(540px, 92vw)",
          maxHeight: "90dvh",
          backgroundColor: "#1A0F05",
          border: "1px solid #5C3A1E",
          borderRadius: "4px",
          boxShadow: "0 24px 60px rgba(0, 0, 0, 0.6)",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
      >
        {/* Header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "14px 20px",
            borderBottom: "1px solid #5C3A1E",
            backgroundColor: "#231508",
            flexShrink: 0,
          }}
        >
          <span
            style={{
              fontFamily: "IBM Plex Mono, monospace",
              fontSize: "11px",
              color: "#C9A84C",
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              fontWeight: 700,
            }}
          >
            {isEditing ? `Edit — ${contact?.name}` : "Add Contact"}
          </span>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close contact form"
            style={{
              background: "transparent",
              border: "none",
              color: "#7A5B35",
              fontSize: "18px",
              cursor: "pointer",
              lineHeight: 1,
              padding: "2px 6px",
            }}
          >
            ×
          </button>
        </div>

        {/* Delete confirmation overlay */}
        {showDeleteConfirm ? (
          <DeleteConfirm
            contactName={contact?.name ?? "this contact"}
            onConfirm={handleDeleteConfirm}
            onCancel={() => setShowDeleteConfirm(false)}
            isDeleting={isDeleting}
          />
        ) : (
          // React 19 — the entire form (fields + footer buttons) shares one
          // <form action={...}>; useFormStatus inside SubmitButton/CancelButton
          // reads pending state from this enclosing form.
          <form
            id="contact-form"
            action={formAction}
            noValidate
            style={{
              flex: 1,
              minHeight: 0,
              display: "flex",
              flexDirection: "column",
            }}
          >
            {/* Scrollable fields */}
            <div
              style={{
                flex: 1,
                overflowY: "auto",
                padding: "20px",
                display: "flex",
                flexDirection: "column",
                gap: "14px",
                scrollbarWidth: "thin",
                scrollbarColor: "#5C3A1E #1A0F05",
              }}
            >
              {/* Name */}
              <Field id="contact-name" label="Name *" error={errors.name}>
                <input
                  id="contact-name"
                  name="name"
                  type="text"
                  required
                  defaultValue={contact?.name ?? ""}
                  placeholder="Full name"
                  aria-required="true"
                  aria-invalid={Boolean(errors.name)}
                  style={inputStyle}
                  {...focusStyle}
                />
              </Field>

              {/* Two-column row: email + phone */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                <Field id="contact-email" label="Email" error={errors.email}>
                  <input
                    id="contact-email"
                    name="email"
                    type="email"
                    defaultValue={contact?.email ?? ""}
                    placeholder="email@company.com"
                    aria-invalid={Boolean(errors.email)}
                    style={inputStyle}
                    {...focusStyle}
                  />
                </Field>
                <Field id="contact-phone" label="Phone" error={errors.phone}>
                  <input
                    id="contact-phone"
                    name="phone"
                    type="tel"
                    placeholder="+1 555 000 0000"
                    aria-invalid={Boolean(errors.phone)}
                    style={inputStyle}
                    {...focusStyle}
                  />
                </Field>
              </div>

              {/* Title */}
              <Field id="contact-title" label="Title" error={errors.title}>
                <input
                  id="contact-title"
                  name="title"
                  type="text"
                  defaultValue={contact?.title ?? ""}
                  placeholder="Software Engineer, Recruiter..."
                  aria-invalid={Boolean(errors.title)}
                  style={inputStyle}
                  {...focusStyle}
                />
              </Field>

              {/* Company */}
              <Field id="contact-company" label="Company" error={errors.companyId}>
                <select
                  id="contact-company"
                  name="companyId"
                  defaultValue={contact?.companyId ?? ""}
                  aria-invalid={Boolean(errors.companyId)}
                  style={{ ...inputStyle, cursor: "pointer" }}
                  {...focusStyle}
                >
                  <option value="">Select company</option>
                  {companies.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </Field>

              {/* Relationship type */}
              <Field id="contact-relationship" label="Relationship" error={errors.relationship}>
                <select
                  id="contact-relationship"
                  name="relationship"
                  defaultValue={contact?.relationship ?? ""}
                  aria-invalid={Boolean(errors.relationship)}
                  style={{ ...inputStyle, cursor: "pointer" }}
                  {...focusStyle}
                >
                  <option value="">Select relationship type</option>
                  <option value="alumni">Alumni</option>
                  <option value="recruiter">Recruiter</option>
                  <option value="referral">Referral</option>
                  <option value="warm_intro">Warm Intro</option>
                  <option value="cold">Cold Outreach</option>
                </select>
              </Field>

              {/* LinkedIn URL */}
              <Field id="contact-linkedin" label="LinkedIn URL" error={errors.linkedinUrl}>
                <input
                  id="contact-linkedin"
                  name="linkedinUrl"
                  type="url"
                  defaultValue={contact?.linkedinUrl ?? ""}
                  placeholder="https://linkedin.com/in/..."
                  aria-invalid={Boolean(errors.linkedinUrl)}
                  style={inputStyle}
                  {...focusStyle}
                />
              </Field>

              {/* Introduced by */}
              <Field id="contact-introduced-by" label="Introduced By" error={errors.introducedBy}>
                <input
                  id="contact-introduced-by"
                  name="introducedBy"
                  type="text"
                  defaultValue={contact?.introducedBy ?? ""}
                  placeholder="Name of person who introduced you"
                  aria-invalid={Boolean(errors.introducedBy)}
                  style={inputStyle}
                  {...focusStyle}
                />
              </Field>

              {/* Notes */}
              <Field id="contact-notes" label="Notes" error={errors.notes}>
                <textarea
                  id="contact-notes"
                  name="notes"
                  defaultValue={contact?.notes ?? ""}
                  placeholder="Any context, how you met, follow-up ideas..."
                  rows={3}
                  aria-invalid={Boolean(errors.notes)}
                  style={{
                    ...inputStyle,
                    resize: "vertical",
                    minHeight: "72px",
                  }}
                  onFocus={(e) => Object.assign(e.currentTarget.style, inputFocusStyle)}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = "rgba(92, 58, 30, 0.8)";
                  }}
                />
              </Field>
            </div>

            {/* Footer (still inside <form> so useFormStatus reaches it) */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "12px 20px",
                borderTop: "1px solid #5C3A1E",
                backgroundColor: "#231508",
                flexShrink: 0,
                gap: "10px",
              }}
            >
              {/* Delete button — only when editing */}
              {isEditing && onDelete ? (
                <ContactDeleteTriggerButton
                  onTrigger={() => setShowDeleteConfirm(true)}
                />
              ) : (
                <span />
              )}

              <div style={{ display: "flex", gap: "8px" }}>
                <ContactCancelButton onClose={onClose} />
                <ContactSubmitButton isEditing={isEditing} />
              </div>
            </div>
          </form>
        )}
      </div>
    </>
  );
}
