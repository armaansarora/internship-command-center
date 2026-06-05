import { createClient } from "@/lib/supabase/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { getGoogleTokens } from "@/lib/gmail/oauth";
import {
  parseGmailMessage,
  classifyEmail,
  fetchApplicationsForMatching,
  matchEmailAgainstApplications,
} from "@/lib/gmail/parser";
import { readGoogleApiError } from "@/lib/google/api-error";
import { log } from "@/lib/logger";
import type { GmailMessage } from "@/lib/gmail/parser";

// Per-request ceiling on each Gmail API round-trip. The initial sync is
// awaited on the OAuth callback redirect path (via Promise.allSettled), so a
// hung Google response must not hold the serverless function open to its
// maxDuration. On timeout the fetch rejects → the caller logs a rejected sync
// and proceeds.
const GMAIL_FETCH_TIMEOUT_MS = 10_000;

interface GmailMessageRef {
  id: string;
  threadId: string;
}

interface GmailMessageListResponse {
  messages?: GmailMessageRef[];
}

interface SyncGmailOptions {
  useAdmin?: boolean;
}

export interface SyncGmailResult {
  synced: number;
  classified: number;
  failed: number;
}

async function fetchRecentMessageRefs(
  accessToken: string
): Promise<GmailMessageRef[]> {
  const params = new URLSearchParams({
    q: "newer_than:7d",
    maxResults: "20",
  });

  const response = await fetch(
    `https://gmail.googleapis.com/gmail/v1/users/me/messages?${params.toString()}`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: "application/json",
      },
      signal: AbortSignal.timeout(GMAIL_FETCH_TIMEOUT_MS),
    }
  );

  if (!response.ok) {
    throw await readGoogleApiError("gmail", response);
  }

  const data = (await response.json()) as GmailMessageListResponse;
  return data.messages ?? [];
}

async function fetchMessageDetail(
  accessToken: string,
  messageId: string
): Promise<GmailMessage> {
  const response = await fetch(
    `https://gmail.googleapis.com/gmail/v1/users/me/messages/${messageId}?format=full`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: "application/json",
      },
      signal: AbortSignal.timeout(GMAIL_FETCH_TIMEOUT_MS),
    }
  );

  if (!response.ok) {
    throw await readGoogleApiError("gmail", response);
  }

  return response.json() as Promise<GmailMessage>;
}

export async function syncGmailForUser(
  userId: string,
  options: SyncGmailOptions = {}
): Promise<SyncGmailResult> {
  const supabase = options.useAdmin ? getSupabaseAdmin() : await createClient();
  const tokens = await getGoogleTokens(userId, options);

  const messageRefs = await fetchRecentMessageRefs(tokens.access_token);
  if (messageRefs.length === 0) {
    return { synced: 0, classified: 0, failed: 0 };
  }

  let syncedCount = 0;
  let classifiedCount = 0;
  let failedCount = 0;

  // Fetch the user's applications ONCE for the whole batch — matching each
  // email against them used to re-query the full applications table per email
  // (an N+1 of up to 20 queries on the OAuth-callback request path).
  const applications = await fetchApplicationsForMatching(userId, {
    useAdmin: options.useAdmin,
  });

  for (const ref of messageRefs) {
    try {
      const raw = await fetchMessageDetail(tokens.access_token, ref.id);
      const parsed = parseGmailMessage(raw);
      const result = classifyEmail({
        subject: parsed.subject,
        from: parsed.from,
        snippet: parsed.snippet,
        bodyText: parsed.bodyText,
        userId,
      });

      const matchedApplicationId = matchEmailAgainstApplications(
        parsed,
        applications,
      );

      const row = {
        user_id: userId,
        gmail_id: raw.id,
        thread_id: raw.threadId,
        application_id: matchedApplicationId ?? null,
        from_address: parsed.from,
        to_address: parsed.to,
        subject: parsed.subject,
        snippet: parsed.snippet,
        body_text: parsed.bodyText,
        classification: result.classification,
        urgency: result.urgency,
        suggested_action: result.suggestedAction,
        is_read: false,
        is_processed: true,
        received_at: parsed.receivedAt ?? new Date().toISOString(),
      };

      const { error } = await supabase
        .from("emails")
        .upsert(row, {
          onConflict: "user_id,gmail_id",
          ignoreDuplicates: false,
        });

      if (error) {
        failedCount++;
        continue;
      }

      syncedCount++;
      if (result.classification !== "other") classifiedCount++;
    } catch (err) {
      log.warn("gmail.sync.message_failed", {
        userId,
        messageId: ref.id,
        error: err instanceof Error ? err.message : String(err),
      });
      failedCount++;
    }
  }

  return {
    synced: syncedCount,
    classified: classifiedCount,
    failed: failedCount,
  };
}
