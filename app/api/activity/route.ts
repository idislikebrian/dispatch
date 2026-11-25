import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { authenticateRequest, hasTelemetryReadPermission } from '@/lib/security';

// GET /api/activity — last 50 events, optional ?agentId= filter
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const principal = await authenticateRequest(request);
    if (!principal) return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    if (!hasTelemetryReadPermission(principal)) return NextResponse.json({ error: 'Permission denied' }, { status: 403 });
    const { searchParams } = new URL(request.url);
    const requestedAgentId = searchParams.get('agentId');
    const agentId = principal.kind === 'identity' ? principal.agentId : requestedAgentId;
    if (principal.kind === 'identity' && !agentId) return NextResponse.json({ error: 'Identity has no agent scope' }, { status: 403 });
    if (principal.kind === 'identity' && requestedAgentId && requestedAgentId !== agentId) return NextResponse.json({ error: 'Agent scope denied' }, { status: 403 });

    const events = await prisma.agentEvent.findMany({
      where: agentId ? { agentId } : undefined,
      orderBy: { createdAt: 'desc' },
      take: 50,
      include: {
        agent: {
          select: { name: true },
        },
        costEvent: {
          select: { costUsd: true, inputTokens: true, outputTokens: true },
        },
      },
    });

    // Normalise to the shape the UI expects
    const result = events.map((ev) => ({
      id: ev.id,
      timestamp: ev.createdAt,
      agentName: ev.agent.name,
      type: ev.type,
      message: ev.message,
      result: null, // AgentEvent has no result field in schema
      metadata: {
        ...(ev.metadata as Record<string, unknown> | null ?? {}),
        tokensUsed: ev.costEvent
          ? (ev.costEvent.inputTokens ?? 0) + (ev.costEvent.outputTokens ?? 0)
          : undefined,
        cost: ev.costEvent?.costUsd ?? undefined,
      },
    }));

    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    console.error('Activity fetch error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
