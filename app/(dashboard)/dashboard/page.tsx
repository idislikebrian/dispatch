import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import styles from './page.module.css';

export const metadata = {
  title: 'Dispatch',
};

export default function DashboardPage() {
  return (
    <div className={styles.container}>
      <div className={styles.hero}>
        <h1 className={styles.title}>Dashboard</h1>
        <p>Eagle-eye view of operations.</p>
        <div className={styles.actions}>
          <Button>New Task</Button>
          <Button variant="outline">Chat</Button>
        </div>
      </div>

      <div className={styles.grid}>
        <Card>
          <CardHeader>
            <CardTitle>Quick Stats</CardTitle>
            <CardDescription>Overview of your workspace</CardDescription>
          </CardHeader>
          <CardContent>
            <div className={styles.stats}>
              <div className={styles.stat}>
                <span className={styles.statValue}>0</span>
                <span className={styles.statLabel}>Tasks</span>
              </div>
              <div className={styles.stat}>
                <span className={styles.statValue}>0</span>
                <span className={styles.statLabel}>Team</span>
              </div>
              <div className={styles.stat}>
                <span className={styles.statValue}>0</span>
                <span className={styles.statLabel}>Active</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
            <CardDescription>Latest updates from your team</CardDescription>
          </CardHeader>
          <CardContent>
            <p className={styles.placeholder}>No recent activity</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Shortcuts</CardTitle>
            <CardDescription>Quick actions</CardDescription>
          </CardHeader>
          <CardContent>
            <div className={styles.shortcuts}>
              <Button variant="outline" size="sm" className={styles.shortcut}>
                New Task
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
