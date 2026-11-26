import { NextRequest, NextResponse } from 'next/server';
import { authorizeOperator } from '@/lib/security';
import { prisma } from '@/lib/db';

export async function GET(request: NextRequest): Promise<NextResponse> {
  const auth = await authorizeOperator(request);
  if (auth.denied) return auth.denied;
  const issues = await prisma.linearIssueSnapshot.findMany({ orderBy: [{ archived: 'asc' }, { updatedAt: 'desc' }], take: 250 });
  return NextResponse.json(issues, { status: 200 });
}
