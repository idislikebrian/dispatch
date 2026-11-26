import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { getSession, hashPassword } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { enrollmentSecret, verifyInvite } from '@/lib/security';

const MIN_PASSWORD_LENGTH = 12;
const MAX_PASSWORD_BYTES = 72; // bcrypt ignores anything longer

const refuse = (status: number, error: string) => NextResponse.json({ error }, { status });

// Account creation requires an owner-issued invitation. Disabled unless
// DISPATCH_ENROLLMENT_SECRET is set. An account is not operator access.
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const secret = enrollmentSecret();
    if (!secret) return refuse(403, 'Enrollment is disabled');
    const body = await request.json().catch(() => ({})) as { email?: unknown; password?: unknown; token?: unknown };
    const { password, token } = body;
    const email = typeof body.email === 'string' ? body.email.trim() : '';
    if (!email || typeof password !== 'string' || typeof token !== 'string') return refuse(400, 'email, password, and token are required');
    if (!verifyInvite(secret, email, token)) return refuse(403, 'Invalid or expired invitation');
    if (password.length < MIN_PASSWORD_LENGTH || Buffer.byteLength(password) > MAX_PASSWORD_BYTES) return refuse(400, `password must be ${MIN_PASSWORD_LENGTH} to ${MAX_PASSWORD_BYTES} characters`);
    const existing = await prisma.user.findFirst({ where: { email: { equals: email, mode: 'insensitive' } }, select: { id: true } });
    if (existing) return refuse(409, 'User already exists');

    const user = await prisma.user.create({ data: { email, passwordHash: await hashPassword(password) } });
    const session = await getSession();
    session.userId = user.id;
    session.email = user.email;
    session.isLoggedIn = true;
    await session.save();
    return NextResponse.json({ success: true, user: { id: user.id, email: user.email } }, { status: 201 });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') return refuse(409, 'User already exists');
    console.error('Enrollment error:', error);
    return refuse(500, 'Internal server error');
  }
}
