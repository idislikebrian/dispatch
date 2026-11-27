import { randomBytes } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { Prisma, Project } from '@prisma/client';
import { prisma } from '@/lib/db';
import { agentEnrollmentEnabled, authorizeOperator, ENROLLABLE_PERMISSIONS, sha256 } from '@/lib/security';

const MAX_PENDING_REQUESTS = 5;
function validProject(value: unknown): Project | null { return typeof value === 'string' && Object.values(Project).includes(value as Project) ? value as Project : null; }
function validPermissions(value: unknown): string[] { return Array.isArray(value) ? [...new Set(value.filter((item): item is string => typeof item === 'string' && (ENROLLABLE_PERMISSIONS as readonly string[]).includes(item)))] : []; }
function requestDedupeKey(agentName: string, harness: string, project: Project, requestedPermissions: string[]): string { return sha256(JSON.stringify([agentName, harness, project, [...requestedPermissions].sort()])); }

// Unauthenticated by design (a new runtime has no credential yet), so it is only
// open while an operator has switched agent enrollment on.
export async function POST(request: NextRequest): Promise<NextResponse> {
  if (!agentEnrollmentEnabled()) return NextResponse.json({ error: 'Agent enrollment is disabled' }, { status: 403 });
  const body = await request.json().catch(() => ({})) as { agentName?: string; harness?: string; project?: string; permissions?: unknown };
  const agentName = body.agentName?.trim(); const harness = body.harness?.trim(); const project = validProject(body.project); const requestedPermissions = validPermissions(body.permissions);
  if (!agentName || !harness || !project || requestedPermissions.length === 0) return NextResponse.json({ error: 'agentName, harness, project, and at least one valid permission are required' }, { status: 400 });
  const dedupeKey = requestDedupeKey(agentName, harness, project, requestedPermissions);
  const now = new Date();
  const existing = await prisma.$transaction(async (tx) => {
    await tx.enrollmentRequest.updateMany({ where: { dedupeKey, status: 'pending', expiresAt: { lte: now } }, data: { status: 'expired', dedupeKey: null } });
    return tx.enrollmentRequest.findFirst({ where: { dedupeKey, status: 'pending', expiresAt: { gt: now } }, select: { id: true, expiresAt: true } });
  });
  if (existing) return NextResponse.json({ error: 'an active enrollment request already exists', requestId: existing.id, expiresAt: existing.expiresAt, deduplicated: true }, { status: 409 });
  const pending = await prisma.enrollmentRequest.count({ where: { status: 'pending', expiresAt: { gt: now } } });
  if (pending >= MAX_PENDING_REQUESTS) return NextResponse.json({ error: 'Too many pending enrollment requests' }, { status: 429 });
  const exchangeToken = randomBytes(32).toString('base64url');
  try {
    const enrollment = await prisma.enrollmentRequest.create({ data: { agentName, harness, project, requestedPermissions: requestedPermissions as Prisma.InputJsonValue, dedupeKey, tokenHash: sha256(exchangeToken), expiresAt: new Date(Date.now() + 10 * 60 * 1000) } });
    return NextResponse.json({ requestId: enrollment.id, exchangeToken, expiresAt: enrollment.expiresAt }, { status: 201 });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') return NextResponse.json({ error: 'an active enrollment request already exists', deduplicated: true }, { status: 409 });
    throw error;
  }
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  const auth = await authorizeOperator(request);
  if (auth.denied) return auth.denied;
  const requests = await prisma.enrollmentRequest.findMany({ where: { status: 'pending', expiresAt: { gt: new Date() } }, orderBy: { createdAt: 'asc' } });
  return NextResponse.json(requests.map((item) => ({ id: item.id, agentName: item.agentName, harness: item.harness, project: item.project, requestedPermissions: item.requestedPermissions, status: item.status, expiresAt: item.expiresAt, createdAt: item.createdAt })));
}
