import { randomBytes } from 'node:crypto';
import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { decryptSecret } from './secret';
import { isFreshTimestamp, signRequest, timingSafeSignatureEqual } from './signing';

export type Principal = { kind: 'session'; userId: string } | { kind: 'identity'; id: string; keyId: string };

export async function authenticateRequest(request: NextRequest): Promise<Principal | null> {
  const session = await getSession();
  if (session.isLoggedIn && session.userId) return { kind: 'session', userId: session.userId };

  const keyId = request.headers.get('x-dispatch-key-id');
  const timestamp = request.headers.get('x-dispatch-timestamp');
  const nonce = request.headers.get('x-dispatch-nonce');
  const signature = request.headers.get('x-dispatch-signature');
  if (!keyId || !timestamp || !nonce || !signature || !isFreshTimestamp(timestamp)) return null;

  const identity = await prisma.authenticatedIdentity.findUnique({ where: { keyId } });
  if (!identity?.active) return null;
  const body = await request.clone().text();
  const expected = signRequest(decryptSecret(identity.secretCiphertext), request.method, new URL(request.url).pathname, timestamp, nonce, body);
  if (!timingSafeSignatureEqual(expected, signature)) return null;

  try {
    await prisma.requestNonce.create({ data: { identityId: identity.id, nonce, expiresAt: new Date(Number(timestamp) + 10 * 60 * 1000) } });
  } catch {
    return null;
  }
  await prisma.authenticatedIdentity.update({ where: { id: identity.id }, data: { lastUsedAt: new Date() } });
  return { kind: 'identity', id: identity.id, keyId: identity.keyId };
}

export function newIdentitySecret(): string { return randomBytes(32).toString('base64url'); }
