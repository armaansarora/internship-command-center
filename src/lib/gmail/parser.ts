import { createClient } from "@/lib/supabase/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { detectInjection, recordInjectionAttempt } from "./injection-filter";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type EmailClassification =
  | "interview_invite"
  | "rejection"
  | "info_request"
  | "newsletter"
  | "follow_up_needed"
  | "other";

export type EmailUrgency = "high" | "medium" | "low";

export interface ParsedEmail {
  subject: string;
  from: string;
  to: string;
  snippet: string;
  bodyText: string;
  receivedAt?: string;
}

export interface EmailClassificationResult {
  classification: EmailClassification;
  urgency: EmailUrgency;
  suggestedAction: string;
  matchedApplication?: string; // application UUID if matched
  /**
   * True when the pre-classifier regex flagged the body as a likely prompt-
   * injection attempt. When true, downstream LLM pipelines MUST NOT forward
   * the body to a model (the detection has already been audit-logged if
   * `userId` was threaded through).
   */
  suspectedInjection?: boolean;
}

// ---------------------------------------------------------------------------
// Raw Gmail API message types
// ---------------------------------------------------------------------------

interface GmailMessagePart {
  mimeType: string;
  body: {
    data?: string;
    size: number;
  };
  parts?: GmailMessagePart[];
  headers?: GmailMessageHeader[];
}

interface GmailMessageHeader {
  name: string;
  value: string;
}

export interface GmailMessage {
  id: string;
  threadId: string;
  snippet?: string;
  internalDate?: string;
  payload?: GmailMessagePart & {
    headers: GmailMessageHeader[];
  };
}

// ---------------------------------------------------------------------------
// Classification patterns
// ---------------------------------------------------------------------------

const INTERVIEW_PATTERNS = [
  /\binterview\b/i,
  /\bschedule\b/i,
  /\bscreening\b/i,
  /\bvideo call\b/i,
  /\bphone screen\b/i,
  /\bvirtual interview\b/i,
  /\binvite you\b/i,
  /\bwould like to\b.*\btalk\b/i,
];

const REJECTION_PATTERNS = [
  /unfortunately/i,
  /\bregret\b/i,
  /not moving forward/i,
  /decided not to/i,
  /will not be moving/i,
  /not selected/i,
  /not the right fit/i,
  /position has been filled/i,
  /we have moved forward with other candidates/i,
  /we will not be proceeding/i,
];

const INFO_REQUEST_PATTERNS = [
  /please provide/i,
  /additional information/i,
  /next steps/i,
  /could you (please )?send/i,
  /we need (from you|your)/i,
  /please complete/i,
  /required documents/i,
  /application requires/i,
];

const NEWSLETTER_FROM_PATTERNS = [
  /^noreply@/i,
  /^no-reply@/i,
  /^newsletter@/i,
  /^notifications?@/i,
  /^updates?@/i,
  /^digest@/i,
  /^mailer@/i,
  /^donotreply@/i,
  /^do-not-reply@/i,
  /^automated@/i,
];

// ---------------------------------------------------------------------------
// Classification engine
// ---------------------------------------------------------------------------

export function classifyEmail(email: {
  subject: string;
  from: string;
  snippet: string;
  bodyText: string;
  /**
   * Optional — when provided AND the pre-classifier flags injection, an audit
   * row is written via `recordInjectionAttempt`. Callers that have a user
   * context (sync loop, cron) should pass it; pure unit tests can omit.
   */
  userId?: string;
}): EmailClassificationResult {
  // R0.8 — Pre-classifier regex runs BEFORE any content-based classification
  // so a hostile email is never fed to downstream LLM consumers with a
  // confidence signal attached. Returning "other" + `suspectedInjection=true`
  // short-circuits the full pattern suite so the hostile string can't
  // additionally match e.g. INTERVIEW_PATTERNS and get upgraded to urgency:high.
  const check = detectInjection(email.bodyText);
  if (check.detected) {
    if (email.userId) {
      // Fire-and-forget — the helper is unconditionally safe (R0.2). We don't
      // await because `classifyEmail` is called synchronously in hot loops;
      // letting the audit write run in the background is fine and preserves
      // the synchronous signature callers rely on.
      void recordInjectionAttempt({
        userId: email.userId,
        pattern: check.pattern!,
        from: email.from,
        subject: email.subject,
        snippet: email.bodyText,
      });
    }
    return {
      classification: "other",
      urgency: "low",
      suggestedAction: "Flagged as suspicious content — review manually.",
      suspectedInjection: true,
    };
  }

  const combinedText = `${email.subject} ${email.snippet} ${email.bodyText}`;

  // Check interview patterns first (highest priority)
  const isInterview = INTERVIEW_PATTERNS.some((p) => p.test(combinedText));
  if (isInterview) {
    return {
      classification: "interview_invite",
      urgency: "high",
      suggestedAction:
        "Reply promptly to confirm your availability. Add the interview to your calendar.",
    };
  }

  // Check rejection patterns
  const isRejection = REJECTION_PATTERNS.some((p) => p.test(combinedText));
  if (isRejection) {
    return {
      classification: "rejection",
      urgency: "medium",
      suggestedAction:
        "Update the application status to rejected. Consider sending a gracious response.",
    };
  }

  // Check info request patterns
  const isInfoRequest = INFO_REQUEST_PATTERNS.some((p) => p.test(combinedText));
  if (isInfoRequest) {
    return {
      classification: "info_request",
      urgency: "high",
      suggestedAction: "Respond as soon as possible with the requested information.",
    };
  }

  // Check newsletter / automated sender
  const fromAddress = email.from.toLowerCase();
  const isNewsletter = NEWSLETTER_FROM_PATTERNS.some((p) => p.test(fromAddress));
  if (isNewsletter) {
    return {
      classification: "newsletter",
      urgency: "low",
      suggestedAction: "No action required.",
    };
  }

  return {
    classification: "other",
    urgency: "low",
    suggestedAction: "Review and determine if follow-up is needed.",
  };
}

// ---------------------------------------------------------------------------
// Parse raw Gmail API message
// ---------------------------------------------------------------------------

function decodeBase64Url(encoded: string): string {
  const base64 = encoded.replace(/-/g, "+").replace(/_/g, "/");
  return Buffer.from(base64, "base64").toString("utf8");
}

function extractBodyText(part: GmailMessagePart): string {
  if (part.mimeType === "text/plain" && part.body.data) {
    return decodeBase64Url(part.body.data);
  }

  if (part.parts) {
    for (const subPart of part.parts) {
      const text = extractBodyText(subPart);
      if (text) return text;
    }
  }

  return "";
}

function getHeader(headers: GmailMessageHeader[], name: string): string {
  const header = headers.find((h) => h.name.toLowerCase() === name.toLowerCase());
  return header?.value ?? "";
}

export function parseGmailMessage(raw: GmailMessage): ParsedEmail {
  const headers = raw.payload?.headers ?? [];

  const subject = getHeader(headers, "Subject");
  const from = getHeader(headers, "From");
  const to = getHeader(headers, "To");
  const snippet = raw.snippet ?? "";

  let bodyText = "";
  if (raw.payload) {
    bodyText = extractBodyText(raw.payload);
  }

  const receivedAt = raw.internalDate
    ? new Date(parseInt(raw.internalDate, 10)).toISOString()
    : undefined;

  return { subject, from, to, snippet, bodyText, receivedAt };
}

// ---------------------------------------------------------------------------
// Match email to existing application by company domain/name
// ---------------------------------------------------------------------------

interface ApplicationRecord {
  id: string;
  company_name: string | null;
  // `applications` does not have a `company_domain` column. The domain lives
  // on the related `companies` row, surfaced here through the PostgREST
  // nested-select alias (`companies(domain)`).
  companies?: { domain: string | null } | null;
}

export async function matchEmailToApplication(
  email: ParsedEmail,
  userId: string,
  options: { useAdmin?: boolean } = {}
): Promise<string | undefined> {
  const supabase = options.useAdmin ? getSupabaseAdmin() : await createClient();

  // Join to companies via `company_id` so we can read `companies.domain`.
  // PostgREST nested-select returns the joined row (or `null`) under the
  // foreign-table key. Apps without a linked company will have `companies: null`
  // — those fall through to the name-based fuzzy match below.
  const { data: applications, error } = await supabase
    .from("applications")
    .select("id, company_name, companies(domain)")
    .eq("user_id", userId);

  if (error || !applications) return undefined;

  const fromDomain = extractDomainFromEmail(email.from);
  if (!fromDomain) return undefined;

  const records = applications as unknown as ApplicationRecord[];

  // Try matching by linked company domain first
  for (const app of records) {
    const appDomain = app.companies?.domain;
    if (appDomain) {
      const normalized = appDomain.toLowerCase().replace(/^www\./, "");
      if (fromDomain.includes(normalized) || normalized.includes(fromDomain)) {
        return app.id;
      }
    }
  }

  // Fall back to matching by normalized company name in email domain
  for (const app of records) {
    if (!app.company_name) continue;
    const normalizedName = app.company_name.toLowerCase().replace(/[^a-z0-9]/g, "");
    const normalizedDomain = fromDomain.replace(/[^a-z0-9]/g, "");
    if (normalizedDomain.includes(normalizedName) && normalizedName.length >= 4) {
      return app.id;
    }
  }

  return undefined;
}

function extractDomainFromEmail(from: string): string | null {
  // Handle "Name <email@domain.com>" format
  const angleMatch = from.match(/<([^>]+)>/);
  const emailStr = angleMatch ? angleMatch[1] : from;
  const atIndex = emailStr.indexOf("@");
  if (atIndex === -1) return null;
  return emailStr.slice(atIndex + 1).toLowerCase().trim();
}
