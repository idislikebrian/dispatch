import test from 'node:test';
import assert from 'node:assert/strict';
import { fetchLinearIssues } from '../lib/integrations/linear-sync';

test('Linear sync reads paginated issues without mutation methods', async () => {
  const previous = process.env.LINEAR_API_KEY;
  process.env.LINEAR_API_KEY = 'test-linear-key';
  const requests: Array<{ method?: string; body?: string; authorization?: string }> = [];
  let page = 0;
  const fetchImpl: typeof fetch = async (_input, init) => {
    requests.push({ method: init?.method, body: String(init?.body), authorization: new Headers(init?.headers).get('authorization') ?? undefined });
    page++;
    return new Response(JSON.stringify({ data: { issues: {
      nodes: [{ identifier: `COB-${page}`, title: `Issue ${page}`, url: 'https://linear.app/example', priority: 2, dueDate: null, updatedAt: '2026-11-25T00:00:00.000Z', archived: false, state: { name: 'Todo' }, team: { key: 'COB' }, project: null }],
      pageInfo: { hasNextPage: page === 1, endCursor: page === 1 ? 'cursor-1' : null },
    } } }), { status: 200, headers: { 'content-type': 'application/json' } });
  };
  try {
    const issues = await fetchLinearIssues(fetchImpl);
    assert.equal(issues.length, 2);
    assert.deepEqual(requests.map((request) => request.method), ['POST', 'POST']);
    assert.ok(requests.every((request) => request.authorization === 'test-linear-key'));
    assert.ok(requests.every((request) => request.body?.includes('query DispatchLinearSync')));
  } finally {
    if (previous === undefined) delete process.env.LINEAR_API_KEY;
    else process.env.LINEAR_API_KEY = previous;
  }
});
