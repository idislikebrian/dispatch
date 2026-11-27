import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth/session';
import { isOperator } from '@/lib/security/authorize';
import { DashboardShell } from './dashboard-shell';

export const metadata: Metadata = {
  title: 'Dispatch',
  description: 'AI-native dispatch system',
};

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();

  if (!session.isLoggedIn || !session.userId) {
    redirect('/');
  }

  if (!(await isOperator(session.userId))) {
    redirect('/?access=denied');
  }

  return <DashboardShell>{children}</DashboardShell>;
}
