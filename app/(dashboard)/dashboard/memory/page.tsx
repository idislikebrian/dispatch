import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import styles from './page.module.css';

export const metadata = {
  title: 'Memory | Dispatch',
};

export default function MemoryPage() {
  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>Memory</h1>
        <p className={styles.description}>Knowledge base and AI memory management.</p>
      </div>

      <div className={styles.grid}>
        <Card>
          <CardHeader>
            <CardTitle>Knowledge Base</CardTitle>
            <CardDescription>Stored facts and information</CardDescription>
          </CardHeader>
          <CardContent>
            <p className={styles.placeholder}>No knowledge entries</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Conversations</CardTitle>
            <CardDescription>Chat history and context</CardDescription>
          </CardHeader>
          <CardContent>
            <p className={styles.placeholder}>No conversations</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Embeddings</CardTitle>
            <CardDescription>Vector search indexes</CardDescription>
          </CardHeader>
          <CardContent>
            <p className={styles.placeholder}>No embeddings</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
