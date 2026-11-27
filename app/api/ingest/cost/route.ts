import { NextRequest, NextResponse } from 'next/server';
import { Prisma, Project } from '@prisma/client';
import { prisma } from '@/lib/db';
import { authorizeAgent, hasIdentityScope } from '@/lib/security';

interface CostRequestBody {
  agentName: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
  costUsd: number;
  eventId?: string;
  project?: Project;
  metadata?: Record<string, unknown>;
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const auth = await authorizeAgent(request, 'costs:write');
    if (auth.denied) return auth.denied;
    const body: CostRequestBody = await request.json();
    const { agentName, model, inputTokens, outputTokens, costUsd, eventId, project, metadata } = body;

    if (!(await hasIdentityScope(auth.actor.principal, agentName, project))) return NextResponse.json({ error: 'Agent scope denied' }, { status: 403 });

    if (!agentName || !model || inputTokens == null || outputTokens == null || costUsd == null) {
      return NextResponse.json(
        { error: 'agentName, model, inputTokens, outputTokens, and costUsd are required' },
        { status: 400 }
      );
    }

    // Upsert agent by name
    const agent = await prisma.agent.upsert({
      where: { name: agentName },
      update: { updatedAt: new Date() },
      create: { name: agentName, type: 'openclaw' },
    });

    // A cost record may only be attached to the same agent's event.
    if (eventId) {
      const event = await prisma.agentEvent.findUnique({ where: { id: eventId }, select: { agentId: true } });
      if (event?.agentId !== agent.id) return NextResponse.json({ error: 'Event scope denied' }, { status: 403 });
    }

    // Create cost event record
    const costEvent = await prisma.agentCostEvent.create({
      data: {
        agentId: agent.id,
        model,
        inputTokens,
        outputTokens,
        costUsd,
        eventId: eventId ?? null,
        project: project ?? null,
        metadata: metadata !== undefined ? (metadata as Prisma.InputJsonValue) : Prisma.JsonNull,
      },
    });

    return NextResponse.json({ id: costEvent.id }, { status: 200 });
  } catch (error) {
    console.error('Cost ingest error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
