import { createHmac, timingSafeEqual } from 'node:crypto';

// Owner-issued account invitation: bound to one email address and an expiry.
// It is single use in effect, because an email address can only be enrolled once.
const PURPOSE = 'dispatch-enrollment-v1';
export const MIN_ENROLLMENT_SECRET_LENGTH = 32;
export const MAX_INVITE_LIFETIME_MS = 24 * 60 * 60 * 1000;

function mac(secret: string, email: string, expiresAt: number): Buffer {
  return createHmac('sha256', secret).update([PURPOSE, email.trim().toLowerCase(), String(expiresAt)].join('\n')).digest();
}

export function enrollmentSecret(env: Record<string, string | undefined> = process.env): string | null {
  const secret = env.DISPATCH_ENROLLMENT_SECRET;
  return secret && secret.length >= MIN_ENROLLMENT_SECRET_LENGTH ? secret : null;
}

export function createInvite(secret: string, email: string, expiresAt: number): string {
  if (secret.length < MIN_ENROLLMENT_SECRET_LENGTH) throw new Error('enrollment secret is too short');
  return `${expiresAt}.${mac(secret, email, expiresAt).toString('base64url')}`;
}

export function verifyInvite(secret: string, email: string, token: string, now = Date.now()): boolean {
  const match = /^(\d{1,15})\.([A-Za-z0-9_-]{43})$/.exec(token);
  if (!match || secret.length < MIN_ENROLLMENT_SECRET_LENGTH) return false;
  const expiresAt = Number(match[1]);
  if (expiresAt <= now || expiresAt - now > MAX_INVITE_LIFETIME_MS) return false;
  const supplied = Buffer.from(match[2], 'base64url');
  const expected = mac(secret, email, expiresAt);
  return supplied.length === expected.length && timingSafeEqual(supplied, expected);
}
