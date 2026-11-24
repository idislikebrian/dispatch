import { randomBytes } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { encryptSecret, newIdentitySecret } from '@/lib/security';

export async function POST(request: NextRequest): Promise<NextResponse> {
  const session = await getSession();
  if (!session.isLoggedIn || !session.userId) return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  const body = await request.json().catch(() => ({})) as { name?: string };
  const name = body.name?.trim();
  if (!name) return NextResponse.json({ error: 'name is required' }, { status: 400 });
  const secret = newIdentitySecret();
  const keyId = `dsp_${randomBytes(12).toString('hex')}`;
  const identity = await prisma.authenticatedIdentity.create({ data: { name, keyId, secretCiphertext: encryptSecret(secret) } });
  return NextResponse.json({ id: identity.id, name, keyId, secret }, { status: 201 });
}
