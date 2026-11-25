import { randomBytes } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { encryptSecret, newIdentitySecret } from '@/lib/security';
import { Project, Prisma } from '@prisma/client';
import { deriveAgentStatus } from '@/lib/agents/status';

const allowedPermissions = ['heartbeat:write', 'events:write', 'costs:write'] as const;

function cleanPermissions(value: unknown): string[] {
  if (!Array.isArray(value)) return ['heartbeat:write', 'events:write'];
  return [...new Set(value.filter((item): item is string => typeof item === 'string' && (allowedPermissions as readonly string[]).includes(item)))];
}

function cleanProject(value: unknown): Project | null {
  return typeof value === 'string' && Object.values(Project).includes(value as Project) ? value as Project : null;
}

export async function GET(): Promise<NextResponse> {
  const session = await getSession();
  if (!session.isLoggedIn || !session.userId) return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  const identities = await prisma.authenticatedIdentity.findMany({
    orderBy: { createdAt: 'desc' },
    include: { agent: { include: { heartbeats: { orderBy: { createdAt: 'desc' }, take: 1 } } }, auditEvents: { orderBy: { createdAt: 'desc' }, take: 20 } },
  });
  return NextResponse.json(identities.map((identity) => ({
    id: identity.id, name: identity.name, keyId: identity.keyId, active: identity.active,
    project: identity.project, permissions: identity.permissions ?? [], lastUsedAt: identity.lastUsedAt,
    revokedAt: identity.revokedAt, rotatedAt: identity.rotatedAt,
    agent: identity.agent ? { id: identity.agent.id, name: identity.agent.name, type: identity.agent.type, project: identity.agent.project, status: deriveAgentStatus(identity.agent.heartbeats[0]?.status, identity.agent.heartbeats[0]?.createdAt), lastHeartbeat: identity.agent.heartbeats[0]?.createdAt ?? null } : null,
    authenticationHistory: identity.auditEvents.map((event) => ({ action: event.action, keyId: event.keyId, createdAt: event.createdAt })),
  })));
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const session = await getSession();
  if (!session.isLoggedIn || !session.userId) return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  const body = await request.json().catch(() => ({})) as { name?: string; agentName?: string; agentType?: string; project?: string; permissions?: unknown };
  const name = body.name?.trim();
  if (!name) return NextResponse.json({ error: 'name is required' }, { status: 400 });
  const agentName = body.agentName?.trim() || name;
  const project = cleanProject(body.project);
  const permissions = cleanPermissions(body.permissions);
  const secret = newIdentitySecret();
  const keyId = `dsp_${randomBytes(12).toString('hex')}`;
  const identity = await prisma.$transaction(async (tx) => {
    const agent = await tx.agent.upsert({ where: { name: agentName }, update: { project }, create: { name: agentName, type: body.agentType?.trim() || 'openclaw', project } });
    const created = await tx.authenticatedIdentity.create({ data: { name, keyId, secretCiphertext: encryptSecret(secret), agentId: agent.id, project, permissions: permissions as Prisma.InputJsonValue } });
    await tx.identityAuditEvent.create({ data: { identityId: created.id, action: 'created', keyId, metadata: { project, permissions } } });
    return created;
  });
  return NextResponse.json({ id: identity.id, name, agentName, project, permissions, keyId, secret }, { status: 201 });
}
