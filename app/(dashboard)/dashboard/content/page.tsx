import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import styles from './page.module.css';

export const metadata = {
  title: 'Content | Dispatch',
};

export default function ContentPage() {
  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>Content</h1>
        <p className={styles.description}>Manage content workflows and publishing.</p>
      </div>

      <div className={styles.grid}>
        <Card>
          <CardHeader>
            <CardTitle>Drafts</CardTitle>
            <CardDescription>Unpublished content in progress</CardDescription>
          </CardHeader>
          <CardContent>
            <p className={styles.placeholder}>No drafts</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Scheduled</CardTitle>
            <CardDescription>Content queued for publishing</CardDescription>
          </CardHeader>
          <CardContent>
            <p className={styles.placeholder}>No scheduled content</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Published</CardTitle>
            <CardDescription>Live content across channels</CardDescription>
          </CardHeader>
          <CardContent>
            <p className={styles.placeholder}>No published content</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
