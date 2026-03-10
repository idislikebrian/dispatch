import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

// GET /api/errors — last 50 error events
export async function GET(): Promise<NextResponse> {
  try {
    const events = await prisma.agentEvent.findMany({
      where: { type: 'error' },
      orderBy: { createdAt: 'desc' },
      take: 50,
      include: {
        agent: {
          select: { name: true },
        },
      },
    });

    return NextResponse.json({ events }, { status: 200 });
  } catch (error) {
    console.error('Errors fetch error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
