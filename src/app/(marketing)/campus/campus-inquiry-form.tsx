"use client";

import {
  useState,
  useTransition,
  type ChangeEvent,
  type FormEvent,
  type JSX,
} from "react";
import {
  submitCampusInquiry,
  type CampusInquiryInput,
  type CampusInquiryResult,
} from "./actions";

type Status =
  | { kind: "idle" }
  | { kind: "submitting" }
  | { kind: "success" }
  | { kind: "error"; message: string; fieldErrors: Record<string, string> };

const STUDENT_COUNT_OPTIONS: ReadonlyArray<{
  value: CampusInquiryInput["studentCount"];
  label: string;
}> = [
  { value: "under-500", label: "Under 500" },
  { value: "500-2000", label: "500 – 2,000" },
  { value: "2000-5000", label: "2,000 – 5,000" },
  { value: "5000-plus", label: "5,000+" },
];

const INTAKE_SEASON_OPTIONS: ReadonlyArray<{
  value: CampusInquiryInput["intakeSeason"];
  label: string;
}> = [
  { value: "fall-2026", label: "Fall 2026" },
  { value: "spring-2027", label: "Spring 2027" },
  { value: "fall-2027", label: "Fall 2027" },
  { value: "undecided", label: "Not yet decided" },
];

const INITIAL_FORM: CampusInquiryInput = {
  schoolName: "",
  contactName: "",
  role: "",
  email: "",
  studentCount: "under-500",
  intakeSeason: "fall-2026",
  notes: "",
};

const inputStyle: React.CSSProperties = {
  fontFamily: "'Satoshi', sans-serif",
  fontSize: "15px",
  background: "rgba(10, 12, 25, 0.7)",
  border: "1px solid rgba(255,255,255,0.12)",
  color: "var(--text-primary)",
  minHeight: "44px",
  width: "100%",
  padding: "10px 14px",
  borderRadius: "8px",
};

const labelStyle: React.CSSProperties = {
  fontFamily: "'Satoshi', sans-serif",
  fontSize: "13px",
  fontWeight: 600,
  color: "rgba(255,255,255,0.85)",
  letterSpacing: "0.01em",
  marginBottom: "6px",
  display: "block",
};

const fieldErrorStyle: React.CSSProperties = {
  fontFamily: "'Satoshi', sans-serif",
  fontSize: "12px",
  color: "#ef9a9a",
  marginTop: "6px",
};

export function CampusInquiryForm(): JSX.Element {
  const [form, setForm] = useState<CampusInquiryInput>(INITIAL_FORM);
  const [status, setStatus] = useState<Status>({ kind: "idle" });
  const [isPending, startTransition] = useTransition();

  const fieldErrors = status.kind === "error" ? status.fieldErrors : {};

  function update<K extends keyof CampusInquiryInput>(
    key: K,
    value: CampusInquiryInput[K],
  ) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function handleChange(key: keyof CampusInquiryInput) {
    return (
      event: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>,
    ) => {
      const value = event.currentTarget.value;
      update(key, value as CampusInquiryInput[typeof key]);
    };
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (status.kind === "submitting" || isPending) return;
    setStatus({ kind: "submitting" });
    startTransition(async () => {
      let result: CampusInquiryResult;
      try {
        result = await submitCampusInquiry(form);
      } catch (err) {
        setStatus({
          kind: "error",
          message:
            err instanceof Error
              ? err.message
              : "We couldn't send that. Please try again.",
          fieldErrors: {},
        });
        return;
      }
      if (result.ok) {
        setStatus({ kind: "success" });
        setForm(INITIAL_FORM);
      } else {
        setStatus({
          kind: "error",
          message: result.error,
          fieldErrors: result.fieldErrors ?? {},
        });
      }
    });
  }

  if (status.kind === "success") {
    return (
      <div
        className="rounded-xl px-6 py-8 text-center"
        role="status"
        aria-live="polite"
        data-testid="campus-success"
        style={{
          background: "rgba(201, 168, 76, 0.08)",
          border: "1px solid rgba(201, 168, 76, 0.3)",
        }}
      >
        <p
          style={{
            fontFamily: "'Playfair Display', serif",
            fontSize: "24px",
            color: "#C9A84C",
            lineHeight: 1.3,
          }}
        >
          Got it. We&rsquo;ll be in touch.
        </p>
        <p
          className="mt-2"
          style={{
            fontFamily: "'Satoshi', sans-serif",
            fontSize: "14px",
            color: "rgba(255,255,255,0.7)",
            lineHeight: 1.55,
          }}
        >
          Expect a reply within two business days with a pilot proposal.
        </p>
      </div>
    );
  }

  const submitting = status.kind === "submitting" || isPending;

  return (
    <form
      onSubmit={handleSubmit}
      noValidate
      className="flex flex-col gap-5"
      aria-describedby={status.kind === "error" ? "campus-form-error" : undefined}
      data-testid="campus-inquiry-form"
    >
      <Field
        id="schoolName"
        label="School / institution"
        error={fieldErrors.schoolName}
      >
        <input
          id="schoolName"
          name="schoolName"
          type="text"
          required
          autoComplete="organization"
          value={form.schoolName}
          onChange={handleChange("schoolName")}
          aria-invalid={Boolean(fieldErrors.schoolName)}
          aria-describedby={
            fieldErrors.schoolName ? "schoolName-error" : undefined
          }
          style={inputStyle}
        />
      </Field>

      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
        <Field
          id="contactName"
          label="Your name"
          error={fieldErrors.contactName}
        >
          <input
            id="contactName"
            name="contactName"
            type="text"
            required
            autoComplete="name"
            value={form.contactName}
            onChange={handleChange("contactName")}
            aria-invalid={Boolean(fieldErrors.contactName)}
            aria-describedby={
              fieldErrors.contactName ? "contactName-error" : undefined
            }
            style={inputStyle}
          />
        </Field>

        <Field id="role" label="Role at school" error={fieldErrors.role}>
          <input
            id="role"
            name="role"
            type="text"
            required
            autoComplete="organization-title"
            value={form.role}
            onChange={handleChange("role")}
            aria-invalid={Boolean(fieldErrors.role)}
            aria-describedby={fieldErrors.role ? "role-error" : undefined}
            placeholder="e.g. Director of Career Services"
            style={inputStyle}
          />
        </Field>
      </div>

      <Field id="email" label="Work email" error={fieldErrors.email}>
        <input
          id="email"
          name="email"
          type="email"
          inputMode="email"
          required
          autoComplete="email"
          value={form.email}
          onChange={handleChange("email")}
          aria-invalid={Boolean(fieldErrors.email)}
          aria-describedby={fieldErrors.email ? "email-error" : undefined}
          style={inputStyle}
        />
      </Field>

      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
        <Field
          id="studentCount"
          label="Approximate cohort size"
          error={fieldErrors.studentCount}
        >
          <select
            id="studentCount"
            name="studentCount"
            value={form.studentCount}
            onChange={handleChange("studentCount")}
            aria-invalid={Boolean(fieldErrors.studentCount)}
            aria-describedby={
              fieldErrors.studentCount ? "studentCount-error" : undefined
            }
            style={inputStyle}
          >
            {STUDENT_COUNT_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </Field>

        <Field
          id="intakeSeason"
          label="Target intake season"
          error={fieldErrors.intakeSeason}
        >
          <select
            id="intakeSeason"
            name="intakeSeason"
            value={form.intakeSeason}
            onChange={handleChange("intakeSeason")}
            aria-invalid={Boolean(fieldErrors.intakeSeason)}
            aria-describedby={
              fieldErrors.intakeSeason ? "intakeSeason-error" : undefined
            }
            style={inputStyle}
          >
            {INTAKE_SEASON_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </Field>
      </div>

      <Field id="notes" label="Anything else? (optional)" error={fieldErrors.notes}>
        <textarea
          id="notes"
          name="notes"
          value={form.notes ?? ""}
          onChange={handleChange("notes")}
          rows={4}
          maxLength={2000}
          aria-invalid={Boolean(fieldErrors.notes)}
          aria-describedby={fieldErrors.notes ? "notes-error" : undefined}
          style={{
            ...inputStyle,
            minHeight: "120px",
            padding: "12px 14px",
            resize: "vertical",
          }}
        />
      </Field>

      <button
        type="submit"
        disabled={submitting}
        className="self-start rounded-lg px-6 py-3 transition-all disabled:opacity-60"
        style={{
          fontFamily: "'Satoshi', sans-serif",
          fontSize: "15px",
          fontWeight: 600,
          background: "rgba(201, 168, 76, 0.22)",
          border: "1px solid rgba(201, 168, 76, 0.55)",
          color: "#C9A84C",
          cursor: submitting ? "wait" : "pointer",
          minHeight: "44px",
        }}
      >
        {submitting ? "Sending…" : "Request a pilot proposal"}
      </button>

      {status.kind === "error" && (
        <p
          id="campus-form-error"
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

function Field({
  id,
  label,
  error,
  children,
}: {
  id: string;
  label: string;
  error: string | undefined;
  children: React.ReactNode;
}): JSX.Element {
  return (
    <div>
      <label htmlFor={id} style={labelStyle}>
        {label}
      </label>
      {children}
      {error !== undefined && (
        <p id={`${id}-error`} role="alert" style={fieldErrorStyle}>
          {error}
        </p>
      )}
    </div>
  );
}
