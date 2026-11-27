import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { authenticateRequest, type Principal } from './authenticate';
import { operatorIds } from './config';
import type { AgentPermission } from './permissions';

// The only entry points API routes use to decide who may proceed.
export type OperatorActor = { kind: 'operator'; userId: string };
export type AgentActor = { kind: 'agent'; identityId: string; agentId: string; principal: Principal };
export type Authorization<T> = { actor: T; denied?: undefined } | { actor?: undefined; denied: NextResponse };

function deny(status: 401 | 403, error: string): { denied: NextResponse } {
  return { denied: NextResponse.json({ error }, { status }) };
}

// A session alone is not operator access: the user must be allowlisted and must
// still exist.
export async function isOperator(userId: string): Promise<boolean> {
  if (!operatorIds().has(userId)) return false;
  return Boolean(await prisma.user.findUnique({ where: { id: userId }, select: { id: true } }));
}

function toAgent(principal: Principal, permission: AgentPermission): Authorization<AgentActor> {
  if (principal.kind !== 'identity') return deny(403, 'Agent credential required');
  if (!principal.permissions.includes(permission)) return deny(403, 'Permission denied');
  if (!principal.agentId) return deny(403, 'Identity has no agent scope');
  return { actor: { kind: 'agent', identityId: principal.id, agentId: principal.agentId, principal } };
}

export async function authorizeOperator(request: NextRequest): Promise<Authorization<OperatorActor>> {
  const principal = await authenticateRequest(request);
  if (!principal) return deny(401, 'Authentication required');
  if (principal.kind !== 'session' || !(await isOperator(principal.userId))) return deny(403, 'Operator access required');
  return { actor: { kind: 'operator', userId: principal.userId } };
}

export async function authorizeAgent(request: NextRequest, permission: AgentPermission): Promise<Authorization<AgentActor>> {
  const principal = await authenticateRequest(request);
  if (!principal) return deny(401, 'Authentication required');
  return toAgent(principal, permission);
}

// Telemetry reads: an operator sees everything; an agent sees only itself.
// `agentScope` is null for operators and the bound agent id for agents.
export async function authorizeTelemetryRead(request: NextRequest): Promise<Authorization<{ agentScope: string | null }>> {
  const principal = await authenticateRequest(request);
  if (!principal) return deny(401, 'Authentication required');
  if (principal.kind === 'session') {
    return (await isOperator(principal.userId)) ? { actor: { agentScope: null } } : deny(403, 'Operator access required');
  }
  const agent = toAgent(principal, 'telemetry:read');
  return agent.denied ? agent : { actor: { agentScope: agent.actor.agentId } };
}
