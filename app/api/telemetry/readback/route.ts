import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { authenticateRequest, hasTelemetryReadPermission } from '@/lib/security';

// Signed identity read-back is deliberately limited to that identity's bound agent.
export async function GET(request: NextRequest): Promise<NextResponse> {
  const principal = await authenticateRequest(request);
  if (!principal) return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  if (!hasTelemetryReadPermission(principal)) return NextResponse.json({ error: 'Permission denied' }, { status: 403 });
  const agentId = principal.kind === 'identity' ? principal.agentId : new URL(request.url).searchParams.get('agentId');
  if (!agentId) return NextResponse.json({ error: 'agentId is required' }, { status: 400 });
  const agent = await prisma.agent.findUnique({ where: { id: agentId }, include: { heartbeats: { orderBy: { createdAt: 'desc' }, take: 10 }, events: { orderBy: { createdAt: 'desc' }, take: 25 } } });
  if (!agent) return NextResponse.json({ error: 'Agent not found' }, { status: 404 });
  if (principal.kind === 'identity' && principal.agentId !== agent.id) return NextResponse.json({ error: 'Agent scope denied' }, { status: 403 });
  return NextResponse.json({ agent: { id: agent.id, name: agent.name, type: agent.type }, heartbeats: agent.heartbeats, events: agent.events }, { status: 200 });
}
