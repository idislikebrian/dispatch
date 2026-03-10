import { NextRequest, NextResponse } from 'next/server';
import { Prisma, Project } from '@prisma/client';
import { prisma } from '@/lib/db';

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
    const body: CostRequestBody = await request.json();
    const { agentName, model, inputTokens, outputTokens, costUsd, eventId, project, metadata } = body;

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
