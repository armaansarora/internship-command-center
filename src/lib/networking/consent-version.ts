/**
 * bumped from 1 → 2 when the consent copy gained language about
 * match queries being rate-limited and the audit log surface. All users
 * at version < CURRENT_CONSENT_VERSION become `consent-version-stale`
 * until they re-consent via the NetworkingConsent component.
 */
export const CURRENT_CONSENT_VERSION = 2;
