import { spawnSync } from 'node:child_process';

const required = ['DATABASE_URL', 'SESSION_SECRET', 'DISPATCH_IDENTITY_ENCRYPTION_KEY', 'NEXT_PUBLIC_APP_URL'];

function main(): void {
  const missing = required.filter((name) => !process.env[name]);
  if (missing.length > 0) throw new Error(`required production configuration is missing: ${missing.join(', ')}`);
  const key = Buffer.from(process.env.DISPATCH_IDENTITY_ENCRYPTION_KEY!, 'base64');
  if (key.length !== 32) throw new Error('DISPATCH_IDENTITY_ENCRYPTION_KEY must decode to exactly 32 bytes');
  const status = spawnSync('npx', ['prisma', 'migrate', 'status'], { encoding: 'utf8', stdio: 'inherit', env: process.env });
  if (status.status !== 0) throw new Error('database migrations are not current');
  console.log('release preflight passed: required configuration and migrations are ready');
}

try { main(); } catch (error) { console.error(`release preflight failed: ${error instanceof Error ? error.message : String(error)}`); process.exitCode = 1; }
