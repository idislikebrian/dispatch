import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { authenticateRequest, hasTelemetryReadPermission } from '@/lib/security';
import { deriveOfficeAgentState } from '@/lib/telemetry/office';

// GET /api/agents — all agents with derived status and last heartbeat timestamp
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const principal = await authenticateRequest(request);
    if (!principal) return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    if (!hasTelemetryReadPermission(principal)) return NextResponse.json({ error: 'Permission denied' }, { status: 403 });
    const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const includeSynthetic = new URL(request.url).searchParams.get('includeSynthetic') === 'true';

    const agents = await prisma.agent.findMany({
      where: {
        ...(principal.kind === 'identity' && principal.agentId ? { id: principal.agentId } : {}),
        ...(includeSynthetic ? {} : { isSynthetic: false }),
      },
      orderBy: { name: 'asc' },
      include: {
        heartbeats: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
        events: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          select: { metadata: true },
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
      const office = deriveOfficeAgentState(latestHeartbeat, agent.events[0] ?? null);
      return {
        id: agent.id,
        name: agent.name,
        type: agent.type,
        project: agent.project,
        // Expose the heartbeat status string for the UI
        status: office.status,
        connectivity: office.connectivity,
        telemetryFreshness: office.telemetryFreshness,
        executionState: office.executionState,
        financialMetrics: office.financialMetrics,
        operationalMetrics: office.operationalMetrics,
        isSynthetic: agent.isSynthetic,
        responsibility: agent.responsibility,
        harness: agent.harness,
        objectiveRef: agent.objectiveRef,
        classification: agent.classification,
        classificationEvidence: agent.classificationEvidence,
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
