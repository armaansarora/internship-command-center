import { auth } from '@/auth';
import { google } from 'googleapis';

/**
 * Creates authenticated Google API clients from the user's session token.
 * Returns { gmail, calendar } clients ready for API calls.
 */
export async function getGoogleClient() {
  const session = await auth();

  if (!session?.accessToken) {
    throw new Error('Not authenticated');
  }

  if (session.error === 'RefreshTokenError') {
    throw new Error('Token refresh failed');
  }

  const oauth2Client = new google.auth.OAuth2();
  oauth2Client.setCredentials({ access_token: session.accessToken });

  return {
    gmail: google.gmail({ version: 'v1', auth: oauth2Client }),
    calendar: google.calendar({ version: 'v3', auth: oauth2Client }),
  };
}
