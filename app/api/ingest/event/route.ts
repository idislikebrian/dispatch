import { NextRequest, NextResponse } from 'next/server';
import { Prisma, Project } from '@prisma/client';
import { prisma } from '@/lib/db';

interface EventRequestBody {
  agentName: string;
  agentType?: string;
  type: string;
  message: string;
  project?: Project;
  metadata?: Record<string, unknown>;
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body: EventRequestBody = await request.json();
    const { agentName, agentType, type, message, project, metadata } = body;

    if (!agentName || !type || !message) {
      return NextResponse.json(
        { error: 'agentName, type, and message are required' },
        { status: 400 }
      );
    }

    // Upsert agent by name
    const agent = await prisma.agent.upsert({
      where: { name: agentName },
      update: { updatedAt: new Date() },
      create: { name: agentName, type: agentType || 'openclaw' },
    });

    // Create event record
    const event = await prisma.agentEvent.create({
      data: {
        agentId: agent.id,
        type,
        message,
        project: project ?? null,
        metadata: metadata !== undefined ? (metadata as Prisma.InputJsonValue) : Prisma.JsonNull,
      },
    });

    return NextResponse.json({ id: event.id }, { status: 200 });
  } catch (error) {
    console.error('Event ingest error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
