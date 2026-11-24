import { randomBytes } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { encryptSecret, newIdentitySecret } from '@/lib/security';

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }): Promise<NextResponse> {
  const session = await getSession();
  if (!session.isLoggedIn || !session.userId) return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  const { id } = await params; const body = await request.json().catch(() => ({})) as { action?: string };
  const enrollment = await prisma.enrollmentRequest.findUnique({ where: { id } });
  if (!enrollment) return NextResponse.json({ error: 'Enrollment request not found' }, { status: 404 });
  if (body.action === 'approve' && (enrollment.status === 'approved' || enrollment.status === 'consumed')) return NextResponse.json({ id, status: enrollment.status, expiresAt: enrollment.expiresAt, idempotent: true });
  if (enrollment.status !== 'pending' || enrollment.expiresAt <= new Date()) return NextResponse.json({ error: 'Enrollment request is no longer pending', status: enrollment.status }, { status: 409 });
  if (body.action === 'reject') { await prisma.enrollmentRequest.update({ where: { id }, data: { status: 'rejected', dedupeKey: null } }); return NextResponse.json({ id, status: 'rejected' }); }
  if (body.action !== 'approve') return NextResponse.json({ error: 'action must be approve or reject' }, { status: 400 });
  const permissions = Array.isArray(enrollment.requestedPermissions) ? enrollment.requestedPermissions : [];
  const result = await prisma.$transaction(async (tx) => {
    const agent = await tx.agent.upsert({ where: { name: enrollment.agentName }, update: { type: enrollment.harness, project: enrollment.project }, create: { name: enrollment.agentName, type: enrollment.harness, project: enrollment.project } });
    const existingIdentity = await tx.authenticatedIdentity.findUnique({ where: { agentId: agent.id } });
    if (existingIdentity) return tx.enrollmentRequest.update({ where: { id }, data: { status: 'approved', approvedAt: enrollment.approvedAt ?? new Date(), identityId: existingIdentity.id } });
    const secret = newIdentitySecret(); const keyId = `dsp_${randomBytes(12).toString('hex')}`;
    const identity = await tx.authenticatedIdentity.create({ data: { name: enrollment.agentName, keyId, secretCiphertext: encryptSecret(secret), agentId: agent.id, project: enrollment.project, permissions: permissions as Prisma.InputJsonValue } });
    await tx.identityAuditEvent.create({ data: { identityId: identity.id, action: 'enrollment-approved', keyId, metadata: { harness: enrollment.harness, project: enrollment.project, permissions } } });
    return tx.enrollmentRequest.update({ where: { id }, data: { status: 'approved', approvedAt: new Date(), identityId: identity.id } });
  });
  return NextResponse.json({ id: result.id, status: result.status, expiresAt: result.expiresAt });
}
