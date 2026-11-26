// Runs the authorization checks against an already deployed, isolated target.
// All inputs come from the environment so nothing sensitive reaches argv.
import { runAuthorizationChecks } from './authorization-checks';

async function main(): Promise<void> {
  const { BASE_URL, DATABASE_URL, DISPATCH_ENROLLMENT_SECRET, DISPATCH_PROTECTION_BYPASS } = process.env;
  if (!BASE_URL || !DATABASE_URL) throw new Error('BASE_URL and DATABASE_URL are required');
  if (new URL(BASE_URL).hostname === 'dispatch-taupe.vercel.app') throw new Error('refusing to run against production');
  const result = await runAuthorizationChecks({
    base: BASE_URL.replace(/\/$/, ''), databaseUrl: DATABASE_URL,
    interrupts: process.env.EXPECT_INTERRUPTS === 'true', agentEnrollment: process.env.EXPECT_AGENT_ENROLLMENT === 'true',
    enrollmentSecret: DISPATCH_ENROLLMENT_SECRET || null, linearConfigured: process.env.EXPECT_LINEAR === 'true', allowFixtureDelete: false,
    headers: DISPATCH_PROTECTION_BYPASS ? { 'x-vercel-protection-bypass': DISPATCH_PROTECTION_BYPASS } : undefined,
  });
  for (const failure of result.failed) console.error(`FAIL ${failure}`);
  console.log(`authorization checks: ${result.passed} passed, ${result.failed.length} failed`);
  if (result.failed.length > 0) process.exitCode = 1;
}

main().catch((error) => { console.error(error instanceof Error ? error.message : String(error)); process.exitCode = 1; });
