import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import styles from './page.module.css';

export const metadata = {
  title: 'Team | Dispatch',
};

export default function TeamPage() {
  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>Team</h1>
        <p className={styles.description}>Team coordination and presence.</p>
      </div>

      <div className={styles.grid}>
        <Card>
          <CardHeader>
            <CardTitle>Online Now</CardTitle>
            <CardDescription>Team members currently active</CardDescription>
          </CardHeader>
          <CardContent>
            <p className={styles.placeholder}>No team members online</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
            <CardDescription>Latest team updates</CardDescription>
          </CardHeader>
          <CardContent>
            <p className={styles.placeholder}>No recent activity</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Team Members</CardTitle>
            <CardDescription>All team members</CardDescription>
          </CardHeader>
          <CardContent>
            <p className={styles.placeholder}>No team members</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
