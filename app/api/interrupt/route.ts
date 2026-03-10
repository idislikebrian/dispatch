import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/db';

interface InterruptRequestBody {
  agentName: string;
  type: string;
  message?: string;
  metadata?: Record<string, unknown>;
}

// POST /api/interrupt — create an interrupt for an agent
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body: InterruptRequestBody = await request.json();
    const { agentName, type, message, metadata } = body;

    if (!agentName || !type) {
      return NextResponse.json(
        { error: 'agentName and type are required' },
        { status: 400 }
      );
    }

    // Find agent by name (do NOT create — interrupt requires existing agent)
    const agent = await prisma.agent.findUnique({
      where: { name: agentName },
    });

    if (!agent) {
      return NextResponse.json(
        { error: `Agent '${agentName}' not found` },
        { status: 404 }
      );
    }

    const interrupt = await prisma.agentInterrupt.create({
      data: {
        agentId: agent.id,
        type,
        message: message ?? null,
        status: 'pending',
        metadata: metadata !== undefined ? (metadata as Prisma.InputJsonValue) : Prisma.JsonNull,
      },
    });

    return NextResponse.json({ id: interrupt.id }, { status: 200 });
  } catch (error) {
    console.error('Interrupt create error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// GET /api/interrupt?agentId=<id> — return pending interrupts and mark delivered
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const { searchParams } = new URL(request.url);
    const agentId = searchParams.get('agentId');

    if (!agentId) {
      return NextResponse.json(
        { error: 'agentId query parameter is required' },
        { status: 400 }
      );
    }

    // Fetch pending interrupts
    const interrupts = await prisma.agentInterrupt.findMany({
      where: { agentId, status: 'pending' },
      orderBy: { createdAt: 'asc' },
    });

    if (interrupts.length > 0) {
      // Mark them all as delivered
      await prisma.agentInterrupt.updateMany({
        where: {
          id: { in: interrupts.map((i) => i.id) },
        },
        data: { status: 'delivered' },
      });
    }

    return NextResponse.json({ interrupts }, { status: 200 });
  } catch (error) {
    console.error('Interrupt fetch error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
