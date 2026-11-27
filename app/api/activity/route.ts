import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { authorizeTelemetryRead } from '@/lib/security';

// GET /api/activity — last 50 events, optional ?agentId= filter
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const auth = await authorizeTelemetryRead(request);
    if (auth.denied) return auth.denied;
    const { agentScope } = auth.actor;
    const { searchParams } = new URL(request.url);
    const requestedAgentId = searchParams.get('agentId');
    if (agentScope && requestedAgentId && requestedAgentId !== agentScope) return NextResponse.json({ error: 'Agent scope denied' }, { status: 403 });
    const agentId = agentScope ?? requestedAgentId;
    const includeSynthetic = searchParams.get('includeSynthetic') === 'true';

    const events = await prisma.agentEvent.findMany({
      where: {
        ...(agentId ? { agentId } : {}),
        ...(includeSynthetic ? {} : { agent: { isSynthetic: false } }),
      },
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
      result: typeof (ev.metadata as Record<string, unknown> | null)?.executionState === 'string'
        ? (ev.metadata as Record<string, string>).executionState
        : 'unavailable',
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
