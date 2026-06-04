/**
 * Google Drive export utility.
 * Exports cover letters and prep packets to the user's Google Drive.
 * Uses the google_drive connector via Supabase-stored Google tokens.
 */

import { getGoogleTokens } from "@/lib/gmail/oauth";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  webViewLink: string;
}

interface ExportOptions {
  title: string;
  content: string;
  folderId?: string;
  mimeType?: "application/vnd.google-apps.document" | "application/pdf";
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const DRIVE_API_BASE = "https://www.googleapis.com/upload/drive/v3/files";
const DRIVE_FILES_API = "https://www.googleapis.com/drive/v3/files";

// Per-request ceiling on each Drive API round-trip, matching the 10s ceiling
// used by the Gmail/Calendar integrations so a hung Google response can't hold
// the export request open to the function's maxDuration.
const DRIVE_FETCH_TIMEOUT_MS = 10_000;

// ---------------------------------------------------------------------------
// Export to Google Drive as a Google Doc
// ---------------------------------------------------------------------------

async function exportToGoogleDrive(
  accessToken: string,
  options: ExportOptions
): Promise<DriveFile> {
  // Create file metadata
  const metadata: Record<string, string | string[]> = {
    name: options.title,
    mimeType: options.mimeType ?? "application/vnd.google-apps.document",
  };

  if (options.folderId) {
    metadata.parents = [options.folderId];
  }

  // For Google Docs, we upload as plain text and Google converts it
  const boundary = "tower_export_boundary";
  const body = [
    `--${boundary}`,
    "Content-Type: application/json; charset=UTF-8",
    "",
    JSON.stringify(metadata),
    `--${boundary}`,
    "Content-Type: text/plain; charset=UTF-8",
    "",
    options.content,
    `--${boundary}--`,
  ].join("\r\n");

  const response = await fetch(
    `${DRIVE_API_BASE}?uploadType=multipart&fields=id,name,mimeType,webViewLink`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": `multipart/related; boundary=${boundary}`,
      },
      body,
      signal: AbortSignal.timeout(DRIVE_FETCH_TIMEOUT_MS),
    }
  );

  if (!response.ok) {
    throw new Error(`Google Drive upload failed: ${response.status}`);
  }

  return response.json() as Promise<DriveFile>;
}

// ---------------------------------------------------------------------------
// Create or find "The Tower" folder in Google Drive
// ---------------------------------------------------------------------------

async function getOrCreateTowerFolder(accessToken: string): Promise<string> {
  // Search for existing folder
  const searchParams = new URLSearchParams({
    q: "name='The Tower - Documents' and mimeType='application/vnd.google-apps.folder' and trashed=false",
    fields: "files(id,name)",
  });

  const searchResponse = await fetch(`${DRIVE_FILES_API}?${searchParams.toString()}`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/json",
    },
    signal: AbortSignal.timeout(DRIVE_FETCH_TIMEOUT_MS),
  });

  if (!searchResponse.ok) {
    throw new Error(`Google Drive search failed: ${searchResponse.status}`);
  }

  const searchData = (await searchResponse.json()) as { files: Array<{ id: string; name: string }> };

  if (searchData.files.length > 0) {
    return searchData.files[0].id;
  }

  // Create the folder
  const createResponse = await fetch(`${DRIVE_FILES_API}?fields=id,name`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      name: "The Tower - Documents",
      mimeType: "application/vnd.google-apps.folder",
    }),
    signal: AbortSignal.timeout(DRIVE_FETCH_TIMEOUT_MS),
  });

  if (!createResponse.ok) {
    throw new Error(`Google Drive folder creation failed: ${createResponse.status}`);
  }

  const folder = (await createResponse.json()) as { id: string; name: string };
  return folder.id;
}

// ---------------------------------------------------------------------------
// Export a document to Google Drive (high-level wrapper)
// ---------------------------------------------------------------------------

export async function exportDocumentToDrive(
  userId: string,
  document: { title: string; content: string; type: string }
): Promise<{ fileId: string; webViewLink: string }> {
  // Resolve the user's Google tokens ONCE and thread the access token through
  // both Drive calls (previously each helper re-fetched + possibly re-refreshed
  // tokens — a redundant DB read per export).
  const tokens = await getGoogleTokens(userId);

  const folderId = await getOrCreateTowerFolder(tokens.access_token);

  const prefix = document.type === "cover_letter" ? "Cover Letter" : "Prep Packet";
  const title = `${prefix} — ${document.title}`;

  const file = await exportToGoogleDrive(tokens.access_token, {
    title,
    content: document.content,
    folderId,
  });

  return {
    fileId: file.id,
    webViewLink: file.webViewLink,
  };
}
