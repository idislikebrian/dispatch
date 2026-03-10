import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

// GET /api/activity — last 50 events, optional ?agentId= filter
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const { searchParams } = new URL(request.url);
    const agentId = searchParams.get('agentId');

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
