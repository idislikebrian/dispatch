import { access, readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';

async function main(): Promise<void> {
  const root = process.cwd();
  const migrationsRoot = join(root, 'prisma/migrations');
  const entries = (await readdir(migrationsRoot, { withFileTypes: true }))
    .filter((entry) => entry.isDirectory()).map((entry) => entry.name).sort();
  if (entries.length === 0) throw new Error('no Prisma migrations found');
  for (const name of entries) {
    if (!/^\d{14}_[a-z0-9_]+$/.test(name)) throw new Error(`invalid migration directory name: ${name}`);
    const sqlPath = join(migrationsRoot, name, 'migration.sql');
    await access(sqlPath);
    if (!(await readFile(sqlPath, 'utf8')).trim()) throw new Error(`empty migration: ${name}`);
  }
  const forbidden = ['prisma db push', 'prisma migrate reset', 'prisma migrate dev'];
  const packageJson = await readFile(join(root, 'package.json'), 'utf8');
  for (const command of forbidden) if (packageJson.includes(command)) throw new Error(`forbidden implicit/destructive command in package.json: ${command}`);
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required; use the protected deployment runner, never a committed credential');
  const result = spawnSync('npx', ['prisma', 'migrate', 'status'], { encoding: 'utf8', stdio: 'inherit', env: process.env });
  if (result.status !== 0) throw new Error('production migration status is not current');
  console.log(`migration release check passed for ${entries.length} migration(s)`);
}

main().catch((error) => { console.error(`migration release check failed: ${error instanceof Error ? error.message : String(error)}`); process.exitCode = 1; });
