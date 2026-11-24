import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { decryptSecret, sha256 } from '@/lib/security';

export async function POST(request: NextRequest): Promise<NextResponse> {
  const body = await request.json().catch(() => ({})) as { requestId?: string; exchangeToken?: string };
  if (!body.requestId || !body.exchangeToken) return NextResponse.json({ error: 'requestId and exchangeToken are required' }, { status: 400 });
  const enrollment = await prisma.enrollmentRequest.findUnique({ where: { id: body.requestId }, include: { identity: true } });
  if (!enrollment || enrollment.tokenHash !== sha256(body.exchangeToken)) return NextResponse.json({ error: 'Invalid enrollment exchange' }, { status: 401 });
  if (enrollment.status !== 'approved' || enrollment.expiresAt <= new Date()) return NextResponse.json({ error: 'Enrollment exchange expired or not approved' }, { status: 409 });
  if (!enrollment.identity) return NextResponse.json({ error: 'Enrollment identity unavailable' }, { status: 409 });
  const consumed = await prisma.enrollmentRequest.updateMany({ where: { id: enrollment.id, status: 'approved', consumedAt: null }, data: { status: 'consumed', consumedAt: new Date() } });
  if (consumed.count !== 1) return NextResponse.json({ error: 'Enrollment exchange already used' }, { status: 409 });
  await prisma.identityAuditEvent.create({ data: { identityId: enrollment.identity.id, action: 'enrollment-consumed', keyId: enrollment.identity.keyId } });
  return NextResponse.json({ keyId: enrollment.identity.keyId, secret: decryptSecret(enrollment.identity.secretCiphertext), agentName: enrollment.agentName, project: enrollment.project, permissions: enrollment.requestedPermissions });
}
