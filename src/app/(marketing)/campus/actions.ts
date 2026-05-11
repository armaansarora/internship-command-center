"use server";

import { z } from "zod";
import { headers } from "next/headers";
import { Resend } from "resend";
import { GATE_CONFIG } from "@/lib/config/gate-config";
import { LEGAL_CONFIG } from "@/lib/config/legal-config";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { checkInMemoryRateLimit } from "@/lib/rate-limit";
import { log } from "@/lib/logger";
import { requireEnv } from "@/lib/env";

/**
 * Campus pilot inquiry intake.
 *
 * Two-sided durability: the lead is delivered to the founder's inbox via
 * Resend AND persisted to `audit_logs` with the synthetic event-type
 * `campus_pilot_inquiry` (a system-attributable event — we attach the
 * service-role user via a null user_id-shaped metadata payload).
 *
 * Rate-limited per normalized school name to keep spammers from drowning
 * the founder's inbox. The audit row is the source of truth — Resend is a
 * convenience.
 */

const CampusInquirySchema = z.object({
  schoolName: z.string().min(2, "School name is required").max(200),
  contactName: z.string().min(2, "Your name is required").max(120),
  role: z.string().min(2, "Role is required").max(120),
  email: z.string().email("Valid email required").max(254),
  studentCount: z
    .union([
      z.literal("under-500"),
      z.literal("500-2000"),
      z.literal("2000-5000"),
      z.literal("5000-plus"),
    ]),
  intakeSeason: z.union([
    z.literal("fall-2026"),
    z.literal("spring-2027"),
    z.literal("fall-2027"),
    z.literal("undecided"),
  ]),
  notes: z.string().max(2000).optional(),
});

export type CampusInquiryInput = z.input<typeof CampusInquirySchema>;
export type CampusInquiryResult =
  | { ok: true }
  | { ok: false; error: string; fieldErrors?: Partial<Record<keyof CampusInquiryInput, string>> };

const PER_SCHOOL_LIMIT = 3;
const PER_SCHOOL_WINDOW_MS = 60_000;

const STUDENT_COUNT_LABELS: Record<CampusInquiryInput["studentCount"], string> = {
  "under-500": "Under 500 students",
  "500-2000": "500–2,000 students",
  "2000-5000": "2,000–5,000 students",
  "5000-plus": "5,000+ students",
};

const INTAKE_SEASON_LABELS: Record<CampusInquiryInput["intakeSeason"], string> = {
  "fall-2026": "Fall 2026",
  "spring-2027": "Spring 2027",
  "fall-2027": "Fall 2027",
  undecided: "Not yet decided",
};

function extractClientIp(headerList: Headers): string | null {
  const forwardedFor = headerList.get("x-forwarded-for");
  if (forwardedFor) {
    const first = forwardedFor.split(",")[0]?.trim();
    if (first) return first;
  }
  const realIp = headerList.get("x-real-ip");
  if (realIp) return realIp.trim();
  return null;
}

function buildEmailBody(input: CampusInquiryInput, ip: string | null): string {
  return [
    `New campus pilot inquiry — ${input.schoolName}`,
    "",
    `Contact: ${input.contactName} (${input.role})`,
    `Email:   ${input.email}`,
    `School:  ${input.schoolName}`,
    `Size:    ${STUDENT_COUNT_LABELS[input.studentCount]}`,
    `Intake:  ${INTAKE_SEASON_LABELS[input.intakeSeason]}`,
    "",
    input.notes ? `Notes:\n${input.notes}\n` : "",
    `IP: ${ip ?? "unknown"}`,
  ]
    .filter((line) => line !== null && line !== undefined)
    .join("\n");
}

export async function submitCampusInquiry(
  raw: CampusInquiryInput,
): Promise<CampusInquiryResult> {
  const parsed = CampusInquirySchema.safeParse(raw);
  if (!parsed.success) {
    const fieldErrors: Partial<Record<keyof CampusInquiryInput, string>> = {};
    for (const issue of parsed.error.issues) {
      const path = issue.path[0];
      if (typeof path === "string") {
        fieldErrors[path as keyof CampusInquiryInput] ??= issue.message;
      }
    }
    return {
      ok: false,
      error: "Please review the fields and try again.",
      fieldErrors,
    };
  }

  const input = parsed.data;
  const normalizedSchool = input.schoolName.toLowerCase().trim();

  const limit = checkInMemoryRateLimit(
    `campus:${normalizedSchool}`,
    PER_SCHOOL_LIMIT,
    PER_SCHOOL_WINDOW_MS,
  );
  if (!limit.success) {
    return {
      ok: false,
      error: "Too many submissions. Try again in a minute.",
    };
  }

  const headerList = await headers();
  const ip = extractClientIp(headerList);
  const userAgent = headerList.get("user-agent");

  // 1) Audit row — never gates on email delivery. If Resend dies we still
  // recover the lead from audit_logs.
  try {
    const admin = getSupabaseAdmin();
    const { error } = await admin.from("audit_logs").insert({
      // No user_id — this is an unauthenticated marketing lead. The audit
      // table allows null user_id for system-attributed events.
      user_id: null,
      event_type: "campus_pilot_inquiry",
      resource_type: "campus_pilot",
      resource_id: null,
      // PII (contact_name, email, role, freeform notes) is intentionally
      // OUTSIDE the audit row — it lands in Resend (the founder's inbox)
      // and stays out of the durable audit log. If a future service-role
      // reader joins audit metadata to another surface, no lead PII leaks.
      // `has_notes` lets ops see which inquiries had freeform context
      // without exposing the text itself.
      metadata: {
        school_name: input.schoolName,
        student_count: input.studentCount,
        intake_season: input.intakeSeason,
        has_notes: Boolean(input.notes && input.notes.length > 0),
        resend_recipient: GATE_CONFIG.brand.senderEmail,
      },
      ip_address: ip,
      user_agent: userAgent,
    });
    if (error) {
      log.warn("campus_inquiry.audit_insert_failed", {
        code: error.code,
        message: error.message,
      });
      // Keep going — the email path still has a chance.
    }
  } catch (err) {
    log.warn("campus_inquiry.audit_insert_threw", {
      err: err instanceof Error ? err.message : String(err),
    });
  }

  // 2) Email the founder via Resend. Concierge mailbox = same env address
  // used for all transactional sends.
  try {
    const { RESEND_API_KEY } = requireEnv(["RESEND_API_KEY"] as const);
    const resend = new Resend(RESEND_API_KEY);
    const from =
      process.env.OUTREACH_EMAIL_FROM ??
      `${GATE_CONFIG.brand.name} <${GATE_CONFIG.brand.senderEmail}>`;

    const result = await resend.emails.send({
      from,
      to: GATE_CONFIG.brand.senderEmail,
      replyTo: input.email,
      subject: `[Campus Pilot] ${input.schoolName} — ${input.contactName}`,
      text: buildEmailBody(input, ip),
    });

    if (result.error) {
      log.error("campus_inquiry.resend_failed", {
        message: result.error.message,
      });
      return {
        ok: false,
        error: `Email delivery failed. Please write us directly at ${LEGAL_CONFIG.entity.supportEmail}.`,
      };
    }
  } catch (err) {
    log.error("campus_inquiry.resend_threw", {
      err: err instanceof Error ? err.message : String(err),
    });
    return {
      ok: false,
      error: `We couldn't send that just now. Please email us at ${LEGAL_CONFIG.entity.supportEmail}.`,
    };
  }

  return { ok: true };
}
