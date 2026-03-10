import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

// GET /api/agents — all agents with derived status and last heartbeat timestamp
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

    const result = agents.map((agent) => {
      const latestHeartbeat = agent.heartbeats[0] ?? null;
      return {
        id: agent.id,
        name: agent.name,
        type: agent.type,
        project: agent.project,
        // Expose the heartbeat status string for the UI
        status: latestHeartbeat?.status ?? 'offline',
        // Expose last heartbeat timestamp under the key the UI expects
        lastHeartbeat: latestHeartbeat?.createdAt ?? null,
        eventCount24h: agent._count.events,
        createdAt: agent.createdAt,
        updatedAt: agent.updatedAt,
      };
    });

    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    console.error('Agents fetch error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
