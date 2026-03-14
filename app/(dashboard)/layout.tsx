import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth/session';
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

  if (!session.isLoggedIn) {
    redirect('/');
  }

  return <DashboardShell>{children}</DashboardShell>;
}
