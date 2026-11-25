import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/db';

export async function GET(): Promise<NextResponse> {
  const session = await getSession();
  if (!session.isLoggedIn || !session.userId) return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  const issues = await prisma.linearIssueSnapshot.findMany({ orderBy: [{ archived: 'asc' }, { updatedAt: 'desc' }], take: 250 });
  return NextResponse.json(issues, { status: 200 });
}
