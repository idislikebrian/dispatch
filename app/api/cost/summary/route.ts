import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

type Period = '24h' | '7d' | '30d';

function getPeriodStart(period: Period): Date {
  const now = Date.now();
  switch (period) {
    case '7d':
      return new Date(now - 7 * 24 * 60 * 60 * 1000);
    case '30d':
      return new Date(now - 30 * 24 * 60 * 60 * 1000);
    case '24h':
    default:
      return new Date(now - 24 * 60 * 60 * 1000);
  }
}

// GET /api/cost/summary — aggregate cost grouped by agent + project, optional ?period=24h|7d|30d
// Returns ALL agents (including those with zero cost in the window)
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const { searchParams } = new URL(request.url);
    const periodParam = (searchParams.get('period') ?? '24h') as Period;
    const validPeriods: Period[] = ['24h', '7d', '30d'];
    const period: Period = validPeriods.includes(periodParam) ? periodParam : '24h';

    const since = getPeriodStart(period);

    // Fetch all agents so we always return every agent (even with zero cost)
    const allAgents = await prisma.agent.findMany({
      select: { id: true, name: true, project: true },
    });

    // Aggregate cost events grouped by agentId + project
    const costGroups = await prisma.agentCostEvent.groupBy({
      by: ['agentId', 'project'],
      where: { createdAt: { gte: since } },
      _sum: {
        costUsd: true,
        inputTokens: true,
        outputTokens: true,
      },
      _count: { id: true },
    });

    // Build a map of agentId → aggregated cost data
    const costMap = new Map<string, {
      totalCost: number;
      totalInputTokens: number;
      totalOutputTokens: number;
      eventCount: number;
      project: string | null;
    }>();

    for (const g of costGroups) {
      const existing = costMap.get(g.agentId);
      if (existing) {
        existing.totalCost += g._sum.costUsd ?? 0;
        existing.totalInputTokens += g._sum.inputTokens ?? 0;
        existing.totalOutputTokens += g._sum.outputTokens ?? 0;
        existing.eventCount += g._count.id;
      } else {
        costMap.set(g.agentId, {
          totalCost: g._sum.costUsd ?? 0,
          totalInputTokens: g._sum.inputTokens ?? 0,
          totalOutputTokens: g._sum.outputTokens ?? 0,
          eventCount: g._count.id,
          project: g.project,
        });
      }
    }

    // Return all agents, filling in zero for agents with no cost events
    const entries = allAgents.map((agent) => {
      const cost = costMap.get(agent.id);
      return {
        agentName: agent.name,
        project: cost?.project ?? agent.project ?? null,
        totalCost: cost?.totalCost ?? 0,
        totalInputTokens: cost?.totalInputTokens ?? 0,
        totalOutputTokens: cost?.totalOutputTokens ?? 0,
        eventCount: cost?.eventCount ?? 0,
      };
    });

    return NextResponse.json(entries, { status: 200 });
  } catch (error) {
    console.error('Cost summary error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
