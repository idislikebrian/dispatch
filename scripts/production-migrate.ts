import { chmod, mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';

async function main(): Promise<void> {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) throw new Error('DATABASE_URL is required from the protected deployment runner');
  const backupDir = process.env.MIGRATION_BACKUP_DIR ?? '/var/backups/dispatch';
  await mkdir(backupDir, { recursive: true, mode: 0o700 });
  const stamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');
  const backupPath = join(backupDir, `dispatch-pre-migration-${stamp}.dump`);
  const backup = spawnSync('pg_dump', ['--format=custom', `--file=${backupPath}`, databaseUrl], { stdio: 'inherit' });
  if (backup.status !== 0) throw new Error('backup failed; migrations were not attempted');
  await chmod(backupPath, 0o600);
  const migrate = spawnSync('npx', ['prisma', 'migrate', 'deploy'], { stdio: 'inherit', env: process.env });
  if (migrate.status !== 0) throw new Error(`migration deploy failed; backup retained at ${backupPath}`);
  const verify = spawnSync('npx', ['tsx', 'scripts/migration-release-check.ts'], { stdio: 'inherit', env: process.env });
  if (verify.status !== 0) throw new Error(`post-migration verification failed; backup retained at ${backupPath}`);
  console.log(`migration release completed; backup retained at ${backupPath}`);
}

main().catch((error) => { console.error(`production migration failed: ${error instanceof Error ? error.message : String(error)}`); process.exitCode = 1; });
