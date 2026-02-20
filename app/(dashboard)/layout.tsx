import type { Metadata } from 'next';
import { Sidebar } from '@/components/layout/sidebar';
import { Topbar } from '@/components/layout/topbar';
import styles from './layout.module.css';

export const metadata: Metadata = {
  title: 'Dispatch',
  description: 'AI-native dispatch system',
};

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className={styles.container}>
      <Sidebar />
      <div className={styles.mainWrapper}>
        <Topbar />
        <main className={styles.main}>{children}</main>
      </div>
    </div>
  );
}
