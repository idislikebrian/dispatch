import { NextRequest, NextResponse } from 'next/server';
import { authorizeOperator } from '@/lib/security';
import { fetchLinearIssues, syncLinearIssues } from '@/lib/integrations/linear-sync';

// Linear is read-only here. This route writes only the local Dispatch snapshot.
export async function POST(request: NextRequest): Promise<NextResponse> {
  const auth = await authorizeOperator(request);
  if (auth.denied) return auth.denied;
  try {
    const issues = await fetchLinearIssues();
    return NextResponse.json(await syncLinearIssues(issues), { status: 200 });
  } catch (error) {
    console.error('Linear sync error:', error);
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Linear sync failed' }, { status: 502 });
  }
}
