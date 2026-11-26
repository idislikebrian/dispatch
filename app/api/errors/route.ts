import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { authorizeTelemetryRead } from '@/lib/security';

// GET /api/errors — last 50 error events
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const auth = await authorizeTelemetryRead(request);
    if (auth.denied) return auth.denied;
    const { agentScope } = auth.actor;
    const includeSynthetic = new URL(request.url).searchParams.get('includeSynthetic') === 'true';
    const events = await prisma.agentEvent.findMany({
      where: {
        type: 'error',
        ...(agentScope ? { agentId: agentScope } : {}),
        ...(includeSynthetic ? {} : { agent: { isSynthetic: false } }),
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
      include: {
        agent: {
          select: { name: true, isSynthetic: true },
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
