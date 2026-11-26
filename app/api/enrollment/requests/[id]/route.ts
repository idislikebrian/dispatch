import { randomBytes } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/db';
import { assertIdentityEncryptionKey, authorizeOperator, encryptSecret, newIdentitySecret } from '@/lib/security';

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }): Promise<NextResponse> {
  const auth = await authorizeOperator(request);
  if (auth.denied) return auth.denied;
  const { id } = await params; const body = await request.json().catch(() => ({})) as { action?: string };
  const enrollment = await prisma.enrollmentRequest.findUnique({ where: { id } });
  if (!enrollment) return NextResponse.json({ error: 'Enrollment request not found' }, { status: 404 });
  if (body.action === 'approve' && (enrollment.status === 'approved' || enrollment.status === 'consumed')) return NextResponse.json({ id, status: enrollment.status, expiresAt: enrollment.expiresAt, idempotent: true });
  if (enrollment.status !== 'pending' || enrollment.expiresAt <= new Date()) return NextResponse.json({ error: 'Enrollment request is no longer pending', status: enrollment.status }, { status: 409 });
  if (body.action === 'reject') { await prisma.enrollmentRequest.update({ where: { id }, data: { status: 'rejected', dedupeKey: null } }); return NextResponse.json({ id, status: 'rejected' }); }
  if (body.action !== 'approve') return NextResponse.json({ error: 'action must be approve or reject' }, { status: 400 });
  try { assertIdentityEncryptionKey(); } catch { return NextResponse.json({ error: 'identity enrollment is temporarily unavailable' }, { status: 503 }); }
  const permissions = Array.isArray(enrollment.requestedPermissions) ? enrollment.requestedPermissions : [];
  // Never hand an existing credential to a new requester.
  const holder = await prisma.authenticatedIdentity.findFirst({ where: { agent: { name: enrollment.agentName } }, select: { id: true } });
  if (holder) return NextResponse.json({ error: 'Agent already has a credential; rotate it from agent management instead', status: enrollment.status }, { status: 409 });
  const result = await prisma.$transaction(async (tx) => {
    const agent = await tx.agent.upsert({ where: { name: enrollment.agentName }, update: { type: enrollment.harness, project: enrollment.project }, create: { name: enrollment.agentName, type: enrollment.harness, project: enrollment.project } });
    const secret = newIdentitySecret(); const keyId = `dsp_${randomBytes(12).toString('hex')}`;
    // agentId is unique, so a concurrent approval for the same agent fails here.
    const identity = await tx.authenticatedIdentity.create({ data: { name: enrollment.agentName, keyId, secretCiphertext: encryptSecret(secret), agentId: agent.id, project: enrollment.project, permissions: permissions as Prisma.InputJsonValue } });
    await tx.identityAuditEvent.create({ data: { identityId: identity.id, action: 'enrollment-approved', keyId, metadata: { harness: enrollment.harness, project: enrollment.project, permissions, operatorId: auth.actor.userId } } });
    return tx.enrollmentRequest.update({ where: { id, status: 'pending' }, data: { status: 'approved', approvedAt: new Date(), identityId: identity.id } });
  });
  return NextResponse.json({ id: result.id, status: result.status, expiresAt: result.expiresAt });
}
