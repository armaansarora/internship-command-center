import type { gmail_v1 } from 'googleapis';
import { getGoogleClient } from '@/lib/google';

export interface ParsedEmail {
  id: string;
  threadId: string;
  from: string;
  to: string;
  subject: string;
  date: string;
  snippet: string;
  isUnread: boolean;
}

export interface FullEmail extends ParsedEmail {
  body: string;
}

export interface CompanyEmails {
  company: string;
  emails: ParsedEmail[];
}

/**
 * Extract key headers from a Gmail message.
 */
function parseEmailHeaders(message: gmail_v1.Schema$Message): ParsedEmail {
  const headers = message.payload?.headers ?? [];

  const getHeader = (name: string): string => {
    const header = headers.find(
      (h) => h.name?.toLowerCase() === name.toLowerCase()
    );
    return header?.value ?? '';
  };

  return {
    id: message.id ?? '',
    threadId: message.threadId ?? '',
    from: getHeader('From'),
    to: getHeader('To'),
    subject: getHeader('Subject'),
    date: getHeader('Date'),
    snippet: message.snippet ?? '',
    isUnread: message.labelIds?.includes('UNREAD') ?? false,
  };
}

/**
 * Heuristic to extract a likely domain from a company name.
 * e.g., "Goldman Sachs" -> "goldmansachs.com"
 */
function extractCompanyDomain(companyName: string): string {
  const cleaned = companyName
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, '')
    .trim();

  return `${cleaned}.com`;
}

/**
 * Extract the body text from a Gmail message.
 * Traverses multipart messages recursively to find text/plain (preferred) or text/html.
 */
export function getEmailBody(message: gmail_v1.Schema$Message): string {
  function findBody(
    parts: gmail_v1.Schema$MessagePart[] | undefined,
    preferredMime: string
  ): string | null {
    if (!parts) return null;
    for (const part of parts) {
      if (part.mimeType === preferredMime && part.body?.data) {
        return Buffer.from(part.body.data, 'base64url').toString('utf-8');
      }
      if (part.parts) {
        const nested = findBody(part.parts, preferredMime);
        if (nested) return nested;
      }
    }
    return null;
  }

  const payload = message.payload;
  if (!payload) return '';

  // Try multipart message first
  if (payload.parts) {
    const plain = findBody(payload.parts, 'text/plain');
    if (plain) return plain;
    const html = findBody(payload.parts, 'text/html');
    if (html) return html;
  }

  // Simple (non-multipart) message
  if (payload.body?.data) {
    return Buffer.from(payload.body.data, 'base64url').toString('utf-8');
  }

  return '';
}

/**
 * Get full email thread for a company, including message bodies.
 * Returns emails sorted chronologically (oldest first).
 */
export async function getFullEmailThread(
  companyName: string,
  maxResults = 20
): Promise<FullEmail[]> {
  try {
    const { gmail } = await getGoogleClient();
    const domain = extractCompanyDomain(companyName);
    const query = `from:@${domain} OR to:@${domain} OR subject:${companyName}`;

    const listResponse = await gmail.users.messages.list({
      userId: 'me',
      q: query,
      maxResults,
    });

    const messageIds = listResponse.data.messages ?? [];
    if (messageIds.length === 0) return [];

    const emails: FullEmail[] = [];
    for (const msg of messageIds) {
      if (!msg.id) continue;
      const detail = await gmail.users.messages.get({
        userId: 'me',
        id: msg.id,
        format: 'full',
      });
      const parsed = parseEmailHeaders(detail.data);
      const body = getEmailBody(detail.data);
      emails.push({ ...parsed, body });
    }

    // Sort by date ascending (oldest first, like a conversation)
    emails.sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );

    return emails;
  } catch {
    return [];
  }
}

/**
 * Send an email via Gmail API.
 * Optionally thread it by providing threadId, inReplyTo, and references headers.
 */
export async function sendEmail(
  to: string,
  subject: string,
  body: string,
  threadId?: string,
  inReplyTo?: string,
  references?: string
): Promise<{ success: true; messageId: string } | { success: false; error: string }> {
  try {
    const { gmail } = await getGoogleClient();

    // Construct RFC 2822 message
    const headers = [
      `To: ${to}`,
      `Subject: ${subject}`,
      'Content-Type: text/plain; charset=utf-8',
    ];
    if (inReplyTo) headers.push(`In-Reply-To: ${inReplyTo}`);
    if (references) headers.push(`References: ${references}`);

    const rawMessage = headers.join('\r\n') + '\r\n\r\n' + body;
    const encoded = Buffer.from(rawMessage)
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');

    const res = await gmail.users.messages.send({
      userId: 'me',
      requestBody: { raw: encoded, threadId },
    });

    return { success: true, messageId: res.data.id ?? '' };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Failed to send email',
    };
  }
}

/**
 * Search Gmail for emails related to a specific company.
 */
export async function searchCompanyEmails(
  gmail: gmail_v1.Gmail,
  companyName: string,
  maxResults = 10
): Promise<ParsedEmail[]> {
  try {
    const domain = extractCompanyDomain(companyName);
    const query = `from:@${domain} OR subject:${companyName}`;

    const listResponse = await gmail.users.messages.list({
      userId: 'me',
      q: query,
      maxResults,
    });

    const messageIds = listResponse.data.messages ?? [];
    if (messageIds.length === 0) return [];

    const emails: ParsedEmail[] = [];
    for (const msg of messageIds) {
      if (!msg.id) continue;
      const detail = await gmail.users.messages.get({
        userId: 'me',
        id: msg.id,
        format: 'metadata',
        metadataHeaders: [
          'From',
          'To',
          'Subject',
          'Date',
          'Message-ID',
          'References',
        ],
      });
      emails.push(parseEmailHeaders(detail.data));
    }

    return emails;
  } catch {
    return [];
  }
}

/**
 * Get unread application-related emails across all tracked companies.
 * Returns emails grouped by company. Gracefully returns empty on any error.
 */
export async function getUnreadApplicationEmails(
  companyNames: string[],
  maxPerCompany = 3
): Promise<CompanyEmails[]> {
  try {
    const { gmail } = await getGoogleClient();

    // Limit to max 5 companies to avoid API call explosion
    const limitedCompanies = companyNames.slice(0, 5);
    const results: CompanyEmails[] = [];

    for (const company of limitedCompanies) {
      try {
        const domain = extractCompanyDomain(company);
        const query = `(from:@${domain} OR subject:${company}) is:unread newer_than:30d`;

        const listResponse = await gmail.users.messages.list({
          userId: 'me',
          q: query,
          maxResults: maxPerCompany,
        });

        const messageIds = listResponse.data.messages ?? [];
        if (messageIds.length === 0) continue;

        const emails: ParsedEmail[] = [];
        for (const msg of messageIds) {
          if (!msg.id) continue;
          const detail = await gmail.users.messages.get({
            userId: 'me',
            id: msg.id,
            format: 'metadata',
            metadataHeaders: [
              'From',
              'To',
              'Subject',
              'Date',
              'Message-ID',
              'References',
            ],
          });
          emails.push(parseEmailHeaders(detail.data));
        }

        if (emails.length > 0) {
          results.push({ company, emails });
        }
      } catch {
        // Skip this company on error, continue with others
        continue;
      }
    }

    return results;
  } catch {
    // Graceful degradation — return empty if anything fails
    return [];
  }
}
