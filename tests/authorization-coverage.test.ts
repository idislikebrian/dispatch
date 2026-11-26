import assert from 'node:assert/strict';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';
import { REQUIRED_GUARDS, ROUTES } from './authorization-matrix';

const apiRoot = join(process.cwd(), 'app/api');
function routeFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? routeFiles(path) : /^route\.[jt]sx?$/.test(name) ? [path] : [];
  });
}

// Splits a route module into the source of each exported HTTP handler.
function handlers(source: string): Map<string, string> {
  const starts = [...source.matchAll(/^(?:export )?(?:async )?function (GET|HEAD|POST|PUT|PATCH|DELETE|OPTIONS)\b/gm)];
  return new Map(starts.map((match, index) => [match[1], source.slice(match.index, starts[index + 1]?.index)]));
}

const found = new Map<string, string>();
for (const file of routeFiles(apiRoot)) {
  const source = readFileSync(file, 'utf8');
  const path = file.slice(process.cwd().length + '/app'.length).replace(/\/route\.[jt]sx?$/, '');
  const parsed = handlers(source);
  // Every other way of exporting a handler would escape the check, so forbid it.
  assert.doesNotMatch(source, /export\s+(const|let|var)\s+(GET|HEAD|POST|PUT|PATCH|DELETE|OPTIONS)\b/, `${path}: declare handlers as functions`);
  for (const list of source.matchAll(/export\s*\{([^}]*)\}/g)) {
    for (const name of list[1].split(',').map((item) => item.trim()).filter(Boolean)) assert.ok(parsed.has(name), `${path}: unrecognised export ${name}`);
  }
  for (const [method, body] of parsed) found.set(`${method} ${path}`, body);
}

test('every API handler is listed in the authorization matrix', () => {
  assert.deepEqual([...found.keys()].sort(), Object.keys(ROUTES).sort());
});

test('every API handler calls the guard its access class requires', () => {
  for (const [route, access] of Object.entries(ROUTES)) {
    for (const guard of REQUIRED_GUARDS[access]) assert.ok(found.get(route)?.includes(guard), `${route} is missing ${guard}`);
  }
});

test('the dashboard requires an operator', () => {
  assert.match(readFileSync(join(process.cwd(), 'app/(dashboard)/layout.tsx'), 'utf8'), /await isOperator\(session\.userId\)/);
});
