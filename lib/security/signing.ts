import { createHash, createHmac, timingSafeEqual } from 'node:crypto';

export const SIGNATURE_VERSION = 'v1';
export const REQUEST_WINDOW_MS = 5 * 60 * 1000;

export function sha256(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

export function canonicalRequest(method: string, path: string, timestamp: string, nonce: string, body: string): string {
  return [method.toUpperCase(), path, timestamp, nonce, sha256(body)].join('\n');
}

export function signRequest(secret: string, method: string, path: string, timestamp: string, nonce: string, body: string): string {
  return `${SIGNATURE_VERSION}=${createHmac('sha256', secret).update(canonicalRequest(method, path, timestamp, nonce, body)).digest('hex')}`;
}

export function timingSafeSignatureEqual(expected: string, actual: string): boolean {
  const a = Buffer.from(expected);
  const b = Buffer.from(actual);
  return a.length === b.length && timingSafeEqual(a, b);
}

export function isFreshTimestamp(timestamp: string, now = Date.now()): boolean {
  const parsed = Number(timestamp);
  return Number.isFinite(parsed) && Math.abs(now - parsed) <= REQUEST_WINDOW_MS;
}

export function retryDelayMs(attempt: number): number {
  return Math.min(60 * 60 * 1000, 1000 * 2 ** Math.max(0, attempt - 1));
}
