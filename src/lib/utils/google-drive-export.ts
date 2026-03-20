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

// ---------------------------------------------------------------------------
// Export to Google Drive as a Google Doc
// ---------------------------------------------------------------------------

export async function exportToGoogleDrive(
  userId: string,
  options: ExportOptions
): Promise<DriveFile> {
  const tokens = await getGoogleTokens(userId);

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
        Authorization: `Bearer ${tokens.access_token}`,
        "Content-Type": `multipart/related; boundary=${boundary}`,
      },
      body,
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Google Drive upload failed: ${response.status} ${errorText}`);
  }

  return response.json() as Promise<DriveFile>;
}

// ---------------------------------------------------------------------------
// Create or find "The Tower" folder in Google Drive
// ---------------------------------------------------------------------------

export async function getOrCreateTowerFolder(userId: string): Promise<string> {
  const tokens = await getGoogleTokens(userId);

  // Search for existing folder
  const searchParams = new URLSearchParams({
    q: "name='The Tower - Documents' and mimeType='application/vnd.google-apps.folder' and trashed=false",
    fields: "files(id,name)",
  });

  const searchResponse = await fetch(`${DRIVE_FILES_API}?${searchParams.toString()}`, {
    headers: {
      Authorization: `Bearer ${tokens.access_token}`,
      Accept: "application/json",
    },
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
      Authorization: `Bearer ${tokens.access_token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      name: "The Tower - Documents",
      mimeType: "application/vnd.google-apps.folder",
    }),
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
  const folderId = await getOrCreateTowerFolder(userId);

  const prefix = document.type === "cover_letter" ? "Cover Letter" : "Prep Packet";
  const title = `${prefix} — ${document.title}`;

  const file = await exportToGoogleDrive(userId, {
    title,
    content: document.content,
    folderId,
  });

  return {
    fileId: file.id,
    webViewLink: file.webViewLink,
  };
}
