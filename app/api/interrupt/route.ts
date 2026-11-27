import { randomBytes } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/db';
import { authorizeAgent, authorizeOperator, interruptsEnabled, leaseWindow, retryDelayMs } from '@/lib/security';

const DEFAULT_LEASE_MS = 60_000;
// Interrupts are refused here, not only in the interface, until an operator
// enables them. Operators create commands; only the target agent may claim them.
const disabled = () => NextResponse.json({ error: 'Interrupts are disabled' }, { status: 403 });

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const auth = await authorizeOperator(request);
    if (auth.denied) return auth.denied;
    if (!interruptsEnabled()) return disabled();
    const body = await request.json() as { agentName?: string; type?: string; message?: string; metadata?: Record<string, unknown>; expiresAt?: string };
    if (!body.agentName || !body.type) return NextResponse.json({ error: 'agentName and type are required' }, { status: 400 });
    const agent = await prisma.agent.findUnique({ where: { name: body.agentName } });
    if (!agent) return NextResponse.json({ error: `Agent '${body.agentName}' not found` }, { status: 404 });
    const interrupt = await prisma.agentInterrupt.create({ data: { agentId: agent.id, type: body.type, message: body.message ?? null, status: 'pending', metadata: body.metadata !== undefined ? body.metadata as Prisma.InputJsonValue : Prisma.JsonNull, expiresAt: body.expiresAt ? new Date(body.expiresAt) : null } });
    return NextResponse.json({ id: interrupt.id }, { status: 201 });
  } catch (error) { console.error('Interrupt create error:', error); return NextResponse.json({ error: 'Internal server error' }, { status: 500 }); }
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const auth = await authorizeAgent(request, 'interrupts:claim');
    if (auth.denied) return auth.denied;
    if (!interruptsEnabled()) return disabled();
    const owner = `identity:${auth.actor.identityId}`;
    const params = new URL(request.url).searchParams;
    const agentId = params.get('agentId');
    if (!agentId) return NextResponse.json({ error: 'agentId query parameter is required' }, { status: 400 });
    if (agentId !== auth.actor.agentId) return NextResponse.json({ error: 'Agent scope denied' }, { status: 403 });
    const now = new Date();
    await prisma.agentInterrupt.updateMany({ where: { agentId, status: { in: ['pending', 'claimed'] }, expiresAt: { lte: now } }, data: { status: 'expired', claimToken: null, claimOwner: null } });
    const candidate = await prisma.agentInterrupt.findFirst({ where: { agentId, status: { in: ['pending', 'claimed'] }, availableAt: { lte: now }, OR: [{ leaseExpiresAt: null }, { leaseExpiresAt: { lte: now } }], AND: [{ OR: [{ expiresAt: null }, { expiresAt: { gt: now } }] }] }, orderBy: { createdAt: 'asc' } });
    if (!candidate) return NextResponse.json({ interrupts: [] }, { status: 200 });
    const lease = leaseWindow({ now, leaseMs: Number(params.get('leaseMs') ?? DEFAULT_LEASE_MS), attempt: candidate.attempts });
    const claimToken = randomBytes(24).toString('base64url');
    const updated = await prisma.agentInterrupt.updateMany({ where: { id: candidate.id, status: candidate.status, OR: [{ leaseExpiresAt: null }, { leaseExpiresAt: { lte: now } }] }, data: { status: 'claimed', claimToken, claimOwner: owner, ...lease } });
    if (updated.count !== 1) return NextResponse.json({ interrupts: [] }, { status: 200 });
    const claimed = await prisma.agentInterrupt.findUnique({ where: { id: candidate.id } });
    return NextResponse.json({ interrupts: claimed ? [claimed] : [] }, { status: 200 });
  } catch (error) { console.error('Interrupt claim error:', error); return NextResponse.json({ error: 'Internal server error' }, { status: 500 }); }
}

export async function PATCH(request: NextRequest): Promise<NextResponse> {
  try {
    const auth = await authorizeAgent(request, 'interrupts:claim');
    if (auth.denied) return auth.denied;
    if (!interruptsEnabled()) return disabled();
    const owner = `identity:${auth.actor.identityId}`;
    const body = await request.json() as { id?: string; claimToken?: string; action?: 'ack' | 'retry' };
    if (!body.id || !body.claimToken || !body.action) return NextResponse.json({ error: 'id, claimToken, and action are required' }, { status: 400 });
    const interrupt = await prisma.agentInterrupt.findUnique({ where: { id: body.id } });
    if (!interrupt || interrupt.agentId !== auth.actor.agentId || interrupt.status !== 'claimed' || interrupt.claimToken !== body.claimToken || interrupt.claimOwner !== owner) return NextResponse.json({ error: 'Invalid or expired claim' }, { status: 409 });
    if (body.action === 'ack') await prisma.agentInterrupt.update({ where: { id: body.id }, data: { status: 'acknowledged', acknowledgedAt: new Date(), claimToken: null, claimOwner: null, leaseExpiresAt: null } });
    else await prisma.agentInterrupt.update({ where: { id: body.id }, data: { status: 'pending', availableAt: new Date(Date.now() + retryDelayMs(interrupt.attempts)), claimToken: null, claimOwner: null, leaseExpiresAt: null } });
    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) { console.error('Interrupt acknowledgement error:', error); return NextResponse.json({ error: 'Internal server error' }, { status: 500 }); }
}
