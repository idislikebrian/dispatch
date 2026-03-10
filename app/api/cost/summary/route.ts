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

// GET /api/cost/summary — aggregate cost grouped by agent, optional ?period=24h|7d|30d
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const { searchParams } = new URL(request.url);
    const periodParam = (searchParams.get('period') ?? '24h') as Period;
    const validPeriods: Period[] = ['24h', '7d', '30d'];
    const period: Period = validPeriods.includes(periodParam) ? periodParam : '24h';

    const since = getPeriodStart(period);

    // Aggregate cost events grouped by agent
    const costGroups = await prisma.agentCostEvent.groupBy({
      by: ['agentId'],
      where: { createdAt: { gte: since } },
      _sum: {
        costUsd: true,
        inputTokens: true,
        outputTokens: true,
      },
      _count: { id: true },
    });

    // Fetch agent names
    const agentIds = costGroups.map((g) => g.agentId);
    const agents = await prisma.agent.findMany({
      where: { id: { in: agentIds } },
      select: { id: true, name: true },
    });
    const agentMap = new Map(agents.map((a) => [a.id, a.name]));

    const byAgent = costGroups.map((g) => ({
      agentId: g.agentId,
      agentName: agentMap.get(g.agentId) ?? 'unknown',
      totalCostUsd: g._sum.costUsd ?? 0,
      totalInputTokens: g._sum.inputTokens ?? 0,
      totalOutputTokens: g._sum.outputTokens ?? 0,
      eventCount: g._count.id,
    }));

    const totalCostUsd = byAgent.reduce((sum, a) => sum + a.totalCostUsd, 0);
    const totalInputTokens = byAgent.reduce((sum, a) => sum + a.totalInputTokens, 0);
    const totalOutputTokens = byAgent.reduce((sum, a) => sum + a.totalOutputTokens, 0);

    return NextResponse.json(
      {
        period,
        since,
        totalCostUsd,
        totalInputTokens,
        totalOutputTokens,
        byAgent,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Cost summary error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
