import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { authorizeTelemetryRead } from '@/lib/security';

// Signed identity read-back is deliberately limited to that identity's bound agent.
export async function GET(request: NextRequest): Promise<NextResponse> {
  const auth = await authorizeTelemetryRead(request);
  if (auth.denied) return auth.denied;
  const { agentScope } = auth.actor;
  const requestedAgentId = new URL(request.url).searchParams.get('agentId');
  if (agentScope && requestedAgentId && requestedAgentId !== agentScope) return NextResponse.json({ error: 'Agent scope denied' }, { status: 403 });
  const agentId = agentScope ?? requestedAgentId;
  if (!agentId) return NextResponse.json({ error: 'agentId is required' }, { status: 400 });
  const agent = await prisma.agent.findUnique({ where: { id: agentId }, include: { heartbeats: { orderBy: { createdAt: 'desc' }, take: 10 }, events: { orderBy: { createdAt: 'desc' }, take: 25 } } });
  if (!agent) return NextResponse.json({ error: 'Agent not found' }, { status: 404 });
  return NextResponse.json({ agent: { id: agent.id, name: agent.name, type: agent.type }, heartbeats: agent.heartbeats, events: agent.events }, { status: 200 });
}
