import { randomBytes } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { AGENT_PERMISSIONS, authorizeOperator, encryptSecret, newIdentitySecret } from '@/lib/security';

function cleanPermissions(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.filter((item): item is string => typeof item === 'string' && (AGENT_PERMISSIONS as readonly string[]).includes(item)))];
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }): Promise<NextResponse> {
  const auth = await authorizeOperator(request);
  if (auth.denied) return auth.denied;
  const { id } = await params;
  const body = await request.json().catch(() => ({})) as { action?: string; permissions?: unknown };
  const identity = await prisma.authenticatedIdentity.findUnique({ where: { id } });
  if (!identity) return NextResponse.json({ error: 'Identity not found' }, { status: 404 });
  if (body.action !== 'revoke' && body.action !== 'rotate' && body.action !== 'set-permissions') return NextResponse.json({ error: 'action must be revoke, rotate, or set-permissions' }, { status: 400 });
  if (body.action === 'revoke') {
    await prisma.$transaction([
      prisma.authenticatedIdentity.update({ where: { id }, data: { active: false, revokedAt: new Date() } }),
      prisma.identityAuditEvent.create({ data: { identityId: id, action: 'revoked', keyId: identity.keyId, metadata: { operatorId: auth.actor.userId } } }),
    ]);
    return NextResponse.json({ id, active: false });
  }
  if (body.action === 'set-permissions') {
    const permissions = cleanPermissions(body.permissions);
    await prisma.$transaction([
      prisma.authenticatedIdentity.update({ where: { id }, data: { permissions } }),
      prisma.identityAuditEvent.create({ data: { identityId: id, action: 'permissions-updated', keyId: identity.keyId, metadata: { permissions, operatorId: auth.actor.userId } } }),
    ]);
    return NextResponse.json({ id, permissions });
  }
  const secret = newIdentitySecret();
  const keyId = `dsp_${randomBytes(12).toString('hex')}`;
  await prisma.$transaction([
    prisma.authenticatedIdentity.update({ where: { id }, data: { keyId, secretCiphertext: encryptSecret(secret), active: true, revokedAt: null, rotatedAt: new Date() } }),
    prisma.identityAuditEvent.create({ data: { identityId: id, action: 'rotated', keyId, metadata: { operatorId: auth.actor.userId } } }),
  ]);
  return NextResponse.json({ id, keyId, secret, active: true });
}
