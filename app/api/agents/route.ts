import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

// GET /api/agents — all agents with latest heartbeat and 24h event count
export async function GET(): Promise<NextResponse> {
  try {
    const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const agents = await prisma.agent.findMany({
      orderBy: { name: 'asc' },
      include: {
        heartbeats: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
        _count: {
          select: {
            events: {
              where: { createdAt: { gte: since24h } },
            },
          },
        },
      },
    });

    const result = agents.map((agent) => ({
      id: agent.id,
      name: agent.name,
      type: agent.type,
      project: agent.project,
      createdAt: agent.createdAt,
      updatedAt: agent.updatedAt,
      latestHeartbeat: agent.heartbeats[0] ?? null,
      eventCount24h: agent._count.events,
    }));

    return NextResponse.json({ agents: result }, { status: 200 });
  } catch (error) {
    console.error('Agents fetch error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
