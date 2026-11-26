import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { fetchLinearIssues, syncLinearIssues } from '@/lib/integrations/linear-sync';

// Linear is read-only here. This route writes only the local Dispatch snapshot.
export async function POST(): Promise<NextResponse> {
  const session = await getSession();
  if (!session.isLoggedIn || !session.userId) return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  try {
    const issues = await fetchLinearIssues();
    return NextResponse.json(await syncLinearIssues(issues), { status: 200 });
  } catch (error) {
    console.error('Linear sync error:', error);
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Linear sync failed' }, { status: 502 });
  }
}
