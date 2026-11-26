// Builds nothing: expects `npm run build` first and a local, disposable
// DATABASE_URL. Applies migrations, then runs the checks twice, with every
// optional feature off (the production default) and then on.
import { spawn, spawnSync } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { assertDisposableDatabase } from '../lib/db/destructive-guard';
import { OPERATOR_ID, REMOVABLE_OPERATOR_ID, runAuthorizationChecks } from './authorization-checks';

const port = Number(process.env.AUTHZ_PORT ?? 3217);
const base = `http://127.0.0.1:${port}`;

async function waitForServer(): Promise<void> {
  for (let attempt = 0; attempt < 100; attempt += 1) {
    try { if ((await fetch(base)).ok) return; } catch { /* not listening yet */ }
    await new Promise((resolve) => setTimeout(resolve, 200));
  }
  throw new Error('server did not start');
}

async function main(): Promise<void> {
  const databaseUrl = process.env.DATABASE_URL;
  assertDisposableDatabase([databaseUrl], process.env, 'local authorization checks');
  if (spawnSync('npx', ['prisma', 'migrate', 'deploy'], { stdio: 'inherit' }).status !== 0) throw new Error('migration failed');
  for (const enabled of [false, true]) {
    const enrollmentSecret = enabled ? randomBytes(32).toString('base64url') : '';
    // Every setting is assigned explicitly so a local env file cannot leak in.
    const server = spawn('node_modules/.bin/next', ['start', '-H', '127.0.0.1', '-p', String(port)], {
      stdio: ['ignore', 'ignore', 'pipe'], detached: true,
      env: {
        ...process.env, NODE_ENV: 'production', DATABASE_URL: databaseUrl,
        SESSION_SECRET: randomBytes(32).toString('base64url'),
        DISPATCH_IDENTITY_ENCRYPTION_KEY: randomBytes(32).toString('base64'),
        DISPATCH_OPERATOR_USER_IDS: `${OPERATOR_ID},${REMOVABLE_OPERATOR_ID}`,
        DISPATCH_ENROLLMENT_SECRET: enrollmentSecret,
        DISPATCH_INTERRUPTS_ENABLED: String(enabled), DISPATCH_AGENT_ENROLLMENT_ENABLED: String(enabled),
        LINEAR_API_KEY: '',
      },
    });
    let errors = '';
    server.stderr.on('data', (chunk) => { errors += chunk; });
    try {
      await waitForServer();
      const result = await runAuthorizationChecks({ base, databaseUrl: databaseUrl!, interrupts: enabled, agentEnrollment: enabled, enrollmentSecret: enrollmentSecret || null, linearConfigured: false, allowFixtureDelete: true });
      for (const failure of result.failed) console.error(`FAIL ${failure}`);
      console.log(`authorization checks (optional features ${enabled ? 'on' : 'off'}): ${result.passed} passed, ${result.failed.length} failed`);
      if (result.failed.length > 0) { process.exitCode = 1; console.error(errors.slice(-3000)); }
    } finally {
      process.kill(-server.pid!, 'SIGTERM');
      await new Promise((resolve) => server.once('exit', resolve));
    }
  }
}

main().catch((error) => { console.error(error instanceof Error ? error.message : String(error)); process.exitCode = 1; });
