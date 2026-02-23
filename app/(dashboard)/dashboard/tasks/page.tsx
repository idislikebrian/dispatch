import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import styles from './page.module.css';

export const metadata = {
  title: 'Tasks | Dispatch',
};

export default function TasksPage() {
  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>Tasks</h1>
        <p className={styles.description}>Manage and track your tasks.</p>
      </div>

      <div className={styles.grid}>
        <Card>
          <CardHeader>
            <CardTitle>Pending Tasks</CardTitle>
            <CardDescription>Tasks waiting to be started</CardDescription>
          </CardHeader>
          <CardContent>
            <p className={styles.placeholder}>No pending tasks</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>In Progress</CardTitle>
            <CardDescription>Currently active tasks</CardDescription>
          </CardHeader>
          <CardContent>
            <p className={styles.placeholder}>No active tasks</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Completed</CardTitle>
            <CardDescription>Recently finished tasks</CardDescription>
          </CardHeader>
          <CardContent>
            <p className={styles.placeholder}>No completed tasks</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
