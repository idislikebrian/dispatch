import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { authenticateRequest } from '@/lib/security';

// GET /api/errors — last 50 error events
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    if (!await authenticateRequest(request)) return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    const includeSynthetic = new URL(request.url).searchParams.get('includeSynthetic') === 'true';
    const events = await prisma.agentEvent.findMany({
      where: {
        type: 'error',
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
