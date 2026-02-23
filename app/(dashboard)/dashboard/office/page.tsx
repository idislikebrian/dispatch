import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import styles from './page.module.css';

export const metadata = {
  title: 'Office | Dispatch',
};

export default function OfficePage() {
  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>Office</h1>
        <p className={styles.description}>Virtual office and presence.</p>
      </div>

      <div className={styles.grid}>
        <Card>
          <CardHeader>
            <CardTitle>Rooms</CardTitle>
            <CardDescription>Available meeting rooms</CardDescription>
          </CardHeader>
          <CardContent>
            <p className={styles.placeholder}>No active rooms</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Focus Mode</CardTitle>
            <CardDescription>Current focus sessions</CardDescription>
          </CardHeader>
          <CardContent>
            <p className={styles.placeholder}>No focus sessions</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Office Map</CardTitle>
            <CardDescription>Virtual office layout</CardDescription>
          </CardHeader>
          <CardContent>
            <p className={styles.placeholder}>Office map not configured</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
