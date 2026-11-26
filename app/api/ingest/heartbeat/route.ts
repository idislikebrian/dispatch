import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/db';
import { authorizeAgent, hasIdentityScope } from '@/lib/security';

interface HeartbeatRequestBody {
  agentName: string;
  agentType?: string;
  status: string;
  metadata?: Record<string, unknown>;
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const auth = await authorizeAgent(request, 'heartbeat:write');
    if (auth.denied) return auth.denied;
    const body: HeartbeatRequestBody = await request.json();
    const { agentName, agentType, status, metadata } = body;

    if (!(await hasIdentityScope(auth.actor.principal, agentName))) return NextResponse.json({ error: 'Agent scope denied' }, { status: 403 });

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
      create: { name: agentName, type: agentType || 'openclaw' },
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
