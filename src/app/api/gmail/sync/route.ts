import { NextResponse } from "next/server";
import { requireUser, createClient } from "@/lib/supabase/server";
import { getGoogleTokens } from "@/lib/gmail/oauth";
import {
  parseGmailMessage,
  classifyEmail,
  matchEmailToApplication,
} from "@/lib/gmail/parser";
import type { GmailMessage } from "@/lib/gmail/parser";

// ---------------------------------------------------------------------------
// Gmail API types
// ---------------------------------------------------------------------------

interface GmailMessageRef {
  id: string;
  threadId: string;
}

interface GmailMessageListResponse {
  messages?: GmailMessageRef[];
  nextPageToken?: string;
  resultSizeEstimate?: number;
}

// ---------------------------------------------------------------------------
// Fetch message list from Gmail
// ---------------------------------------------------------------------------

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
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Gmail list error: ${response.status} ${errorText}`);
  }

  const data = (await response.json()) as GmailMessageListResponse;
  return data.messages ?? [];
}

// ---------------------------------------------------------------------------
// Fetch single message detail from Gmail
// ---------------------------------------------------------------------------

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
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Gmail fetch error for ${messageId}: ${response.status} ${errorText}`);
  }

  return response.json() as Promise<GmailMessage>;
}

// ---------------------------------------------------------------------------
// POST /api/gmail/sync
// ---------------------------------------------------------------------------

export async function POST(): Promise<NextResponse> {
  const user = await requireUser();
  const supabase = await createClient();

  const tokens = await getGoogleTokens(user.id);

  const messageRefs = await fetchRecentMessageRefs(tokens.access_token);

  if (messageRefs.length === 0) {
    return NextResponse.json({ synced: 0, classified: 0 });
  }

  let syncedCount = 0;
  let classifiedCount = 0;

  for (const ref of messageRefs) {
    const raw = await fetchMessageDetail(tokens.access_token, ref.id);
    const parsed = parseGmailMessage(raw);
    const result = classifyEmail({
      subject: parsed.subject,
      from: parsed.from,
      snippet: parsed.snippet,
      bodyText: parsed.bodyText,
    });

    const matchedApplicationId = await matchEmailToApplication(parsed, user.id);

    const row = {
      user_id: user.id,
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
      .upsert(row, { onConflict: "gmail_id", ignoreDuplicates: false });

    if (!error) {
      syncedCount++;
      if (result.classification !== "other") classifiedCount++;
    }
  }

  return NextResponse.json({ synced: syncedCount, classified: classifiedCount });
}
