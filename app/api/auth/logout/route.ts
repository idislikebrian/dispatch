import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';

export async function POST(): Promise<NextResponse> {
  try {
    const session = await getSession();
    session.destroy();

    return NextResponse.json(
      { success: true },
      { status: 200 }
    );
  } catch (error) {
    console.error('Logout error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
