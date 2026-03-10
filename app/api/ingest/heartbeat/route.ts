import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/db';

interface HeartbeatRequestBody {
  agentName: string;
  status: string;
  metadata?: Record<string, unknown>;
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body: HeartbeatRequestBody = await request.json();
    const { agentName, status, metadata } = body;

    if (!agentName || !status) {
      return NextResponse.json(
        { error: 'agentName and status are required' },
        { status: 400 }
      );
    }

    // Upsert agent by name
    const agent = await prisma.agent.upsert({
      where: { name: agentName },
      update: { updatedAt: new Date() },
      create: { name: agentName, type: 'openclaw' },
    });

    // Create heartbeat record
    const heartbeat = await prisma.agentHeartbeat.create({
      data: {
        agentId: agent.id,
        status,
        metadata: metadata !== undefined ? (metadata as Prisma.InputJsonValue) : Prisma.JsonNull,
      },
    });

    return NextResponse.json({ id: heartbeat.id }, { status: 200 });
  } catch (error) {
    console.error('Heartbeat ingest error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
