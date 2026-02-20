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
        <h1 className={styles.title}>Welcome to Dispatch</h1>
        <p className={styles.description}>
          AI-native dispatch system for distributed teams.
        </p>
        <div className={styles.actions}>
          <Button>Get Started</Button>
          <Button variant="outline">Documentation</Button>
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
              <Button variant="outline" size="sm" className={styles.shortcut}>
                Invite Team
              </Button>
              <Button variant="outline" size="sm" className={styles.shortcut}>
                Settings
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
