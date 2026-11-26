import assert from 'node:assert/strict';
import test from 'node:test';
import { assertDisposableDatabase, guardPrismaCommand } from '../lib/db/destructive-guard';

const shared = 'postgresql://user:not-a-real-password@db.shared.example.com/app?sslmode=require';
const local = 'postgresql://user@127.0.0.1:5432/app';

test('development and destructive commands are refused on a shared database', () => {
  for (const args of [
    ['migrate', 'dev'], ['migrate', 'reset', '--force'], ['db', 'push'], ['db', 'push', '--accept-data-loss'], ['db', 'seed'],
    ['db', 'execute', '--file', 'x.sql'], ['studio'], ['some-future-command'], ['--schema', 'prisma/schema.prisma', 'migrate', 'reset'],
  ]) assert.throws(() => guardPrismaCommand(args, { DATABASE_URL: shared }), /refusing to run/, args.join(' '));
});

test('release and read-only commands still run', () => {
  for (const args of [[], ['--version'], ['generate'], ['validate'], ['format'], ['migrate', 'deploy'], ['migrate', 'status'], ['migrate', 'resolve', '--applied', 'x'], ['migrate', 'diff', '--from-empty', '--to-schema-datamodel', 'prisma/schema.prisma'], ['db', 'pull']]) {
    assert.doesNotThrow(() => guardPrismaCommand(args, { DATABASE_URL: shared }), args.join(' '));
  }
});

test('local and explicitly named disposable databases are allowed', () => {
  assert.doesNotThrow(() => guardPrismaCommand(['migrate', 'dev'], { DATABASE_URL: local }));
  assert.doesNotThrow(() => guardPrismaCommand(['db', 'push'], { DATABASE_URL: shared, DISPATCH_DISPOSABLE_DB_HOSTS: 'db.shared.example.com' }));
});

test('no flag or secondary variable can redirect to a shared database', () => {
  const env = { DATABASE_URL: local };
  assert.throws(() => guardPrismaCommand(['db', 'execute', '--url', shared], env));
  assert.throws(() => guardPrismaCommand(['db', 'execute', `--url=${shared}`], env));
  assert.throws(() => guardPrismaCommand(['migrate', 'dev'], { ...env, SHADOW_DATABASE_URL: shared }));
  assert.throws(() => guardPrismaCommand(['migrate', 'dev'], { ...env, DIRECT_URL: shared }));
  assert.throws(() => guardPrismaCommand(['migrate', 'diff', '--shadow-database-url', shared], env));
  assert.throws(() => assertDisposableDatabase(['postgresql://u@localhost/app?host=db.shared.example.com'], {}));
});

test('missing, malformed, and production targets are refused without leaking credentials', () => {
  assert.throws(() => assertDisposableDatabase([undefined], {}), /no database target/);
  assert.throws(() => assertDisposableDatabase(['not a url'], {}), /refusing/);
  assert.throws(() => assertDisposableDatabase([local], { VERCEL_ENV: 'production' }), /production environment/);
  assert.throws(() => assertDisposableDatabase([shared], {}), (error: Error) => !error.message.includes('not-a-real-password') && !error.message.includes('db.shared'));
});
