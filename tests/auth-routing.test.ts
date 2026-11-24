import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import test from 'node:test';

const loginSource = readFileSync(new URL('../app/page.tsx', import.meta.url), 'utf8');

test('login lands on the authenticated dashboard route', () => {
  assert.equal(existsSync(new URL('../app/(dashboard)/dashboard/page.tsx', import.meta.url)), true);
  assert.match(loginSource, /router\.push\(["']\/dashboard["']\)/);
  assert.doesNotMatch(loginSource, /router\.push\(["']\/tasks["']\)/);
});

